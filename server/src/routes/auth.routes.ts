import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { loginLimiter } from '../middlewares/limiter.middleware';
import { adminAuthMiddleware, userAuthMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(loginLimiter);

/**
 * @route POST /api/auth/register-admin
 * @desc Register a new admin account (Public)
 */
router.post('/register-admin', authController.registerAdmin);

/**
 * @route POST /api/auth/create-app
 * @desc Create a new app (Protected - Admin only)
 */
router.post('/create-app', adminAuthMiddleware, authController.createApp);


/**
 * @route POST /api/auth/admin-login
 * @desc Login an app admin
 */
router.post('/admin-login', authController.adminLogin);

/**
 * @route POST /api/auth/admin-refresh
 * @desc Refresh admin access token
 */
router.post('/admin-refresh', authController.adminRefreshToken);

/**
 * @route POST /api/auth/register-user
 * @desc Register a new user within a specific tenant
 */
router.post('/register-user', authController.registerUser);

/**
 * @route POST /api/auth/login
 * @desc Login a user within a specific tenant
 */

router.post('/login', authController.login);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh tenant user access token
 */
router.post('/refresh', authController.userRefreshToken);

/**
 * @route POST /api/auth/logout
 * @desc Logout and invalidate refresh tokens
 */
router.post('/logout', authController.logout);
 
/**
 * @route GET /api/auth/me
 * @desc Get currently authenticated user details
 */
router.get('/me', userAuthMiddleware, authController.getMe);

/**
 * @route GET /api/auth/admin-apps
 * @desc Get apps owned by admin (Admin only)
 */
router.get('/admin-apps', adminAuthMiddleware, authController.getAdminApps);

/**
 * @route GET /api/auth/admin-profile
 * @desc Get admin profile (Admin only)
 */
router.get('/admin-profile', adminAuthMiddleware, authController.getAdminProfile);

/**
 * @route GET /api/auth/admin-dashboard
 * @desc Get all data for admin dashboard (Profile, Apps, keys, and paginated users for selected app)
 */
router.get('/admin-dashboard', adminAuthMiddleware, authController.getAdminDashboard);

/**
 * @route GET /api/auth/jwt-public-key
 * @desc Fetch RSA public key for validating app JWT tokens (Admin only)
 */
router.get('/jwt-public-key', adminAuthMiddleware, authController.getJwtPublicKey);

export default router;
