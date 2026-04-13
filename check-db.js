const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ take: 1 });
  console.log('User schema sample:', users[0] ? Object.keys(users[0]) : 'No users found');
  
  const pending = await prisma.user.findMany({
    where: { approvalStatus: 'PENDING' }
  });
  console.log('Pending users:', pending.length);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
