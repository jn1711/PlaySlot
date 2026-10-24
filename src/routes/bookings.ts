import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { store } from '../store.js';
import { Booking, BookingStatus } from '../types.js';

export const bookingsRouter = Router();

function formatBookingView(booking: Booking) {
  const court = store.courts.get(booking.courtId);
  const user = store.getUserById(booking.userId);
  return {
    id: booking.id,
    courtId: booking.courtId,
    courtName: court ? court.name : 'Белгісіз алаң',
    userId: booking.userId,
    userName: user ? user.fullName : 'Белгісіз',
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    status: booking.status,
  };
}

// POST /api/bookings
bookingsRouter.post(
  '/',
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (user.role !== 'PLAYER' && user.role !== 'OWNER') {
      res.status(403).json({ error: 'Брондауға рұқсат жоқ' });
      return;
    }

    const { courtId, startsAt, endsAt } = req.body || {};
    if (!courtId || !startsAt || !endsAt) {
      res.status(400).json({ error: 'Брондау уақыты қате' });
      return;
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);
    const now = new Date();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate <= now || endDate <= startDate) {
      res.status(400).json({ error: 'Брондау уақыты қате' });
      return;
    }

    const court = store.courts.get(courtId);
    if (!court || court.status !== 'APPROVED') {
      res.status(404).json({ error: 'Алаң табылмады' });
      return;
    }

    // Check same date
    const startDayStr = startDate.toISOString().slice(0, 10);
    const endDayStr = endDate.toISOString().slice(0, 10);
    if (startDayStr !== endDayStr) {
      res.status(400).json({ error: 'Уақыт алаңның жұмыс кестесінен тыс' });
      return;
    }

    // Check operating hours
    const startTimeStr = startDate.toTimeString().slice(0, 8); // HH:mm:ss
    const endTimeStr = endDate.toTimeString().slice(0, 8);

    if (startTimeStr < court.openingTime || endTimeStr > court.closingTime) {
      res.status(400).json({ error: 'Уақыт алаңның жұмыс кестесінен тыс' });
      return;
    }

    // Check overlaps
    const hasOverlap = Array.from(store.bookings.values()).some((b) => {
      if (b.courtId !== courtId) return false;
      if (b.status !== 'PENDING' && b.status !== 'CONFIRMED') return false;
      const bStart = new Date(b.startsAt);
      const bEnd = new Date(b.endsAt);
      return startDate < bEnd && endDate > bStart;
    });

    if (hasOverlap) {
      res.status(409).json({ error: 'Бұл уақыт бос емес' });
      return;
    }

    const newBooking: Booking = {
      id: uuidv4(),
      userId: user.id,
      courtId,
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
      status: 'PENDING',
    };

    store.bookings.set(newBooking.id, newBooking);

    res.status(201).json(formatBookingView(newBooking));
  }
);

// GET /api/bookings/mine
bookingsRouter.get('/mine', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const myBookings = Array.from(store.bookings.values())
    .filter((b) => b.userId === user.id)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    .map(formatBookingView);

  res.json(myBookings);
});

// PUT /api/bookings/:id/status
bookingsRouter.put('/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
  const booking = store.bookings.get(req.params.id);
  if (!booking) {
    res.status(404).json({ error: 'Брондау табылмады' });
    return;
  }

  const court = store.courts.get(booking.courtId);
  const user = req.user!;
  const isOwner = court ? court.ownerId === user.id : false;
  const isAdmin = user.role === 'ADMIN';
  const isPlayer = booking.userId === user.id;

  if (!isOwner && !isAdmin && !isPlayer) {
    res.status(403).json({ error: 'Брондауды өзгертуге рұқсат жоқ' });
    return;
  }

  const newStatus = req.body?.status as BookingStatus | undefined;
  if (!newStatus) {
    res.status(400).json({ error: 'Брондау күйі қажет' });
    return;
  }

  if (isPlayer && !isOwner && !isAdmin && newStatus !== 'CANCELLED') {
    res.status(403).json({ error: 'Пайдаланушы тек брондауды болдырмай алады' });
    return;
  }

  if (isOwner && !isAdmin) {
    if (newStatus !== 'CONFIRMED' && newStatus !== 'CANCELLED' && newStatus !== 'COMPLETED') {
      res.status(400).json({ error: 'Бұл брондау күйіне ауысу мүмкін емес' });
      return;
    }
    if (newStatus === 'CONFIRMED' && booking.status !== 'PENDING') {
      res.status(409).json({ error: 'Тек жаңа брондауды растауға болады' });
      return;
    }
    if (newStatus === 'COMPLETED') {
      if (booking.status !== 'CONFIRMED' || new Date(booking.endsAt) > new Date()) {
        res.status(409).json({ error: 'Аяқталмаған брондауды жабуға болмайды' });
        return;
      }
    }
  }

  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
    res.status(409).json({ error: 'Брондау жабылған' });
    return;
  }

  booking.status = newStatus;
  res.json(formatBookingView(booking));
});

// GET /api/owner/bookings
export const ownerBookingsHandler = [
  requireAuth,
  requireRole('OWNER'),
  (req: AuthenticatedRequest, res: any) => {
    const ownerId = req.user!.id;
    const ownerCourts = new Set(
      Array.from(store.courts.values())
        .filter((c) => c.ownerId === ownerId)
        .map((c) => c.id)
    );

    const ownerBookings = Array.from(store.bookings.values())
      .filter((b) => ownerCourts.has(b.courtId))
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
      .map(formatBookingView);

    res.json(ownerBookings);
  },
];
