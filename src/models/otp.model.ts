import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  _id: string;
  email: string;
  otp: string;
  type: 'verification' | 'password_reset';
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
    length: 6,
  },
  type: {
    type: String,
    enum: ['verification', 'password_reset'],
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model<IOTP>('OTP', otpSchema);
