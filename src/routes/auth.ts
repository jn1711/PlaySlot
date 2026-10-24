import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { store } from '../store.js';
import { User, UserRole } from '../types.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authRouter = Router();

// GET /api/auth/csrf
authRouter.get('/csrf', (_req, res) => {
  const token = uuidv4();
  res.setHeader('Cache-Control', 'no-store');
  res.cookie('XSRF-TOKEN', token, { httpOnly: false, sameSite: 'lax', path: '/' });
  res.status(204).end();
});

// POST /api/auth/register
authRouter.post('/register', (req, res) => {
  const { fullName, email, password, role: rawRole } = req.body || {};

  if (!req.body) {
    res.status(400).json({ error: 'Тіркелу деректері қажет' });
    return;
  }

  const trimmedName = typeof fullName === 'string' ? fullName.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const trimmedPassword = typeof password === 'string' ? password : '';

  let role: UserRole = 'PLAYER';
  if (rawRole) {
    const candidate = String(rawRole).trim().toUpperCase();
    if (candidate === 'PLAYER' || candidate === 'OWNER') {
      role = candidate as UserRole;
    } else if (candidate === 'ADMIN') {
      res.status(400).json({ error: 'Әкімші рөлін өздігінен тіркеуге болмайды' });
      return;
    } else {
      res.status(400).json({ error: 'Рөл PLAYER немесе OWNER болуы керек' });
      return;
    }
  }

  if (!trimmedName || trimmedName.length > 150) {
    res.status(400).json({ error: 'Аты-жөніңізді енгізіңіз (150 таңбаға дейін)' });
    return;
  }

  if (trimmedEmail.length > 254 || !EMAIL_PATTERN.test(trimmedEmail)) {
    res.status(400).json({ error: 'Дұрыс электрондық пошта мекенжайын енгізіңіз' });
    return;
  }

  const pwByteLen = Buffer.byteLength(trimmedPassword, 'utf8');
  if (trimmedPassword.length < 8 || pwByteLen > 72) {
    res.status(400).json({
      error: 'Құпиясөз 8 таңбадан кем болмауы және 72 байттан аспауы керек',
    });
    return;
  }

  if (store.getUserByEmail(trimmedEmail)) {
    res.status(409).json({ error: 'Бұл электрондық пошта тіркелген' });
    return;
  }

  const passwordHash = bcrypt.hashSync(trimmedPassword, 10);
  const newUser: User = {
    id: uuidv4(),
    fullName: trimmedName,
    email: trimmedEmail,
    passwordHash,
    role,
  };

  store.users.set(newUser.id, newUser);

  res.status(201).json({
    fullName: newUser.fullName,
    email: newUser.email,
    role: newUser.role,
  });
});

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const trimmedPassword = typeof password === 'string' ? password : '';

  if (!trimmedEmail || !trimmedPassword) {
    res.status(400).json({ error: 'Пошта мен құпиясөзді енгізіңіз' });
    return;
  }

  const user = store.getUserByEmail(trimmedEmail);
  if (!user || !bcrypt.compareSync(trimmedPassword, user.passwordHash)) {
    res.status(401).json({ error: 'Пошта немесе құпиясөз қате' });
    return;
  }

  const token = store.createSession(user.id);
  res.cookie('playslot_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    token,
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers.authorization;
  let token = req.cookies?.playslot_session;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  store.deleteSession(token);
  res.clearCookie('playslot_session', { path: '/' });
  res.json({ status: 'logged_out' });
});

// GET /api/auth/me
authRouter.get('/me', (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Кіру қажет' });
    return;
  }
  res.json({
    fullName: req.user.fullName,
    email: req.user.email,
    role: req.user.role,
  });
});
