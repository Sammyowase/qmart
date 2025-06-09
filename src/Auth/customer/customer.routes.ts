import { Router } from 'express';
import { customerSignup, customerSignin } from './customer.controller';

const router = Router();

// Customer-specific routes
router.post('/signup', customerSignup);
router.post('/signin', customerSignin);

export default router;
