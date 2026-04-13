import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { PrismaClient } = require('@prisma/client');

// Use the pgbouncer=false mode for schema operations
// The DATABASE_URL needs pgbouncer=false and statement_cache_size=0 for Prisma migrations
const dbUrl = process.env.DATABASE_URL + '?pgbouncer=false&statement_cache_size=0';
const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl }
  }
});

// Run individual statements sequentially
async function runSQL(sql, label) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('OK:', label);
    return true;
  } catch (e) {
    const msg = e.message || String(e);
    if (msg.includes('already exists')) {
      console.log('SKIP (exists):', label);
      return true;
    }
    console.warn('FAIL:', label, '->', msg.substring(0, 120));
    return false;
  }
}

try {
  await prisma.$connect();
  console.log('Connected OK\n');

  // Create enums one at a time  
  await runSQL(`CREATE TYPE IF NOT EXISTS "UserRole" AS ENUM ('SEEKER', 'RECRUITER', 'ADMIN')`, 'UserRole enum');
  await runSQL(`CREATE TYPE IF NOT EXISTS "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'REMOTE', 'RESEARCH')`, 'JobType enum');
  await runSQL(`CREATE TYPE IF NOT EXISTS "JobSource" AS ENUM ('AFRIWORK', 'ETHIOJOBS', 'SHEGA', 'HUGGINGFACE', 'INTERNAL')`, 'JobSource enum');

  await runSQL(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    role TEXT NOT NULL DEFAULT 'SEEKER',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`, 'users table');

  await runSQL(`CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE(provider, "providerAccountId")
  )`, 'accounts table');

  await runSQL(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL
  )`, 'sessions table');

  await runSQL(`CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    UNIQUE(identifier, token)
  )`, 'verification_tokens table');

  await runSQL(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'FULL_TIME',
    salary TEXT,
    description TEXT NOT NULL,
    skills TEXT[] NOT NULL DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'INTERNAL',
    category TEXT,
    experience TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "postedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "postedById" TEXT REFERENCES users(id)
  )`, 'jobs table');

  await runSQL(`CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT,
    "parsedText" TEXT,
    skills TEXT[] NOT NULL DEFAULT '{}',
    "experienceYears" INTEGER,
    "targetRole" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`, 'resumes table');

  await runSQL(`CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "resumeId" TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    "jobId" TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    rank INTEGER,
    "matchedSkills" TEXT[] NOT NULL DEFAULT '{}',
    "missingSkills" TEXT[] NOT NULL DEFAULT '{}',
    explanation TEXT,
    "computedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("resumeId", "jobId")
  )`, 'matches table');

  await runSQL(`CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    "jobId" TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "applicantName" TEXT NOT NULL,
    email TEXT NOT NULL,
    "resumeURL" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("jobId", "userId")
  )`, 'applications table');

  // Disable RLS
  for (const t of ['users', 'jobs', 'resumes', 'matches', 'applications', 'accounts', 'sessions', 'verification_tokens']) {
    await runSQL(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`, `disable RLS on ${t}`);
  }

  // Verify
  console.log('\n--- Verification ---');
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('users','jobs','resumes','matches','applications','accounts','sessions','verification_tokens')
    ORDER BY table_name
  `);
  console.log('Tables:', tables.map(t => t.table_name).join(', '));

  const counts = {};
  for (const model of ['user', 'job', 'resume', 'match']) {
    counts[model] = await prisma[model].count().catch(e => `ERR: ${e.message.substring(0, 50)}`);
  }
  console.log('Counts:', JSON.stringify(counts));
  
  console.log('\n✅ Schema bootstrap complete!');
} catch (e) {
  console.error('Fatal error:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
