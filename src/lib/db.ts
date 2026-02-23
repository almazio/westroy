
import { PrismaClient } from '@prisma/client';

// Compatibility bridge:
// - Vercel Supabase integration exposes POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING
// - local setups often use DATABASE_URL / DIRECT_URL
if (!process.env.POSTGRES_PRISMA_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_PRISMA_URL = process.env.DATABASE_URL;
}
if (!process.env.POSTGRES_URL_NON_POOLING && process.env.DIRECT_URL) {
    process.env.POSTGRES_URL_NON_POOLING = process.env.DIRECT_URL;
}

// Prisma Client Singleton for Next.js dev HMR
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================
// Re-export domain modules for backward compat
// `import { prisma, getCompanies } from '@/lib/db'` still works
// ============================================
export * from './db/categories';
export * from './db/companies';
export * from './db/users';
export * from './db/requests';
export * from './db/offers';
