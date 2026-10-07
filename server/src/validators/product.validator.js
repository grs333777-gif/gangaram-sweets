import { z } from 'zod';

const pricePaise = z
  .number()
  .int('Price must be an integer (in paise)')
  .nonnegative('Price cannot be negative');

const stock = z
  .number()
  .int('Stock must be an integer')
  .nonnegative('Stock cannot be negative');

const variantSchema = z.object({
  variantId: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1, 'Variant name required').max(100),
  pricePaise,
  stock,
  isActive: z.boolean().default(true),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name too short').max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().trim().max(2000).default(''),
  category: z.string().trim().min(1, 'Category is required').max(100),
  images: z.array(z.string().url()).default([]),
  variants: z.array(variantSchema).min(1, 'At least one variant required'),
  isActive: z.boolean().default(true),
  tags: z.array(z.string().trim().toLowerCase().max(50)).default([]),
  isVeg: z.boolean().default(true),
  isBestseller: z.boolean().default(false),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  images: z.array(z.string().url()).optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string().trim().toLowerCase().max(50)).optional(),
  isVeg: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
});

export const updateStockSchema = z.object({
  variantId: z.string().trim().min(1),
  stock,
});

export const updateVariantPriceSchema = z.object({
  variantId: z.string().trim().min(1),
  pricePaise,
});

export const updateVariantStatusSchema = z.object({
  variantId: z.string().trim().min(1),
  isActive: z.boolean(),
});

export const addVariantSchema = variantSchema;

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().optional(),
  search: z.string().trim().max(200).optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'priceLow', 'priceHigh', 'popularity'])
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  tags: z.string().trim().optional(),
});
