import { Router } from 'express';
import { verifyEmail, forgotPasswordHandler, resetPasswordHandler, signout } from './auth.controller';

const router = Router();

// Shared authentication routes
router.post('/verify-otp', verifyEmail);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.post('/signout', signout);

export default router;
