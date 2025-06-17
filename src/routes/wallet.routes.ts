import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateSchema, validateQuery, sanitizeInput } from '../middleware/validation.middleware';
import { transferLimiter, pinOperationLimiter, otpRequestLimiter, walletQueryLimiter } from '../middleware/enhanced-rate-limit.middleware';
import { transferFundsSchema, setPinSchema, resetPinSchema, verifyPinSchema, requestOTPSchema, transactionHistorySchema, statisticsSchema } from '../schemas/wallet.schemas';
import {
  getBalance,
  getWalletByUserId,
  generateQRCode,
  setWithdrawalPin,
  resetWithdrawalPin,
  validateWithdrawalPin
} from '../services/wallet.service';
import {
  transferFunds,
  getTransactionHistory,
  getTransactionById,
  getTransactionStatistics,
  cancelTransaction
} from '../services/transaction.service';
import { generateOTP, getOTPExpiration } from '../utils/otp';
import { sendOTPEmail } from '../config/email';
import { OTP } from '../models/otp.model';
import { User } from '../Auth/customer/customer.model';

const router = express.Router();

// Extend Request interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Apply authentication and sanitization to all wallet routes
router.use(authenticateToken);
router.use(sanitizeInput);

/**
 * GET /api/wallet/balance
 * Get current wallet balance
 */
