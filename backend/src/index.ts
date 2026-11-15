import { passwordResetConfigured, sendPasswordReset } from './config/email.js';
import 'dotenv/config';
import crypto from 'crypto';
import http from 'http';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { User, AuthResponse, Profile, PublicProfile, Match, Message, Event } from '@tanzmatch/types';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { UserModel } from './models/User.js';
import { MatchModel } from './models/Match.js';
import { MessageModel } from './models/Message.js';
import { EventModel } from './models/Event.js';
import { BlockAuditModel } from './models/BlockAudit.js';
import {
  authenticateRequest,
  ensureAuthConfig,
  hashPassword,
  needsPasswordRehash,
  requireAuth,
  signAuthToken,
  signRefreshToken,
  verifyRefreshToken,
  type AuthenticatedRequest,
  verifyPassword,
} from './middleware/auth.js';
import { uploadProfileImage } from './config/cloudinary.js';

function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next);
  };
}

const app: Express = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const RAW_CORS_ORIGIN =
  process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const CORS_ORIGINS = RAW_CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .map((origin) => {
    if (origin === '*') return origin;
    try {
      return new URL(origin.includes('://') ? origin : `https://${origin}`).origin;
    } catch {
      return '';
    }
  })
  .filter(Boolean);
const CORS_ALLOW_ALL = CORS_ORIGINS.includes('*') && process.env.NODE_ENV !== 'production';
const TRUST_PROXY = process.env.TRUST_PROXY;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('Unsupported image type'));
      return;
    }
    callback(null, true);
  },
});
const REFRESH_COOKIE_NAME = 'refreshToken';

const REFRESH_COOKIE_SAMESITE = (process.env.REFRESH_COOKIE_SAMESITE || 'lax') as
  | 'lax'
  | 'strict'
  | 'none';
const REFRESH_COOKIE_SECURE =
  process.env.REFRESH_COOKIE_SECURE === 'true' ||
  (process.env.REFRESH_COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production') ||
  REFRESH_COOKIE_SAMESITE === 'none';
const REFRESH_COOKIE_DOMAIN = process.env.REFRESH_COOKIE_DOMAIN;
const REFRESH_COOKIE_PATH = process.env.REFRESH_COOKIE_PATH || '/api/auth';
const JWT_SECRET = process.env.JWT_SECRET;

if (REFRESH_COOKIE_SAMESITE === 'none' && !REFRESH_COOKIE_SECURE) {
  console.warn(
    '[Auth] REFRESH_COOKIE_SAMESITE is "none" but REFRESH_COOKIE_SECURE is false. Secure will be forced.'
  );
}

const refreshCookieOptions = {
  httpOnly: true,
  secure: REFRESH_COOKIE_SECURE,
  sameSite: REFRESH_COOKIE_SAMESITE,
  path: REFRESH_COOKIE_PATH,
  ...(REFRESH_COOKIE_DOMAIN ? { domain: REFRESH_COOKIE_DOMAIN } : {}),
};

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sendError(res: Response, status: number, message: string, code?: string, details?: unknown) {
  res.status(status).json({
    error: message,
    code,
    details,
  });
}

function getRequestMetadata(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'] ?? 'unknown',
  };
}

function validatePassword(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (Buffer.byteLength(value, 'utf8') > 72) {
    return 'Password must be no more than 72 bytes';
  }
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must contain an uppercase letter, a lowercase letter, and a number';
  }
  return null;
}

function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }

  if (!isOriginAllowed(origin)) {
    sendError(res, 403, 'Origin not allowed', 'ORIGIN_NOT_ALLOWED');
    return;
  }

  next();
}

function isOriginAllowed(origin: string): boolean {
  if (CORS_ALLOW_ALL) {
    return true;
  }

  try {
    return CORS_ORIGINS.includes(new URL(origin).origin);
  } catch {
    return false;
  }
}

type CallRoom = {
  matchId: string;
  clients: WebSocket[];
};

const callRooms = new Map<string, CallRoom>();
const callClientMeta = new Map<WebSocket, { userId: string; matchId?: string }>();
const chatRooms = new Map<string, WebSocket[]>();
const chatClientMeta = new Map<WebSocket, { userId: string; matchId?: string }>();
const callJoinRate = new Map<string, number>();

function verifyAuthToken(token: string): { userId: string } | null {
  if (!JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as {
      sub?: string;
      tokenUse?: 'access' | 'refresh';
    };
    if (!decoded.sub || decoded.tokenUse !== 'access') {
      return null;
    }
    return { userId: decoded.sub };
  } catch {
    return null;
  }
}

function removeClientFromRoom(ws: WebSocket) {
  const meta = callClientMeta.get(ws);
  if (!meta?.matchId) {
    return;
  }

  const room = callRooms.get(meta.matchId);
  if (!room) {
    return;
  }

  room.clients = room.clients.filter((client) => client !== ws);
  if (room.clients.length === 0) {
    callRooms.delete(meta.matchId);
  }
}

