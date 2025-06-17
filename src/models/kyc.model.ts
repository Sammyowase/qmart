import mongoose, { Document, Schema } from 'mongoose';

export interface IKYC extends Document {
  userId: mongoose.Types.ObjectId;
  currentTier: number;
  requestedTier: number;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  documents: {
    nin?: string;
    bvn?: string;
    selfieUrl?: string;
    addressProofUrl?: string;
  };
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;

  // Instance methods
  validateDocuments(): { isValid: boolean; missingDocs: string[] };
  approve(adminId: string): Promise<IKYC>;
  reject(adminId: string, reason: string): Promise<IKYC>;
}

export interface IKYCModel extends mongoose.Model<IKYC> {
  getStatistics(): Promise<any>;
}

const kycSchema = new Schema<IKYC>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  currentTier: {
    type: Number,
    required: true,
    enum: [1, 2, 3],
    default: 1
  },
  requestedTier: {
    type: Number,
    required: true,
    enum: [1, 2, 3],
    validate: {
      validator: function(this: IKYC, value: number) {
        return value > this.currentTier;
      },
      message: 'Requested tier must be higher than current tier'
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'under_review'],
    default: 'pending',
    index: true
  },
  documents: {
    nin: {
      type: String,
      match: /^[0-9]{11}$/,
      sparse: true
    },
    bvn: {
      type: String,
      match: /^[0-9]{11}$/,
      sparse: true
    },
    selfieUrl: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.(jpg|jpeg|png)$/i.test(v);
        },
        message: 'Invalid selfie URL format'
      }
    },
    addressProofUrl: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.(jpg|jpeg|png|pdf)$/i.test(v);
        },
        message: 'Invalid address proof URL format'
      }
    }
  },
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Compound indexes
kycSchema.index({ userId: 1, status: 1 });
kycSchema.index({ status: 1, submittedAt: -1 });
kycSchema.index({ requestedTier: 1, status: 1 });

// KYC tier requirements configuration
export const KYC_REQUIREMENTS = {
  1: {
    dailyLimit: 50000,
    requirements: [],
    name: 'Basic'
  },
  2: {
    dailyLimit: 500000,
    requirements: ['nin', 'bvn'],
    name: 'Standard'
  },
  3: {
    dailyLimit: 5000000,
    requirements: ['nin', 'bvn', 'selfieUrl', 'addressProofUrl'],
    name: 'Premium'
  }
};

// Instance method to validate documents for requested tier
kycSchema.methods.validateDocuments = function(): { isValid: boolean; missingDocs: string[] } {
  const requiredDocs = KYC_REQUIREMENTS[this.requestedTier as keyof typeof KYC_REQUIREMENTS]?.requirements || [];
  const missingDocs: string[] = [];

  for (const doc of requiredDocs) {
    if (!this.documents[doc as keyof typeof this.documents]) {
      missingDocs.push(doc);
    }
  }

  return {
    isValid: missingDocs.length === 0,
    missingDocs
  };
};

// Instance method to approve KYC
kycSchema.methods.approve = function(adminId: string) {
  this.status = 'approved';
  this.currentTier = this.requestedTier;
  this.reviewedAt = new Date();
  this.reviewedBy = new mongoose.Types.ObjectId(adminId);
  this.rejectionReason = undefined;
  return this.save();
};

// Instance method to reject KYC
kycSchema.methods.reject = function(adminId: string, reason: string) {
  this.status = 'rejected';
  this.reviewedAt = new Date();
  this.reviewedBy = new mongoose.Types.ObjectId(adminId);
  this.rejectionReason = reason;
  return this.save();
};

// Static method to get KYC statistics
kycSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const tierStats = await this.aggregate([
    {
      $match: { status: 'approved' }
    },
    {
      $group: {
        _id: '$currentTier',
        count: { $sum: 1 }
      }
    }
  ]);

  return { statusStats: stats, tierStats };
};

// Pre-save validation
kycSchema.pre('save', function(next) {
  // Validate that required documents are provided for the requested tier
  const validation = this.validateDocuments();

  if (this.status === 'pending' && !validation.isValid) {
    return next(new Error(`Missing required documents: ${validation.missingDocs.join(', ')}`));
  }

  next();
});

// Post-save middleware to update wallet tier when KYC is approved
kycSchema.post('save', async function(doc) {
  if (doc.status === 'approved' && doc.isModified('status')) {
    try {
      const Wallet = mongoose.model('Wallet');
      await Wallet.findOneAndUpdate(
        { userId: doc.userId },
        {
          kycTier: doc.currentTier,
          dailyLimit: KYC_REQUIREMENTS[doc.currentTier as keyof typeof KYC_REQUIREMENTS].dailyLimit
        }
      );
    } catch (error) {
      console.error('Error updating wallet tier:', error);
    }
  }
});

export const KYC = mongoose.model<IKYC, IKYCModel>('KYC', kycSchema);
