import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { toPublicUser } from '../serializers.js';
import type { UserRole } from '../types.js';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  title: string;
  companyId: string | null;
  companyName: string | null;
  emailVerified: boolean;
  mustChangePassword: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: AuthUser) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { id: string };
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    let companyName: string | null = null;
    if (user.companyId) {
      const company = await Company.findById(user.companyId).select('name');
      companyName = company?.name ?? null;
    }

    req.user = toPublicUser(user, companyName);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action' });
    }
    next();
  };
}
