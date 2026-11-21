import { AdminMfaController } from './admin-security';
import { Module, Injectable, Controller, Post, Get, Body, Headers, UnauthorizedException, ConflictException, BadRequestException, Param, NotFoundException, ForbiddenException, ServiceUnavailableException, Delete, ParseIntPipe, Query, Patch, HttpCode } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { IsEmail, IsString, MinLength, MaxLength, IsIn } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(10) password!: string;
  @IsString() @MinLength(2) @MaxLength(40) displayName!: string;
  @IsString() @MaxLength(2) countryCode!: string;
}
class LoginDto { @IsEmail() email!: string; @IsString() password!: string; }
class MessageDto { @IsString() @MinLength(1) @MaxLength(500) content!: string; }
class RoomDto { @IsString() @MinLength(3) @MaxLength(80) title!: string; @IsString() @IsIn(["wolf_vip","gold_lounge","purple_lounge","classic_dark"]) backgroundTheme: string = "classic_dark"; @IsIn([2,6,8,12,18,24]) seatCount: number = 8; }
@Injectable() class Db extends PrismaClient {}
@Injectable() class Auth {
  constructor(private db: Db, private jwt: JwtService) {}
  async register(dto: RegisterDto) {
    if(!/^[A-Z]{2}$/.test(dto.countryCode))throw new BadRequestException('Invalid country code');
    const email = dto.email.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw new ConflictException('Email already registered');
    const user = await this.db.user.create({data:{email,countryCode:dto.countryCode,displayName:dto.displayName,passwordHash:await bcrypt.hash(dto.password,12)}});
    return { id:user.id, publicId:user.publicId, displayName:user.displayName };
  }
  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({where:{email:dto.email.trim().toLowerCase()}});
    if (!user || !await bcrypt.compare(dto.password,user.passwordHash)) throw new UnauthorizedException('Invalid credentials');
    return {accessToken:await this.jwt.signAsync({sub:user.id}),tokenType:'Bearer'};
  }
  async user(auth?: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    try { const token = await this.jwt.verifyAsync<{sub:string}>(auth.slice(7));
      const user = await this.db.user.findUnique({where:{id:token.sub},select:{id:true,publicId:true,email:true,displayName:true,avatarUrl:true}});
      if (!user) throw new UnauthorizedException();
      const status = await this.db.user.findUnique({where:{id:user.id},select:{suspendedAt:true}});
      if(status?.suspendedAt) throw new ForbiddenException('Account suspended');
      return user;
    } catch { throw new UnauthorizedException(); }
  }
}
@WebSocketGateway({ namespace: '/rooms', cors: { origin: process.env.CORS_ORIGIN?.split(',') || false } })
@Injectable() class RoomEvents {
  @WebSocketServer() server!: Server;
  constructor(private auth: Auth, private db: Db) {}
  async handleConnection(socket: Socket) {
    try {
      const bearer = socket.handshake.auth?.token;
      const user = await this.auth.user(typeof bearer === 'string' ? `Bearer ${bearer}` : undefined);
      socket.data.userId = user.id;
    } catch { socket.disconnect(true); }
  }
  @SubscribeMessage('room:join') async join(@ConnectedSocket() socket:Socket,@MessageBody() data:{roomId:string}) {
    const userId=socket.data.userId;
    if(typeof data?.roomId!=='string' || !userId)return {ok:false};
    const room=await this.db.room.findUnique({where:{id:data.roomId}});
    const banned=await this.db.roomBan.findUnique({where:{roomId_userId:{roomId:data.roomId,userId}}});
    if(!room||banned||(room.isPrivate&&room.ownerId!==userId))return {ok:false};
    await socket.join(`room:${room.id}`);
    this.server.to(`room:${room.id}`).emit('presence:changed',{userId,joined:true});
    return {ok:true};
  }
  @SubscribeMessage('room:leave') async leave(@ConnectedSocket() socket:Socket,@MessageBody() data:{roomId:string}) {
    if(typeof data?.roomId==='string')await socket.leave(`room:${data.roomId}`);
    return {ok:true};
  }
  emitRoom(roomId:string,event:string,payload:unknown){this.server?.to(`room:${roomId}`).emit(event,payload);}
  kick(roomId:string,userId:string){this.server?.in(`room:${roomId}`).fetchSockets().then(sockets=>{for(const s of sockets){if(s.data.userId===userId){s.emit('room:kicked',{roomId});s.leave(`room:${roomId}`);}}}).catch(()=>{});}
}
function livekitClient(){const url=process.env.LIVEKIT_URL,key=process.env.LIVEKIT_API_KEY,secret=process.env.LIVEKIT_API_SECRET;if(!url||!key||!secret)throw new ServiceUnavailableException('LiveKit not configured');return new RoomServiceClient(url.replace(/^ws/,'http'),key,secret);}
@Controller() class Api {
  constructor(private auth: Auth, private db: Db, private events: RoomEvents) {}
  @Get('health') health() { return {status:'ok'}; }
  @Post('auth/register') register(@Body() body:RegisterDto) { return this.auth.register(body); }
  @Post('auth/login') login(@Body() body:LoginDto) { return this.auth.login(body); }
  @Get('me') me(@Headers('authorization') auth?:string) { return this.auth.user(auth); }
  @Patch('me') async updateMe(
    @Headers('authorization') auth:string,
    @Body() body:{displayName?:string;avatarUrl?:string|null}
  ) {
    const user=await this.auth.user(auth);
    const data:{displayName?:string;avatarUrl?:string|null}={};
    if(body.displayName!==undefined){
      if(typeof body.displayName!=='string'||body.displayName.trim().length<2||body.displayName.trim().length>40)
        throw new BadRequestException('Display name must be 2-40 characters');
      data.displayName=body.displayName.trim();
    }
    if(body.avatarUrl!==undefined){
      if(body.avatarUrl!==null){
        if(typeof body.avatarUrl!=='string'||body.avatarUrl.length>2048)
          throw new BadRequestException('Invalid avatar URL');
        let url:URL;
        try{url=new URL(body.avatarUrl);}catch{throw new BadRequestException('Invalid avatar URL');}
        if(url.protocol!=='https:')throw new BadRequestException('Avatar URL must use HTTPS');
      }
      data.avatarUrl=body.avatarUrl;
    }
    if(!Object.keys(data).length)throw new BadRequestException('No profile changes');
    return this.db.user.update({where:{id:user.id},data,select:{id:true,publicId:true,displayName:true,avatarUrl:true}});
  }

