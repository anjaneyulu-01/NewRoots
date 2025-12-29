import mongoose from 'mongoose';

const EmailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

EmailOtpSchema.index({ email: 1, code: 1 });

export default mongoose.model('EmailOtp', EmailOtpSchema);
