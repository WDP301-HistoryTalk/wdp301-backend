import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as { body?: unknown; query?: typeof req.query; params?: typeof req.params };

      req.body = parsed.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};