  @Get('rooms') rooms() { return this.db.room.findMany({select:{id:true,title:true,ownerId:true,isPrivate:true,backgroundTheme:true,seatCount:true,createdAt:true},where:{isPrivate:false},orderBy:{createdAt:'desc'},take:50}); }
  private async roomAccess(roomId: string, auth?: string) {
    const user = await this.auth.user(auth);
    const room = await this.db.room.findUnique({where:{id:roomId}});
    if (!room) throw new NotFoundException('Room not found');
    if (await this.db.roomBan.findUnique({where:{roomId_userId:{roomId,userId:user.id}}})) throw new ForbiddenException('Banned from room');
    if (room.isPrivate && room.ownerId !== user.id) throw new ForbiddenException('Private room');
    return {user,room};
  }
  @Patch('rooms/:id/theme') async updateRoomTheme(@Param('id') id:string,@Headers('authorization') auth:string,@Body() body:{backgroundTheme:string}) {
    const {user,room}=await this.roomAccess(id,auth);
    if(room.ownerId!==user.id)throw new ForbiddenException('Only room owner can change theme');
    const allowed=['wolf_vip','gold_lounge','purple_lounge','classic_dark'];
    if(!body || !allowed.includes(body.backgroundTheme))throw new BadRequestException('Invalid room theme');
    const updated=await this.db.room.update({where:{id},data:{backgroundTheme:body.backgroundTheme},select:{id:true,backgroundTheme:true}});
    this.events.emitRoom(id,'room:theme:changed',updated);
    return updated;
  }
  @Patch('rooms/:id/seats/:number/lock')
  async setSeatLock(
    @Param('id') id:string,
    @Param('number',ParseIntPipe) number:number,
    @Headers('authorization') auth:string,
    @Body() body:{isLocked:boolean}
  ) {
    const {user,room}=await this.roomAccess(id,auth);
    const moderator=await this.db.roomModerator.findUnique({
      where:{roomId_userId:{roomId:id,userId:user.id}}
    });
    if(room.ownerId!==user.id&&!moderator)
      throw new ForbiddenException('Manager permission required');
    if(typeof body?.isLocked!=='boolean')
      throw new BadRequestException('isLocked must be boolean');
    if(number<1||number>room.seatCount)
      throw new BadRequestException('Invalid seat number');

    const seat=await this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      return tx.roomSeat.upsert({
        where:{roomId_seatNumber:{roomId:id,seatNumber:number}},
        create:{roomId:id,seatNumber:number,isLocked:body.isLocked},
        update:{isLocked:body.isLocked}
      });
    });
    this.events.emitRoom(id,'seats:changed',{roomId:id});
    return seat;
  }

  @Get('rooms/:id/seats') async seats(@Param('id') id:string, @Headers('authorization') auth?:string) {
    const {room}=await this.roomAccess(id,auth);
    await this.db.roomSeat.createMany({
      data:Array.from({length:room.seatCount},(_,i)=>({roomId:id,seatNumber:i+1})),
      skipDuplicates:true
    });
    return this.db.roomSeat.findMany({where:{roomId:id},include:{user:{select:{id:true,displayName:true,avatarUrl:true}}},orderBy:{seatNumber:'asc'}});
  }
  @Post('rooms/:id/seats/:number/take') async takeSeat(@Param('id') id:string,@Param('number',ParseIntPipe) number:number,@Headers('authorization') auth?:string) {
    const {user,room}=await this.roomAccess(id,auth);
    if(number<1||number>room.seatCount)throw new BadRequestException(`Seat must be 1-${room.seatCount}`);
    // Serializes competing seat claims within PostgreSQL transaction.
    const result=await this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const existing=await tx.roomSeat.findFirst({where:{roomId:id,userId:user.id}});
      if(existing && existing.seatNumber!==number)await tx.roomSeat.update({where:{id:existing.id},data:{userId:null,micBlocked:false}});
      const seat=await tx.roomSeat.findUnique({where:{roomId_seatNumber:{roomId:id,seatNumber:number}}});
      if(seat?.isLocked)throw new ForbiddenException('Seat locked');
      if(seat?.userId && seat.userId!==user.id)throw new ConflictException('Seat occupied');
      return tx.roomSeat.upsert({where:{roomId_seatNumber:{roomId:id,seatNumber:number}},create:{roomId:id,seatNumber:number,userId:user.id,micBlocked:false},update:{userId:user.id,micBlocked:false}});
    });
    try { await livekitClient().updateParticipant(`boru_${id}`,user.id,undefined,{canPublish:true,canSubscribe:true,canPublishData:true}); } catch(e) { /* user may not be connected yet; token refresh needed */ }
    this.events.emitRoom(id,'seats:changed',{roomId:id});
    return result;
  }
  @Delete('rooms/:id/seats/:number') async releaseSeat(@Param('id') id:string,@Param('number',ParseIntPipe) number:number,@Headers('authorization') auth?:string) {
    const {user,room}=await this.roomAccess(id,auth);
    const seat=await this.db.roomSeat.findUnique({where:{roomId_seatNumber:{roomId:id,seatNumber:number}}});
    if(!seat)throw new NotFoundException('Seat not found');
    if(seat.userId!==user.id && room.ownerId!==user.id)throw new ForbiddenException();
    await this.db.roomSeat.update({where:{id:seat.id},data:{userId:null,micBlocked:false}});
    if(seat.userId){try{await livekitClient().updateParticipant(`boru_${id}`,seat.userId,undefined,{canPublish:false,canSubscribe:true,canPublishData:true});}catch(e){/* participant may be offline */}}
    this.events.emitRoom(id,'seats:changed',{roomId:id});
    return {ok:true};
  }
  @Get('rooms/:id/messages') async messages(@Param('id') id:string,@Headers('authorization') auth?:string) {
    await this.roomAccess(id,auth);
    return this.db.roomMessage.findMany({where:{roomId:id},include:{sender:{select:{id:true,displayName:true}}},orderBy:{createdAt:'desc'},take:50}).then(rows=>rows.reverse());
  }
  @Post('rooms/:id/messages') async sendMessage(@Param('id') id:string,@Headers('authorization') auth:string,@Body() dto:MessageDto) {
    const {user}=await this.roomAccess(id,auth);
    if(!dto.content.trim())throw new BadRequestException('Empty message');
    const message=await this.db.roomMessage.create({data:{roomId:id,senderId:user.id,content:dto.content.trim()},include:{sender:{select:{id:true,displayName:true}}}});
    this.events.emitRoom(id,'message:new',message);return message;
  }
  @Post('rooms/:id/ban/:userId') async ban(@Param('id') id:string,@Param('userId') userId:string,@Headers('authorization') auth:string) {
    const {user,room}=await this.roomAccess(id,auth);
    const moderator=await this.db.roomModerator.findUnique({where:{roomId_userId:{roomId:id,userId:user.id}}});
    if((room.ownerId!==user.id&&!moderator)||userId===room.ownerId)throw new ForbiddenException();
    await this.db.roomBan.upsert({where:{roomId_userId:{roomId:id,userId}},create:{roomId:id,userId},update:{}});
    await this.db.roomSeat.updateMany({where:{roomId:id,userId},data:{userId:null,micBlocked:false}});
    // Revoke active RTC session as well as future access.
    const url=process.env.LIVEKIT_URL, key=process.env.LIVEKIT_API_KEY, secret=process.env.LIVEKIT_API_SECRET;
    if(url&&key&&secret){const client=new RoomServiceClient(url.replace(/^ws/,'http'),key,secret);try{await client.removeParticipant(`boru_${id}`,userId);}catch(e){ /* offline participant */ }}
    this.events.kick(id,userId);this.events.emitRoom(id,'participant:banned',{userId});
    this.events.emitRoom(id,'seats:changed',{roomId:id});
    return {ok:true};
  }
  @Post('rooms/:id/kick/:userId') async kickFromRoom(
    @Param('id') id:string,@Param('userId') userId:string,@Headers('authorization') auth:string
  ) {
    const {user,room}=await this.roomAccess(id,auth);
    const manager=room.ownerId===user.id ||
      !!await this.db.roomModerator.findUnique({where:{roomId_userId:{roomId:id,userId:user.id}}});
    if(!manager||userId===room.ownerId||userId===user.id)throw new ForbiddenException();
    if(!await this.db.user.findUnique({where:{id:userId}}))throw new NotFoundException('User not found');
    await this.db.roomSeat.updateMany({where:{roomId:id,userId},data:{userId:null,micBlocked:false}});
    try{await livekitClient().removeParticipant(`boru_${id}`,userId);}catch{/* Participant may be offline. */}
    this.events.kick(id,userId);
    this.events.emitRoom(id,'seats:changed',{roomId:id});
    return {ok:true};
  }
  @Patch('rooms/:id/microphone/:userId') async setMicrophonePermission(
    @Param('id') id:string,@Param('userId') userId:string,
    @Headers('authorization') auth:string,@Body() body:{blocked:boolean}
  ) {
    const {user,room}=await this.roomAccess(id,auth);
    const manager=room.ownerId===user.id ||
      !!await this.db.roomModerator.findUnique({where:{roomId_userId:{roomId:id,userId:user.id}}});
    if(!manager||userId===room.ownerId)throw new ForbiddenException();
    if(typeof body?.blocked!=='boolean')throw new BadRequestException('blocked must be boolean');
    const seat=await this.db.roomSeat.findFirst({where:{roomId:id,userId}});
    if(!seat)throw new BadRequestException('User is not seated');
    await this.db.roomSeat.update({where:{id:seat.id},data:{micBlocked:body.blocked}});
    try {
      await livekitClient().updateParticipant(`boru_${id}`,userId,undefined,
        {canPublish:!body.blocked,canSubscribe:true,canPublishData:true});
    } catch(e) {
      // Offline users retain the DB permission; online errors are surfaced.
      if(!(e instanceof Error && /not found|does not exist/i.test(e.message)))
        throw new ServiceUnavailableException('Could not update live microphone permission');
    }
    this.events.emitRoom(id,'participant:mic:changed',{userId,blocked:body.blocked});
    this.events.emitRoom(id,'seats:changed',{roomId:id});
    return {ok:true,blocked:body.blocked};
  }
  @Post('rooms/:id/seats/:number/clear') async clearSeat(
    @Param('id') id:string,@Param('number',ParseIntPipe) number:number,
    @Headers('authorization') auth:string
  ) {
    const {user,room}=await this.roomAccess(id,auth);
    const manager=room.ownerId===user.id ||
      !!await this.db.roomModerator.findUnique({where:{roomId_userId:{roomId:id,userId:user.id}}});
    if(!manager)throw new ForbiddenException();
    if(number<1||number>room.seatCount)throw new BadRequestException('Invalid seat number');
    const previous=await this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const seat=await tx.roomSeat.findUnique({where:{roomId_seatNumber:{roomId:id,seatNumber:number}}});
      if(!seat?.userId)throw new NotFoundException('Seat is empty');
      if(seat.userId===room.ownerId)throw new ForbiddenException('Cannot remove room owner');
      await tx.roomSeat.update({where:{id:seat.id},data:{userId:null,micBlocked:false}});
      return seat.userId;
    });
    try{await livekitClient().updateParticipant(`boru_${id}`,previous,undefined,
      {canPublish:false,canSubscribe:true,canPublishData:true});}catch{/* Participant may be offline. */}
    this.events.emitRoom(id,'seats:changed',{roomId:id});
    this.events.emitRoom(id,'participant:mic:changed',{userId:previous,blocked:true});
    return {ok:true};
  }
  @Post('rooms/:id/rtc-token') async rtcToken(@Headers('authorization') authorization: string, @Param('id') roomId: string) {
    const {user} = await this.roomAccess(roomId,authorization);
    const url = process.env.LIVEKIT_URL;
    const key = process.env.LIVEKIT_API_KEY;
    const secret = process.env.LIVEKIT_API_SECRET;
    if (!url || !key || !secret) throw new ServiceUnavailableException('LiveKit not configured');
    const token = new AccessToken(key, secret, { identity:user.id, name:user.displayName, ttl:'15m' });
    const seat=await this.db.roomSeat.findFirst({where:{roomId,userId:user.id}});
    token.addGrant({ roomJoin:true, room:`boru_${roomId}`, canPublish:!!seat&&!seat.micBlocked, canSubscribe:true, canPublishData:true });
    return {serverUrl:url, token:await token.toJwt(), roomId:roomId};
  }
  @Get('rooms/:id/participants') async participants(@Param('id') id:string,@Headers('authorization') auth?:string){
    await this.roomAccess(id,auth);
    try {const participants=await livekitClient().listParticipants(`boru_${id}`);return participants.map(p=>({id:p.identity,name:p.name,isSpeaking:false}));}
    catch(e){throw new ServiceUnavailableException('Live participant list unavailable');}
  }
  @Get('rooms/:id/moderators') async moderators(@Param('id') id:string,@Headers('authorization') auth?:string){
    await this.roomAccess(id,auth);return this.db.roomModerator.findMany({where:{roomId:id},include:{user:{select:{id:true,displayName:true}}}});
  }
  @Post('rooms/:id/moderators/:userId') async addModerator(@Param('id') id:string,@Param('userId') userId:string,@Headers('authorization') auth?:string){
    const {user,room}=await this.roomAccess(id,auth);if(room.ownerId!==user.id)throw new ForbiddenException('Only owner can appoint moderators');
    const target=await this.db.user.findUnique({where:{id:userId}});if(!target)throw new NotFoundException('User not found');
    const result=await this.db.roomModerator.upsert({where:{roomId_userId:{roomId:id,userId}},create:{roomId:id,userId},update:{}});
    this.events.emitRoom(id,'moderators:changed',{roomId:id});return result;
  }
  @Delete('rooms/:id/moderators/:userId') async removeModerator(@Param('id') id:string,@Param('userId') userId:string,@Headers('authorization') auth?:string){
    const {user,room}=await this.roomAccess(id,auth);if(room.ownerId!==user.id)throw new ForbiddenException();
    await this.db.roomModerator.deleteMany({where:{roomId:id,userId}});this.events.emitRoom(id,'moderators:changed',{roomId:id});return {ok:true};
  }
  @Post('rooms/:id/mute/:userId') async mute(@Param('id') id:string,@Param('userId') userId:string,@Headers('authorization') auth?:string){
    const {user,room}=await this.roomAccess(id,auth);
    const moderator=await this.db.roomModerator.findUnique({where:{roomId_userId:{roomId:id,userId:user.id}}});
    if(room.ownerId!==user.id&&!moderator)throw new ForbiddenException();
    if(userId===room.ownerId)throw new ForbiddenException();
    await this.db.roomSeat.updateMany({where:{roomId:id,userId},data:{userId:null,micBlocked:false}});
    try {await livekitClient().updateParticipant(`boru_${id}`,userId,undefined,{canPublish:false,canSubscribe:true,canPublishData:true});}catch(e){/* offline */}
    this.events.emitRoom(id,'seats:changed',{roomId:id});this.events.emitRoom(id,'participant:muted',{userId});return {ok:true};
  }
  @Post('rooms') async createRoom(@Headers('authorization') auth:string,@Body() dto:RoomDto) {
    const user = await this.auth.user(auth);
    const room = await this.db.room.create({
      data:{title:dto.title,ownerId:user.id,backgroundTheme:dto.backgroundTheme,seatCount:dto.seatCount},
      select:{id:true,title:true,ownerId:true,isPrivate:true,backgroundTheme:true,seatCount:true}
    });
    await this.db.roomSeat.createMany({
      data:Array.from({length:room.seatCount},(_,i)=>({roomId:room.id,seatNumber:i+1})),
      skipDuplicates:true
    });
    return room;
  }
}

