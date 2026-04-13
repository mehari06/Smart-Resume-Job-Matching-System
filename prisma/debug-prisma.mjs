// prisma/debug-prisma.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_')));
process.exit(0);
