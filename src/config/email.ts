import nodemailer from 'nodemailer';

const createEmailTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Nodemailer connection failed:', error.message);
    } else {
      console.log('✅ Nodemailer is ready to send emails');
    }
  });

  return transporter;
};




export const sendOTPEmail = async (email: string, otp: string, type: 'verification' | 'reset' = 'verification') => {
  const transporter = createEmailTransporter();
  
  const subject = type === 'verification' ? 'Verify Your Qmart Account' : 'Reset Your Password';
  const message = type === 'verification' 
    ? `Your verification code is: ${otp}. This code expires in 15 minutes.`
    : `Your password reset code is: ${otp}. This code expires in 15 minutes.`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@qmart.com',
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Qmart ${type === 'verification' ? 'Account Verification' : 'Password Reset'}</h2>
        <p style="font-size: 16px; color: #666;">${message}</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #999;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export default createEmailTransporter;
