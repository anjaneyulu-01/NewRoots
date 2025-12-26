import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    company: String,
    address: String,
    lat: Number,
    lng: Number,
    pay: Number,
    contact: String,
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Job', JobSchema);
