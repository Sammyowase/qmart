import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Enhanced rate limiting for different operation types
 */

// Transfer operations - 10 per minute
export const transferLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    status: 'error',
    message: 'Too many transfer attempts. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    return (req as any).user?.userId || req.ip;
  }
});

// KYC submissions - 3 per hour
export const kycSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    status: 'error',
    message: 'Too many KYC submissions. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).user?.userId || req.ip;
  }
});

// PIN operations - 5 per 15 minutes
export const pinOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    status: 'error',
    message: 'Too many PIN operations. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).user?.userId || req.ip;
  }
});

// OTP requests - 5 per 15 minutes
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    status: 'error',
    message: 'Too many OTP requests. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).user?.userId || req.ip;
  }
});

// Admin operations - 100 per 15 minutes
export const adminOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    status: 'error',
    message: 'Too many admin operations. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).user?.userId || req.ip;
  }
});

// Authentication attempts - 5 per 15 minutes (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown'; // Use IP for auth attempts
  }
});

// General API rate limiting - 100 per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    status: 'error',
    message: 'Too many requests. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Wallet query operations - 50 per minute
export const walletQueryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: {
    status: 'error',
    message: 'Too many wallet queries. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return (req as any).user?.userId || req.ip || 'unknown';
  }
});

// Admin panel access - 200 per 15 minutes
export const adminPanelLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    status: 'error',
    message: 'Too many admin panel requests. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Failed login attempts tracking
export const failedLoginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 failed attempts per hour
  message: {
    status: 'error',
    message: 'Too many failed login attempts. Account temporarily locked.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request): string => {
    // Combine IP and email for failed login tracking
    const email = req.body?.email || 'unknown';
    return `${req.ip || 'unknown'}:${email}`;
  }
});

// Suspicious activity limiter - very strict
export const suspiciousActivityLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Only 3 attempts per day for suspicious activities
  message: {
    status: 'error',
    message: 'Suspicious activity detected. Account temporarily restricted.',
    retryAfter: 86400
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Dynamic rate limiter based on user tier
 */
export const createTierBasedLimiter = (operation: string) => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: (req: Request) => {
      const user = (req as any).user;
      if (!user) return 10; // Default for unauthenticated

      // Adjust limits based on KYC tier (if available)
      const tier = user.kycTier || 1;

      switch (operation) {
        case 'transfer':
          return tier === 3 ? 20 : tier === 2 ? 15 : 10;
        case 'query':
          return tier === 3 ? 100 : tier === 2 ? 75 : 50;
        default:
          return 10;
      }
    },
    message: {
      status: 'error',
      message: `Too many ${operation} operations. Upgrade your KYC tier for higher limits.`,
      retryAfter: 60
    },
    keyGenerator: (req: Request): string => {
      return (req as any).user?.userId || req.ip || 'unknown';
    }
  });
};

/**
 * Rate limit bypass for admin users
 */
export const adminBypassLimiter = (limiter: any) => {
  return (req: Request, res: Response, next: any) => {
    const user = (req as any).user;

    // Bypass rate limiting for admin users
    if (user && user.role === 'admin') {
      return next();
    }

    // Apply normal rate limiting for non-admin users
    return limiter(req, res, next);
  };
};
