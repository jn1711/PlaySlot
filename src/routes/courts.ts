import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { store } from '../store.js';
import { Court, Review, SportType } from '../types.js';

export const courtsRouter = Router();

function formatCourtResponse(court: Court) {
  return {
    id: court.id,
    name: court.name,
    sportType: court.sportType,
    city: court.city,
    district: court.district || null,
    latitude: court.latitude || null,
    longitude: court.longitude || null,
    address: court.address,
    description: court.description || null,
    hourlyPrice: court.hourlyPrice,
    openingTime: court.openingTime,
    closingTime: court.closingTime,
    photoUrls: court.photoUrls,
    amenities: court.amenities,
    status: court.status,
  };
}

// GET /api/courts
courtsRouter.get('/', (req, res) => {
  const { city, district, sportType, minPrice, maxPrice, search } = req.query;

  const results = Array.from(store.courts.values())
    .filter((court) => court.status === 'APPROVED')
    .sort((a, b) => {
      const cityCmp = a.city.localeCompare(b.city);
      if (cityCmp !== 0) return cityCmp;
      return a.name.localeCompare(b.name);
    })
    .filter((court) => {
      if (city && typeof city === 'string') {
        if (court.city.toLowerCase() !== city.trim().toLowerCase()) return false;
      }
      if (district && typeof district === 'string') {
        if (!court.district || court.district.toLowerCase() !== district.trim().toLowerCase()) {
          return false;
        }
      }
      if (sportType && typeof sportType === 'string') {
        if (court.sportType !== (sportType.toUpperCase() as SportType)) return false;
      }
      if (minPrice !== undefined && minPrice !== '') {
        const min = Number(minPrice);
        if (!isNaN(min) && court.hourlyPrice < min) return false;
      }
      if (maxPrice !== undefined && maxPrice !== '') {
        const max = Number(maxPrice);
        if (!isNaN(max) && court.hourlyPrice > max) return false;
      }
      if (search && typeof search === 'string') {
        const term = search.trim().toLowerCase();
        const combined = `${court.name} ${court.address} ${court.city}`.toLowerCase();
        if (!combined.includes(term)) return false;
      }
      return true;
    });

  res.json(results.map(formatCourtResponse));
});

// GET /api/courts/:id
courtsRouter.get('/:id', (req, res) => {
  const court = store.courts.get(req.params.id);
  if (!court || court.status !== 'APPROVED') {
    res.status(404).json({ error: 'Алаң табылмады' });
    return;
  }
  res.json(formatCourtResponse(court));
});

// GET /api/courts/:courtId/availability?date=YYYY-MM-DD
courtsRouter.get('/:courtId/availability', (req, res) => {
  const { courtId } = req.params;
  const court = store.courts.get(courtId);
  if (!court || court.status !== 'APPROVED') {
    res.status(404).json({ error: 'Алаң табылмады' });
    return;
  }

  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'Күн параметрі қажет' });
    return;
  }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const activeBookings = Array.from(store.bookings.values())
    .filter((b) => b.courtId === courtId)
    .filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED')
    .filter((b) => {
      const start = new Date(b.startsAt);
      const end = new Date(b.endsAt);
      return start < dayEnd && end > dayStart;
    })
    .map((b) => ({
      bookingId: b.id,
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      status: b.status,
    }));

  res.json(activeBookings);
});

// GET /api/courts/:courtId/reviews
courtsRouter.get('/:courtId/reviews', (req, res) => {
  const { courtId } = req.params;
  const court = store.courts.get(courtId);
  if (!court) {
    res.status(404).json({ error: 'Алаң табылмады' });
    return;
  }

  const reviews = Array.from(store.reviews.values())
    .filter((r) => r.courtId === courtId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((r) => {
      const user = store.getUserById(r.userId);
      return {
        id: r.id,
        courtId: r.courtId,
        author: user ? user.fullName : 'Белгісіз пайдаланушы',
        rating: r.rating,
        comment: r.comment || null,
        createdAt: r.createdAt,
      };
    });

  res.json(reviews);
});

// GET /api/courts/:courtId/reviews/summary
courtsRouter.get('/:courtId/reviews/summary', (req, res) => {
  const { courtId } = req.params;
  const court = store.courts.get(courtId);
  if (!court) {
    res.status(404).json({ error: 'Алаң табылмады' });
    return;
  }

  const courtReviews = Array.from(store.reviews.values()).filter(
    (r) => r.courtId === courtId
  );
  const count = courtReviews.length;
  const averageRating =
    count > 0
      ? Number(
          (
            courtReviews.reduce((sum, r) => sum + r.rating, 0) / count
          ).toFixed(1)
        )
      : null;

  res.json({ averageRating, reviewCount: count });
});

// POST /api/courts/:courtId/reviews
courtsRouter.post('/:courtId/reviews', requireAuth, (req: AuthenticatedRequest, res) => {
  const { courtId } = req.params;
  const court = store.courts.get(courtId);
  if (!court) {
    res.status(404).json({ error: 'Алаң табылмады' });
    return;
  }

  const { rating, comment } = req.body || {};
  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5 || (comment && comment.length > 5000)) {
    res.status(400).json({ error: 'Пікір немесе рейтинг қате' });
    return;
  }

  const user = req.user!;
  // Check completed booking
  const hasCompleted = Array.from(store.bookings.values()).some(
    (b) => b.userId === user.id && b.courtId === courtId && b.status === 'COMPLETED'
  );

  if (!hasCompleted) {
    res.status(403).json({ error: 'Пікір қалдыру үшін брондау аяқталуы керек' });
    return;
  }

  // Check unique review per user + court
  const alreadyReviewed = Array.from(store.reviews.values()).some(
    (r) => r.userId === user.id && r.courtId === courtId
  );

  if (alreadyReviewed) {
    res.status(409).json({ error: 'Бұл алаңға пікір қалдырылған' });
    return;
  }

  const newReview: Review = {
    id: uuidv4(),
    userId: user.id,
    courtId,
    rating: numRating,
    comment: comment ? String(comment).trim() : null,
    createdAt: new Date().toISOString(),
  };

  store.reviews.set(newReview.id, newReview);

  res.status(201).json({
    id: newReview.id,
    courtId: newReview.courtId,
    author: user.fullName,
    rating: newReview.rating,
    comment: newReview.comment,
    createdAt: newReview.createdAt,
  });
});
