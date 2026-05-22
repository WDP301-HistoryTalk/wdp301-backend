import rateLimit from 'express-rate-limit';

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
