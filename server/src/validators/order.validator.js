import { z } from 'zod';
import { PAYMENT_METHOD, DELIVERY_TYPE } from '../constants/index.js';

export const addCartItemSchema = z.object({
  productId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid productId'),
  variantId: z.string().trim().min(1, 'variantId is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
});

export const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
});

const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ''))
  .refine(
    (v) => /^(\+91)?[6-9]\d{9}$/.test(v),
    'Phone must be a valid Indian mobile number',
  );

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productKey: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .max(50)
    .optional(),
  paymentMethod: z.enum(Object.values(PAYMENT_METHOD), {
    errorMap: () => ({ message: `paymentMethod must be one of: ${Object.values(PAYMENT_METHOD).join(', ')}` }),
  }),
  deliveryType: z.enum(Object.values(DELIVERY_TYPE)).default(DELIVERY_TYPE.DELIVERY),
  shippingAddress: z
    .object({
      name: z.string().trim().min(1, 'Name required').max(100),
      phone: indianPhone,
      addressLine1: z.string().trim().min(1, 'Address required').max(255),
      addressLine2: z.string().trim().max(255).optional(),
      landmark: z.string().trim().max(200).optional(),
      city: z.string().trim().max(100).optional(),
      state: z.string().trim().max(100).optional(),
      pincode: z.string().trim().optional(),
      country: z.string().trim().default('India'),
    })
    .optional(),
  giftMessage: z.string().trim().max(500).optional(),
  timeSlot: z.enum(['anytime', 'morning', 'afternoon', 'evening']).default('anytime'),
  notes: z.string().trim().max(500).optional(),
  // Explicitly ignore any client-provided price fields
}).strip();

export const adminOrderStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  note: z.string().trim().max(500).optional(),
});

export const adminOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
  userId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(4, 'Enter the order ID').max(40),
  phone: z.string().trim().min(10, 'Enter the phone number used for the order').max(20),
});

export const customerOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
});
