import { UserModel } from '../models/User.js';
import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export function mayUseAccount(user: { isGuest?: boolean | null; emailVerifiedAt?: Date | null }): boolean {
  return user.isGuest === true || user.emailVerifiedAt instanceof Date;
}

export interface AuthenticatedRequest extends Request {
  authUserId?: string;
  authVersion?: string;
}

interface TokenPayload {
  sub: string;
  email: string;
  role?: string;
  version?: string;
}

type TokenUse = 'access' | 'refresh';

export function ensureAuthConfig(): void {
  if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes. Configure it in the environment.');
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('$2')) {
    return bcrypt.compare(password, hash);
  }

  return password === hash;
}

export function needsPasswordRehash(hash: string): boolean {
  return !hash.startsWith('$2');
}

export function signAuthToken(payload: TokenPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is missing. Please set it in backend/.env');
  }

  const signOptions: jwt.SignOptions = {
    subject: payload.sub,
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };

  return jwt.sign({ email: payload.email, role: payload.role, version: payload.version ?? '', tokenUse: 'access' }, JWT_SECRET, {
    ...signOptions,
  });
}

export function signRefreshToken(payload: TokenPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is missing. Please set it in backend/.env');
  }

  const signOptions: jwt.SignOptions = {
    subject: payload.sub,
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };

  return jwt.sign({ email: payload.email, tokenUse: 'refresh' }, JWT_SECRET, {
    ...signOptions,
  });
}

export function verifyRefreshToken(token: string): (TokenPayload & jwt.JwtPayload) | null {
  if (!JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as
      | (TokenPayload & jwt.JwtPayload & { tokenUse?: TokenUse })
      | null;
    return decoded?.tokenUse === 'refresh' ? decoded : null;
  } catch {
    return null;
  }
}

export function authenticateRequest(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    if (!JWT_SECRET) {
      next();
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as
      | (TokenPayload & jwt.JwtPayload & { tokenUse?: TokenUse })
      | null;
    req.authUserId =
      decoded?.tokenUse === 'access' && typeof decoded.sub === 'string' ? decoded.sub : undefined;
    req.authVersion = typeof decoded?.version === 'string' ? decoded.version : '';
  } catch {
    req.authUserId = undefined;
  }

  next();
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.authUserId) {
    res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    return;
  }

  try {
    const user = await UserModel.findById(req.authUserId).select('authVersion isGuest emailVerifiedAt').lean();
    if (!user || (user.authVersion ?? '') !== (req.authVersion ?? '')) {
      res.status(401).json({ error: 'Session expired', code: 'AUTH_REQUIRED' });
      return;
    }
    if (!mayUseAccount(user)) {
      res.status(403).json({ error: 'Please verify your email address before signing in.', code: 'EMAIL_NOT_VERIFIED' });
      return;
    }
    next();
  } catch (error) { next(error); }
}