function broadcastToRoom(matchId: string, message: unknown, except?: WebSocket) {
  const room = callRooms.get(matchId);
  if (!room) {
    return;
  }

  room.clients.forEach((client) => {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastChat(matchId: string, message: unknown, except?: WebSocket) {
  const room = chatRooms.get(matchId);
  if (!room) {
    return;
  }

  room.forEach((client) => {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function removeChatClient(ws: WebSocket) {
  const meta = chatClientMeta.get(ws);
  if (!meta?.matchId) {
    return;
  }

  const room = chatRooms.get(meta.matchId);
  if (!room) {
    return;
  }

  const next = room.filter((client) => client !== ws);
  if (next.length === 0) {
    chatRooms.delete(meta.matchId);
  } else {
    chatRooms.set(meta.matchId, next);
  }
}

type PersistedUser = {
  _id: { toString(): string };
  email: string;
  password: string;
  authVersion?: string | null;
  gender?: 'M' | 'W' | 'D' | 'other' | null;
  height?: number | null;
  athleticism?: 'very-sporty' | 'sporty' | 'normal' | 'not-sporty' | null;
  figure?: 'slim' | 'normal' | 'curvy' | 'muscular' | null;
  calendar?: boolean[];
  customDances?: string[];
  danceLevels?: { danceId?: string | null; level?: number | null }[];

  firstName: string;
  lastName: string;
  age?: number | null;
  zipCode?: string | null;
  role: 'user' | 'moderator' | 'admin';
  bio: string;
  interests: string[];
  danceStyles: string[];
  profilePhotos: string[];
  privateProfile?: boolean;
  notificationPreferences?: { messages?: boolean; matches?: boolean; events?: boolean; likes?: boolean } | null;
  location?: { lat?: number | null; lng?: number | null; city?: string | null } | null;
  preferences?: {
    minAge?: number | null;
    maxAge?: number | null;
    danceStyles: string[];
    distance?: number | null;
  } | null;
  blockedUserIds?: string[];
  refreshToken?: string | null;
  refreshTokenExpiresAt?: Date | null;
  refreshTokenIp?: string | null;
  refreshTokenUserAgent?: string | null;
  passwordResetToken?: string | null;
  passwordResetExpiresAt?: Date | null;
  createdAt: Date;
  save: () => Promise<unknown>;
};

type PersistedMatch = {
  _id: { toString(): string };
  actorUserId: string;
  targetUserId: string;
  type: 'like' | 'superlike' | 'pass';
  mutualMatch: boolean;
  unmatchedAt?: Date | null;
  createdAt: Date;
  save: () => Promise<unknown>;
};

type PersistedMessage = {
  _id: { toString(): string };
  senderId: string;
  matchId: string;
  text: string;
  createdAt: Date;
  read: boolean;
};

type PersistedEvent = {
  _id: { toString(): string };
  title: string;
  description: string;
  date: Date;
  time?: string | null;
  location: string;
  danceStyle?: string | null;
  organizer: { id: string; name: string };
  attendeeIds: string[];
  createdAt: Date;
  save: () => Promise<unknown>;
};

function asOptionalNumber(value: number | null | undefined): number | undefined {
  return value ?? undefined;
}

function asOptionalString(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

function asOptionalLocation(user: PersistedUser): Profile['location'] {
  if (!user.location?.city || user.location.lat == null || user.location.lng == null) {
    return undefined;
  }

  return {
    city: user.location.city,
    lat: user.location.lat,
    lng: user.location.lng,
  };
}

function asOptionalPreferences(user: PersistedUser): Profile['preferences'] {
  if (!user.preferences) {
    return undefined;
  }

  return {
    minAge: asOptionalNumber(user.preferences.minAge),
    maxAge: asOptionalNumber(user.preferences.maxAge),
    danceStyles: user.preferences.danceStyles,
    distance: asOptionalNumber(user.preferences.distance),
  };
}

function sanitizePhotoUrls(photos?: string[] | null): string[] {
  if (!Array.isArray(photos)) {
    return [];
  }

  const cleaned = photos
    .filter((url) => typeof url === 'string')
    .map((url) => url.trim())
    .map((url) => {
      if (url.startsWith('//')) {
        return `https:${url}`;
      }
      if (!/^https?:\/\//.test(url) && url.includes('res.cloudinary.com')) {
        return `https://${url}`;
      }
      return url;
    })
    .filter((url) => url.length > 0 && /^https?:\/\//.test(url))
    .filter(
      (url) =>
        !url.includes('via.placeholder.com') &&
        !url.includes('/clever-match.svg') &&
        !url.includes('/user-placeholder.svg')
    );

  // Prefer Cloudinary images first
  return cleaned.sort((a, b) => {
    const aCloud = a.includes('res.cloudinary.com');
    const bCloud = b.includes('res.cloudinary.com');
    if (aCloud === bCloud) return 0;
    return aCloud ? -1 : 1;
  });
}

function toUserResponse(user: PersistedUser): User {
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    age: asOptionalNumber(user.age),
    zipCode: asOptionalString(user.zipCode),
    createdAt: user.createdAt.toISOString(),
    role: user.role,
  };
}

function toProfileResponse(user: PersistedUser): Profile {
  const sanitizedPhotos = sanitizePhotoUrls(user.profilePhotos);
  return {
    ...toUserResponse(user),
    bio: user.bio,
    interests: user.interests,
    danceStyles: user.danceStyles,
    profilePhotos: sanitizedPhotos,
    location: asOptionalLocation(user),
    preferences: asOptionalPreferences(user),
    gender: user.gender ?? 'other',
    height: asOptionalNumber(user.height),
    athleticism: user.athleticism ?? 'normal',
    figure: user.figure ?? 'normal',
    calendar: user.calendar ?? [],
    customDances: user.customDances ?? [],
    danceLevels: (user.danceLevels ?? []).filter(item => typeof item.danceId === 'string' && typeof item.level === 'number' && item.level >= 1 && item.level <= 5).map(item => ({ danceId: item.danceId!, level: item.level as 1 | 2 | 3 | 4 | 5 })),
    privateProfile: user.privateProfile ?? false,
    notificationPreferences: { messages: true, matches: true, events: true, likes: false, ...user.notificationPreferences },
  };
}

function distanceBetweenUsersInKm(from: PersistedUser, to: PersistedUser): number | undefined {
  const fromLat = from.location?.lat;
  const fromLng = from.location?.lng;
  const toLat = to.location?.lat;
  const toLng = to.location?.lng;
  if (
    typeof fromLat !== 'number' ||
    typeof fromLng !== 'number' ||
    typeof toLat !== 'number' ||
    typeof toLng !== 'number' ||
    ![fromLat, fromLng, toLat, toLng].every(Number.isFinite)
  ) {
    return undefined;
  }

  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(toLat - fromLat);
  const longitudeDelta = radians(toLng - fromLng);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(fromLat)) *
      Math.cos(radians(toLat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const distance = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.round(distance);
}

function toPublicProfileResponse(user: PersistedUser, viewer?: PersistedUser): PublicProfile {
  const sanitizedPhotos = sanitizePhotoUrls(user.profilePhotos);
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    age: asOptionalNumber(user.age),
    location: user.location?.city
      ? { city: user.location.city, distance: viewer ? distanceBetweenUsersInKm(viewer, user) : undefined }
      : undefined,
    profilePhoto: sanitizedPhotos[0],
    profilePhotos: sanitizedPhotos,
    danceStyles: user.danceStyles,
    bio: user.bio,
    interests: user.interests,
  };
}

function toMatchResponse(match: PersistedMatch, currentUserId?: string): Match {
  const otherUserId =
    currentUserId && match.actorUserId === currentUserId ? match.targetUserId : match.actorUserId;
  return {
    id: match._id.toString(),
    userId: otherUserId,
    type: match.type,
    mutualMatch: match.mutualMatch,
    createdAt: match.createdAt.toISOString(),
    unmatchedAt: match.unmatchedAt?.toISOString(),
  };
}

function toMessageResponse(message: PersistedMessage): Message {
  return {
    id: message._id.toString(),
    senderId: message.senderId,
    matchId: message.matchId,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
    read: message.read,
  };
}

function toEventResponse(event: PersistedEvent, currentUserId?: string): Event {
  return {
    id: event._id.toString(),
    title: event.title,
    description: event.description,
    date: event.date.toISOString(),
    time: event.time ?? undefined,
    location: event.location,
    danceStyle: event.danceStyle ?? undefined,
    organizer: event.organizer,
    attendees: event.attendeeIds.length,
    registered: currentUserId ? event.attendeeIds.includes(currentUserId) : false,
    createdAt: event.createdAt.toISOString(),
  };
}

async function ensureSeedData(): Promise<void> {
  if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEMO_SEED !== 'true') return;

  const existingUser = await UserModel.findOne({ email: 'test@example.com' });

  if (existingUser) {
    if (needsPasswordRehash(existingUser.password)) {
      existingUser.password = await hashPassword('password123');
      await existingUser.save();
    }
  } else {
    await UserModel.create({
      email: 'test@example.com',
      password: await hashPassword('password123'),
      firstName: 'Max',
      lastName: 'Mustermann',
      age: 28,
      zipCode: '10115',
      bio: 'Passionate about dancing',
      interests: ['music', 'dance', 'travel'],
      danceStyles: ['salsa', 'hip-hop'],
      profilePhotos: [],
      location: {
        city: 'Berlin',
        lat: 52.52,
        lng: 13.405,
      },
      preferences: {
        minAge: 24,
        maxAge: 36,
        danceStyles: ['salsa', 'bachata'],
        distance: 25,
      },
    });
  }

  const eventCount = await EventModel.countDocuments();

  if (eventCount === 0) {
  const organizer = await UserModel.findOne({ email: 'test@example.com' });

    if (organizer) {
      await EventModel.create([
        {
          title: 'Salsa Night Berlin',
          description: 'Live-DJ, offene Tanzflaeche und Workshop vor dem Social.',
          date: new Date('2026-03-15T20:00:00.000Z'),
          time: '21:00',
          location: 'Luna Club, Berlin',
          danceStyle: 'salsa',
          organizer: { id: organizer._id.toString(), name: organizer.firstName },
          attendeeIds: [organizer._id.toString()],
        },
        {
          title: 'Bachata Meetup',
          description: 'Entspannter Social-Abend fuer Bachata-Fans.',
          date: new Date('2026-03-18T18:30:00.000Z'),
          time: '19:30',
          location: 'Studio Kreuzberg, Berlin',
          danceStyle: 'bachata',
          organizer: { id: organizer._id.toString(), name: organizer.firstName },
          attendeeIds: [],
        },
      ]);
    }
  }
}

async function getCurrentUser(req: Request): Promise<PersistedUser | null> {
  const authUserId = (req as AuthenticatedRequest).authUserId;
  if (authUserId) {
    return UserModel.findById(authUserId);
  }

  return null;
}

async function userCanAccessMatch(matchId: string, userId: string): Promise<boolean> {
  const match = await MatchModel.findOne({
    _id: matchId,
    $or: [{ actorUserId: userId }, { targetUserId: userId }],
    mutualMatch: true,
    unmatchedAt: null,
  });

  return Boolean(match);
}

async function getMatchParticipants(matchId: string) {
  const match = await MatchModel.findById(matchId);
  if (!match) {
    return null;
  }
  return {
    actorUserId: match.actorUserId,
    targetUserId: match.targetUserId,
  };
}

async function isBlockedBetween(userId: string, otherUserId: string): Promise<boolean> {
  const [user, other] = await Promise.all([
    UserModel.findById(userId),
    UserModel.findById(otherUserId),
  ]);

  if (!user || !other) {
    return false;
  }

  const userBlocked = user.blockedUserIds?.includes(otherUserId) ?? false;
  const otherBlocked = other.blockedUserIds?.includes(userId) ?? false;
  return userBlocked || otherBlocked;
}

// === Middleware ===
if (TRUST_PROXY) {
  const trustProxyValue = Number(TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(trustProxyValue) ? TRUST_PROXY : trustProxyValue);
}

app.disable('x-powered-by');

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);
app.use(express.json({ limit: '1mb' }));
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    req.body = {};
  }
  next();
});
app.use(cookieParser());
app.use(authenticateRequest);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const resetTime = req.rateLimit?.resetTime;
    if (resetTime) {
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
      res.setHeader('Retry-After', Math.max(0, retryAfter).toString());
    }
    sendError(res, options.statusCode, 'Too many requests. Please try again later.', 'RATE_LIMIT');
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const resetTime = req.rateLimit?.resetTime;
    if (resetTime) {
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
      res.setHeader('Retry-After', Math.max(0, retryAfter).toString());
    }
    sendError(res, options.statusCode, 'Too many login attempts. Please try again later.', 'AUTH_RATE_LIMIT');
  },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const resetTime = req.rateLimit?.resetTime;
    if (resetTime) {
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
      res.setHeader('Retry-After', Math.max(0, retryAfter).toString());
    }
    sendError(res, options.statusCode, 'Too many messages. Please slow down.', 'RATE_LIMIT');
  },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const resetTime = req.rateLimit?.resetTime;
    if (resetTime) {
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
      res.setHeader('Retry-After', Math.max(0, retryAfter).toString());
    }
    sendError(res, options.statusCode, 'Too many refresh attempts. Please try again later.', 'REFRESH_RATE_LIMIT');
  },
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const resetTime = req.rateLimit?.resetTime;
    if (resetTime) {
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
      res.setHeader('Retry-After', Math.max(0, retryAfter).toString());
    }
    sendError(
      res,
      options.statusCode,
      'Too many password reset attempts. Please try again later.',
      'PASSWORD_RESET_RATE_LIMIT'
    );
  },
});

const photoUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// === Routes ===

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ok' : 'degraded',
    database: databaseReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// === Auth Routes ===
app.post('/api/auth/login', authLimiter, asyncRoute(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, 'Email and password required', 'VALIDATION_ERROR');
  }

  const user = await UserModel.findOne({ email: String(email).toLowerCase() });

  if (process.env.NODE_ENV === 'production' && user?.email === 'test@example.com') {
    return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (!user || !(await verifyPassword(String(password), user.password))) {
    return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (needsPasswordRehash(user.password)) {
    user.password = await hashPassword(String(password));
    await user.save();
  }

  const token = signAuthToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    version: user.authVersion ?? '',
  });

  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    version: user.authVersion ?? '',
  });

  // Store refresh token hash in database with expiration + metadata
  user.refreshToken = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const loginMeta = getRequestMetadata(req);
  user.refreshTokenIp = loginMeta.ip;
  user.refreshTokenUserAgent = loginMeta.userAgent;
  await user.save();

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const response: AuthResponse = {
    token,
    user: toUserResponse(user),
  };

  res.json(response);
}));

app.post('/api/auth/guest', authLimiter, asyncRoute(async (_req: Request, res: Response) => {
  const user = await UserModel.create({
    email: `guest-${crypto.randomUUID()}@tanzmatch.local`,
    password: await hashPassword(crypto.randomUUID()),
    firstName: 'Gast',
    lastName: 'Nutzer',
    bio: 'Ich nutze Clever Match als Gast.',
  });

  const token = signAuthToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    version: user.authVersion ?? '',
  });

  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    version: user.authVersion ?? '',
  });

  user.refreshToken = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const guestMeta = getRequestMetadata(_req);
  user.refreshTokenIp = guestMeta.ip;
  user.refreshTokenUserAgent = guestMeta.userAgent;
  await user.save();

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const response: AuthResponse = {
    token,
    user: toUserResponse(user),
  };

  res.json(response);
}));

