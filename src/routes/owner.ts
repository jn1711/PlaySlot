import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { store } from '../store.js';
import { Court, CourtStatus, SportType } from '../types.js';

export const ownerRouter = Router();

ownerRouter.use(requireAuth, requireRole('OWNER'));

function formatCourtView(court: Court) {
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

function validateCourtRequest(data: any): string | null {
  if (!data) return 'Алаң деректері қате';
  const { name, sportType, city, address, hourlyPrice } = data;

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 150) {
    return 'Алаң деректері қате';
  }
  if (!sportType || !['FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'TENNIS'].includes(sportType)) {
    return 'Алаң деректері қате';
  }
  if (!city || typeof city !== 'string' || city.trim().length === 0 || city.trim().length > 100) {
    return 'Алаң деректері қате';
  }
  if (!address || typeof address !== 'string' || address.trim().length === 0 || address.trim().length > 255) {
    return 'Алаң деректері қате';
  }
  const price = Number(hourlyPrice);
  if (isNaN(price) || price <= 0 || price > 99999999.99) {
    return 'Алаң деректері қате';
  }
  if (data.district && String(data.district).length > 100) {
    return 'Алаң деректері қате';
  }
  if (data.description && String(data.description).length > 10000) {
    return 'Алаң деректері қате';
  }
  return null;
}

// GET /api/owner/courts/summary
ownerRouter.get('/summary', (req: AuthenticatedRequest, res) => {
  const ownerId = req.user!.id;
  const myCourts = Array.from(store.courts.values()).filter((c) => c.ownerId === ownerId);
  const myCourtIds = new Set(myCourts.map((c) => c.id));

  const courtsPendingModeration = myCourts.filter((c) => c.status === 'PENDING').length;

  const myBookings = Array.from(store.bookings.values()).filter((b) =>
    myCourtIds.has(b.courtId)
  );

  const pendingBookings = myBookings.filter((b) => b.status === 'PENDING').length;
  const confirmedBookings = myBookings.filter((b) => b.status === 'CONFIRMED').length;

  res.json({
    courts: myCourts.length,
    courtsPendingModeration,
    pendingBookings,
    confirmedBookings,
  });
});

// GET /api/owner/courts
ownerRouter.get('/', (req: AuthenticatedRequest, res) => {
  const ownerId = req.user!.id;
  const myCourts = Array.from(store.courts.values())
    .filter((c) => c.ownerId === ownerId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(formatCourtView);

  res.json(myCourts);
});

// POST /api/owner/courts
ownerRouter.post('/', (req: AuthenticatedRequest, res) => {
  const error = validateCourtRequest(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const {
    name,
    sportType,
    city,
    district,
    address,
    description,
    hourlyPrice,
    latitude,
    longitude,
    openingTime,
    closingTime,
    photoUrls,
    amenities,
  } = req.body;

  const ownerId = req.user!.id;
  const newCourt: Court = {
    id: uuidv4(),
    ownerId,
    name: name.trim(),
    sportType: sportType as SportType,
    city: city.trim(),
    district: district ? String(district).trim() : null,
    address: address.trim(),
    description: description ? String(description).trim() : null,
    hourlyPrice: Number(hourlyPrice),
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
    openingTime: openingTime || '08:00:00',
    closingTime: closingTime || '23:00:00',
    photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
    amenities: Array.isArray(amenities) ? amenities : [],
    status: 'PENDING',
  };

  store.courts.set(newCourt.id, newCourt);
  res.status(201).json(formatCourtView(newCourt));
});

// PUT /api/owner/courts/:id
ownerRouter.put('/:id', (req: AuthenticatedRequest, res) => {
  const ownerId = req.user!.id;
  const court = store.courts.get(req.params.id);

  if (!court || court.ownerId !== ownerId) {
    res.status(404).json({ error: 'Алаң табылмады' });
    return;
  }

  const error = validateCourtRequest(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const {
    name,
    sportType,
    city,
    district,
    address,
    description,
    hourlyPrice,
    latitude,
    longitude,
    openingTime,
    closingTime,
    photoUrls,
    amenities,
  } = req.body;

  court.name = name.trim();
  court.sportType = sportType as SportType;
  court.city = city.trim();
  court.district = district ? String(district).trim() : null;
  court.address = address.trim();
  court.description = description ? String(description).trim() : null;
  court.hourlyPrice = Number(hourlyPrice);
  court.latitude = latitude !== undefined ? Number(latitude) : court.latitude;
  court.longitude = longitude !== undefined ? Number(longitude) : court.longitude;
  if (openingTime) court.openingTime = openingTime;
  if (closingTime) court.closingTime = closingTime;
  if (Array.isArray(photoUrls)) court.photoUrls = photoUrls;
  if (Array.isArray(amenities)) court.amenities = amenities;
  court.status = 'PENDING';

  res.json(formatCourtView(court));
});
