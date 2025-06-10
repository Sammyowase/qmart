import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../Auth/customer/customer.model';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check for token in cookies if not found in header
    if (!token && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Access token is required',
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({
        status: 'error',
        message: 'JWT secret not configured',
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as any;

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'User no longer exists',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        status: 'error',
        message: 'User account is deactivated',
      });
      return;
    }

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as any;
        const user = await User.findById(decoded.userId);

        if (user && user.isActive) {
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
          };
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};
