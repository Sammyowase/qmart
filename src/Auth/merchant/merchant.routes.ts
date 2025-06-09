import { Router } from 'express';
import { merchantSignup, merchantSignin, merchantBusinessInfo } from './merchant.controller';
import { authenticateToken, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// Public merchant routes
router.post('/signup', merchantSignup);
router.post('/signin', merchantSignin);

// Protected merchant routes (requires authentication)
router.post('/business-info', authenticateToken, requireRole(['merchant']), merchantBusinessInfo
);

export default router;
