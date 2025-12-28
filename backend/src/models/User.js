import mongoose from 'mongoose';

const EarningsEntrySchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  date: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    createdEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    joinedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    earningsHistory: {
      totalEarned: { type: Number, default: 0 },
      entries: [EarningsEntrySchema],
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