router.get('/balance', walletQueryLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const balance = await getBalance(req.user.userId);

    res.json({
      status: 'success',
      data: {
        balance,
        formattedBalance: `₦${balance.toFixed(2)}`
      }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/wallet/details
 * Get complete wallet information
 */
router.get('/details', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const wallet = await getWalletByUserId(req.user.userId);

    res.json({
      status: 'success',
      data: {
        accountNumber: wallet.accountNumber,
        balance: wallet.balance,
        formattedBalance: `₦${wallet.balance.toFixed(2)}`,
        kycTier: wallet.kycTier,
        dailyLimit: wallet.dailyLimit,
        formattedDailyLimit: `₦${wallet.dailyLimit.toLocaleString()}`,
        status: wallet.status,
        hasPIN: !!wallet.withdrawalPin,
        createdAt: wallet.createdAt
      }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/wallet/qr-code
 * Generate QR code for receiving payments
 */
router.get('/qr-code', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { amount } = req.query;
    const wallet = await getWalletByUserId(req.user.userId);

    const qrCode = await generateQRCode(
      wallet.accountNumber,
      amount ? parseFloat(amount as string) : undefined
    );

    res.json({
      status: 'success',
      data: {
        qrCode,
        accountNumber: wallet.accountNumber,
        amount: amount ? parseFloat(amount as string) : null
      }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/wallet/transfer
 * Transfer funds to another wallet
 */
router.post('/transfer', transferLimiter, validateSchema(transferFundsSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { recipientIdentifier, amount, method, remark, pin } = req.body;

    // Validate required fields
    if (!recipientIdentifier || !amount || !method) {
      res.status(400).json({
        status: 'error',
        message: 'Recipient identifier, amount, and method are required'
      });
      return;
    }

    // Validate amount
    if (amount <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Amount must be greater than 0'
      });
      return;
    }

    // Validate method
    if (!['account_number', 'qr_code'].includes(method)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid transfer method'
      });
      return;
    }

    // Validate PIN if provided
    if (pin) {
      const isPinValid = await validateWithdrawalPin(req.user.userId, pin);
      if (!isPinValid) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid withdrawal PIN'
        });
        return;
      }
    }

    const transaction = await transferFunds(
      req.user.userId,
      recipientIdentifier,
      amount,
      method,
      remark
    );

    res.json({
      status: 'success',
      message: 'Transfer completed successfully',
      data: {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        formattedAmount: `₦${transaction.amount.toFixed(2)}`,
        status: transaction.status,
        reference: `QMT${transaction.transactionId.slice(-8).toUpperCase()}`,
        createdAt: transaction.createdAt
      }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/wallet/transactions
 * Get transaction history with pagination
 */
router.get('/transactions', walletQueryLimiter, validateQuery(transactionHistorySchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { transactions, total } = await getTransactionHistory(req.user.userId, limit, offset);

    res.json({
      status: 'success',
      data: {
        transactions: transactions.map(tx => ({
          transactionId: tx.transactionId,
          amount: tx.amount,
          formattedAmount: `₦${tx.amount.toFixed(2)}`,
          type: tx.type,
          method: tx.method,
          status: tx.status,
          remark: tx.remark,
          reference: `QMT${tx.transactionId.slice(-8).toUpperCase()}`,
          createdAt: tx.createdAt,
          completedAt: tx.completedAt
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/wallet/transactions/:id
 * Get specific transaction details
 */
router.get('/transactions/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const transaction = await getTransactionById(req.params.id);

    // Check if user is authorized to view this transaction
    const userWallet = await getWalletByUserId(req.user.userId);
    const isAuthorized = transaction.senderWallet._id.equals(userWallet._id) ||
                        transaction.receiverWallet._id.equals(userWallet._id);

    if (!isAuthorized) {
      res.status(403).json({
        status: 'error',
        message: 'Unauthorized to view this transaction'
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        formattedAmount: `₦${transaction.amount.toFixed(2)}`,
        type: transaction.type,
        method: transaction.method,
        status: transaction.status,
        remark: transaction.remark,
        reference: `QMT${transaction.transactionId.slice(-8).toUpperCase()}`,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
        metadata: transaction.metadata
      }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/wallet/pin/set
 * Set withdrawal PIN (requires OTP)
 */
router.post('/pin/set', pinOperationLimiter, validateSchema(setPinSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { pin, otp } = req.body;

    if (!pin || !otp) {
      res.status(400).json({
        status: 'error',
        message: 'PIN and OTP are required'
      });
      return;
    }

    await setWithdrawalPin(req.user.userId, pin, otp);

    res.json({
      status: 'success',
      message: 'Withdrawal PIN set successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/wallet/pin/reset
 * Reset withdrawal PIN (requires OTP)
 */
router.post('/pin/reset', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { newPin, otp } = req.body;

    if (!newPin || !otp) {
      res.status(400).json({
        status: 'error',
        message: 'New PIN and OTP are required'
      });
      return;
    }

    await resetWithdrawalPin(req.user.userId, newPin, otp);

    res.json({
      status: 'success',
      message: 'Withdrawal PIN reset successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/wallet/pin/verify
 * Verify withdrawal PIN
 */
router.post('/pin/verify', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { pin } = req.body;

    if (!pin) {
      res.status(400).json({
        status: 'error',
        message: 'PIN is required'
      });
      return;
    }

    const isValid = await validateWithdrawalPin(req.user.userId, pin);

    res.json({
      status: 'success',
      data: {
        isValid
      }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * POST /api/wallet/pin/request-otp
 * Request OTP for PIN operations
 */
router.post('/pin/request-otp', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { type } = req.body; // 'pin_setup' or 'pin_reset'

    if (!type || !['pin_setup', 'pin_reset'].includes(type)) {
      res.status(400).json({
        status: 'error',
        message: 'Valid type is required (pin_setup or pin_reset)'
      });
      return;
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiration = getOTPExpiration();

    // Save OTP
    const otpRecord = new OTP({
      email: req.user.email,
      otp,
      type,
      expiresAt: otpExpiration
    });

    await otpRecord.save();

    // Send OTP email
    await sendOTPEmail(req.user.email, otp, type);

    res.json({
      status: 'success',
      message: 'OTP sent to your email address'
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/wallet/statistics
 * Get wallet transaction statistics
 */
router.get('/statistics', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const days = parseInt(req.query.days as string) || 30;
    const stats = await getTransactionStatistics(req.user.userId, days);

    res.json({
      status: 'success',
      data: {
        period: `${days} days`,
        totalTransactions: stats.totalTransactions,
        totalSent: stats.totalSent,
        totalReceived: stats.totalReceived,
        formattedTotalSent: `₦${stats.totalSent.toFixed(2)}`,
        formattedTotalReceived: `₦${stats.totalReceived.toFixed(2)}`
      }
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;
