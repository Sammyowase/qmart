import mongoose from 'mongoose';
import { Transaction, ITransaction } from '../models/transaction.model';
import { creditWallet, debitWallet, getWalletByAccountNumber, getWalletByUserId } from './wallet.service';
import { metricsTracker } from '../middleware/prometheus.middleware';
import { User } from '../Auth/customer/customer.model';

/**
 * Create a new transaction record
 */
export const createTransaction = async (transactionData: Partial<ITransaction>): Promise<ITransaction> => {
  const transaction = new Transaction(transactionData);
  return await transaction.save();
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (transactionId: string): Promise<ITransaction> => {
  const transaction = await Transaction.findOne({ transactionId })
    .populate('senderWallet', 'accountNumber userId')
    .populate('receiverWallet', 'accountNumber userId');

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  return transaction;
};

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (
  transactionId: string,
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
): Promise<ITransaction> => {
  const transaction = await Transaction.findOne({ transactionId });
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  transaction.status = status;
  if (status === 'completed' || status === 'failed') {
    transaction.completedAt = new Date();
  }

  return await transaction.save();
};

/**
 * Get transaction history for a user
 */
export const getTransactionHistory = async (
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ transactions: ITransaction[]; total: number }> => {
  // Get user's wallet
  const wallet = await getWalletByUserId(userId);

  // Build query to find transactions where user is sender or receiver
  const query = {
    $or: [
      { senderWallet: wallet._id },
      { receiverWallet: wallet._id }
    ]
  };

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .populate('senderWallet', 'accountNumber userId')
      .populate('receiverWallet', 'accountNumber userId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset),
    Transaction.countDocuments(query)
  ]);

  return { transactions, total };
};

/**
 * Transfer funds between wallets
 */
export const transferFunds = async (
  senderId: string,
  recipientIdentifier: string,
  amount: number,
  method: 'account_number' | 'qr_code',
  remark?: string
): Promise<ITransaction> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validate amount
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }

    // Get sender wallet
    const senderWallet = await getWalletByUserId(senderId);
    if (!senderWallet) {
      throw new Error('Sender wallet not found');
    }

    // Check if sender wallet can transact
    if (!senderWallet.canTransact(amount)) {
      throw new Error('Sender wallet cannot perform this transaction');
    }

    // Check daily limit
    const dailySpent = await getDailyTransactionAmount(senderId);
    if (dailySpent + amount > senderWallet.dailyLimit) {
      throw new Error('Transaction exceeds daily limit');
    }

    // Get receiver wallet
    let receiverWallet;
    if (method === 'account_number') {
      receiverWallet = await getWalletByAccountNumber(recipientIdentifier);
    } else if (method === 'qr_code') {
      // Parse QR code data
      try {
        const qrData = JSON.parse(recipientIdentifier);
        receiverWallet = await getWalletByAccountNumber(qrData.accountNumber);
      } catch (error) {
        throw new Error('Invalid QR code format');
      }
    } else {
      throw new Error('Invalid transfer method');
    }

    if (!receiverWallet) {
      throw new Error('Receiver wallet not found');
    }

    // Check if receiver wallet is active
    if (receiverWallet.status !== 'active') {
      throw new Error('Receiver wallet is not active');
    }

    // Prevent self-transfer
    if (senderWallet._id.equals(receiverWallet._id)) {
      throw new Error('Cannot transfer to the same wallet');
    }

    // Create transaction record
    const transaction = new Transaction({
      senderWallet: senderWallet._id,
      receiverWallet: receiverWallet._id,
      amount,
      type: 'transfer',
      method,
      status: 'pending',
      remark: remark?.trim() || undefined
    });

    const savedTransaction = await transaction.save({ session });

    // Perform the transfer
    await debitWallet(senderId, amount, savedTransaction.transactionId);
    await creditWallet(receiverWallet.userId.toString(), amount, savedTransaction.transactionId);

    // Mark transaction as completed
    savedTransaction.status = 'completed';
    savedTransaction.completedAt = new Date();
    await savedTransaction.save({ session });

    await session.commitTransaction();

    // Track metrics
    const senderUser = await User.findById(senderWallet.userId);
    metricsTracker.trackWalletOperation('transfer', senderUser?.role as 'customer' | 'merchant' || 'customer');
    metricsTracker.trackTransactionAmount(amount, 'transfer', method);

    return savedTransaction;

  } catch (error) {
    await session.abortTransaction();

    // If transaction was created, mark it as failed
    try {
      await Transaction.findOneAndUpdate(
        { transactionId: (error as any).transactionId },
        { status: 'failed', completedAt: new Date() }
      );
    } catch (updateError) {
      // Ignore update errors
    }

    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Validate transaction limits for a user
 */
export const validateTransactionLimits = async (userId: string, amount: number): Promise<boolean> => {
  const wallet = await getWalletByUserId(userId);

  // Check if amount is within daily limit
  const dailySpent = await getDailyTransactionAmount(userId);
  return (dailySpent + amount) <= wallet.dailyLimit;
};

/**
 * Check daily transaction limit for a user
 */
export const checkDailyTransactionLimit = async (userId: string, amount: number): Promise<boolean> => {
  return await validateTransactionLimits(userId, amount);
};

/**
 * Get total amount spent today by a user
 */
export const getDailyTransactionAmount = async (userId: string): Promise<number> => {
  const wallet = await getWalletByUserId(userId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const result = await Transaction.aggregate([
    {
      $match: {
        senderWallet: wallet._id,
        status: 'completed',
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  return result[0]?.totalAmount || 0;
};

/**
 * Get transaction statistics for a wallet
 */
export const getTransactionStatistics = async (userId: string, days: number = 30) => {
  const wallet = await getWalletByUserId(userId);
  return await Transaction.getWalletSummary(wallet._id.toString(), days);
};

/**
 * Cancel a pending transaction
 */
export const cancelTransaction = async (transactionId: string, userId: string): Promise<ITransaction> => {
  const transaction = await Transaction.findOne({ transactionId })
    .populate('senderWallet', 'userId');

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Get sender wallet to check ownership
  const senderWallet = await getWalletByUserId(userId);
  if (!transaction.senderWallet._id.equals(senderWallet._id)) {
    throw new Error('Unauthorized to cancel this transaction');
  }

  // Can only cancel pending transactions
  if (transaction.status !== 'pending') {
    throw new Error('Can only cancel pending transactions');
  }

  transaction.status = 'cancelled';
  transaction.completedAt = new Date();

  return await transaction.save();
};
