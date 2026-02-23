// ============================================
// WESTROY — Database Barrel Export
// ============================================
// Re-exports everything so `import { prisma, getCompanies } from '@/lib/db'`
// still works after the split.

export { prisma } from '../db';

// Domain modules
export * from './categories';
export * from './companies';
export * from './users';
export * from './requests';
export * from './offers';
export * from './mappers';
