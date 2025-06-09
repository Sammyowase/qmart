import mongoose, { Document, Schema } from 'mongoose';

export interface IMerchantProfile extends Document {
  _id: string;
  userId: string;
  businessName: string;
  businessType: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  cacNumber: string;
  aboutBusiness: string;

  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const merchantProfileSchema = new Schema<IMerchantProfile>({
  userId: {
    type: String,
    required: true,
    unique: true,
    ref: 'User',
  },
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  businessType: {
    type: String,
    required: true,
    enum: ['retail', 'restaurant', 'service', 'online', 'other'],
  },
  businessAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'Nigeria' },
  },
  aboutBusiness: {
    type: String,
    required: false,
  },
  
  cacNumber: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export const MerchantProfile = mongoose.model<IMerchantProfile>('MerchantProfile', merchantProfileSchema);
