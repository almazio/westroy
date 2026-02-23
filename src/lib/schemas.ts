// ============================================
// WESTROY — API Validation Schemas (Zod)
// ============================================

import { z } from 'zod';

// --- Shared ---

const phoneSchema = z.string().min(5).max(30);
const emailSchema = z.string().email();

// --- Requests ---

export const RequestCreateSchema = z.object({
    categoryId: z.string().min(1),
    query: z.string().min(1).max(2000),
    parsedCategory: z.string().min(1),
    parsedVolume: z.string().max(100).optional().nullable(),
    parsedCity: z.string().max(100).optional().nullable(),
    deliveryNeeded: z.boolean().optional().default(false),
    address: z.string().max(500).optional().nullable(),
    deadline: z.string().max(50).optional().nullable(),
});

// --- Offers ---

export const OfferCreateSchema = z.object({
    requestId: z.string().min(1),
    companyId: z.string().optional(),
    price: z.number().positive(),
    priceUnit: z.string().max(50).optional().default('за м³'),
    comment: z.string().max(2000).optional().default(''),
    deliveryIncluded: z.boolean().optional().default(false),
    deliveryPrice: z.number().min(0).optional().nullable(),
    validUntil: z.string().max(50).optional(),
});

export const OfferStatusSchema = z.object({
    status: z.enum(['accepted', 'rejected']),
});

// --- Users ---

const roleSchema = z.enum(['client', 'producer', 'admin']);

export const UserCreateSchema = z.object({
    name: z.string().min(1).max(200).transform(s => s.trim()),
    email: emailSchema.transform(s => s.trim().toLowerCase()),
    phone: phoneSchema.transform(s => s.trim()),
    password: z.string().min(6).max(128),
    role: roleSchema.optional().default('client'),
});

export const UserUpdateSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    phone: phoneSchema.optional(),
    role: roleSchema.optional(),
    password: z.string().min(6).max(128).optional(),
});

// --- Companies ---

export const CompanyCreateSchema = z.object({
    name: z.string().min(1).max(300),
    description: z.string().max(5000).optional().default(''),
    categoryId: z.string().min(1),
    regionId: z.string().min(1),
    address: z.string().max(500),
    phone: phoneSchema,
    delivery: z.boolean().optional().default(false),
    ownerId: z.string().optional().nullable(),
});

export const CompanyUpdateSchema = z.object({
    name: z.string().min(1).max(300).optional(),
    description: z.string().max(5000).optional(),
    phone: phoneSchema.optional(),
    address: z.string().max(500).optional(),
    delivery: z.boolean().optional(),
});

// --- Products ---

export const ProductCreateSchema = z.object({
    name: z.string().min(1).max(500),
    description: z.string().max(5000).optional().default(''),
    categoryId: z.string().min(1),
    article: z.string().max(100).optional().nullable(),
    brand: z.string().max(200).optional().nullable(),
    boxQuantity: z.number().int().positive().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    source: z.string().max(1000).optional().nullable(),
    specsJson: z.string().optional().nullable(),
    unit: z.string().min(1).max(50),
    priceFrom: z.number().min(0),
    priceUnit: z.string().min(1).max(50),
    inStock: z.boolean().optional().default(true),
});

// --- Guest Requests ---

export const GuestRequestSchema = z.object({
    name: z.string().min(1).max(200),
    phone: phoneSchema,
    query: z.string().min(1).max(2000),
    quantity: z.string().max(100).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    companyName: z.string().max(300).optional().nullable(),
    productName: z.string().max(500).optional().nullable(),
    sellerName: z.string().max(300).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
});

// --- Partner Applications ---

export const PartnerApplicationSchema = z.object({
    name: z.string().min(1).max(200),
    email: emailSchema,
    phone: phoneSchema,
    companyName: z.string().min(1).max(300),
    category: z.string().min(1).max(100),
    city: z.string().min(1).max(100),
    message: z.string().max(2000).optional().nullable(),
});

export const PartnerApplicationStatusSchema = z.object({
    status: z.enum(['approved', 'rejected']),
});

// --- Helper ---

export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(data);
    if (result.success) return { success: true, data: result.data };
    const messages = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { success: false, error: messages };
}
