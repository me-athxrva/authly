import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export interface TenantRequest extends Request {
  appId?: string;
  tenantContext?: any;
}

/**
 * Middleware to identify the tenant from the request.
 */
export const tenantMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  const publicKey = req.headers['x-public-key'] as string;

  if (!publicKey) {
    return res.status(400).json({
      message: 'Public Key (x-public-key header) is required',
      status: "failed"
    });
  }

  try {
    const app = await prisma.app.findUnique({
      where: { publicKey: publicKey },
    });



    if (!app) {
      return res.status(404).json({ 
        message: 'App not found',
        status: "failed" 
      });
    }

    if (!app.isActive) {
      return res.status(403).json({
        message: 'App access has been revoked or is inactive',
        status: "failed"
      });
    }

    // Attach app info to request
    req.appId = app.id;
    req.tenantContext = app;


    next();
  } catch (error) {
    next(error);
  }
};
