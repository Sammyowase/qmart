import { User } from '../customer/customer.model';
import { OTP } from '../../models/otp.model';
import { MerchantProfile } from './merchant.model';
import { generateOTP, getOTPExpiration } from '../../utils/otp';
import { sendOTPEmail } from '../../config/email';
import { MerchantSignupInput, MerchantBusinessInfoInput } from '../../schemas/auth.schemas';
import { createWallet } from '../../services/wallet.service';

export const createMerchant = async (userData: MerchantSignupInput) => {
  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: userData.email }, { phone: userData.phone }]
  });

  if (existingUser) {
    throw new Error('User with this email or phone already exists');
  }

  // Create user
  const user = new User({
    ...userData,
    role: 'merchant',
  });

  await user.save();

  // Generate and send OTP
  const otp = generateOTP();
  const otpExpiration = getOTPExpiration();

  const otpRecord = new OTP({
    email: user.email,
    otp,
    type: 'verification',
    expiresAt: otpExpiration,
  });

  await otpRecord.save();
    console.log(`Otp for ${user.email}: ${otp}`);
  await sendOTPEmail(user.email, otp, 'verification');

  return {
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    message: 'Please verify your email and complete business information',
  };
};

export const addMerchantBusinessInfo = async (userId: string, businessData: MerchantBusinessInfoInput) => {
  // Check if user exists and is a merchant
  const user = await User.findById(userId);
  if (!user || user.role !== 'merchant') {
    throw new Error('User not found or not a merchant');
  }

  if (!user.isVerified) {
    throw new Error('Please verify your email first');
  }

  // Check if business info already exists
  const existingProfile = await MerchantProfile.findOne({ userId });
  if (existingProfile) {
    throw new Error('Business information already exists');
  }

  // Create merchant profile
  const merchantProfile = new MerchantProfile({
    userId,
    ...businessData,
  });

  await merchantProfile.save();

  // Create wallet using the wallet service
  const wallet = await createWallet(user._id.toString());

  return {
    merchantProfile,
    wallet: {
      accountNumber: wallet.accountNumber,
      balance: wallet.balance,
      formattedBalance: `₦${wallet.balance.toFixed(2)}`,
      kycTier: wallet.kycTier,
      dailyLimit: wallet.dailyLimit,
      status: wallet.status
    },
  };
};
