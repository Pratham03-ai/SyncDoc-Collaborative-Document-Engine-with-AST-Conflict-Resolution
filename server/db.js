import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log(`[DB] Attempting connection to MongoDB at: ${uri}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000
      });
      console.log('[DB] Connected successfully to external MongoDB');
      return;
    } catch (err) {
      console.warn(`[DB] External MongoDB connection failed (${err.message}). Falling back to MongoMemoryServer...`);
    }
  }

  // Fallback to in-memory MongoDB
  try {
    console.log('[DB] Initializing embedded in-memory MongoDB server...');
    mongoMemoryServer = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[DB] Connected to in-memory MongoDB at: ${memoryUri}`);
  } catch (memErr) {
    console.error('[DB] Failed to start MongoMemoryServer:', memErr);
    throw memErr;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
    console.log('[DB] Disconnected from MongoDB');
  } catch (err) {
    console.error('[DB] Error during disconnect:', err);
  }
}
