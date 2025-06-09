import { Request, Response, NextFunction } from 'express';
import { createCustomer } from './customer.service';
import { signin } from '../shared/auth.service';

export const customerSignup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await createCustomer(req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Customer account created successfully. Please check your email for verification.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

export const customerSignin = async (req: Request, res: Response, next: NextFunction) => {
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
