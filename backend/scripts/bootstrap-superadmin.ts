import {PrismaClient} from '@prisma/client';
const db=new PrismaClient();
async function main(){
 const email=process.argv[2]?.trim().toLowerCase();
 if(!email)throw Error('Usage: npx tsx scripts/bootstrap-superadmin.ts admin@example.com');
 const user=await db.user.findUnique({where:{email}});
 if(!user)throw Error('Register user first');
 const exists=await db.adminRole.findFirst({where:{userId:user.id,role:'SUPER_ADMIN'}});
 if(!exists)await db.adminRole.create({data:{userId:user.id,role:'SUPER_ADMIN'}});
 console.log('Super admin granted to existing user:',user.publicId);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
