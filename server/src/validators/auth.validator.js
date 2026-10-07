import { z } from 'zod';

const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ''))
  .refine(
    (v) => /^(\+91)?[6-9]\d{9}$/.test(v),
    'Phone must be a valid Indian mobile number',
  );

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine(
    (v) => /[A-Z]/.test(v),
    'Password must contain at least one uppercase letter',
  )
  .refine(
    (v) => /[a-z]/.test(v),
    'Password must contain at least one lowercase letter',
  )
  .refine(
    (v) => /\d/.test(v),
    'Password must contain at least one number',
  );

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name too short').max(100, 'Name too long'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  phone: indianPhone,
  password,
});

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().optional(),
    phone: indianPhone.optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine((data) => data.email || data.phone, {
    message: 'Email or phone is required',
    path: ['email'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address').optional(),
  phone: indianPhone.optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Email or phone is required',
  path: ['email'],
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password,
});

export const refreshTokenSchema = z.object({});
