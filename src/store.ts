import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  Booking,
  Court,
  Game,
  Review,
  SportType,
  Team,
  User,
  UserRole,
} from './types.js';

export class DataStore {
  users: Map<string, User> = new Map();
  courts: Map<string, Court> = new Map();
  bookings: Map<string, Booking> = new Map();
  games: Map<string, Game> = new Map();
  teams: Map<string, Team> = new Map();
  reviews: Map<string, Review> = new Map();
  sessions: Map<string, string> = new Map(); // token -> userId

  constructor() {
    this.seed();
  }

  private seed() {
    const salt = bcrypt.genSaltSync(10);

    // Users
    const adminUser: User = {
      id: '11111111-1111-4111-8111-111111111111',
      fullName: 'Әкімшілік PlaySlot',
      email: 'admin@playslot.kz',
      passwordHash: bcrypt.hashSync('admin1234', salt),
      role: 'ADMIN',
    };

    const ownerUser: User = {
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'Дәулет Серікұлы (Алаң Иесі)',
      email: 'owner@playslot.kz',
      passwordHash: bcrypt.hashSync('owner1234', salt),
      role: 'OWNER',
    };

    const playerUser: User = {
      id: '33333333-3333-4333-8333-333333333333',
      fullName: 'Нұрдәулет Жамбылов',
      email: 'player@playslot.kz',
      passwordHash: bcrypt.hashSync('player1234', salt),
      role: 'PLAYER',
    };

    const playerUser2: User = {
      id: '44444444-4444-4444-8444-444444444444',
      fullName: 'Аслан Төлеутаев',
      email: 'aslan@playslot.kz',
      passwordHash: bcrypt.hashSync('player1234', salt),
      role: 'PLAYER',
    };

    [adminUser, ownerUser, playerUser, playerUser2].forEach((u) =>
      this.users.set(u.id, u)
    );

    // Courts
    const court1: Court = {
      id: 'a1000000-0000-0000-0000-000000000001',
      ownerId: ownerUser.id,
      name: 'Dostyk Arena Football Complex',
      sportType: 'FOOTBALL',
      city: 'Алматы',
      district: 'Медеу ауданы',
      latitude: 43.238949,
      longitude: 76.945465,
      address: 'Достық даңғылы, 105',
      description: 'Жоғары сапалы жасанды көгал, жарықтандыру, жылы шешінетін бөлмелер мен душ бар футбол алаңы.',
      status: 'APPROVED',
      hourlyPrice: 15000,
      openingTime: '08:00:00',
      closingTime: '23:00:00',
      photoUrls: [
        'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      ],
      amenities: ['Жарықтандыру', 'Шешінетін бөлме', 'Душ', 'Автотұрақ', 'Доптар мен манишкалар'],
    };

    const court2: Court = {
      id: 'a1000000-0000-0000-0000-000000000002',
      ownerId: ownerUser.id,
      name: 'Astana Basket Center',
      sportType: 'BASKETBALL',
      city: 'Астана',
      district: 'Есіл ауданы',
      latitude: 51.128421,
      longitude: 71.430564,
      address: 'Мәңгілік Ел даңғылы, 53',
      description: 'Кәсіби паркет төсеніші, ресми өлшемдегі баскетбол алаңы, электронды табло және трибуна.',
      status: 'APPROVED',
      hourlyPrice: 12000,
      openingTime: '09:00:00',
      closingTime: '22:00:00',
      photoUrls: [
        'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
      ],
      amenities: ['Паркет', 'Электронды табло', 'Шешінетін бөлме', 'Ауыз су', 'Wi-Fi'],
    };

    const court3: Court = {
      id: 'a1000000-0000-0000-0000-000000000003',
      ownerId: ownerUser.id,
      name: 'Shymkent Tennis Club',
      sportType: 'TENNIS',
      city: 'Шымкент',
      district: 'Әл-Фараби ауданы',
      latitude: 42.315514,
      longitude: 69.586907,
      address: 'Байдібек би даңғылы, 12',
      description: 'Ашық аспан астындағы және жабық топырақ корттары (clay court). Жаттықтырушы қызметі қолжетімді.',
      status: 'APPROVED',
      hourlyPrice: 8000,
      openingTime: '07:00:00',
      closingTime: '22:00:00',
      photoUrls: [
        'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80',
      ],
      amenities: ['Топырақ төсеніш', 'Ракеткаларды жалға алу', 'Кафе', 'Автотұрақ'],
    };

    const court4: Court = {
      id: 'a1000000-0000-0000-0000-000000000004',
      ownerId: ownerUser.id,
      name: 'Almaty Volleyball Dome',
      sportType: 'VOLLEYBALL',
      city: 'Алматы',
      district: 'Бостандық ауданы',
      latitude: 43.212345,
      longitude: 76.912345,
      address: 'Розыбакиев көшесі, 247',
      description: 'Амортизациялық едені бар жабық волейбол залы, жаңа торлар мен доптар.',
      status: 'APPROVED',
      hourlyPrice: 10000,
      openingTime: '08:00:00',
      closingTime: '23:00:00',
      photoUrls: [
        'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80',
      ],
      amenities: ['Амортизациялық еден', 'Тор мен доптар', 'Душ', 'Шешінетін бөлме'],
    };

    [court1, court2, court3, court4].forEach((c) => this.courts.set(c.id, c));

    // Bookings (including 1 completed for review check)
    const completedBooking: Booking = {
      id: 'b1000000-0000-0000-0000-000000000001',
      userId: playerUser.id,
      courtId: court1.id,
      startsAt: '2026-10-15T18:00:00',
      endsAt: '2026-10-15T20:00:00',
      status: 'COMPLETED',
    };

    const upcomingBooking: Booking = {
      id: 'b1000000-0000-0000-0000-000000000002',
      userId: playerUser.id,
      courtId: court1.id,
      startsAt: '2026-10-25T19:00:00',
      endsAt: '2026-10-25T21:00:00',
      status: 'CONFIRMED',
    };

    [completedBooking, upcomingBooking].forEach((b) => this.bookings.set(b.id, b));

    // Reviews
    const review1: Review = {
      id: 'r1000000-0000-0000-0000-000000000001',
      userId: playerUser.id,
      courtId: court1.id,
      rating: 5,
      comment: 'Керемет алаң! Көгал сапасы өте жақсы, жарықтандыру кешкі уақытта жап-жарық.',
      createdAt: '2026-10-16T10:30:00',
    };
    this.reviews.set(review1.id, review1);

    // Games
    const game1: Game = {
      id: 'g1000000-0000-0000-0000-000000000001',
      organizerId: playerUser.id,
      courtId: court1.id,
      sportType: 'FOOTBALL',
      startsAt: '2026-10-26T20:00:00',
      maxPlayers: 14,
      description: '7x7 достық футбол матчы. 3 ойыншы жетпей тұр, қосылыңыздар!',
      status: 'APPROVED',
      participantIds: [playerUser.id, playerUser2.id],
    };

    const game2: Game = {
      id: 'g1000000-0000-0000-0000-000000000002',
      organizerId: playerUser2.id,
      courtId: court2.id,
      sportType: 'BASKETBALL',
      startsAt: '2026-10-27T18:00:00',
      maxPlayers: 10,
      description: '5x5 баскетбол ойыны, орташа деңгей. Барлық ниет білдірушілерді шақырамыз.',
      status: 'APPROVED',
      participantIds: [playerUser2.id],
    };

    [game1, game2].forEach((g) => this.games.set(g.id, g));

    // Teams
    const team1: Team = {
      id: 't1000000-0000-0000-0000-000000000001',
      name: 'Almaty Wolves FC',
      sportType: 'FOOTBALL',
      description: 'Әуесқой қалалық лигада өнер көрсететін футбол командасы.',
      captainId: playerUser.id,
      memberIds: [playerUser.id, playerUser2.id],
    };

    const team2: Team = {
      id: 't1000000-0000-0000-0000-000000000002',
      name: 'Astana Steppe Hawks',
      sportType: 'BASKETBALL',
      description: 'Баскетбол әуесқойларының бірлестігі.',
      captainId: playerUser2.id,
      memberIds: [playerUser2.id],
    };

    [team1, team2].forEach((t) => this.teams.set(t.id, t));
  }

  getUserByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return undefined;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  createSession(userId: string): string {
    const token = uuidv4();
    this.sessions.set(token, userId);
    return token;
  }

  getSessionUser(token?: string): User | undefined {
    if (!token) return undefined;
    const userId = this.sessions.get(token);
    if (!userId) return undefined;
    return this.users.get(userId);
  }

  deleteSession(token?: string): boolean {
    if (!token) return false;
    return this.sessions.delete(token);
  }
}

export const store = new DataStore();
