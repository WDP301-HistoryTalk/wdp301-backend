import { z } from 'zod';
import { UserRole } from '../types/enums';

export const registerSchema = z.object({
  body: z
    .object({
      userName: z.string().min(2, 'Username must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Google ID token is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Reset token is required'),
  }),
  body: z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const registerContentAdminSchema = z.object({
  body: z
    .object({
      userName: z.string().min(2, 'Username must be at least 2 characters'),
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      confirmPassword: z.string().min(1, 'Please confirm your password'),
      roleName: z.enum([UserRole.ContentAdmin, UserRole.SystemAdmin]),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});
