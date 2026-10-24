import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { store } from '../store.js';
import { Game, SportType } from '../types.js';

export const gamesRouter = Router();

function formatGameView(game: Game) {
  const court = store.courts.get(game.courtId);
  const participants = game.participantIds
    .map((id) => store.getUserById(id))
    .filter(Boolean)
    .map((u) => ({ id: u!.id, fullName: u!.fullName }));

  return {
    id: game.id,
    courtId: game.courtId,
    courtName: court ? court.name : 'Белгісіз алаң',
    sportType: game.sportType,
    startsAt: game.startsAt,
    maxPlayers: game.maxPlayers,
    currentPlayers: game.participantIds.length,
    description: game.description || null,
    status: game.status,
    participants,
  };
}

// GET /api/games
gamesRouter.get('/', (_req, res) => {
  const now = new Date();
  const upcoming = Array.from(store.games.values())
    .filter((g) => g.status === 'APPROVED' && new Date(g.startsAt) > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .map(formatGameView);

  res.json(upcoming);
});

// POST /api/games
gamesRouter.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const { courtId, sportType, startsAt, maxPlayers, description } = req.body || {};
  const numPlayers = Number(maxPlayers);

  if (
    !courtId ||
    !sportType ||
    !startsAt ||
    isNaN(numPlayers) ||
    numPlayers < 2 ||
    numPlayers > 100 ||
    (description && String(description).length > 10000)
  ) {
    res.status(400).json({ error: 'Ойын деректері қате' });
    return;
  }

  const startDate = new Date(startsAt);
  if (isNaN(startDate.getTime()) || startDate <= new Date()) {
    res.status(400).json({ error: 'Ойын деректері қате' });
    return;
  }

  const court = store.courts.get(courtId);
  if (!court || court.status !== 'APPROVED') {
    res.status(404).json({ error: 'Алаң табылмады' });
    return;
  }

  if (court.sportType !== (sportType as SportType)) {
    res.status(400).json({ error: 'Ойын түрі алаңға сәйкес емес' });
    return;
  }

  const user = req.user!;
  const newGame: Game = {
    id: uuidv4(),
    organizerId: user.id,
    courtId,
    sportType: sportType as SportType,
    startsAt: startDate.toISOString(),
    maxPlayers: numPlayers,
    description: description ? String(description).trim() : null,
    status: 'APPROVED', // Default approved for ease of play, or PENDING if admin moderation
    participantIds: [user.id],
  };

  store.games.set(newGame.id, newGame);
  res.status(201).json(formatGameView(newGame));
});

// POST /api/games/:id/join
gamesRouter.post('/:id/join', requireAuth, (req: AuthenticatedRequest, res) => {
  const game = store.games.get(req.params.id);
  if (!game || game.status !== 'APPROVED') {
    res.status(404).json({ error: 'Ойын табылмады' });
    return;
  }

  if (new Date(game.startsAt) <= new Date()) {
    res.status(409).json({ error: 'Бұл ойын басталып кеткен' });
    return;
  }

  const user = req.user!;
  if (!game.participantIds.includes(user.id)) {
    if (game.participantIds.length >= game.maxPlayers) {
      res.status(409).json({ error: 'Ойынға бос орын жоқ' });
      return;
    }
    game.participantIds.push(user.id);
  }

  res.json(formatGameView(game));
});

// POST /api/games/:id/leave
gamesRouter.post('/:id/leave', requireAuth, (req: AuthenticatedRequest, res) => {
  const game = store.games.get(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'Ойын табылмады' });
    return;
  }

  const user = req.user!;
  if (game.organizerId !== user.id) {
    game.participantIds = game.participantIds.filter((id) => id !== user.id);
  }

  res.json(formatGameView(game));
});
