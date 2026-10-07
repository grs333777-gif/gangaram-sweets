import { z } from 'zod';

const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ''))
  .refine(
    (v) => /^(\+91)?[6-9]\d{9}$/.test(v),
    'Phone must be a valid Indian mobile number',
  );

const indianPincode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Pincode must be a 6-digit number');

export const createAddressSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: indianPhone,
  addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().trim().max(255).optional(),
  landmark: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: indianPincode,
  country: z.string().trim().default('India'),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();
