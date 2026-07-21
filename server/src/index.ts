import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import prisma from './lib/prisma';
import redis from './lib/redis';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting 
app.set('trust proxy', 1);

// Standard Middlewares
app.use(helmet());

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().replace(/^["']|["']$/g, ''))
  : [];

const corsOptionsDelegate: cors.CorsOptionsDelegate<express.Request> = (req, callback) => {
  const restrictedPaths = [
    '/api/auth/admin-login',
    '/api/auth/register-admin',
    '/api/auth/create-app'
  ];

  let corsOptions: cors.CorsOptions;

  if (restrictedPaths.includes(req.path)) {
    corsOptions = {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          cb(null, true);
        } else {
          cb(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    };
  } else {
    corsOptions = {
      origin: true,
      credentials: true
    };
  }

  callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));
app.use(express.json());
app.use(cookieParser());


// Health Check
app.get('/health', async (req, res) => {
  const dbStart = Date.now();
  let dbStatus = 'up';
  let dbLatency: number | null = null;
  let dbError: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (error: any) {
    dbStatus = 'down';
    dbError = error.message || String(error);
  }

  const redisStart = Date.now();
  let redisStatus = 'up';
  let redisLatency: number | null = null;
  let redisError: string | undefined;

  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error(`Unexpected ping response: ${pong}`);
    }
    redisLatency = Date.now() - redisStart;
  } catch (error: any) {
    redisStatus = 'down';
    redisError = error.message || String(error);
  }

  const isHealthy = dbStatus === 'up' && redisStatus === 'up';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbStatus,
        latency: dbLatency !== null ? `${dbLatency}ms` : null,
        ...(dbError && { error: dbError })
      },
      redis: {
        status: redisStatus,
        latency: redisLatency !== null ? `${redisLatency}ms` : null,
        ...(redisError && { error: redisError })
      }
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);

// Protected routes would go here and use tenantMiddleware
// app.use('/api/users', tenantMiddleware, userRoutes);

// Error Handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
