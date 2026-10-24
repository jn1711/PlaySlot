import { Router } from 'express';
import { store } from '../store.js';

export const homeRouter = Router();

// GET /api/home
homeRouter.get('/', (_req, res) => {
  const featuredCourts = Array.from(store.courts.values())
    .filter((c) => c.status === 'APPROVED')
    .sort((a, b) => {
      const cityCmp = a.city.localeCompare(b.city);
      if (cityCmp !== 0) return cityCmp;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      name: c.name,
      sportType: c.sportType,
      city: c.city,
      district: c.district || null,
      latitude: c.latitude || null,
      longitude: c.longitude || null,
      address: c.address,
      description: c.description || null,
      hourlyPrice: c.hourlyPrice,
      openingTime: c.openingTime,
      closingTime: c.closingTime,
      photoUrls: c.photoUrls,
      amenities: c.amenities,
      status: c.status,
    }));

  const now = new Date();
  const upcomingGames = Array.from(store.games.values())
    .filter((g) => g.status === 'APPROVED' && new Date(g.startsAt) > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 6)
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
    name: 'PlaySlot',
    headline: 'Спорт алаңын оңай тап және бронда',
    tagline: 'Команда тап, ойын ұйымдастыр',
    featuredCourts,
    upcomingGames,
  });
});
