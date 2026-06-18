import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { status: 'error', message: 'Too many requests, please slow down.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { status: 'error', message: 'Too many auth attempts, please try again later.' },
});

// Throttles checkout-link creation so a user can't spam PayOS / pile up pending
// orders. Keyed per authenticated user (falls back to IP for safety).
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip || 'anonymous'),
  message: { status: 'error', message: 'Too many payment requests, please slow down.' },
});
