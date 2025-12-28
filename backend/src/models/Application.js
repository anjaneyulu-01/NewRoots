import mongoose from 'mongoose';

const ApplicationSchema = new mongoose.Schema(
  {
    // support event/job/housing applications
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    housing: { type: mongoose.Schema.Types.ObjectId, ref: 'Housing' },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: String,
    amount: { type: Number, default: 0 },
    // flexible form payload submitted by applicant (e.g. name, phone, dob, details)
    form: { type: Object },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  },
  { timestamps: true }
);

// uniqueness will be enforced in route handlers to allow multiple target types

export default mongoose.model('Application', ApplicationSchema);
