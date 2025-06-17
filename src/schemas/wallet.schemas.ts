import { z } from 'zod';

// Wallet transfer validation schema
export const transferFundsSchema = z.object({
  recipientIdentifier: z.string()
    .min(9, 'Recipient identifier must be at least 9 characters')
    .max(500, 'Recipient identifier too long')
    .refine((val) => {
      // Validate account number (9 digits) or QR code JSON
      if (/^[0-9]{9}$/.test(val)) return true;
      try {
        const parsed = JSON.parse(val);
        return parsed.accountNumber && /^[0-9]{9}$/.test(parsed.accountNumber);
      } catch {
        return false;
      }
    }, 'Invalid recipient identifier format'),
  
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(10000000, 'Amount exceeds maximum limit')
    .refine((val) => {
      // Check for max 2 decimal places
      return Number(val.toFixed(2)) === val;
    }, 'Amount can have maximum 2 decimal places'),
  
  method: z.enum(['account_number', 'qr_code'], {
    errorMap: () => ({ message: 'Method must be either account_number or qr_code' })
  }),
  
  remark: z.string()
    .max(500, 'Remark cannot exceed 500 characters')
    .optional(),
  
  pin: z.string()
    .regex(/^[0-9]{4}$/, 'PIN must be exactly 4 digits')
    .optional()
});

// PIN management schemas
export const setPinSchema = z.object({
  pin: z.string()
    .regex(/^[0-9]{4}$/, 'PIN must be exactly 4 digits'),
  
  otp: z.string()
    .regex(/^[0-9]{6}$/, 'OTP must be exactly 6 digits')
});

export const resetPinSchema = z.object({
  newPin: z.string()
    .regex(/^[0-9]{4}$/, 'New PIN must be exactly 4 digits'),
  
  otp: z.string()
    .regex(/^[0-9]{6}$/, 'OTP must be exactly 6 digits')
});

export const verifyPinSchema = z.object({
  pin: z.string()
    .regex(/^[0-9]{4}$/, 'PIN must be exactly 4 digits')
});

// OTP request schema
export const requestOTPSchema = z.object({
  type: z.enum(['pin_setup', 'pin_reset'], {
    errorMap: () => ({ message: 'Type must be either pin_setup or pin_reset' })
  })
});

// QR code generation schema
export const generateQRSchema = z.object({
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(10000000, 'Amount exceeds maximum limit')
    .refine((val) => {
      return Number(val.toFixed(2)) === val;
    }, 'Amount can have maximum 2 decimal places')
    .optional()
});

// Transaction history query schema
export const transactionHistorySchema = z.object({
  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  
  offset: z.number()
    .int('Offset must be an integer')
    .min(0, 'Offset must be non-negative')
    .optional()
    .default(0)
});

// Statistics query schema
export const statisticsSchema = z.object({
  days: z.number()
    .int('Days must be an integer')
    .min(1, 'Days must be at least 1')
    .max(365, 'Days cannot exceed 365')
    .optional()
    .default(30)
});

// Type exports
export type TransferFundsInput = z.infer<typeof transferFundsSchema>;
export type SetPinInput = z.infer<typeof setPinSchema>;
export type ResetPinInput = z.infer<typeof resetPinSchema>;
export type VerifyPinInput = z.infer<typeof verifyPinSchema>;
export type RequestOTPInput = z.infer<typeof requestOTPSchema>;
export type GenerateQRInput = z.infer<typeof generateQRSchema>;
export type TransactionHistoryInput = z.infer<typeof transactionHistorySchema>;
export type StatisticsInput = z.infer<typeof statisticsSchema>;
