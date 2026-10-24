import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { store } from '../store.js';
import { CourtStatus, GameStatus, UserRole } from '../types.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

// GET /api/admin/courts?status=PENDING
adminRouter.get('/courts', (req, res) => {
  const status = (req.query.status as CourtStatus) || 'PENDING';
  const courts = Array.from(store.courts.values())
    .filter((c) => c.status === status)
    .sort((a, b) => {
      const cityCmp = a.city.localeCompare(b.city);
      if (cityCmp !== 0) return cityCmp;
      return a.name.localeCompare(b.name);
    });

  res.json(courts);
});

// PATCH /api/admin/courts/:id/status
adminRouter.patch('/courts/:id/status', (req, res) => {
  const court = store.courts.get(req.params.id);
  if (!court) {
    res.status(404).json({ error: 'Алаң табылмады' });
    return;
  }

  const { status } = req.body || {};
  if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
    res.status(400).json({ error: 'Алаң күйі APPROVED немесе REJECTED болуы керек' });
    return;
  }

  court.status = status;
  res.json(court);
});

// GET /api/admin/bookings
adminRouter.get('/bookings', (_req, res) => {
  const bookings = Array.from(store.bookings.values())
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    .map((b) => {
      const court = store.courts.get(b.courtId);
      const user = store.getUserById(b.userId);
      return {
        id: b.id,
        courtId: b.courtId,
        courtName: court ? court.name : 'Белгісіз алаң',
        userId: b.userId,
        userName: user ? user.fullName : 'Белгісіз',
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        status: b.status,
      };
    });

  res.json(bookings);
});

// GET /api/admin/games?status=PENDING
adminRouter.get('/games', (req, res) => {
  const status = (req.query.status as GameStatus) || 'PENDING';
  const games = Array.from(store.games.values())
    .filter((g) => g.status === status)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
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

  res.json(games);
});

// PATCH /api/admin/games/:id/status
adminRouter.patch('/games/:id/status', (req, res) => {
  const game = store.games.get(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'Ойын табылмады' });
    return;
  }

  const { status } = req.body || {};
  if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
    res.status(400).json({ error: 'Ойын күйі APPROVED немесе REJECTED болуы керек' });
    return;
  }

  game.status = status;
  res.json(game);
});

// GET /api/admin/users
adminRouter.get('/users', (_req, res) => {
  const users = Array.from(store.users.values()).map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
  }));

  res.json(users);
});

// PATCH /api/admin/users/:id/role
adminRouter.patch('/users/:id/role', (req: AuthenticatedRequest, res) => {
  const user = store.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Пайдаланушы табылмады' });
    return;
  }

  const { role } = req.body || {};
  const currentAdmin = req.user!;

  if (
    !role ||
    role === 'ADMIN' ||
    (role !== 'PLAYER' && role !== 'OWNER') ||
    user.email.toLowerCase() === currentAdmin.email.toLowerCase()
  ) {
    res.status(400).json({
      error: 'Рөл PLAYER немесе OWNER болуы керек; өз рөліңізді өзгертуге болмайды',
    });
    return;
  }

  user.role = role as UserRole;
  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  });
});

// GET /api/admin/summary
adminRouter.get('/summary', (_req, res) => {
  const allCourts = Array.from(store.courts.values());
  const statuses: CourtStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

  const courtsByStatus = statuses.map((status) => ({
    status,
    count: allCourts.filter((c) => c.status === status).length,
  }));

  res.json({
    users: store.users.size,
    courts: store.courts.size,
    bookings: store.bookings.size,
    games: store.games.size,
    courtsByStatus,
  });
});
