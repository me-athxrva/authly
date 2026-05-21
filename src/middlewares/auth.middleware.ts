import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import redis from '../lib/redis';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'this-is-development-secret-key-1234567890';

export interface AuthRequest extends Request {
  adminId?: string;
  userId?: string;
  appId?: string;
  role?: string;
  publicKey?: string;
}

export const userAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  const sessionId = (req as any).cookies?.sessionId;
  const publicKey = req.headers['x-public-key'] as string;
 
  if (!token && !sessionId) {
    return res.status(401).json({ message: 'Authentication required', status: 'failed' });
  }
 
  // Handle Session
  if (sessionId) {
    const sessionData = await redis.get(`session:${sessionId}`);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      
      // Security: Ensure session belongs to the app requested
      if (publicKey && parsed.publicKey !== publicKey) {
        return res.status(403).json({ message: 'Session mismatch for this app', status: 'failed' });
      }
 
      req.userId = parsed.userId;
      req.appId = parsed.appId;
      req.publicKey = parsed.publicKey;
      return next();
    }
    // If session was provided but not found, only proceed to JWT if token exists
    if (!token) {
      return res.status(401).json({ message: 'Invalid or expired session', status: 'failed' });
    }
  }
 
  // Handle JWT
  if (token) {
    try {
      if (!publicKey) {
        return res.status(400).json({ message: 'x-public-key header required for JWT verification', status: 'failed' });
      }
 
      // Check blacklist
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ message: 'Token has been revoked', status: 'failed' });
      }
 
      const app = await prisma.app.findUnique({
        where: { publicKey },
        include: { jwtConfig: true }
      });
 
      if (!app || !app.jwtConfig) {
        return res.status(401).json({ message: 'App configuration not found', status: 'failed' });
      }
 
      const payload = jwt.verify(token, app.jwtConfig.publicKey, { algorithms: ['RS256'] }) as any;
      req.userId = payload.userId;
      req.appId = app.id;
      req.publicKey = app.publicKey;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token', status: 'failed' });
    }
  }
};

export const adminAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authorization token required', status: 'failed' });
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked', status: 'failed' });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;


    if (!payload.adminId || payload.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required', status: 'failed' });
    }

    req.adminId = payload.adminId;
    req.role = payload.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token', status: 'failed' });
  }
};