app.post('/api/auth/register', authLimiter, asyncRoute(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, zipCode } = req.body;

  if (
    typeof email !== 'string' ||
    typeof firstName !== 'string' ||
    typeof lastName !== 'string' ||
    typeof zipCode !== 'string' ||
    !email.trim() ||
    !firstName.trim() ||
    !lastName.trim() ||
    !zipCode.trim()
  ) {
    return sendError(res, 400, 'All fields required', 'VALIDATION_ERROR');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return sendError(res, 400, 'Email address is invalid', 'VALIDATION_ERROR');
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return sendError(res, 400, passwordError, 'VALIDATION_ERROR');
  }
  if (firstName.trim().length > 80 || lastName.trim().length > 80 || zipCode.trim().length > 32) {
    return sendError(res, 400, 'Profile fields are too long', 'VALIDATION_ERROR');
  }

  const existingUser = await UserModel.findOne({ email: normalizedEmail });
  if (existingUser) {
    return sendError(res, 409, 'Email already registered', 'EMAIL_EXISTS');
  }

  const newUser = await UserModel.create({
    email: normalizedEmail,
    password: await hashPassword(password),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    zipCode: zipCode.trim(),
  });

  const token = signAuthToken({
    sub: newUser._id.toString(),
    email: newUser.email,
    role: newUser.role,
  });

  const refreshToken = signRefreshToken({
    sub: newUser._id.toString(),
    email: newUser.email,
    role: newUser.role,
  });

  newUser.refreshToken = hashToken(refreshToken);
  newUser.refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const registerMeta = getRequestMetadata(req);
  newUser.refreshTokenIp = registerMeta.ip;
  newUser.refreshTokenUserAgent = registerMeta.userAgent;
  await newUser.save();

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const response: AuthResponse = {
    token,
    user: toUserResponse(newUser),
  };

  res.status(201).json(response);
}));

app.post('/api/auth/logout', requireSameOrigin, asyncRoute(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  let userIdToClear = authReq.authUserId;

  if (!userIdToClear && refreshToken) {
    const decoded = verifyRefreshToken(String(refreshToken));
    if (decoded?.sub) {
      userIdToClear = decoded.sub;
    }
  }

  if (userIdToClear) {
    const user = await UserModel.findById(userIdToClear);
    if (user) {
      user.refreshToken = undefined;
      user.refreshTokenExpiresAt = undefined;
      user.refreshTokenIp = undefined;
      user.refreshTokenUserAgent = undefined;
      await user.save();
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  res.json({ message: 'Logged out successfully' });
}));

// === Block Routes ===
app.get('/api/blocks', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }

  res.json({ data: user.blockedUserIds ?? [] });
}));

app.post('/api/blocks/:userId', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.authUserId) {
    return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
  }

  const targetUserId = String(req.params.userId);
  if (!targetUserId || targetUserId === authReq.authUserId) {
    return sendError(res, 400, 'Invalid userId', 'VALIDATION_ERROR');
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    authReq.authUserId,
    { $addToSet: { blockedUserIds: targetUserId } },
    { new: true }
  );

  if (!updatedUser) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }

  await BlockAuditModel.create({
    actorUserId: authReq.authUserId,
    targetUserId,
    action: 'block',
  });

  res.json({ blockedUserIds: updatedUser.blockedUserIds ?? [] });
}));

app.delete('/api/blocks/:userId', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.authUserId) {
    return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
  }

  const targetUserId = String(req.params.userId);
  const updatedUser = await UserModel.findByIdAndUpdate(
    authReq.authUserId,
    { $pull: { blockedUserIds: targetUserId } },
    { new: true }
  );

  if (!updatedUser) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }

  await BlockAuditModel.create({
    actorUserId: authReq.authUserId,
    targetUserId,
    action: 'unblock',
  });

  res.json({ blockedUserIds: updatedUser.blockedUserIds ?? [] });
}));

app.get('/api/admin/block-audit', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return sendError(res, 403, 'Access denied', 'ACCESS_DENIED');
  }

  const records = await BlockAuditModel.find().sort({ createdAt: -1 }).limit(200);
  res.json({ data: records });
}));

app.post(
  '/api/auth/revoke-all',
  requireSameOrigin,
  requireAuth,
  asyncRoute(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.authUserId) {
      return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
    }

    const user = await UserModel.findById(authReq.authUserId);
    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    user.refreshToken = undefined;
    user.refreshTokenExpiresAt = undefined;
    user.refreshTokenIp = undefined;
    user.refreshTokenUserAgent = undefined;
    await user.save();

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    res.json({ message: 'Sessions revoked' });
  })
);

app.post('/api/auth/refresh', requireSameOrigin, refreshLimiter, asyncRoute(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    return sendError(res, 400, 'Refresh token required', 'MISSING_REFRESH_TOKEN');
  }

  // Verify the refresh token
  const decoded = verifyRefreshToken(String(refreshToken));
  if (!decoded) {
    return sendError(res, 401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  // Fetch user from database
  const user = await UserModel.findById(decoded.sub);
  if (!user) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }

  // Check if stored refresh token matches and hasn't expired
  const refreshMeta = getRequestMetadata(req);
  if (user.refreshTokenIp && user.refreshTokenIp !== refreshMeta.ip) {
    user.refreshToken = undefined;
    user.refreshTokenExpiresAt = undefined;
    user.refreshTokenIp = undefined;
    user.refreshTokenUserAgent = undefined;
    await user.save();
    return sendError(res, 401, 'Refresh token IP mismatch', 'REFRESH_IP_MISMATCH');
  }

  if (user.refreshTokenUserAgent && user.refreshTokenUserAgent !== refreshMeta.userAgent) {
    user.refreshToken = undefined;
    user.refreshTokenExpiresAt = undefined;
    user.refreshTokenIp = undefined;
    user.refreshTokenUserAgent = undefined;
    await user.save();
    return sendError(res, 401, 'Refresh token device mismatch', 'REFRESH_DEVICE_MISMATCH');
  }

  if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
    return sendError(res, 401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const hashedRefreshToken = hashToken(String(refreshToken));
  if (user.refreshToken !== hashedRefreshToken) {
    return sendError(res, 401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  // Generate new access token
  const newToken = signAuthToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    version: user.authVersion ?? '',
  });

  // Optionally generate new refresh token (rotate refresh token for better security)
  const newRefreshToken = signRefreshToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    version: user.authVersion ?? '',
  });

  // Update stored refresh token
  user.refreshToken = hashToken(newRefreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  user.refreshTokenIp = refreshMeta.ip;
  user.refreshTokenUserAgent = refreshMeta.userAgent;
  await user.save();

  res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, {
    ...refreshCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const response: AuthResponse = {
    token: newToken,
    user: toUserResponse(user),
  };

  res.json(response);
}));

