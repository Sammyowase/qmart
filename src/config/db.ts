import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qmart';
    
    await mongoose.connect(mongoURI);
    
    console.log('‚úÖ MongoDB connected successfully');
  } catch (error) {
    console.error('‚ùå MongoDB connection failed:', error);
    console.log('Ì≤° Please ensure MongoDB is running or use MongoDB Atlas');
    console.log('Ì≤° For local MongoDB: https://docs.mongodb.com/manual/installation/');
    console.log('Ì≤° For MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
    
    // Don't exit in development, allow API to run without DB for testing
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;
