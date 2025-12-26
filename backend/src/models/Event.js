import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  address: String,
  lat: Number,
  lng: Number,
});

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    location: LocationSchema,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['upcoming', 'completed'], default: 'upcoming' },
  },
  { timestamps: true }
);

export default mongoose.model('Event', EventSchema);
