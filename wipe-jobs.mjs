import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.job.deleteMany();
  console.log(`Successfully deleted ${result.count} jobs from the database.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
