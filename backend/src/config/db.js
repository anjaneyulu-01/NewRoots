import mongoose from 'mongoose';

const connectDB = async () => {
  // Use MONGO_ATLAS for MongoDB connection (set in Render dashboard)
  const uri = process.env.MONGO_ATLAS;
  if (!uri) {
    console.error('MONGO_ATLAS env variable is required');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    if (process.env.NODE_ENV !== 'production') console.log('MongoDB connected');
  } catch (err) {
    console.error('Mongo connection error:', err.message);
    process.exit(1);
  }
};

export default connectDB;
