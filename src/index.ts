import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { authMiddleware } from './middleware/auth.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { bookingsRouter, ownerBookingsHandler } from './routes/bookings.js';
import { courtsRouter } from './routes/courts.js';
import { gamesRouter } from './routes/games.js';
import { healthRouter } from './routes/health.js';
import { homeRouter } from './routes/home.js';
import { ownerRouter } from './routes/owner.js';
import { profileRouter } from './routes/profile.js';
import { teamsRouter } from './routes/teams.js';
import { renderHtmlDashboard } from './ui.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware);

// Endpoints list matching Spring Boot ApiController
const API_ENDPOINTS = [
  '/api/auth/csrf',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/courts',
  '/api/home',
  '/api/bookings',
  '/api/games',
  '/api/teams',
  '/api/profile',
  '/api/owner/courts',
  '/api/admin',
  '/api/health/database',
];

// Routes
app.use('/api/auth', authRouter);
app.use('/api/courts', courtsRouter);
app.use('/api/bookings', bookingsRouter);
app.get('/api/owner/bookings', ...ownerBookingsHandler);
app.use('/api/games', gamesRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/owner/courts', ownerRouter);
app.use('/api/admin', adminRouter);
app.use('/api/home', homeRouter);
app.use('/api/health', healthRouter);

// Root endpoint: API Info & Interactive UI
app.get('/', (req: Request, res: Response) => {
  const acceptsHtml = req.accepts(['json', 'html']) === 'html';
  if (acceptsHtml) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderHtmlDashboard(API_ENDPOINTS));
    return;
  }
  res.json({
    name: 'PlaySlot API',
    endpoints: API_ENDPOINTS,
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[PlaySlot] Server running at http://${HOST}:${PORT}`);
});
