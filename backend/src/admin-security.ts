import { Injectable, Controller, Post, Get, Headers, Body, BadRequestException, ForbiddenException, UnauthorizedException, NestMiddleware } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createCipheriv, createDecipheriv, createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const db = new PrismaClient();
function key():Buffer { const raw=process.env.ADMIN_MFA_ENCRYPTION_KEY; if(!raw||!/^[0-9a-f]{64}$/i.test(raw))throw new Error('ADMIN_MFA_ENCRYPTION_KEY must be 64 hex chars');return Buffer.from(raw,'hex'); }
function encrypt(secret:string){const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);return [iv.toString('hex'),cipher.getAuthTag().toString('hex'),data.toString('hex')].join(':');}
function decrypt(value:string){const [iv,tag,data]=value.split(':');const cipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'hex'));cipher.setAuthTag(Buffer.from(tag,'hex'));return Buffer.concat([cipher.update(Buffer.from(data,'hex')),cipher.final()]).toString('utf8');}
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(bytes:Buffer){let bits=0,value=0,out='';for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-=5))&31];}}if(bits>0)out+=alphabet[(value<<(5-bits))&31];return out;}
function decode32(value:string){let bits=0,acc=0,out:number[]=[];for(const c of value){const v=alphabet.indexOf(c);if(v<0)throw new Error('Invalid base32');acc=(acc<<5)|v;bits+=5;if(bits>=8){out.push((acc>>>(bits-=8))&255);}}return Buffer.from(out);}
export function totp(secret:string,step:number){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(step));const hash=createHmac('sha1',decode32(secret)).update(counter).digest();const offset=hash[19]&15;return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
function validStep(secret:string,code:string,lastUsed:bigint){if(!/^\d{6}$/.test(code))return null;const now=Math.floor(Date.now()/30000);for(const step of [now-1,now,now+1]){if(BigInt(step)<=lastUsed)continue;const expected=Buffer.from(totp(secret,step));if(timingSafeEqual(expected,Buffer.from(code)))return BigInt(step);}return null;}
async function adminUser(jwt:JwtService,header?:string){if(!header?.startsWith('Bearer '))throw new UnauthorizedException();let sub:string;try{sub=(await jwt.verifyAsync<{sub:string}>(header.slice(7))).sub;}catch{throw new UnauthorizedException();}const user=await db.user.findUnique({where:{id:sub}});if(!user||user.suspendedAt)throw new UnauthorizedException();const role=await db.adminRole.findFirst({where:{userId:sub}});if(!role)throw new ForbiddenException('Admin role required');return user;}
@Injectable() export class AdminMfaMiddleware implements NestMiddleware {
 constructor(private readonly jwt:JwtService){}
 async use(req:Request,res:Response,next:NextFunction){
  try{
   const user=await adminUser(this.jwt,req.headers.authorization);
   const mfa=await db.adminMfa.findUnique({where:{userId:user.id}});
   if(!mfa?.enabled)throw new ForbiddenException('Administrator MFA enrollment required');
   const code=req.headers['x-admin-totp'];if(typeof code!=='string')throw new UnauthorizedException('TOTP required');
   const step=validStep(decrypt(mfa.encryptedSecret),code,mfa.lastUsedStep);
   if(step===null)throw new UnauthorizedException('Invalid or reused TOTP');
   const changed=await db.adminMfa.updateMany({where:{userId:user.id,lastUsedStep:{lt:step}},data:{lastUsedStep:step}});
   if(changed.count!==1)throw new UnauthorizedException('TOTP replay detected');
   next();
  }catch(e:any){res.status(e?.getStatus?.()??500).json({message:e?.message??'MFA verification failed'});}
 }
}
@Controller('admin-security/mfa') export class AdminMfaController {
 constructor(private readonly jwt:JwtService){}
 @Post('enroll') async enroll(@Headers('authorization') authorization?:string){const user=await adminUser(this.jwt,authorization);const current=await db.adminMfa.findUnique({where:{userId:user.id}});if(current?.enabled)throw new ForbiddenException('Already enabled');const secret=base32(randomBytes(20));await db.adminMfa.upsert({where:{userId:user.id},create:{userId:user.id,encryptedSecret:encrypt(secret)},update:{encryptedSecret:encrypt(secret),lastUsedStep:-1}});return {secret,otpauthUrl:`otpauth://totp/BORU:${encodeURIComponent(user.email)}?secret=${secret}&issuer=BORU&digits=6&period=30`};}
 @Post('confirm') async confirm(@Headers('authorization') authorization:string,@Body() body:{code?:string}){const user=await adminUser(this.jwt,authorization);const row=await db.adminMfa.findUnique({where:{userId:user.id}});if(!row||row.enabled)throw new BadRequestException('Enrollment not pending');const step=validStep(decrypt(row.encryptedSecret),body?.code??'',row.lastUsedStep);if(step===null)throw new UnauthorizedException('Invalid TOTP');await db.adminMfa.update({where:{userId:user.id},data:{enabled:true,lastUsedStep:step}});await db.adminAudit.create({data:{actorId:user.id,action:'MFA_ENABLED'}});return {enabled:true};}
 @Get('status') async status(@Headers('authorization') authorization?:string){const user=await adminUser(this.jwt,authorization);const row=await db.adminMfa.findUnique({where:{userId:user.id},select:{enabled:true}});return {enabled:row?.enabled??false};}
}
