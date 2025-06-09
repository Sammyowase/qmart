import { Request, Response, NextFunction } from 'express';
import { verifyOTP, forgotPassword, resetPassword } from './auth.service';

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyOTP(email, otp);
    
    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

export const forgotPasswordHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const result = await forgotPassword(email);
    
    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

export const resetPasswordHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await resetPassword(email, otp, newPassword);
    
    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

export const signout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('token');
    
    res.status(200).json({
      status: 'success',
      message: 'Signout successful',
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Signout failed',
    });
  }
};
