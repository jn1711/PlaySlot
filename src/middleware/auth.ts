import { NextFunction, Request, Response } from 'express';
import { store } from '../store.js';
import { User, UserRole } from '../types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.playslot_session) {
    token = req.cookies.playslot_session;
  }

  if (token) {
    const user = store.getSessionUser(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    res.status(401).json({ error: 'Кіру қажет' });
    return;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Кіру қажет' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      if (roles.includes('ADMIN')) {
        res.status(403).json({ error: 'Әкімші рұқсаты қажет' });
      } else if (roles.includes('OWNER')) {
        res.status(403).json({ error: 'Иесіне рұқсат қажет' });
      } else {
        res.status(403).json({ error: 'Рұқсат жоқ' });
      }
      return;
    }
    next();
  };
}
