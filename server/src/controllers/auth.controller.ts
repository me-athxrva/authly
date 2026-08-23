import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import redis from '../lib/redis';
import { AuthRequest } from '../middlewares/auth.middleware';
import crypto from 'crypto';

const generateKey = (prefix: string) => {
  return `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
};

const generateRSAKeys = () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  return { privateKey, publicKey };
};
 
const createSession = async (res: Response, user: any, app: any) => {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const sessionData = {
    userId: user.id,
    appId: app.id,
    publicKey: app.publicKey,
  };
  
  await redis.set(`session:${sessionId}`, JSON.stringify(sessionData), 'EX', 86400); // 24 hours
  
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });
  
  return sessionId;
};

const JWT_SECRET = process.env.JWT_SECRET || 'this-is-development-secret-key-1234567890';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'this-is-development-refresh-secret-key-0987654321';

const registerAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isPro: z.boolean().optional(),
  plan: z.string().optional(),
});

const createAppSchema = z.object({
  appName: z.string().min(2),
  appSlug: z.string().min(2),
  authType: z.enum(['JWT', 'SESSION']).optional(),
});

const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const registerAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = registerAdminSchema.parse(req.body);

    const existingAdmin = await prisma.admin.findUnique({
      where: { email: data.email },
    });

    if (existingAdmin) {
      return res.status(400).json({
        message: 'Email already registered',
        status: "failed"
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const admin = await prisma.admin.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        isPro: data.isPro || false,
        plan: data.plan || 'FREE',
      },
    });

    res.status(201).json({
      message: 'Admin registered successfully',
      admin: {
        id: admin.id,
        email: admin.email,
      },
      status: "success",
    });
  } catch (error) {
    next(error);
  }
};

export const createApp = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createAppSchema.parse(req.body);
    const adminId = req.adminId;

    // Fetch admin to check Pro status and app limit
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: { _count: { select: { apps: true } } }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found', status: 'failed' });
    }

    if (!admin.isPro && admin._count.apps >= 1) {
      return res.status(403).json({ 
        message: 'Free tier limit reached. You can only create 1 app. Upgrade to Pro for unlimited apps.', 
        status: 'failed' 
      });
    }

    // Check if app slug exists
    const existingApp = await prisma.app.findUnique({
      where: { slug: data.appSlug },
    });

    if (existingApp) {
      return res.status(400).json({
        message: 'App slug already taken',
        status: "failed"
      });
    }

    const publicKey = generateKey('pk');
    const secretKey = generateKey('sk');
    const rsaKeys = generateRSAKeys();

    const app = await prisma.app.create({
      data: {
        name: data.appName,
        slug: data.appSlug,
        publicKey: publicKey,
        adminId: adminId!,
        authType: data.authType || 'JWT',
        apiKeys: {
          create: {
            key: secretKey,
            name: 'Default Secret Key',
          },
        },
        jwtConfig: {
          create: {
            privateKey: rsaKeys.privateKey,
            publicKey: rsaKeys.publicKey,
          },
        },
      },
    });


    res.status(201).json({
      message: 'App created successfully',
      app: {
        id: app.id,
        name: app.name,
        slug: app.slug,
        publicKey: app.publicKey,
        jwtPublicKey: rsaKeys.publicKey,
        secretKey: secretKey,
        authType: app.authType,
      },
      status: "success",
    });
  } catch (error) {
    next(error);
  }
};

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerUserSchema.parse(req.body);

    const publicKey = req.headers['x-public-key'] as string;

    if (!publicKey) {
      return res.status(400).json({ message: 'Public Key (x-public-key header) is required', status: 'failed' });
    }

    const app = await prisma.app.findUnique({
      where: { publicKey: publicKey },
      include: { jwtConfig: true }
    });


    if (!app) {
      return res.status(404).json({ message: 'App not found', status: 'failed' });
    }

    if (!app.isActive) {
      return res.status(403).json({ message: 'App access has been revoked', status: 'failed' });
    }




    const existingUser = await prisma.user.findUnique({
      where: {
        email_appId: {
          email: data.email,
          appId: app.id,
        },
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already registered in this app', status: 'failed' });
    }


    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        appId: app.id,
      },
    });

    if (app.authType === 'SESSION') {
      await createSession(res, user, app);
      return res.status(201).json({
        message: 'User registered successfully (Session started)',
        status: "success",
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, publicKey: app.publicKey },
      app.jwtConfig!.privateKey,
      { expiresIn: '15m', algorithm: 'RS256' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, publicKey: app.publicKey },
      app.jwtConfig!.privateKey,
      { expiresIn: '24h', algorithm: 'RS256' }
    );



    res.cookie('userRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      status: "success",
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const publicKey = req.headers['x-public-key'] as string;

    if (!publicKey) {
      return res.status(400).json({ error: 'Public Key (x-public-key header) is required' });
    }

    const app = await prisma.app.findUnique({
      where: { publicKey: publicKey },
      include: { jwtConfig: true }
    });



    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    if (!app.isActive) {
      return res.status(403).json({ error: 'App access has been revoked' });
    }



    const user = await prisma.user.findUnique({
      where: {
        email_appId: {
          email,
          appId: app.id,
        },
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (app.authType === 'SESSION') {
      await createSession(res, user, app);
      return res.json({
        message: 'Login successful (Session started)',
        status: "success",
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, publicKey: app.publicKey },
      app.jwtConfig!.privateKey,
      { expiresIn: '15m', algorithm: 'RS256' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, publicKey: app.publicKey },
      app.jwtConfig!.privateKey,
      { expiresIn: '24h', algorithm: 'RS256' }
    );



    res.cookie('userRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      accessToken,
      status: "success",
    });
  } catch (error) {
    next(error);
  }
};

export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: 'Invalid credentials', status: "failed" });
    }

    const accessToken = jwt.sign(
      { adminId: admin.id, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { adminId: admin.id, role: 'ADMIN' },
      JWT_REFRESH_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('adminRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      accessToken,
      status: "success",
    });
  } catch (error) {
    next(error);
  }
};

export const adminRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.adminRefreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required', status: 'failed' });
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Refresh token has been revoked', status: 'failed' });
    }

    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;


    if (!payload.adminId || payload.role !== 'ADMIN') {
      return res.status(401).json({ message: 'Invalid refresh token', status: 'failed' });
    }

    const newAccessToken = jwt.sign(
      { adminId: payload.adminId, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      accessToken: newAccessToken,
      status: "success",
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token', status: 'failed' });
  }
};

export const userRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.userRefreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required', status: 'failed' });
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Refresh token has been revoked', status: 'failed' });
    }

    const payload = jwt.decode(refreshToken) as any;
    if (!payload || !payload.publicKey) {
      return res.status(401).json({ message: 'Invalid refresh token', status: 'failed' });
    }

    const app = await prisma.app.findUnique({
      where: { publicKey: payload.publicKey },
      include: { jwtConfig: true }
    });

    if (!app || !app.jwtConfig) {
      return res.status(401).json({ message: 'App configuration not found', status: 'failed' });
    }

    const verifiedPayload = jwt.verify(refreshToken, app.jwtConfig.publicKey, { algorithms: ['RS256'] }) as any;

    const newAccessToken = jwt.sign(
      { userId: verifiedPayload.userId, publicKey: verifiedPayload.publicKey },
      app.jwtConfig.privateKey,
      { expiresIn: '15m', algorithm: 'RS256' }
    );

    res.json({
      accessToken: newAccessToken,
      status: "success",
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token', status: 'failed' });
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminToken = req.cookies.adminRefreshToken;
    const userToken = req.cookies.userRefreshToken;
    const sessionId = req.cookies.sessionId;
    const accessToken = req.headers.authorization?.split(' ')[1];

    if (adminToken) {
      await redis.set(`blacklist:${adminToken}`, '1', 'EX', 86400);
    }
    if (userToken) {
      await redis.set(`blacklist:${userToken}`, '1', 'EX', 86400);
    }
    if (sessionId) {
      await redis.del(`session:${sessionId}`);
    }
    if (accessToken) {
      await redis.set(`blacklist:${accessToken}`, '1', 'EX', 900); // 15 mins
    }

    res.clearCookie('adminRefreshToken');
    res.clearCookie('userRefreshToken');
    res.clearCookie('sessionId');

    res.json({
      message: 'Logged out successfully',
      status: 'success'
    });
  } catch (error) {
    next(error);
  }
};
 
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated', status: 'failed' });
    }
 
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        appId: true,
        createdAt: true,
      }
    });
 
    if (!user) {
      return res.status(404).json({ message: 'User not found', status: 'failed' });
    }
 
    res.json({
      user,
      status: 'success'
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminApps = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.adminId;
    if (!adminId) {
      return res.status(401).json({ message: 'Admin not authenticated', status: 'failed' });
    }

    const apps = await prisma.app.findMany({
      where: { adminId },
      include: {
        apiKeys: {
          select: {
            key: true,
            name: true,
            createdAt: true,
          },
        },
        jwtConfig: {
          select: {
            publicKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedApps = apps.map(app => ({
      ...app,
      jwtPublicKey: app.jwtConfig?.publicKey,
    }));

    res.json({
      apps: formattedApps,
      status: 'success',
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.adminId;
    if (!adminId) {
      return res.status(401).json({ message: 'Admin not authenticated', status: 'failed' });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isPro: true,
        plan: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found', status: 'failed' });
    }

    res.json({
      admin,
      status: 'success',
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminId = req.adminId;
    if (!adminId) {
      return res.status(401).json({ message: 'Admin not authenticated', status: 'failed' });
    }

    // 1. Fetch admin profile
    const adminPromise = prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isPro: true,
        plan: true,
        createdAt: true,
      },
    });

    // 2. Fetch all apps owned by this admin
    const appsPromise = prisma.app.findMany({
      where: { adminId },
      include: {
        apiKeys: {
          select: {
            key: true,
            name: true,
            createdAt: true,
          },
        },
        jwtConfig: {
          select: {
            publicKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const [admin, apps] = await Promise.all([adminPromise, appsPromise]);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found', status: 'failed' });
    }

    // 3. Determine selected app (by appId, appSlug, or defaulting to first app)
    const queryAppId = req.query.appId as string;
    const queryAppSlug = req.query.appSlug as string;
    
    let selectedApp = null;
    if (queryAppId) {
      selectedApp = apps.find(a => a.id === queryAppId) || null;
    } else if (queryAppSlug) {
      selectedApp = apps.find(a => a.slug === queryAppSlug) || null;
    } else if (apps.length > 0) {
      selectedApp = apps[0];
    }

    // 4. Fetch paginated users for the selected app (if any)
    let users: any[] = [];
    let pagination = {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };

    if (selectedApp) {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';
      
      const skip = (page - 1) * limit;

      const whereClause: any = {
        appId: selectedApp.id,
      };

      if (search) {
        whereClause.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [usersList, totalUsers] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where: whereClause }),
      ]);

      users = usersList;
      pagination = {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
      };
    }

    const formattedApps = apps.map(app => ({
      ...app,
      jwtPublicKey: app.jwtConfig?.publicKey,
    }));

    res.json({
      admin,
      apps: formattedApps,
      selectedApp: selectedApp ? {
        id: selectedApp.id,
        name: selectedApp.name,
        slug: selectedApp.slug,
        publicKey: selectedApp.publicKey,
        jwtPublicKey: selectedApp.jwtConfig?.publicKey,
        authType: selectedApp.authType,
        isActive: selectedApp.isActive,
        createdAt: selectedApp.createdAt,
        apiKeys: selectedApp.apiKeys,
      } : null,
      users,
      pagination,
      status: 'success',
    });
  } catch (error) {
    next(error);
  }
};

export const getJwtPublicKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const publicKeyHeader = req.headers['x-public-key'] as string;
    const queryPublicKey = req.query.publicKey as string;
    const queryAppSlug = req.query.appSlug as string;
    const queryAppId = req.query.appId as string;

    const keyOrIdentifier = publicKeyHeader || queryPublicKey;

    let whereClause: any = {};
    if (keyOrIdentifier) {
      whereClause = { publicKey: keyOrIdentifier };
    } else if (queryAppSlug) {
      whereClause = { slug: queryAppSlug };
    } else if (queryAppId) {
      whereClause = { id: queryAppId };
    } else {
      return res.status(400).json({
        message: 'App identifier required via x-public-key header, or publicKey/appSlug/appId query parameter',
        status: 'failed',
      });
    }

    const app = await prisma.app.findFirst({
      where: {
        ...whereClause,
        adminId: req.adminId,
      },
      include: { jwtConfig: true },
    });

    if (!app || !app.jwtConfig) {
      return res.status(404).json({ message: 'App or JWT configuration not found', status: 'failed' });
    }

    res.json({
      publicKey: app.jwtConfig.publicKey,
      algorithm: 'RS256',
      status: 'success',
    });
  } catch (error) {
    next(error);
  }
};



