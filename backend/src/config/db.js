import mongoose from 'mongoose';

const connectDB = async () => {
  // Support multiple env names: prefer MONGO_URI, then MONGO_ATLAS, then MONGO_LOCAL
  const uri = process.env.MONGO_URI || process.env.MONGO_ATLAS || process.env.MONGO_LOCAL;
  if (!uri) {
    console.error('MONGO_URI (or MONGO_ATLAS / MONGO_LOCAL) not set');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Mongo connection error:', err.message);
    process.exit(1);
  }
};

export default connectDB;
