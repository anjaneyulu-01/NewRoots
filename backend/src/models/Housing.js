import mongoose from 'mongoose';

const HousingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    address: String,
    lat: Number,
    lng: Number,
    rent: { type: Number, required: true },
    contact: String,
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Housing', HousingSchema);
