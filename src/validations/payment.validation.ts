import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const createOrderSchema = z.object({
  body: z.object({
    tierId: objectId,
  }),
});

export const orderCodeParamSchema = z.object({
  params: z.object({
    orderCode: z.string().regex(/^\d+$/, 'orderCode must be a number'),
  }),
});
