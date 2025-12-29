import mongoose from 'mongoose';

const ReplySchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const ContactSchema = new mongoose.Schema(
  {
    resourceType: { type: String, enum: ['Event', 'Job', 'Housing'], required: true },
    resource: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'resourceType' },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'read', 'archived'], default: 'new' },
    replies: [ReplySchema],
    hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

ContactSchema.index({ toUser: 1, createdAt: -1 });

export default mongoose.model('Contact', ContactSchema);
