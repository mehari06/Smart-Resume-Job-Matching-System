// Prisma client singleton — prevents too many connections in dev (hot reload)
// Uncomment imports once DATABASE_URL is configured in .env.local

// import { PrismaClient } from "@prisma/client";

// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClient | undefined;
// };

// export const db =
//   globalForPrisma.prisma ??
//   new PrismaClient({
//     log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
//   });

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// ─────────────────────────────────────────────────────────────────────────────
// Temporary stub so API routes compile without a real DB connection
// Remove this and uncomment above when Supabase DATABASE_URL is configured
// ─────────────────────────────────────────────────────────────────────────────
export const db = null;
