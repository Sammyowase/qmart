import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITransaction extends Document {
  transactionId: string;
  senderWallet: mongoose.Types.ObjectId;
  receiverWallet: mongoose.Types.ObjectId;
  amount: number;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'payment';
  method: 'account_number' | 'qr_code';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  remark?: string;
  metadata?: object;
  createdAt: Date;
  completedAt?: Date;

  // Instance methods
  markCompleted(): Promise<ITransaction>;
  markFailed(): Promise<ITransaction>;
}

export interface ITransactionModel extends mongoose.Model<ITransaction> {
  getWalletSummary(walletId: string, days?: number): Promise<any>;
}

const transactionSchema = new Schema<ITransaction>({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4(),
    index: true
  },
  senderWallet: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },
  receiverWallet: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
    set: (value: number) => Math.round(value * 100) / 100 // Ensure 2 decimal places
  },
  type: {
    type: String,
    required: true,
    enum: ['transfer', 'deposit', 'withdrawal', 'payment'],
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: ['account_number', 'qr_code'],
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  remark: {
    type: String,
    maxlength: 500,
    trim: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
transactionSchema.index({ senderWallet: 1, createdAt: -1 });
transactionSchema.index({ receiverWallet: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ transactionId: 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return `₦${this.amount.toFixed(2)}`;
});

// Virtual for transaction reference
transactionSchema.virtual('reference').get(function() {
  return `QMT${this.transactionId.slice(-8).toUpperCase()}`;
});

// Instance method to mark transaction as completed
transactionSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Instance method to mark transaction as failed
transactionSchema.methods.markFailed = function() {
  this.status = 'failed';
  this.completedAt = new Date();
  return this.save();
};

// Static method to get transaction summary for a wallet
transactionSchema.statics.getWalletSummary = async function(walletId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await this.aggregate([
    {
      $match: {
        $or: [
          { senderWallet: new mongoose.Types.ObjectId(walletId) },
          { receiverWallet: new mongoose.Types.ObjectId(walletId) }
        ],
        createdAt: { $gte: startDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalSent: {
          $sum: {
            $cond: [
              { $eq: ['$senderWallet', new mongoose.Types.ObjectId(walletId)] },
              '$amount',
              0
            ]
          }
        },
        totalReceived: {
          $sum: {
            $cond: [
              { $eq: ['$receiverWallet', new mongoose.Types.ObjectId(walletId)] },
              '$amount',
              0
            ]
          }
        }
      }
    }
  ]);

  return summary[0] || { totalTransactions: 0, totalSent: 0, totalReceived: 0 };
};

// Pre-save middleware to validate transaction
transactionSchema.pre('save', function(next) {
  // Ensure sender and receiver are different
  if (this.senderWallet.equals(this.receiverWallet)) {
    return next(new Error('Sender and receiver cannot be the same'));
  }

  // Validate amount
  if (this.amount <= 0) {
    return next(new Error('Transaction amount must be greater than 0'));
  }

  next();
});

export const Transaction = mongoose.model<ITransaction, ITransactionModel>('Transaction', transactionSchema);
