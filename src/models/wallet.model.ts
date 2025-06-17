import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  accountNumber: string;
  qrCode: string;
  balance: number;
  withdrawalPin?: string;
  kycTier: number;
  dailyLimit: number;
  status: 'active' | 'frozen' | 'suspended';
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  canTransact(amount: number): boolean;
  isWithinDailyLimit(amount: number): boolean;
}

export interface IWalletModel extends mongoose.Model<IWallet> {
  generateAccountNumber(): Promise<string>;
}

const walletSchema = new Schema<IWallet>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    length: 9,
    match: /^[0-9]{9}$/,
    index: true
  },
  qrCode: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0.00,
    min: 0,
    set: (value: number) => Math.round(value * 100) / 100 // Ensure 2 decimal places
  },
  withdrawalPin: {
    type: String,
    required: false,
    select: false // Don't include in queries by default
  },
  kycTier: {
    type: Number,
    required: true,
    default: 1,
    enum: [1, 2, 3],
    index: true
  },
  dailyLimit: {
    type: Number,
    required: true,
    default: 50000 // Tier 1 default limit
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'frozen', 'suspended'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.withdrawalPin; // Never expose PIN in JSON
      return ret;
    }
  }
});

// Indexes for performance
walletSchema.index({ userId: 1 });
walletSchema.index({ accountNumber: 1 });
walletSchema.index({ status: 1 });
walletSchema.index({ kycTier: 1 });

// Virtual for formatted balance
walletSchema.virtual('formattedBalance').get(function() {
  return `₦${this.balance.toFixed(2)}`;
});

// Instance method to check if wallet can perform transaction
walletSchema.methods.canTransact = function(amount: number): boolean {
  return this.status === 'active' && this.balance >= amount && amount > 0;
};

// Instance method to check daily limit
walletSchema.methods.isWithinDailyLimit = function(amount: number): boolean {
  return amount <= this.dailyLimit;
};

// Static method to generate unique account number
walletSchema.statics.generateAccountNumber = async function(): Promise<string> {
  let accountNumber: string = '';
  let exists = true;

  while (exists) {
    // Generate 9-digit account number starting with 2 (Qmart identifier)
    accountNumber = '2' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    exists = await this.findOne({ accountNumber });
  }

  return accountNumber;
};

// Pre-save middleware to set daily limit based on KYC tier
walletSchema.pre('save', function(next) {
  const KYC_LIMITS = {
    1: 50000,    // ₦50,000
    2: 500000,   // ₦500,000
    3: 5000000   // ₦5,000,000
  };

  this.dailyLimit = KYC_LIMITS[this.kycTier as keyof typeof KYC_LIMITS] || 50000;
  next();
});

export const Wallet = mongoose.model<IWallet, IWalletModel>('Wallet', walletSchema);
