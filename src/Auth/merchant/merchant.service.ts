import QRCode from 'qrcode';
import { User } from '../customer/customer.model';
import { Wallet } from '../../wallet/customer/model';
import { OTP } from '../../models/otp.model';
import { MerchantProfile } from './merchant.model';
import { generateAccountNumber } from '../../utils/accountNumber';
import { generateOTP, getOTPExpiration } from '../../utils/otp';
import { sendOTPEmail } from '../../config/email';
import { MerchantSignupInput, MerchantBusinessInfoInput } from '../../schemas/auth.schemas';

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

  // Generate account number and QR code for merchant wallet
  const accountNumber = await generateAccountNumber();
  const qrCodeData = JSON.stringify({
    accountNumber,
    userId: user._id,
    type: 'merchant_wallet',
  });
  
  const qrCode = await QRCode.toDataURL(qrCodeData);

  // Create wallet
  const wallet = new Wallet({
    userId: user._id,
    accountNumber,
    qrCode,
  });

  await wallet.save();

  return {
    merchantProfile,
    wallet: {
      accountNumber: wallet.accountNumber,
      balance: wallet.balance,
    },
  };
};