app.post('/api/auth/forgot-password', passwordResetLimiter, asyncRoute(async (req: Request, res: Response) => {
  if (!passwordResetConfigured()) return sendError(res, 503, 'Password reset is unavailable', 'PASSWORD_RESET_UNAVAILABLE');
  const { email, language } = req.body;
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(res, 400, 'Valid email required', 'VALIDATION_ERROR');
  }
  const user = await UserModel.findOne({ email: email.trim().toLowerCase() });
  if (user && !user.email.endsWith('@tanzmatch.local')) {
    const token = crypto.randomBytes(32).toString('hex');
    const digest = hashToken(token);
    await UserModel.updateOne({ _id: user._id }, { $set: {
      passwordResetToken: digest,
      passwordResetExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
    } });
    try {
      await sendPasswordReset(user.email, token, language === 'en' ? 'en' : 'de');
    } catch {
      await UserModel.updateOne({ _id: user._id, passwordResetToken: digest }, {
        $unset: { passwordResetToken: 1, passwordResetExpiresAt: 1 },
      });
      console.error('[Email] Password-reset delivery failed');
    }
  }
  // Identical responses prevent disclosure of registered email addresses.
  res.json({ message: 'If the account exists, a reset email will be sent.' });
}));

app.post('/api/auth/reset-password', passwordResetLimiter, asyncRoute(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return sendError(res, 400, 'Invalid or expired reset link', 'INVALID_RESET_TOKEN');
  }
  const passwordError = validatePassword(password);
  if (passwordError) return sendError(res, 400, passwordError, 'VALIDATION_ERROR');
  const passwordHash = await hashPassword(password);
  const user = await UserModel.findOneAndUpdate({
    passwordResetToken: hashToken(token), passwordResetExpiresAt: { $gt: new Date() },
  }, {
    $set: { password: passwordHash, authVersion: crypto.randomUUID() },
    $unset: { passwordResetToken: 1, passwordResetExpiresAt: 1, refreshToken: 1,
      refreshTokenExpiresAt: 1, refreshTokenIp: 1, refreshTokenUserAgent: 1 },
  });
  if (!user) return sendError(res, 400, 'Invalid or expired reset link', 'INVALID_RESET_TOKEN');
  for (const [socket, meta] of [...callClientMeta, ...chatClientMeta]) {
    if (meta.userId === user._id.toString()) socket.close(1008, 'Session expired');
  }
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  res.json({ message: 'Password updated. Please sign in again.' });
}));

// === Profile Routes ===
app.get('/api/profile', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);

  if (!user) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }

  res.json(toProfileResponse(user));
}));

app.put('/api/profile', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);

  if (!user) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }

  if (req.body.bio !== undefined && (typeof req.body.bio !== 'string' || req.body.bio.length > 2000)) return sendError(res, 400, 'Invalid bio', 'VALIDATION_ERROR');
  for (const key of ['interests', 'danceStyles', 'customDances']) {
    const value = req.body[key];
    if (value !== undefined && (!Array.isArray(value) || value.length > 50 || value.some(item => typeof item !== 'string' || item.length > 100))) return sendError(res, 400, 'Invalid profile list', 'VALIDATION_ERROR');
  }
  if (req.body.calendar !== undefined && (!Array.isArray(req.body.calendar) || req.body.calendar.length !== 7 || req.body.calendar.some((day: unknown) => typeof day !== 'boolean'))) return sendError(res, 400, 'Invalid calendar', 'VALIDATION_ERROR');
  if (req.body.danceLevels !== undefined && (!Array.isArray(req.body.danceLevels) || req.body.danceLevels.length > 50 || req.body.danceLevels.some((item: { danceId?: unknown; level?: unknown } | null) => !item || typeof item.danceId !== 'string' || item.danceId.length > 100 || !Number.isInteger(item.level) || Number(item.level) < 1 || Number(item.level) > 5))) return sendError(res, 400, 'Invalid dance levels', 'VALIDATION_ERROR');
  const sanitizedProfilePhotos = Array.isArray(req.body.profilePhotos)
    ? req.body.profilePhotos.filter(
        (url: unknown) => typeof url === 'string' && /^https?:\/\//.test(url)
      )
    : undefined;

  const allowedUpdates: Record<string, unknown> = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    age: req.body.age,
    gender: req.body.gender,
    height: req.body.height,
    athleticism: req.body.athleticism,
    figure: req.body.figure,
    calendar: req.body.calendar,
    customDances: req.body.customDances,
    danceLevels: req.body.danceLevels,
    zipCode: req.body.zipCode,
    bio: req.body.bio,
    interests: req.body.interests,
    danceStyles: req.body.danceStyles,
    location: req.body.location,
    preferences: req.body.preferences,
  };

  if (req.body.notificationPreferences && typeof req.body.notificationPreferences === 'object') {
    for (const key of ['messages', 'matches', 'events', 'likes']) {
      const value = req.body.notificationPreferences[key];
      if (typeof value === 'boolean') allowedUpdates[`notificationPreferences.${key}`] = value;
    }
  }

  if (typeof req.body.privateProfile === 'boolean') {
    allowedUpdates.privateProfile = req.body.privateProfile;
  }

  if (sanitizedProfilePhotos) {
    allowedUpdates.profilePhotos = sanitizedProfilePhotos;
  }

  const updatedUser = await UserModel.findByIdAndUpdate(user._id, allowedUpdates, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }

  res.json(toProfileResponse(updatedUser));
}));

app.post(
  '/api/profile/photos',
  requireAuth,
  photoUploadLimiter,
  upload.array('files', 6),
  asyncRoute(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const user = await getCurrentUser(authReq);

    if (!user || !authReq.authUserId) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    if (!process.env.CLOUDINARY_URL) {
      return sendError(res, 503, 'Photo uploads are not configured', 'UPLOADS_UNAVAILABLE');
    }

    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      return sendError(res, 400, 'At least one file is required', 'VALIDATION_ERROR');
    }

    const uploadedUrls = await Promise.all(
      files.map((file) => uploadProfileImage(file.buffer, file.originalname, authReq.authUserId!))
    );

    user.profilePhotos = [...user.profilePhotos, ...uploadedUrls];
    await user.save();

    res.status(201).json({ data: uploadedUrls, status: 201 });
  })
);