// V6 economy: server-side atomic spending; development-only grants require a secret.
class SendGiftDto {
  @IsString() receiverId!: string;
  @IsString() roomId!: string;
  @IsString() giftId!: string;
  @IsString() @MinLength(8) requestId!: string;
}
class DevGrantDto {
  @IsString() userId!: string;
  @IsString() @MinLength(8) requestId!: string;
}
@Controller('economy') class EconomyApi {
  constructor(private db:Db,private auth:Auth,private events:RoomEvents){}
  @Get('wallet') async wallet(@Headers('authorization') bearer?:string){
    const user=await this.auth.user(bearer);
    const w=await this.db.coinWallet.findUnique({where:{userId:user.id}});
    return {balance:(w?.balance??0n).toString(),currency:'BORU_COIN',cashout:false};
  }
  @Get('ledger') async ledger(@Headers('authorization') bearer?:string){
    const user=await this.auth.user(bearer);
    const rows=await this.db.coinLedger.findMany({where:{userId:user.id},orderBy:{createdAt:'desc'},take:50});
    return rows.map(x=>({...x,amount:x.amount.toString(),balanceAfter:x.balanceAfter.toString()}));
  }
  @Get('gifts') async gifts(){const rows=await this.db.gift.findMany({where:{active:true},orderBy:{priceCoins:'asc'}});return rows.map(x=>({...x,priceCoins:x.priceCoins.toString()}));}
  @Get('packages') async packages(){const rows=await this.db.coinPackage.findMany({where:{active:true}});return rows.map(x=>({...x,coins:x.coins.toString()}));}
  @Get('vip-plans') async vipPlans(){return this.db.vipPlan.findMany({where:{active:true}});}
  @Get('vip') async vip(@Headers('authorization') bearer?:string){const user=await this.auth.user(bearer);return this.db.vipEntitlement.findFirst({where:{userId:user.id,endsAt:{gt:new Date()}},orderBy:{endsAt:'desc'}});}
  // Purchase verification must use the store server API and server notifications.
  // Never trust client-supplied success flags, prices, coins, or expiry dates.
  @Post('purchases/verify') async verifyPurchase(@Headers('authorization') bearer:string,@Body() dto:{platform?:string,productId?:string,transactionId?:string}){
    await this.auth.user(bearer);
    if(!['APPLE','GOOGLE'].includes(dto?.platform??'')||typeof dto?.productId!=='string'||typeof dto?.transactionId!=='string')
      throw new BadRequestException('Invalid purchase request');
    throw new ServiceUnavailableException('Store server verification is not configured; no coins or VIP rights were granted');
  }
  @Post('gifts/send') async send(@Headers('authorization') bearer:string,@Body() dto:SendGiftDto){
    const sender=await this.auth.user(bearer);
    if(sender.id===dto.receiverId)throw new BadRequestException('Cannot gift yourself');
    const room=await this.db.room.findUnique({where:{id:dto.roomId}});
    if(!room)throw new NotFoundException('Room not found');
    const [receiver,gift,banned]=await Promise.all([
      this.db.user.findUnique({where:{id:dto.receiverId}}),
      this.db.gift.findUnique({where:{id:dto.giftId}}),
      this.db.roomBan.findUnique({where:{roomId_userId:{roomId:dto.roomId,userId:sender.id}}})
    ]);
    if(!receiver||!gift||!gift.active)throw new NotFoundException('Recipient or gift not found');
    if(banned||(room.isPrivate&&room.ownerId!==sender.id))throw new ForbiddenException();
    // Unique requestId ensures replay cannot spend twice. All writes commit atomically.
    const result=await this.db.$transaction(async tx=>{
      const prior=await tx.coinLedger.findUnique({where:{referenceId:dto.requestId}});
      if(prior){const previous=await tx.giftSend.findUnique({where:{id:prior.reason.startsWith('GIFT:')?prior.reason.slice(5):''}});
        if(!previous||previous.senderId!==sender.id)throw new ConflictException('Request ID already used');
        return {transferId:previous.id,balance:prior.balanceAfter.toString(),duplicate:true};}
      const debit=await tx.coinWallet.updateMany({where:{userId:sender.id,balance:{gte:gift.priceCoins}},data:{balance:{decrement:gift.priceCoins}}});
      if(debit.count!==1)throw new BadRequestException('Insufficient coin balance');
      const wallet=await tx.coinWallet.findUniqueOrThrow({where:{userId:sender.id}});
      const transfer=await tx.giftSend.create({data:{senderId:sender.id,receiverId:dto.receiverId,roomId:dto.roomId,giftId:gift.id,quantity:1,costCoins:gift.priceCoins}});
      await tx.coinLedger.create({data:{userId:sender.id,amount:-gift.priceCoins,balanceAfter:wallet.balance,reason:`GIFT:${transfer.id}`,referenceId:dto.requestId}});
      return {transferId:transfer.id,balance:wallet.balance.toString(),duplicate:false};
    },{isolationLevel:'Serializable'});
    if(!result.duplicate)this.events.emitRoom(dto.roomId,'gift:sent',{transferId:result.transferId,senderId:sender.id,receiverId:dto.receiverId,giftId:gift.id});
    return result;
  }
  // NEVER deploy this endpoint to production. Real coin grants require store receipt verification.
  @Post('dev/grant') async grant(@Headers('x-dev-secret') secret:string,@Body() dto:DevGrantDto){
    if(process.env.NODE_ENV==='production'||!process.env.DEV_GRANT_SECRET||secret!==process.env.DEV_GRANT_SECRET)throw new ForbiddenException();
    const amount=10000n;
    return this.db.$transaction(async tx=>{
      const prior=await tx.coinLedger.findUnique({where:{referenceId:dto.requestId}});
      if(prior){if(prior.userId!==dto.userId)throw new ConflictException();return {balance:prior.balanceAfter.toString(),duplicate:true};}
      const wallet=await tx.coinWallet.upsert({where:{userId:dto.userId},create:{userId:dto.userId,balance:amount},update:{balance:{increment:amount}}});
      await tx.coinLedger.create({data:{userId:dto.userId,amount,balanceAfter:wallet.balance,reason:'DEV_GRANT',referenceId:dto.requestId}});
      return {balance:wallet.balance.toString(),duplicate:false};
    },{isolationLevel:'Serializable'});
  }
}

