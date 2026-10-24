import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { store } from '../store.js';
import { SportType, Team } from '../types.js';

export const teamsRouter = Router();

function formatTeamView(team: Team) {
  const members = team.memberIds
    .map((id) => store.getUserById(id))
    .filter(Boolean)
    .map((u) => ({ id: u!.id, fullName: u!.fullName }));

  return {
    id: team.id,
    name: team.name,
    sportType: team.sportType,
    description: team.description || null,
    captainId: team.captainId,
    members,
  };
}

// GET /api/teams
teamsRouter.get('/', (_req, res) => {
  const allTeams = Array.from(store.teams.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(formatTeamView);

  res.json(allTeams);
});

// GET /api/teams/mine
teamsRouter.get('/mine', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const myTeams = Array.from(store.teams.values())
    .filter((t) => t.memberIds.includes(user.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(formatTeamView);

  res.json(myTeams);
});

// POST /api/teams
teamsRouter.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const { name, sportType, description } = req.body || {};
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (
    !trimmedName ||
    trimmedName.length > 150 ||
    !sportType ||
    (description && String(description).length > 10000)
  ) {
    res.status(400).json({ error: 'Команда деректері қате' });
    return;
  }

  const user = req.user!;
  const newTeam: Team = {
    id: uuidv4(),
    name: trimmedName,
    sportType: sportType as SportType,
    description: description ? String(description).trim() : null,
    captainId: user.id,
    memberIds: [user.id],
  };

  store.teams.set(newTeam.id, newTeam);
  res.status(201).json(formatTeamView(newTeam));
});

// POST /api/teams/:id/join
teamsRouter.post('/:id/join', requireAuth, (req: AuthenticatedRequest, res) => {
  const team = store.teams.get(req.params.id);
  if (!team) {
    res.status(404).json({ error: 'Команда табылмады' });
    return;
  }

  const user = req.user!;
  if (!team.memberIds.includes(user.id)) {
    team.memberIds.push(user.id);
  }

  res.json(formatTeamView(team));
});

// POST /api/teams/:id/leave
teamsRouter.post('/:id/leave', requireAuth, (req: AuthenticatedRequest, res) => {
  const team = store.teams.get(req.params.id);
  if (!team) {
    res.status(404).json({ error: 'Команда табылмады' });
    return;
  }

  const user = req.user!;
  if (team.captainId !== user.id) {
    team.memberIds = team.memberIds.filter((id) => id !== user.id);
  }

  res.json(formatTeamView(team));
});
