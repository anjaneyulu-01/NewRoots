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
    image: { type: String, default: 'https://wallpapers.com/images/hd/corporate-event-2048-x-1004-wallpaper-s5lftvht2yeiri7u.jpg' },
    date: { type: Date, required: true },
    location: LocationSchema,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['upcoming', 'completed'], default: 'upcoming' },
  },
  { timestamps: true }
);

export default mongoose.model('Event', EventSchema);