@Controller('admin') class AdminApi {
  constructor(private auth: Auth, private db: Db) {}
  private async check(token?:string, roles:string[]=['SUPER_ADMIN']) {
    const user=await this.auth.user(token);
    const role=await this.db.adminRole.findFirst({where:{userId:user.id,role:{in:roles}}});
    if(!role)throw new ForbiddenException('Administrator permission required');
    return user;
  }
  @Get('overview') async overview(@Headers('authorization') token?:string) {
    await this.check(token,['SUPER_ADMIN','SUPPORT','COUNTRY_ADMIN']);
    const [users,rooms,gifts,packages,activeVip]=await Promise.all([
      this.db.user.count(),this.db.room.count(),this.db.gift.count(),this.db.coinPackage.count(),
      this.db.vipEntitlement.count({where:{endsAt:{gt:new Date()}}})]);
    return {users,rooms,gifts,packages,activeVip};
  }
  @Get('users') async users(@Headers('authorization') token?:string,@Query('skip') skip='0') {
    await this.check(token,['SUPER_ADMIN','SUPPORT']);
    const n=Math.max(0,Math.min(100000,Number(skip)||0));
    return this.db.user.findMany({skip:n,take:30,orderBy:{createdAt:'desc'},select:{id:true,publicId:true,displayName:true,email:true,suspendedAt:true,createdAt:true}});
  }
  @Get('rooms') async rooms(@Headers('authorization') token?:string) {
    await this.check(token,['SUPER_ADMIN','SUPPORT']);
    return this.db.room.findMany({take:40,orderBy:{createdAt:'desc'},select:{id:true,title:true,ownerId:true,isPrivate:true,backgroundTheme:true,seatCount:true,createdAt:true}});
  }
  @Get('catalog') async catalog(@Headers('authorization') token?:string) {
    await this.check(token,['SUPER_ADMIN','SUPPORT']);
    const [gifts,packages,vip]=await Promise.all([this.db.gift.findMany(),this.db.coinPackage.findMany(),this.db.vipPlan.findMany()]);
    return {gifts:gifts.map(x=>({...x,priceCoins:x.priceCoins.toString()})),packages:packages.map(x=>({...x,coins:x.coins.toString()})),vip};
  }
  @Get('audit') async audit(@Headers('authorization') token?:string) {
    await this.check(token);
    return this.db.adminAudit.findMany({take:50,orderBy:{createdAt:'desc'}});
  }
  @Patch('users/:id/suspension') async suspension(@Headers('authorization') token:string,@Param('id') id:string,@Body() body:{suspended?:boolean}) {
    const actor=await this.check(token);
    if(typeof body?.suspended!=='boolean')throw new BadRequestException('suspended must be boolean');
    if(actor.id===id)throw new ForbiddenException('Cannot suspend yourself');
    const exists=await this.db.user.findUnique({where:{id}});
    if(!exists)throw new NotFoundException();
    if(await this.db.adminRole.findFirst({where:{userId:id,role:'SUPER_ADMIN'}}))throw new ForbiddenException('Cannot suspend super admin');
    return this.db.$transaction(async tx=>{
      const user=await tx.user.update({where:{id},data:{suspendedAt:body.suspended?new Date():null},select:{id:true,suspendedAt:true}});
      await tx.adminAudit.create({data:{actorId:actor.id,action:body.suspended?'USER_SUSPEND':'USER_RESTORE',targetId:id}});
      return user;
    });
  }
  @Patch('gifts/:id') async gift(@Headers('authorization') token:string,@Param('id') id:string,@Body() body:{active?:boolean}) {
    const actor=await this.check(token);
    if(typeof body?.active!=='boolean')throw new BadRequestException('active must be boolean');
    return this.db.$transaction(async tx=>{
      const gift=await tx.gift.update({where:{id},data:{active:body.active}});
      await tx.adminAudit.create({data:{actorId:actor.id,action:'GIFT_STATUS',targetId:id,details:{active:body.active}}});
      return {...gift,priceCoins:gift.priceCoins.toString()};
    });
  }
}


