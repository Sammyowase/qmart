import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Generic validation middleware factory
 */
export const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      const validatedData = schema.parse(req.body);

      // Replace request body with validated data
      req.body = validatedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errorMessages
        });
        return;
      }

      res.status(400).json({
        status: 'error',
        message: 'Invalid request data'
      });
    }
  };
};

/**
 * Query parameter validation middleware
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Convert query strings to appropriate types
      const queryData = { ...req.query };

      // Convert numeric strings to numbers
      Object.keys(queryData).forEach(key => {
        const value = queryData[key];
        if (typeof value === 'string' && !isNaN(Number(value))) {
          (queryData as any)[key] = Number(value);
        }
      });

      const validatedQuery = schema.parse(queryData);
      req.query = validatedQuery as any;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        res.status(400).json({
          status: 'error',
          message: 'Query validation failed',
          errors: errorMessages
        });
        return;
      }

      res.status(400).json({
        status: 'error',
        message: 'Invalid query parameters'
      });
    }
  };
};

/**
 * URL parameter validation middleware
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedParams = schema.parse(req.params);
      req.params = validatedParams;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        res.status(400).json({
          status: 'error',
          message: 'Parameter validation failed',
          errors: errorMessages
        });
        return;
      }

      res.status(400).json({
        status: 'error',
        message: 'Invalid URL parameters'
      });
    }
  };
};

/**
 * Sanitization middleware for preventing XSS and injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }

    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }

    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }

    return value;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};

/**
 * Rate limiting validation for specific operations
 */
export const validateRateLimit = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Add operation type to request for rate limiting
    (req as any).operationType = operation;
    next();
  };
};

/**
 * Amount validation middleware for financial operations
 */
export const validateAmount = (req: Request, res: Response, next: NextFunction): void => {
  const { amount } = req.body;

  if (amount !== undefined) {
    // Check if amount is a valid number
    if (typeof amount !== 'number' || isNaN(amount)) {
      res.status(400).json({
        status: 'error',
        message: 'Amount must be a valid number'
      });
      return;
    }

    // Check if amount is positive
    if (amount <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Amount must be greater than 0'
      });
      return;
    }

    // Check decimal places (max 2)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      res.status(400).json({
        status: 'error',
        message: 'Amount can have maximum 2 decimal places'
      });
      return;
    }

    // Check maximum amount (10 million Naira)
    if (amount > 10000000) {
      res.status(400).json({
        status: 'error',
        message: 'Amount exceeds maximum limit of ₦10,000,000'
      });
      return;
    }

    // Round to 2 decimal places to prevent floating point issues
    req.body.amount = Math.round(amount * 100) / 100;
  }

  next();
};

/**
 * Account number validation middleware
 */
export const validateAccountNumber = (req: Request, res: Response, next: NextFunction): void => {
  const { recipientIdentifier } = req.body;
  const { accountNumber } = req.params;

  const accountToValidate = recipientIdentifier || accountNumber;

  if (accountToValidate && typeof accountToValidate === 'string') {
    // Check if it's a 9-digit account number
    if (!/^[0-9]{9}$/.test(accountToValidate)) {
      // If not account number, check if it's valid QR code JSON
      try {
        const parsed = JSON.parse(accountToValidate);
        if (!parsed.accountNumber || !/^[0-9]{9}$/.test(parsed.accountNumber)) {
          res.status(400).json({
            status: 'error',
            message: 'Invalid account number or QR code format'
          });
          return;
        }
      } catch {
        res.status(400).json({
          status: 'error',
          message: 'Invalid account number format. Must be 9 digits'
        });
        return;
      }
    }
  }

  next();
};

/**
 * PIN validation middleware
 */
export const validatePIN = (req: Request, res: Response, next: NextFunction): void => {
  const { pin, newPin } = req.body;

  const pinToValidate = pin || newPin;

  if (pinToValidate) {
    if (!/^[0-9]{4}$/.test(pinToValidate)) {
      res.status(400).json({
        status: 'error',
        message: 'PIN must be exactly 4 digits'
      });
      return;
    }
  }

  next();
};
