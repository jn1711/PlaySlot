export type SportType = 'FOOTBALL' | 'BASKETBALL' | 'VOLLEYBALL' | 'TENNIS';

export type CourtStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export type GameStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type UserRole = 'PLAYER' | 'OWNER' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface Court {
  id: string;
  ownerId: string;
  name: string;
  sportType: SportType;
  city: string;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address: string;
  description?: string | null;
  status: CourtStatus;
  hourlyPrice: number;
  openingTime: string; // HH:mm:ss
  closingTime: string; // HH:mm:ss
  photoUrls: string[];
  amenities: string[];
}

export interface Booking {
  id: string;
  userId: string;
  courtId: string;
  startsAt: string; // ISO string
  endsAt: string; // ISO string
  status: BookingStatus;
}

export interface Game {
  id: string;
  organizerId: string;
  courtId: string;
  sportType: SportType;
  startsAt: string; // ISO string
  maxPlayers: number;
  description?: string | null;
  status: GameStatus;
  participantIds: string[];
}

export interface Team {
  id: string;
  name: string;
  sportType: SportType;
  description?: string | null;
  captainId: string;
  memberIds: string[];
}

export interface Review {
  id: string;
  userId: string;
  courtId: string;
  rating: number; // 1-5
  comment?: string | null;
  createdAt: string; // ISO string
}
