// prisma/seed-ten-jobs.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const RECRUITER_EMAIL = "mbereket523@gmail.com";

async function main() {
  console.log('--- Starting Seeding Process (Minimal) ---');
  try {
    const jobsPath = path.join(process.cwd(), 'data', 'jobs.json');
    const jobsData = JSON.parse(await fs.readFile(jobsPath, 'utf8'));
    const firstTenJobs = jobsData.slice(0, 10);
    console.log(`Loaded ${firstTenJobs.length} jobs.`);

    const recruiter = await prisma.user.upsert({
      where: { email: RECRUITER_EMAIL },
      update: { role: 'RECRUITER' },
      create: { email: RECRUITER_EMAIL, name: "M. Bereket", role: 'RECRUITER' },
    });
    console.log(`Recruiter ready: ${recruiter.email}`);

    // Cleanup
    const models = ['application', 'match', 'job'];
    for (const m of models) {
      try {
        if (prisma[m]) {
          await prisma[m].deleteMany();
          console.log(`Cleared ${m}`);
        }
      } catch (e) {
        console.log(`Note: ${m} clear skipped (${e.code || e.message})`);
      }
    }

    // Seed
    for (const job of firstTenJobs) {
      await prisma.job.create({
        data: {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type || 'FULL_TIME',
          salary: job.salary,
          description: job.description,
          skills: job.skills || [],
          source: job.source || 'INTERNAL',
          category: job.category,
          experience: job.experience,
          isActive: true,
          postedAt: new Date(),
          postedById: recruiter.id,
        },
      });
      console.log(`Created: ${job.title}`);
    }
    console.log('✅ Success!');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('💥 Unhandled Rejection:', err);
  process.exit(1);
});
