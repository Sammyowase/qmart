import mongoose from 'mongoose';
import { KYC, IKYC, KYC_REQUIREMENTS } from '../models/kyc.model';
import { Wallet } from '../models/wallet.model';
import { User } from '../Auth/customer/customer.model';

/**
 * Submit KYC request for tier upgrade
 */
export const submitKYCRequest = async (
  userId: string, 
  tier: number, 
  documents: {
    nin?: string;
    bvn?: string;
    selfieUrl?: string;
    addressProofUrl?: string;
  }
): Promise<IKYC> => {
  // Validate tier
  if (![2, 3].includes(tier)) {
    throw new Error('Invalid tier. Only tiers 2 and 3 can be requested');
  }
  
  // Get current KYC status
  const existingKYC = await KYC.findOne({ userId }).sort({ submittedAt: -1 });
  const currentTier = existingKYC?.currentTier || 1;
  
  // Check if tier upgrade is valid
  if (tier <= currentTier) {
    throw new Error('Requested tier must be higher than current tier');
  }
  
  // Check if there's already a pending request
  const pendingKYC = await KYC.findOne({ 
    userId, 
    status: { $in: ['pending', 'under_review'] } 
  });
  
  if (pendingKYC) {
    throw new Error('You already have a pending KYC request');
  }
  
  // Validate required documents for the tier
  const requiredDocs = KYC_REQUIREMENTS[tier as keyof typeof KYC_REQUIREMENTS]?.requirements || [];
  const missingDocs: string[] = [];
  
  for (const doc of requiredDocs) {
    if (!documents[doc as keyof typeof documents]) {
      missingDocs.push(doc);
    }
  }
  
  if (missingDocs.length > 0) {
    throw new Error(`Missing required documents: ${missingDocs.join(', ')}`);
  }
  
  // Create KYC request
  const kycRequest = new KYC({
    userId: new mongoose.Types.ObjectId(userId),
    currentTier,
    requestedTier: tier,
    status: 'pending',
    documents,
    submittedAt: new Date()
  });
  
  return await kycRequest.save();
};

/**
 * Approve KYC request
 */
export const approveKYC = async (kycId: string, adminId: string): Promise<IKYC> => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const kycRequest = await KYC.findById(kycId).session(session);
    if (!kycRequest) {
      throw new Error('KYC request not found');
    }
    
    if (kycRequest.status !== 'pending' && kycRequest.status !== 'under_review') {
      throw new Error('KYC request is not in a state that can be approved');
    }
    
    // Approve the KYC
    await kycRequest.approve(adminId);
    
    // Update wallet tier and limits
    await upgradeWalletTier(kycRequest.userId.toString(), kycRequest.requestedTier);
    
    await session.commitTransaction();
    return kycRequest;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Reject KYC request
 */
export const rejectKYC = async (kycId: string, adminId: string, reason: string): Promise<IKYC> => {
  const kycRequest = await KYC.findById(kycId);
  if (!kycRequest) {
    throw new Error('KYC request not found');
  }
  
  if (kycRequest.status !== 'pending' && kycRequest.status !== 'under_review') {
    throw new Error('KYC request is not in a state that can be rejected');
  }
  
  return await kycRequest.reject(adminId, reason);
};

/**
 * Upgrade wallet tier after KYC approval
 */
export const upgradeWalletTier = async (userId: string, newTier: number): Promise<any> => {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  
  const tierConfig = KYC_REQUIREMENTS[newTier as keyof typeof KYC_REQUIREMENTS];
  if (!tierConfig) {
    throw new Error('Invalid tier');
  }
  
  wallet.kycTier = newTier;
  wallet.dailyLimit = tierConfig.dailyLimit;
  
  return await wallet.save();
};

/**
 * Validate KYC documents for a specific tier
 */
export const validateKYCDocuments = async (
  documents: {
    nin?: string;
    bvn?: string;
    selfieUrl?: string;
    addressProofUrl?: string;
  }, 
  tier: number
): Promise<boolean> => {
  const requiredDocs = KYC_REQUIREMENTS[tier as keyof typeof KYC_REQUIREMENTS]?.requirements || [];
  
  for (const doc of requiredDocs) {
    if (!documents[doc as keyof typeof documents]) {
      return false;
    }
  }
  
  // Additional validation for specific document types
  if (documents.nin && !/^[0-9]{11}$/.test(documents.nin)) {
    throw new Error('Invalid NIN format. Must be 11 digits');
  }
  
  if (documents.bvn && !/^[0-9]{11}$/.test(documents.bvn)) {
    throw new Error('Invalid BVN format. Must be 11 digits');
  }
  
  if (documents.selfieUrl && !/^https?:\/\/.+\.(jpg|jpeg|png)$/i.test(documents.selfieUrl)) {
    throw new Error('Invalid selfie URL format');
  }
  
  if (documents.addressProofUrl && !/^https?:\/\/.+\.(jpg|jpeg|png|pdf)$/i.test(documents.addressProofUrl)) {
    throw new Error('Invalid address proof URL format');
  }
  
  return true;
};

/**
 * Get KYC status for a user
 */
export const getKYCStatus = async (userId: string): Promise<IKYC | null> => {
  return await KYC.findOne({ userId }).sort({ submittedAt: -1 });
};

/**
 * Get all pending KYC requests (for admin)
 */
export const getPendingKYCRequests = async (limit: number = 20, offset: number = 0) => {
  const [requests, total] = await Promise.all([
    KYC.find({ status: { $in: ['pending', 'under_review'] } })
      .populate('userId', 'firstName lastName email')
      .sort({ submittedAt: 1 })
      .limit(limit)
      .skip(offset),
    KYC.countDocuments({ status: { $in: ['pending', 'under_review'] } })
  ]);
  
  return { requests, total };
};

/**
 * Get KYC statistics
 */
export const getKYCStatistics = async () => {
  return await KYC.getStatistics();
};

/**
 * Get KYC requirements for a specific tier
 */
export const getKYCRequirements = (tier: number) => {
  const tierConfig = KYC_REQUIREMENTS[tier as keyof typeof KYC_REQUIREMENTS];
  if (!tierConfig) {
    throw new Error('Invalid tier');
  }
  
  return {
    tier,
    name: tierConfig.name,
    dailyLimit: tierConfig.dailyLimit,
    requirements: tierConfig.requirements,
    formattedLimit: `₦${tierConfig.dailyLimit.toLocaleString()}`
  };
};

/**
 * Update KYC request status to under review
 */
export const markKYCUnderReview = async (kycId: string): Promise<IKYC> => {
  const kycRequest = await KYC.findById(kycId);
  if (!kycRequest) {
    throw new Error('KYC request not found');
  }
  
  if (kycRequest.status !== 'pending') {
    throw new Error('KYC request is not pending');
  }
  
  kycRequest.status = 'under_review';
  return await kycRequest.save();
};

/**
 * Get user's KYC history
 */
export const getKYCHistory = async (userId: string) => {
  return await KYC.find({ userId })
    .populate('reviewedBy', 'firstName lastName email')
    .sort({ submittedAt: -1 });
};
