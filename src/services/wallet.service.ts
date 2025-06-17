import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { Wallet, IWallet } from '../models/wallet.model';
import { Transaction, ITransaction } from '../models/transaction.model';
import { User } from '../Auth/customer/customer.model';
import { OTP } from '../models/otp.model';
import { metricsTracker } from '../middleware/prometheus.middleware';

/**
 * Create a new wallet for a user
 */
export const createWallet = async (userId: string): Promise<IWallet> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Check if wallet already exists
    const existingWallet = await Wallet.findOne({ userId }).session(session);
    if (existingWallet) {
      throw new Error('Wallet already exists for this user');
    }

    // Generate unique account number
    const accountNumber = await Wallet.generateAccountNumber();

    // Generate QR code
    const qrCodeData = {
      accountNumber,
      type: 'qmart_wallet',
      timestamp: new Date().toISOString()
    };
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrCodeData));

    // Create wallet
    const wallet = new Wallet({
      userId: new mongoose.Types.ObjectId(userId),
      accountNumber,
      qrCode,
      balance: 0.00,
      kycTier: 1,
      dailyLimit: 50000,
      status: 'active'
    });

    const savedWallet = await wallet.save({ session });

    await session.commitTransaction();

    // Track metrics
    const user = await User.findById(userId);
    metricsTracker.trackWalletOperation('create', user?.role as 'customer' | 'merchant' || 'customer');

    return savedWallet;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get wallet balance for a user
 */
export const getBalance = async (userId: string): Promise<number> => {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  return wallet.balance;
};

/**
 * Credit wallet with specified amount
 */
export const creditWallet = async (
  userId: string,
  amount: number,
  transactionId: string
): Promise<IWallet> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validate amount
    if (amount <= 0) {
      throw new Error('Credit amount must be greater than 0');
    }

    // Find wallet
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.status !== 'active') {
      throw new Error('Wallet is not active');
    }

    // Update balance
    wallet.balance += amount;
    const updatedWallet = await wallet.save({ session });

    await session.commitTransaction();
    return updatedWallet;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Debit wallet with specified amount
 */
export const debitWallet = async (
  userId: string,
  amount: number,
  transactionId: string
): Promise<IWallet> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validate amount
    if (amount <= 0) {
      throw new Error('Debit amount must be greater than 0');
    }

    // Find wallet
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.status !== 'active') {
      throw new Error('Wallet is not active');
    }

    // Check sufficient balance
    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Update balance
    wallet.balance -= amount;
    const updatedWallet = await wallet.save({ session });

    await session.commitTransaction();
    return updatedWallet;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get wallet by account number
 */
export const getWalletByAccountNumber = async (accountNumber: string): Promise<IWallet> => {
  // Validate account number format
  if (!/^[0-9]{9}$/.test(accountNumber)) {
    throw new Error('Invalid account number format');
  }

  const wallet = await Wallet.findOne({ accountNumber }).populate('userId', 'firstName lastName email');
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  return wallet;
};

/**
 * Get wallet by user ID
 */
export const getWalletByUserId = async (userId: string): Promise<IWallet> => {
  const wallet = await Wallet.findOne({ userId }).populate('userId', 'firstName lastName email');
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  return wallet;
};

/**
 * Generate QR code for receiving payments
 */
export const generateQRCode = async (accountNumber: string, amount?: number): Promise<string> => {
  const wallet = await getWalletByAccountNumber(accountNumber);

  const qrCodeData = {
    accountNumber,
    amount: amount || null,
    type: 'qmart_payment',
    timestamp: new Date().toISOString()
  };

  return await QRCode.toDataURL(JSON.stringify(qrCodeData));
};

/**
 * Set withdrawal PIN for wallet
 */
export const setWithdrawalPin = async (
  userId: string,
  pin: string,
  otpCode: string
): Promise<void> => {
  // Validate PIN format
  if (!/^[0-9]{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }

  // Verify OTP
  const otpRecord = await OTP.findOne({
    email: (await User.findById(userId))?.email,
    otp: otpCode,
    type: 'pin_setup',
    isUsed: false
  });

  if (!otpRecord || otpRecord.expiresAt < new Date()) {
    throw new Error('Invalid or expired OTP');
  }

  // Hash PIN
  const hashedPin = await bcrypt.hash(pin, 12);

  // Update wallet
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  wallet.withdrawalPin = hashedPin;
  await wallet.save();

  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();
};

/**
 * Validate withdrawal PIN
 */
export const validateWithdrawalPin = async (userId: string, pin: string): Promise<boolean> => {
  if (!/^[0-9]{4}$/.test(pin)) {
    return false;
  }

  const wallet = await Wallet.findOne({ userId }).select('+withdrawalPin');
  if (!wallet || !wallet.withdrawalPin) {
    throw new Error('Withdrawal PIN not set');
  }

  return await bcrypt.compare(pin, wallet.withdrawalPin);
};

/**
 * Reset withdrawal PIN
 */
export const resetWithdrawalPin = async (
  userId: string,
  newPin: string,
  otpCode: string
): Promise<void> => {
  // Validate PIN format
  if (!/^[0-9]{4}$/.test(newPin)) {
    throw new Error('PIN must be exactly 4 digits');
  }

  // Verify OTP
  const user = await User.findById(userId);
  const otpRecord = await OTP.findOne({
    email: user?.email,
    otp: otpCode,
    type: 'pin_reset',
    isUsed: false
  });

  if (!otpRecord || otpRecord.expiresAt < new Date()) {
    throw new Error('Invalid or expired OTP');
  }

  // Hash new PIN
  const hashedPin = await bcrypt.hash(newPin, 12);

  // Update wallet
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  wallet.withdrawalPin = hashedPin;
  await wallet.save();

  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();
};
