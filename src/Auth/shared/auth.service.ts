import jwt from 'jsonwebtoken';
import { User } from '../customer/customer.model';
import { OTP } from '../../models/otp.model';
import { generateOTP, getOTPExpiration } from '../../utils/otp';
import { sendOTPEmail } from '../../config/email';
import { SigninInput } from '../../schemas/auth.schemas';

export const verifyOTP = async (email: string, otpCode: string) => {
  const otpRecord = await OTP.findOne({
    email,
    otp: otpCode,
    isUsed: false,
  });

  if (!otpRecord) {
    throw new Error('Invalid or expired OTP');
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new Error('OTP has expired');
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  user.isVerified = true;
  await user.save();

  return { message: 'Email verified successfully' };
};

export const signin = async (credentials: SigninInput) => {
  const { email, password } = credentials;

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  if (!user.isVerified) {
    throw new Error('Please verify your email first');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret not configured');
  }

  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role
    },
    jwtSecret,
    {
      expiresIn: '7d'
    }
  );

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
};

export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  const otp = generateOTP();
  const otpExpiration = getOTPExpiration();

  const otpRecord = new OTP({
    email,
    otp,
    type: 'password_reset',
    expiresAt: otpExpiration,
  });

  await otpRecord.save();
  console.log(`password reset otp for ${user.email}: ${otp}`);
  
  await sendOTPEmail(email, otp, 'reset');

  return { message: 'Password reset OTP sent to your email' };
};

export const resetPassword = async (email: string, otpCode: string, newPassword: string) => {
  const otpRecord = await OTP.findOne({
    email,
    otp: otpCode,
    type: 'password_reset',
    isUsed: false,
  });

  if (!otpRecord) {
    throw new Error('Invalid or expired OTP');
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new Error('OTP has expired');
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  user.password = newPassword;
  await user.save();

  return { message: 'Password reset successfully' };
};
