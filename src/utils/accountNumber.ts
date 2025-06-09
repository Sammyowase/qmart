import mongoose from 'mongoose';

export const generateAccountNumber = async (): Promise<string> => {
  let accountNumber: string;
  let isUnique = false;

  while (!isUnique) {
    // Generate 9-digit account number
    accountNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
    
    // Check if account number exists in any wallet collection
    if (mongoose.connection.db) {
      const existingWallet = await mongoose.connection.db
        .collection('wallets')
        .findOne({ accountNumber });
      
      if (!existingWallet) {
        isUnique = true;
      }
    } else {
      // If no DB connection, assume unique for development
      isUnique = true;
    }
  }

  return accountNumber!;
};

export const validateAccountNumber = (accountNumber: string): boolean => {
  return /^\d{9}$/.test(accountNumber);
};