// === Profiles Routes (Discovery) ===
app.get('/api/profiles', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }

  const currentUserId = currentUser._id.toString();

  // Get all users the current user has already interacted with
  const existingMatches = await MatchModel.find({
    actorUserId: currentUserId,
  });
  const matchedUserIds = new Set(existingMatches.map((m) => m.targetUserId));

  // Get all other users excluding current user and already matched users
  const availableProfiles = await UserModel.find({
    _id: { $ne: currentUserId, $nin: Array.from(matchedUserIds) },
    privateProfile: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .limit(50);

  // Convert to PreviewProfile-like responses with distance and compatibility
  const items = availableProfiles.map((profile: PersistedUser) => {
    const danceStyleMatches = profile.danceStyles.filter((d) => currentUser.danceStyles.includes(d)).length;
    const totalDances = Math.max(profile.danceStyles.length, currentUser.danceStyles.length, 1);
    const compatibility = Math.round((danceStyleMatches / totalDances) * 100);

    const distance = distanceBetweenUsersInKm(currentUser, profile);

    const photos = sanitizePhotoUrls(profile.profilePhotos);

    return {
      id: profile._id.toString(),
      firstName: profile.firstName,
      age: asOptionalNumber(profile.age),
      gender: profile.gender ?? 'other',
      height: profile.height,
      city: profile.location?.city || '',
      athleticism: profile.athleticism ?? 'normal',
      figure: profile.figure ?? 'normal',
      bio: profile.bio,
      dances: profile.danceStyles.map(danceId => ({ danceId, level: 1 })),
      customDances: profile.customDances ?? [],
      searchPurposes: ['hobby'] as const,
      photos,
      videos: [],
      calendar: profile.calendar ?? [],
      verified: false,
      online: false,
      created: profile.createdAt,
      lastSeen: profile.createdAt,
      distance,
      compatibility,
    };
  });

  res.json({
    data: items,
    total: items.length,
    page: 1,
    limit: 50,
  });
}));

app.get('/api/profiles/:id', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.params.id);

  if (!user) {
    return sendError(res, 404, 'Profile not found', 'PROFILE_NOT_FOUND');
  }

  const viewer = await getCurrentUser(req);
  if (user.privateProfile && viewer?._id.toString() !== user._id.toString()) {
    const viewerId = viewer?._id.toString();
    const targetId = user._id.toString();
    const mutualMatch = viewerId
      ? await MatchModel.exists({
          mutualMatch: true,
          unmatchedAt: null,
          $or: [
            { actorUserId: viewerId, targetUserId: targetId },
            { actorUserId: targetId, targetUserId: viewerId },
          ],
        })
      : null;
    if (!mutualMatch || (viewerId && (await isBlockedBetween(viewerId, targetId)))) {
      return sendError(res, 404, 'Profile not found', 'PROFILE_NOT_FOUND');
    }
  }
  res.json(toPublicProfileResponse(user, viewer ?? undefined));
}));

app.get('/api/notifications', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  if (!user) return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  const id = user._id.toString();
  const blocked = user.blockedUserIds ?? [];
  const reverseBlocks = await UserModel.find({ blockedUserIds: id }).select('_id').lean();
  const excluded = [...blocked, ...reverseBlocks.map(item => item._id.toString())];
  const preferences = { messages: true, matches: true, events: true, likes: false, ...user.notificationPreferences };
  const matches = await MatchModel.find({ mutualMatch: true, unmatchedAt: null,
    $or: [{ actorUserId: id }, { targetUserId: id }],
    actorUserId: { $nin: excluded }, targetUserId: { $nin: excluded },
  }).sort({ updatedAt: -1 }).limit(100).lean();
  const messages = preferences.messages ? await MessageModel.find({
    matchId: { $in: matches.map(item => item._id.toString()) },
    senderId: { $ne: id }, read: false,
  }).sort({ createdAt: -1 }).limit(100).lean() : [];
  const items: { id: string; type: string; createdAt: string; path: string }[] = messages.map(item => ({
    id: `message-${item._id}`, type: 'message', createdAt: item.createdAt.toISOString(), path: `/chat/${item.matchId}`,
  }));
  if (preferences.matches) for (const match of matches) items.push({
    id: `match-${match._id}`, type: 'match', createdAt: match.updatedAt.toISOString(), path: `/chat/${match._id}`,
  });
  if (preferences.likes) {
    const likes = await MatchModel.find({ targetUserId: id, actorUserId: { $nin: excluded },
      type: { $in: ['like', 'superlike'] }, mutualMatch: false, unmatchedAt: null,
    }).sort({ updatedAt: -1 }).limit(50).lean();
    for (const like of likes) items.push({ id: `like-${like._id}`, type: 'like', createdAt: like.updatedAt.toISOString(), path: '/matches' });
  }
  if (preferences.events) {
    const events = await EventModel.find({ attendeeIds: id, date: { $gte: new Date() } }).sort({ date: 1 }).limit(50).lean();
    for (const event of events) items.push({ id: `event-${event._id}`, type: 'event', createdAt: event.createdAt.toISOString(), path: '/events' });
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ data: items.slice(0, 100), unreadMessages: messages.length });
}));

// === Matches Routes ===
app.get('/api/matches', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);

  if (!user) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }

  const currentUserId = user._id.toString();
  const matches = await MatchModel.find({
    $or: [{ actorUserId: currentUserId }, { targetUserId: currentUserId }],
    type: { $in: ['like', 'superlike'] },
    mutualMatch: true,
    unmatchedAt: null,
  }).sort({ createdAt: -1 });

  res.json({
    data: matches.map((match) => toMatchResponse(match, currentUserId)),
    message: matches.length === 0 ? 'No matches yet' : undefined,
  });
}));

app.post('/api/matches', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const { userId, type } = req.body;

  if (!userId || !type) {
    return sendError(res, 400, 'userId and type required', 'VALIDATION_ERROR');
  }

  if (!['like', 'superlike', 'pass'].includes(String(type))) {
    return sendError(res, 400, 'Invalid match type', 'VALIDATION_ERROR');
  }

  const currentUser = await getCurrentUser(req);

  if (!currentUser) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }

  if (currentUser._id.toString() === String(userId)) {
    return sendError(res, 400, 'Cannot match with yourself', 'VALIDATION_ERROR');
  }

  const match = await MatchModel.findOneAndUpdate(
    {
      actorUserId: currentUser._id.toString(),
      targetUserId: String(userId),
    },
    {
      actorUserId: currentUser._id.toString(),
      targetUserId: String(userId),
      type: String(type),
      mutualMatch: false,
      unmatchedAt: type === 'pass' ? new Date() : undefined,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  const reverseMatch = await MatchModel.findOne({
    actorUserId: String(userId),
    targetUserId: currentUser._id.toString(),
    type: { $in: ['like', 'superlike', 'pass'] },
  });

  if (type === 'like' || type === 'superlike') {
    if (reverseMatch && reverseMatch.type !== 'pass') {
      match.mutualMatch = true;
      reverseMatch.mutualMatch = true;
      reverseMatch.unmatchedAt = undefined;
      await Promise.all([match.save(), reverseMatch.save()]);
    }
  } else if (type === 'pass' && reverseMatch?.mutualMatch) {
    reverseMatch.mutualMatch = false;
    reverseMatch.unmatchedAt = new Date();
    await reverseMatch.save();
  }

  res.status(201).json(toMatchResponse(match, currentUser._id.toString()));
}));

