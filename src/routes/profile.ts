import { Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { store } from '../store.js';

export const profileRouter = Router();

// GET /api/profile
profileRouter.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;

  const userBookings = Array.from(store.bookings.values())
    .filter((b) => b.userId === user.id)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    .map((b) => {
      const court = store.courts.get(b.courtId);
      return {
        id: b.id,
        courtId: b.courtId,
        courtName: court ? court.name : 'Белгісіз алаң',
        userId: b.userId,
        userName: user.fullName,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        status: b.status,
      };
    });

  const userGames = Array.from(store.games.values())
    .filter((g) => g.participantIds.includes(user.id))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    .map((g) => {
      const court = store.courts.get(g.courtId);
      const participants = g.participantIds
        .map((pid) => store.getUserById(pid))
        .filter(Boolean)
        .map((u) => ({ id: u!.id, fullName: u!.fullName }));

      return {
        id: g.id,
        courtId: g.courtId,
        courtName: court ? court.name : 'Белгісіз алаң',
        sportType: g.sportType,
        startsAt: g.startsAt,
        maxPlayers: g.maxPlayers,
        currentPlayers: g.participantIds.length,
        description: g.description,
        status: g.status,
        participants,
      };
    });

  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    bookings: userBookings,
    games: userGames,
  });
});

// PUT /api/profile
profileRouter.put('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const { fullName } = req.body || {};
  const trimmed = typeof fullName === 'string' ? fullName.trim() : '';

  if (!trimmed || trimmed.length > 150) {
    res.status(400).json({ error: 'Аты-жөніңізді дұрыс енгізіңіз' });
    return;
  }

  const user = req.user!;
  user.fullName = trimmed;

  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  });
});
