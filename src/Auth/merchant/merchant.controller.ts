import { Request, Response, NextFunction } from 'express';
import { createMerchant, addMerchantBusinessInfo } from './merchant.service';
import { signin } from '../shared/auth.service';


interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const merchantSignup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await createMerchant(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Merchant account created successfully. Please verify your email and complete business information.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

export const merchantBusinessInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Security: Extract userId from authenticated JWT token, not request body
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Ensure only merchants can add business information
    if (req.user.role !== 'merchant') {
      res.status(403).json({
        status: 'error',
        message: 'Only merchants can add business information',
      });
      return;
    }

    const userId = req.user.userId; // Secure: Get from authenticated token
    const result = await addMerchantBusinessInfo(userId, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Business information added successfully.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

export const merchantSignin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await signin(req.body);

    // Set JWT token in HTTP-only cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      status: 'success',
      message: 'Signin successful',
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error: any) {
    res.status(401).json({
      status: 'error',
      message: error.message,
    });
  }
};
