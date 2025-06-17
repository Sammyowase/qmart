import mongoose from 'mongoose';


let isConnected = false;
let connectionPromise: Promise<void> | null = null;


const connectDB = async (): Promise<void> => {
  
  if (connectionPromise) {
    return connectionPromise;
  }

  // Return immediately if already connected
  if (isConnected && mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  connectionPromise = connectWithRetry();
  return connectionPromise;
};

/**
 * Connect to MongoDB with retry logic and proper timeout handling
 */
const connectWithRetry = async (): Promise<void> => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qmart';
  const maxRetries = 5;
  let retryCount = 0;

  const connectionOptions = {
    // Connection timeout settings
    serverSelectionTimeoutMS: 30000, // 30 seconds
    connectTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
    
    // Buffer settings
    bufferCommands: false, // Disable mongoose buffering
   
    
    // Connection pool settings
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    
    // Retry settings
    retryWrites: true,
    retryReads: true,
    
    // Heartbeat settings
    heartbeatFrequencyMS: 10000,
    
    // Additional stability settings
    family: 4, // Use IPv4, skip trying IPv6
  };

  while (retryCount < maxRetries) {
    try {
      console.log(`Attempting MongoDB connection (attempt ${retryCount + 1}/${maxRetries})...`);
      
      // Set up connection event listeners
      mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully');
        isConnected = true;
      });

      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        isConnected = false;
      });

      // Attempt connection
      await mongoose.connect(mongoURI, connectionOptions);
      
      // Wait for connection to be fully established
      await waitForConnection();
      
      console.log('MongoDB connection established and ready');
      isConnected = true;
      connectionPromise = null;
      return;

    } catch (error) {
      retryCount++;
      isConnected = false;
      
      console.error(`MongoDB connection attempt ${retryCount} failed:`, error);
      
      if (retryCount >= maxRetries) {
        console.error('All MongoDB connection attempts failed');
        console.log('Please ensure MongoDB is running or use MongoDB Atlas');
        console.log('For local MongoDB: https://docs.mongodb.com/manual/installation/');
        console.log('For MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
        
        connectionPromise = null;
        
        // Don't exit in development, allow API to run without DB for testing
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        } else {
          throw new Error('MongoDB connection failed after all retries');
        }
      } else {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

/**
 * Wait for MongoDB connection to be fully ready
 */
const waitForConnection = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for MongoDB connection to be ready'));
    }, 15000); // 15 second timeout

    const checkConnection = () => {
      if (mongoose.connection.readyState === 1) {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(checkConnection, 100);
      }
    };

    checkConnection();
  });
};

/**
 * Check if database is connected and ready
 */
export const isDatabaseReady = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};

/**
 * Wait for database to be ready with timeout
 */
export const waitForDatabase = async (timeoutMs: number = 30000): Promise<void> => {
  const startTime = Date.now();
  
  while (!isDatabaseReady()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Database not ready after ${timeoutMs}ms timeout`);
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

/**
 * Gracefully close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    connectionPromise = null;
    console.log('MongoDB connection closed');
  }
};

export default connectDB;
