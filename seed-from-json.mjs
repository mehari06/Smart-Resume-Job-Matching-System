import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const jobsData = JSON.parse(fs.readFileSync('data/jobs.json', 'utf-8'));
  console.log(`Loaded ${jobsData.length} jobs from data/jobs.json`);

  // Wipe current jobs
  const del = await prisma.job.deleteMany({});
  console.log(`Deleted ${del.count} existing jobs from database`);

  // Re-seed all 210 jobs
  // Remove hardcoded IDs to let Prisma generate them, or keep them if they are strings
  const formattedJobs = jobsData.map(j => ({
    title: j.title,
    company: j.company,
    location: j.location,
    type: j.type || 'FULL_TIME',
    salary: j.salary,
    description: j.description,
    skills: j.skills || [],
    source: j.source,
    category: j.category,
    experience: j.experience,
    isActive: true,
  }));

  const created = await prisma.job.createMany({
    data: formattedJobs,
  });

  console.log(`Successfully seeded ${created.count} jobs into PostgreSQL from ML configuration!`);

  // Assign 3 jobs to the recruiter so their dashboard still works
  const recruiter = await prisma.user.findUnique({ where: { email: 'bereketteshome95@gmail.com' } });
  if (recruiter) {
    const jobsToUpdate = await prisma.job.findMany({ take: 3 });
    for (const job of jobsToUpdate) {
      await prisma.job.update({ 
        where: { id: job.id }, 
        data: { postedById: recruiter.id, source: 'INTERNAL' } 
      });
    }
    console.log(`Assigned 3 jobs to recruiter ${recruiter.email}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
