import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../Auth/customer/customer.model';
import { Wallet } from '../models/wallet.model';
import { Transaction } from '../models/transaction.model';
import { KYC } from '../models/kyc.model';


export const createDefaultAdmin = async (): Promise<void> => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Import database utilities
      const { isDatabaseReady, waitForDatabase } = await import('../config/database');

      // Wait for database to be ready before proceeding
      if (!isDatabaseReady()) {
        console.log('Waiting for database connection before creating admin user...');
        await waitForDatabase(30000); // Wait up to 30 seconds
      }

      // Check if admin already exists
      const existingAdmin = await User.findOne({ email: 'admin@qmart.com' });

      if (existingAdmin) {
        console.log('Default admin user already exists');
        return;
      }

      // Create new admin user
      const hashedPassword = await bcrypt.hash('QmartAdmin2024!', 12);

      const adminUser = new User({
        email: 'admin@qmart.com',
        password: hashedPassword,
        firstName: 'Qmart',
        lastName: 'Administrator',
        phone: '+2348000000000',
        role: 'admin',
        isVerified: true,
        isActive: true
      });

      await adminUser.save();
      console.log('Default admin user created successfully');
      return;

    } catch (error: any) {
      retryCount++;
      console.error(`Error creating default admin user (attempt ${retryCount}/${maxRetries}):`, error.message);

      if (retryCount >= maxRetries) {
        console.error('Failed to create default admin user after all retries');
        console.log('You can create the admin user manually later using the API');
        return;
      }

      // Wait before retrying
      const delay = 2000 * retryCount; // 2s, 4s, 6s
      console.log(`Retrying admin user creation in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Admin signin service
 */
export const adminSignin = async (email: string, password: string) => {
  try {
    // Find admin user
    const admin = await User.findOne({ email, role: 'admin' });

    if (!admin) {
      throw new Error('Invalid admin credentials');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new Error('Admin account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new Error('Invalid admin credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: admin._id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '8h' }
    );

    return {
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role
      }
    };
  } catch (error: any) {
    throw new Error(error.message || 'Admin signin failed');
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    // Get user counts
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalMerchants = await User.countDocuments({ role: 'merchant' });

    // Get wallet statistics
    const totalWallets = await Wallet.countDocuments();
    const activeWallets = await Wallet.countDocuments({ status: 'active' });

    // Get total balance
    const balanceAggregation = await Wallet.aggregate([
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
    ]);
    const totalBalance = balanceAggregation[0]?.totalBalance || 0;

    // Get transaction statistics
    const totalTransactions = await Transaction.countDocuments();

    // Get pending KYC count
    const pendingKYC = await KYC.countDocuments({ status: 'pending' });

    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTransactions = await Transaction.aggregate([
      { $match: { createdAt: { $gte: yesterday } } },
      {
        $group: {
          _id: null,
          volume: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const recentActivity = recentTransactions[0] || { volume: 0, count: 0 };

    // Get daily transaction data for charts (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyTransactions = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          volume: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get daily registration data (last 7 days)
    const dailyRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          customers: {
            $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 1, 0] }
          },
          merchants: {
            $sum: { $cond: [{ $eq: ['$role', 'merchant'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return {
      overview: {
        totalUsers,
        totalCustomers,
        totalMerchants,
        totalWallets,
        activeWallets,
        totalTransactions,
        pendingKYC,
        totalBalance,
        formattedTotalBalance: `₦${totalBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
      },
      recentActivity: {
        transactionVolume: recentActivity.volume,
        transactionCount: recentActivity.count,
        formattedVolume: `₦${recentActivity.volume.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
      },
      charts: {
        dailyTransactions,
        dailyRegistrations
      }
    };
  } catch (error: any) {
    throw new Error(`Failed to get dashboard stats: ${error.message}`);
  }
};

/**
 * Get all users with pagination
 */
export const getAllUsers = async (limit: number = 20, offset: number = 0, role?: string) => {
  try {
    const filter: any = {};
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password')
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    return { users, total };
  } catch (error: any) {
    throw new Error(`Failed to get users: ${error.message}`);
  }
};

/**
 * Get all transactions with pagination and filtering
 */
export const getAllTransactions = async (
  limit: number = 20,
  offset: number = 0,
  status?: string,
  type?: string
) => {
  try {
    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const transactions = await Transaction.find(filter)
      .populate('senderWallet', 'accountNumber userId')
      .populate('receiverWallet', 'accountNumber userId')
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });

    const total = await Transaction.countDocuments(filter);

    return { transactions, total };
  } catch (error: any) {
    throw new Error(`Failed to get transactions: ${error.message}`);
  }
};

/**
 * Toggle wallet status (freeze/unfreeze)
 */
export const toggleWalletStatus = async (userId: string, status: string) => {
  try {
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    wallet.status = status as 'active' | 'frozen' | 'suspended';
    await wallet.save();

    return wallet;
  } catch (error: any) {
    throw new Error(`Failed to update wallet status: ${error.message}`);
  }
};

/**
 * Get system health metrics
 */
export const getSystemHealth = async () => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent transaction metrics
    const recentTransactions = await Transaction.countDocuments({
      createdAt: { $gte: oneHourAgo }
    });

    const failedTransactions = await Transaction.countDocuments({
      createdAt: { $gte: oneHourAgo },
      status: 'failed'
    });

    const successRate = recentTransactions > 0
      ? ((recentTransactions - failedTransactions) / recentTransactions) * 100
      : 100;

    // Get active users (users with transactions in last hour)
    const activeUsers = await Transaction.distinct('senderWallet', {
      createdAt: { $gte: oneHourAgo }
    }).then(wallets => wallets.length);

    return {
      status: successRate > 95 ? 'healthy' : successRate > 85 ? 'warning' : 'critical',
      metrics: {
        recentTransactions,
        failedTransactions,
        successRate: Math.round(successRate * 100) / 100,
        activeUsers,
        systemErrors: 0 // This would be tracked by error monitoring
      },
      timestamp: now.toISOString()
    };
  } catch (error: any) {
    throw new Error(`Failed to get system health: ${error.message}`);
  }
};

/**
 * Get security alerts
 */
export const getSecurityAlerts = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get failed transactions
    const failedTransactions = await Transaction.find({
      createdAt: { $gte: oneHourAgo },
      status: 'failed'
    })
    .populate('senderWallet', 'accountNumber userId')
    .populate('receiverWallet', 'accountNumber userId')
    .limit(10)
    .sort({ createdAt: -1 });

    // Get large transactions (over ₦1M)
    const largeTransactions = await Transaction.find({
      createdAt: { $gte: oneHourAgo },
      amount: { $gte: 1000000 },
      status: 'completed'
    })
    .populate('senderWallet', 'accountNumber userId')
    .populate('receiverWallet', 'accountNumber userId')
    .limit(10)
    .sort({ createdAt: -1 });

    return {
      failedTransactions,
      largeTransactions,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    throw new Error(`Failed to get security alerts: ${error.message}`);
  }
};

/**
 * Get pending KYC requests
 */
export const getPendingKYC = async (limit: number = 20, offset: number = 0) => {
  try {
    const kycRequests = await KYC.find({ status: 'pending' })
      .populate('userId', 'firstName lastName email')
      .limit(limit)
      .skip(offset)
      .sort({ submittedAt: -1 });

    const total = await KYC.countDocuments({ status: 'pending' });

    return { kycRequests, total };
  } catch (error: any) {
    throw new Error(`Failed to get pending KYC requests: ${error.message}`);
  }
};

/**
 * Review KYC request (approve/reject)
 */
export const reviewKYC = async (kycId: string, action: 'approve' | 'reject', adminId: string, notes?: string) => {
  try {
    const kycRequest = await KYC.findById(kycId);

    if (!kycRequest) {
      throw new Error('KYC request not found');
    }

    if (kycRequest.status !== 'pending') {
      throw new Error('KYC request has already been reviewed');
    }

    if (action === 'approve') {
      await kycRequest.approve(adminId);
    } else {
      await kycRequest.reject(adminId, notes || 'No reason provided');
    }

    return kycRequest;
  } catch (error: any) {
    throw new Error(`Failed to review KYC: ${error.message}`);
  }
};