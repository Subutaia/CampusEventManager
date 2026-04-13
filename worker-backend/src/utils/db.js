import { MongoClient } from 'mongodb';

let cachedClient = null;
let cachedDb = null;

/**
 * Connect to MongoDB Atlas using native driver
 * Optimized for Cloudflare Workers serverless environment
 */
export const connectDB = async (mongoURI, dbName = 'CampusEventManager') => {
  // Return cached connection if already established
  if (cachedClient && cachedDb) {
    try {
      // Verify connection is still alive with a simple ping
      await cachedDb.admin().ping();
      console.log('📦 Using cached MongoDB connection');
      return { connection: cachedClient, db: cachedDb };
    } catch (error) {
      console.log('Cached connection is stale, reconnecting...');
      cachedClient = null;
      cachedDb = null;
    }
  }

  try {
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    // Create connection with optimized timeouts for serverless
    const client = new MongoClient(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 1,  // Important for serverless - keep minimal
      minPoolSize: 0   // Don't maintain idle connections
    });

    // Connect with timeout
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 5000)
      )
    ]);

    const db = client.db(dbName);
    
    // Verify connection
    await db.admin().ping();
    
    cachedClient = client;
    cachedDb = db;
    
    console.log('✓ MongoDB native driver connected');
    return { connection: cachedClient, db: cachedDb };
  } catch (error) {
    console.error(`✗ MongoDB connection failed:`, error.message);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDB = async () => {
  try {
    if (cachedClient) {
      await cachedClient.close();
      cachedClient = null;
      cachedDb = null;
      console.log('✓ MongoDB disconnected');
    }
  } catch (error) {
    console.error('✗ MongoDB disconnection failed:', error.message);
    throw error;
  }
};

/**
 * Get database instance
 */
export const getDB = () => {
  if (!cachedDb) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return cachedDb;
};
