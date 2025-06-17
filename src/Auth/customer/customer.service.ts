import { User } from './customer.model';
import { OTP } from '../../models/otp.model';
import { generateOTP, getOTPExpiration } from '../../utils/otp';
import { sendOTPEmail } from '../../config/email';
import { CustomerSignupInput } from '../../schemas/auth.schemas';
import { createWallet } from '../../services/wallet.service';

export const createCustomer = async (userData: CustomerSignupInput) => {
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
    role: 'customer',
  });

  await user.save();

  // Create wallet using the wallet service
  const wallet = await createWallet(user._id.toString());

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
