// fix-schema.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const sql = `
CREATE TABLE IF NOT EXISTS "applications" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "resumeURL" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "applications_jobId_userId_key" ON "applications"("jobId", "userId");

-- Use try-catch for foreign keys in case they already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_jobId_fkey') THEN
        ALTER TABLE "applications" ADD CONSTRAINT "applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_userId_fkey') THEN
        ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
`;

async function main() {
    console.log('--- Manually Creating Applications Table ---');
    try {
        // Splitting into statements because $executeRaw sometimes struggles with multiple commands
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const s of statements) {
            await prisma.$executeRawUnsafe(s);
            console.log('Executed statement successfully.');
        }
        console.log('✅ Success! Applications table is ready.');
    } catch (err) {
        console.error('❌ Error creating table:', err.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
