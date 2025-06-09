import QRCode from 'qrcode';
import { User } from './customer.model';
import { Wallet } from '../../wallet/customer/model';
import { OTP } from '../../models/otp.model';
import { generateAccountNumber } from '../../utils/accountNumber';
import { generateOTP, getOTPExpiration } from '../../utils/otp';
import { sendOTPEmail } from '../../config/email';
import { CustomerSignupInput } from '../../schemas/auth.schemas';

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

  // Generate account number and QR code
  const accountNumber = await generateAccountNumber();
  const qrCodeData = JSON.stringify({
    accountNumber,
    userId: user._id,
    type: 'wallet',
  });
  
  const qrCode = await QRCode.toDataURL(qrCodeData);

  // Create wallet
  const wallet = new Wallet({
    userId: user._id,
    accountNumber,
    qrCode,
  });

  await wallet.save();

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
    },
  };
};
