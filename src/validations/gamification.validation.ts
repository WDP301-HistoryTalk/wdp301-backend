import { z } from 'zod';

export const claimQuestSchema = z.object({
  body: z.object({
    questId: z
      .string({ message: 'questId is required' })
      .min(1, 'questId is required')
      .max(50, 'Invalid questId'),
  }),
});

export type ClaimQuestInput = z.infer<typeof claimQuestSchema>;
