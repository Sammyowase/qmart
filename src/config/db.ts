import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qmart';
    
    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.log('� Please ensure MongoDB is running or use MongoDB Atlas');
    console.log('� For local MongoDB: https://docs.mongodb.com/manual/installation/');
    console.log('� For MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
    
    // Don't exit in development, allow API to run without DB for testing
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;
