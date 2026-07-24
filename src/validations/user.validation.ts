import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string({
      message: 'Name is required',
    }).min(2, 'Name must be at least 2 characters'),
    
    email: z.string({
      message: 'Email is required',
    }).email('Invalid email address'),
    
    password: z.string({
      message: 'Password is required',
    }).min(6, 'Password must be at least 6 characters'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string({
      message: 'Email is required',
    }).email('Invalid email address'),
    
    password: z.string({
      message: 'Password is required',
    }),
  }),
});

export const deviceTokenSchema = z.object({
  body: z.object({
    fcmToken: z.string().min(10).max(300),
    platform: z.enum(['android', 'ios']),
  }),
});

export const removeDeviceTokenSchema = z.object({
  body: z.object({
    fcmToken: z.string().min(10).max(300),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DeviceTokenInput = z.infer<typeof deviceTokenSchema>;
