import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  _id: string;
  userId: string;
  accountNumber: string;
  balance: number;
  qrCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>({
  userId: {
    type: String,
    required: true,
    unique: true,
    ref: 'User',
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    length: 9,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  qrCode: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);