// V9: all country-level access is enforced by server queries, never by client filters.
@Controller() class SafetyApi {
  constructor(private auth:Auth, private db:Db) {}
  private country(value:unknown) {
    if(typeof value!=='string'|| !/^[A-Z]{2}$/.test(value)) throw new BadRequestException('ISO country code required');
    return value;
  }
  @Post('reports') async report(@Headers('authorization') bearer:string,@Body() body:{targetUserId?:string,roomId?:string,category?:string,description?:string}) {
    const actor=await this.auth.user(bearer);
    const profile=await this.db.user.findUniqueOrThrow({where:{id:actor.id},select:{countryCode:true}});
    if(!profile.countryCode)throw new BadRequestException('Set verified country before reporting');
    if(!body?.targetUserId&&!body?.roomId)throw new BadRequestException('Target required');
    if(!['ABUSE','HARASSMENT','SPAM','SAFETY','OTHER'].includes(body.category||''))throw new BadRequestException('Invalid category');
    if(typeof body.description!=='string'||body.description.trim().length<10||body.description.length>2000)throw new BadRequestException('Description must be 10-2000 chars');
    if(body.targetUserId&&!await this.db.user.findUnique({where:{id:body.targetUserId}}))throw new NotFoundException('Target user');
    if(body.roomId&&!await this.db.room.findUnique({where:{id:body.roomId}}))throw new NotFoundException('Room');
    return this.db.userReport.create({data:{reporterId:actor.id,targetUserId:body.targetUserId,roomId:body.roomId,countryCode:profile.countryCode,category:body.category!,description:body.description.trim()},select:{id:true,status:true,createdAt:true}});
  }
  @Post('support/tickets') async ticket(@Headers('authorization') bearer:string,@Body() body:{subject?:string,description?:string}) {
    const actor=await this.auth.user(bearer);
    const profile=await this.db.user.findUniqueOrThrow({where:{id:actor.id},select:{countryCode:true}});
    if(!profile.countryCode)throw new BadRequestException('Set verified country before opening a ticket');
    if(typeof body.subject!=='string'||body.subject.trim().length<4||body.subject.length>160)throw new BadRequestException('Invalid subject');
    if(typeof body.description!=='string'||body.description.trim().length<10||body.description.length>4000)throw new BadRequestException('Invalid description');
    return this.db.supportTicket.create({data:{userId:actor.id,countryCode:profile.countryCode,subject:body.subject.trim(),description:body.description.trim()},select:{id:true,status:true,createdAt:true}});
  }
  @Get('support/tickets/mine') async mine(@Headers('authorization') bearer:string) {
    const actor=await this.auth.user(bearer);
    return this.db.supportTicket.findMany({where:{userId:actor.id},take:30,orderBy:{createdAt:'desc'},select:{id:true,subject:true,status:true,resolutionNote:true,createdAt:true}});
  }
}
@Controller('admin/v9') class SafetyAdminApi {
  constructor(private auth:Auth,private db:Db) {}
  private async scope(token?:string) {
    const actor=await this.auth.user(token);
    const roles=await this.db.adminRole.findMany({where:{userId:actor.id}});
    if(roles.some(r=>r.role==='SUPER_ADMIN'))return {actor,global:true,countries:[] as string[]};
    const countries=roles.filter(r=>r.role==='COUNTRY_ADMIN'&&r.countryCode).map(r=>r.countryCode!);
    if(countries.length)return {actor,global:false,countries};
    // Support personnel require a separate, explicit support workflow; no global access by default.
    throw new ForbiddenException('Country administrator role required');
  }
  private filter(scope:{global:boolean,countries:string[]}) {return scope.global?{}:{countryCode:{in:scope.countries}};}
  @Get('reports') async reports(@Headers('authorization') token?:string,@Query('status') status='OPEN') {
    const scope=await this.scope(token);
    if(!['OPEN','IN_REVIEW','RESOLVED','REJECTED'].includes(status))throw new BadRequestException('Invalid status');
    return this.db.userReport.findMany({where:{...this.filter(scope),status},take:50,orderBy:{createdAt:'desc'}});
  }
  @Get('tickets') async tickets(@Headers('authorization') token?:string,@Query('status') status='OPEN') {
    const scope=await this.scope(token);
    if(!['OPEN','IN_REVIEW','RESOLVED','CLOSED'].includes(status))throw new BadRequestException('Invalid status');
    return this.db.supportTicket.findMany({where:{...this.filter(scope),status},take:50,orderBy:{createdAt:'desc'}});
  }
  @Patch('reports/:id') async updateReport(@Headers('authorization') token:string,@Param('id') id:string,@Body() body:{status?:string,resolutionNote?:string}) {
    const scope=await this.scope(token);
    if(!['IN_REVIEW','RESOLVED','REJECTED'].includes(body?.status||''))throw new BadRequestException('Invalid status');
    if(typeof body.resolutionNote!=='string'||body.resolutionNote.trim().length<5||body.resolutionNote.length>2000)throw new BadRequestException('Resolution note required');
    return this.db.$transaction(async tx=>{
      const record=await tx.userReport.findFirst({where:{id,...this.filter(scope)}});
      if(!record)throw new NotFoundException();
      const updated=await tx.userReport.update({where:{id},data:{status:body.status!,resolutionNote:body.resolutionNote!.trim(),assignedToId:scope.actor.id}});
      await tx.adminAudit.create({data:{actorId:scope.actor.id,action:'REPORT_STATUS',targetId:id,details:{status:body.status,countryCode:record.countryCode}}});
      return updated;
    });
  }
  @Patch('tickets/:id') async updateTicket(@Headers('authorization') token:string,@Param('id') id:string,@Body() body:{status?:string,resolutionNote?:string}) {
    const scope=await this.scope(token);
    if(!['IN_REVIEW','RESOLVED','CLOSED'].includes(body?.status||''))throw new BadRequestException('Invalid status');
    if(typeof body.resolutionNote!=='string'||body.resolutionNote.trim().length<5||body.resolutionNote.length>2000)throw new BadRequestException('Resolution note required');
    return this.db.$transaction(async tx=>{
      const record=await tx.supportTicket.findFirst({where:{id,...this.filter(scope)}});
      if(!record)throw new NotFoundException();
      const updated=await tx.supportTicket.update({where:{id},data:{status:body.status!,resolutionNote:body.resolutionNote!.trim(),assignedToId:scope.actor.id}});
      await tx.adminAudit.create({data:{actorId:scope.actor.id,action:'TICKET_STATUS',targetId:id,details:{status:body.status,countryCode:record.countryCode}}});
      return updated;
    });
  }
  @Get('stats') async stats(@Headers('authorization') token?:string) {
    const scope=await this.scope(token);const where=this.filter(scope);
    const [users,reportsOpen,reportsResolved,ticketsOpen,ticketsResolved]=await Promise.all([
      this.db.user.count({where}),this.db.userReport.count({where:{...where,status:'OPEN'}}),
      this.db.userReport.count({where:{...where,status:'RESOLVED'}}),this.db.supportTicket.count({where:{...where,status:'OPEN'}}),
      this.db.supportTicket.count({where:{...where,status:'RESOLVED'}})
    ]);
    return {users,reportsOpen,reportsResolved,ticketsOpen,ticketsResolved,scope:scope.global?'GLOBAL':scope.countries};
  }
}
@Module({imports:[JwtModule.register({secret:process.env.JWT_SECRET || (process.env.NODE_ENV==='production' ? (()=>{throw new Error('JWT_SECRET required')})() : 'INSECURE_DEV_ONLY_CHANGE_ME'),signOptions:{expiresIn:'15m'}})],controllers:[Api,EconomyApi,AdminApi,SafetyApi,SafetyAdminApi,AdminMfaController],providers:[Db,Auth,RoomEvents]})
export class AppModule {}
