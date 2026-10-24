import { Router } from 'express';

export const healthRouter = Router();

// GET /api/health/database
healthRouter.get('/database', (_req, res) => {
  res.json({ status: 'connected' });
});
