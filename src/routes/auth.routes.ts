import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', (_req: Request, res: Response) => {
  // TODO: implement — register new customer account
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/auth/login
router.post('/login', (_req: Request, res: Response) => {
  // TODO: implement — return accessToken + refreshToken
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/auth/logout  [auth required]
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — invalidate refresh token
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/auth/refresh-token
router.post('/refresh-token', (_req: Request, res: Response) => {
  // TODO: implement — issue new accessToken from refreshToken
  res.status(501).json({ success: false, message: 'Not implemented' });
});

// POST /api/v1/auth/register-staff  [ADMIN only]
router.post('/register-staff', authenticate, (_req: Request, res: Response) => {
  // TODO: implement — ADMIN creates STAFF or ADMIN account
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export default router;