// === Messages Routes ===
app.get('/api/messages/:matchId', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.authUserId || !(await userCanAccessMatch(req.params.matchId, authReq.authUserId))) {
    return sendError(res, 403, 'Access denied', 'ACCESS_DENIED');
  }

  const participants = await getMatchParticipants(req.params.matchId);
  if (!participants) {
    return sendError(res, 404, 'Match not found', 'MATCH_NOT_FOUND');
  }

  const otherUserId =
    participants.actorUserId === authReq.authUserId
      ? participants.targetUserId
      : participants.actorUserId;

  if (await isBlockedBetween(authReq.authUserId, otherUserId)) {
    return sendError(res, 403, 'Conversation blocked', 'USER_BLOCKED');
  }

  const messages = await MessageModel.find({
    matchId: req.params.matchId,
    deletedFor: { $ne: authReq.authUserId },
  }).sort({ createdAt: 1 });

  res.json({
    data: messages.map(toMessageResponse),
    matchId: req.params.matchId,
  });
}));

app.post('/api/messages/:matchId/read', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.authUserId || !(await userCanAccessMatch(req.params.matchId, authReq.authUserId))) {
    return sendError(res, 403, 'Access denied', 'ACCESS_DENIED');
  }

  const participants = await getMatchParticipants(req.params.matchId);
  if (!participants) {
    return sendError(res, 404, 'Match not found', 'MATCH_NOT_FOUND');
  }

  const otherUserId =
    participants.actorUserId === authReq.authUserId
      ? participants.targetUserId
      : participants.actorUserId;

  if (await isBlockedBetween(authReq.authUserId, otherUserId)) {
    return sendError(res, 403, 'Conversation blocked', 'USER_BLOCKED');
  }

  const result = await MessageModel.updateMany(
    {
      matchId: req.params.matchId,
      senderId: { $ne: authReq.authUserId },
      read: false,
    },
    {
      $set: { read: true, readAt: new Date() },
    }
  );

  res.json({
    updated: result.modifiedCount ?? 0,
    readerId: authReq.authUserId,
    readAt: new Date().toISOString(),
  });

  broadcastChat(req.params.matchId, {
    type: 'messages:read',
    data: { readerId: authReq.authUserId },
  });
}));

app.post('/api/messages', requireAuth, messageLimiter, asyncRoute(async (req: Request, res: Response) => {
  const { matchId, text } = req.body;

  if (
    typeof matchId !== 'string' ||
    !matchId ||
    typeof text !== 'string' ||
    !text.trim() ||
    text.length > 4000
  ) {
    return sendError(res, 400, 'matchId and text required', 'VALIDATION_ERROR');
  }

  const authReq = req as AuthenticatedRequest;

  if (!authReq.authUserId || !(await userCanAccessMatch(String(matchId), authReq.authUserId))) {
    return sendError(res, 403, 'Access denied', 'ACCESS_DENIED');
  }

  const participants = await getMatchParticipants(String(matchId));
  if (!participants) {
    return sendError(res, 404, 'Match not found', 'MATCH_NOT_FOUND');
  }

  const otherUserId =
    participants.actorUserId === authReq.authUserId
      ? participants.targetUserId
      : participants.actorUserId;

  if (await isBlockedBetween(authReq.authUserId, otherUserId)) {
    return sendError(res, 403, 'Conversation blocked', 'USER_BLOCKED');
  }

  const message = await MessageModel.create({
    matchId: String(matchId),
    text: text.trim(),
    senderId: authReq.authUserId,
  });

  const payload = toMessageResponse(message);
  broadcastChat(String(matchId), { type: 'messages:new', data: payload });
  res.status(201).json(payload);
}));

app.delete('/api/messages/:messageId', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.authUserId) {
    return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
  }

  const message = await MessageModel.findById(req.params.messageId);
  if (!message) {
    return sendError(res, 404, 'Message not found', 'MESSAGE_NOT_FOUND');
  }

  if (!(await userCanAccessMatch(message.matchId, authReq.authUserId))) {
    return sendError(res, 403, 'Access denied', 'ACCESS_DENIED');
  }

  await MessageModel.updateOne(
    { _id: message._id },
    { $addToSet: { deletedFor: authReq.authUserId } }
  );

  res.json({ deleted: true });
}));

// === Events Routes ===
app.get('/api/events', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }
  const events = await EventModel.find().sort({ date: 1 });

  res.json({
    data: events.map((event) => toEventResponse(event, currentUser?._id.toString())),
  });
}));

app.get('/api/events/:id', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
  }
  const event = await EventModel.findById(req.params.id);

  if (!event) {
    return sendError(res, 404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  res.json(toEventResponse(event, currentUser?._id.toString()));
}));

app.post('/api/events/:id/register', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const event = await EventModel.findById(req.params.id);

  if (!event || !authReq.authUserId) {
    return sendError(res, 404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  if (!event.attendeeIds.includes(authReq.authUserId)) {
    event.attendeeIds.push(authReq.authUserId);
    await event.save();
  }

  res.json(toEventResponse(event, authReq.authUserId));
}));

app.delete('/api/events/:id/register', requireAuth, asyncRoute(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const event = await EventModel.findById(req.params.id);

  if (!event || !authReq.authUserId) {
    return sendError(res, 404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  event.attendeeIds = event.attendeeIds.filter((attendeeId) => attendeeId !== authReq.authUserId);
  await event.save();

  res.json(toEventResponse(event, authReq.authUserId));
}));

// === Error Handling ===
app.use((req: Request, res: Response) => {
  sendError(res, 404, 'Route not found', 'NOT_FOUND');
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof multer.MulterError || err.message === 'Unsupported image type') {
    sendError(res, 400, 'Invalid profile image upload', 'INVALID_UPLOAD');
    return;
  }

  console.error(`[Error] ${err.message}`);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// === Start Server ===
async function startServer(): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Please set it in backend/.env');
  }

  ensureAuthConfig();
  await connectDatabase(MONGODB_URI);
  await ensureSeedData();

  const server = http.createServer(app);

  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      ws.close(1008, 'Origin not allowed');
      return;
    }

    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token') || '';
    const auth = verifyAuthToken(token);
    if (!auth) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    callClientMeta.set(ws, { userId: auth.userId });

    ws.on('message', async (data: RawData) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'join') {
          const matchId = String(message.matchId || '');
          if (!matchId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid matchId' }));
            return;
          }

          const allowed = await userCanAccessMatch(matchId, auth.userId);
          if (!allowed) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not allowed' }));
            ws.close(1008, 'Forbidden');
            return;
          }

          const participants = await getMatchParticipants(matchId);
          if (!participants) {
            ws.send(JSON.stringify({ type: 'error', message: 'Match not found' }));
            return;
          }

          const otherUserId =
            participants.actorUserId === auth.userId
              ? participants.targetUserId
              : participants.actorUserId;

          if (await isBlockedBetween(auth.userId, otherUserId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Conversation blocked' }));
            ws.close(1008, 'Blocked');
            return;
          }

          const now = Date.now();
          const lastJoin = callJoinRate.get(auth.userId) || 0;
          if (now - lastJoin < 3000) {
            ws.send(JSON.stringify({ type: 'error', message: 'Too many call attempts' }));
            return;
          }
          callJoinRate.set(auth.userId, now);

          const existingRoom = callRooms.get(matchId);
          const joinedMatchId = callClientMeta.get(ws)?.matchId;
          if (joinedMatchId && joinedMatchId !== matchId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Socket is already in another room' }));
            return;
          }
          if (joinedMatchId === matchId) return;

          if (existingRoom && existingRoom.clients.length >= 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room full' }));
            return;
          }

          const room =
            existingRoom ??
            ({
              matchId,
              clients: [],
            } satisfies CallRoom);

          room.clients.push(ws);
          callRooms.set(matchId, room);
          callClientMeta.set(ws, { userId: auth.userId, matchId });

          if (room.clients.length === 2) {
            const [caller, callee] = room.clients;
            caller.send(JSON.stringify({ type: 'ready', role: 'caller' }));
            callee.send(JSON.stringify({ type: 'ready', role: 'callee' }));
          } else {
            ws.send(JSON.stringify({ type: 'waiting' }));
          }

          return;
        }

        if (message.type === 'offer' || message.type === 'answer' || message.type === 'candidate') {
          const matchId = callClientMeta.get(ws)?.matchId;
          if (!matchId || message.matchId !== matchId) {
            return;
          }
          broadcastToRoom(matchId, { type: message.type, data: message.data }, ws);
          return;
        }

        if (message.type === 'hangup') {
          const matchId = callClientMeta.get(ws)?.matchId;
          if (!matchId || message.matchId !== matchId) {
            return;
          }
          broadcastToRoom(matchId, { type: 'hangup' }, ws);
          return;
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid payload' }));
      }
    });

    ws.on('close', () => {
      const meta = callClientMeta.get(ws);
      if (meta?.matchId) {
        broadcastToRoom(meta.matchId, { type: 'hangup' }, ws);
      }
      removeClientFromRoom(ws);
      callClientMeta.delete(ws);
    });
  });

  const chatWss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

  server.on('upgrade', (request, socket, head) => {
    void (async () => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const target = url.pathname === '/ws/chat' ? chatWss : url.pathname === '/ws/calls' ? wss : null;
      const token = url.searchParams.get('token') ?? '';
      const auth = verifyAuthToken(token);
      if (!target || !auth || (request.headers.origin && !isOriginAllowed(request.headers.origin))) { socket.destroy(); return; }
      const payload = jwt.decode(token);
      const version = payload && typeof payload === 'object' && typeof payload.version === 'string' ? payload.version : '';
      const user = await UserModel.findById(auth.userId).select('authVersion').lean();
      if (!user || (user.authVersion ?? '') !== version) { socket.destroy(); return; }
      target.handleUpgrade(request, socket, head, ws => target.emit('connection', ws, request));
    })().catch(() => socket.destroy());
  });

  chatWss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      ws.close(1008, 'Origin not allowed');
      return;
    }

    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token') || '';
    const auth = verifyAuthToken(token);
    if (!auth) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    chatClientMeta.set(ws, { userId: auth.userId });

    ws.on('message', async (data: RawData) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'join') {
          const matchId = String(message.matchId || '');
          if (!matchId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid matchId' }));
            return;
          }

          const allowed = await userCanAccessMatch(matchId, auth.userId);
          if (!allowed) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not allowed' }));
            ws.close(1008, 'Forbidden');
            return;
          }

          const participants = await getMatchParticipants(matchId);
          if (!participants) {
            ws.send(JSON.stringify({ type: 'error', message: 'Match not found' }));
            return;
          }

          const otherUserId =
            participants.actorUserId === auth.userId
              ? participants.targetUserId
              : participants.actorUserId;

          if (await isBlockedBetween(auth.userId, otherUserId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Conversation blocked' }));
            ws.close(1008, 'Blocked');
            return;
          }

          const joinedMatchId = chatClientMeta.get(ws)?.matchId;
          if (joinedMatchId && joinedMatchId !== matchId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Socket is already in another room' }));
            return;
          }
          if (joinedMatchId === matchId) return;

          const room = chatRooms.get(matchId) ?? [];
          room.push(ws);
          chatRooms.set(matchId, room);
          chatClientMeta.set(ws, { userId: auth.userId, matchId });

          ws.send(JSON.stringify({ type: 'joined' }));
          return;
        }

        if (message.type === 'call:invite') {
          const matchId = chatClientMeta.get(ws)?.matchId;
          const callType = String(message.callType || 'audio');
          if (!matchId || message.matchId !== matchId) return;
          broadcastChat(matchId, { type: 'call:incoming', data: { callType, from: auth.userId } }, ws);
          return;
        }

        if (message.type === 'call:accept' || message.type === 'call:decline') {
          const matchId = chatClientMeta.get(ws)?.matchId;
          const callType = String(message.callType || 'audio');
          if (!matchId || message.matchId !== matchId) return;
          broadcastChat(
            matchId,
            { type: message.type, data: { callType, from: auth.userId } },
            ws
          );
          return;
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid payload' }));
      }
    });

    ws.on('close', () => {
      removeChatClient(ws);
      chatClientMeta.delete(ws);
    });
  });

  server.listen(PORT, () => {
    console.log(`
🚀 Clever Match Backend Server
📍 http://localhost:${PORT}
✓ API ready at http://localhost:${PORT}/api
✓ Health check at http://localhost:${PORT}/api/health
  `);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `[Startup Error] Port ${PORT} is already in use. Start the backend with another port, for example: PORT=5002 npm run start`
      );
    } else {
      const message = error.message || 'Unknown server error';
      console.error(`[Startup Error] ${message}`);
    }

    void disconnectDatabase().finally(() => process.exit(1));
  });
}

void startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  console.error(`[Startup Error] ${message}`);
  process.exit(1);
});

process.on('SIGINT', () => {
  void disconnectDatabase().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void disconnectDatabase().finally(() => process.exit(0));
});

export default app;
