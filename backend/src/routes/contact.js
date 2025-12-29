import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import Contact from '../models/Contact.js';
import Event from '../models/Event.js';
import Job from '../models/Job.js';
import Housing from '../models/Housing.js';

const router = express.Router();

const contactSchema = Joi.object({
  resourceType: Joi.string().valid('Event', 'Job', 'Housing').required(),
  resourceId: Joi.string().required(),
  message: Joi.string().min(1).max(2000).required(),
});

router.post('/', requireAuth, async (req, res) => {
  const { error, value } = contactSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { resourceType, resourceId, message } = value;

  let resourceDoc = null;
  let toUser = null;
  if (resourceType === 'Event') {
    resourceDoc = await Event.findById(resourceId);
    toUser = resourceDoc?.createdBy;
  } else if (resourceType === 'Job') {
    resourceDoc = await Job.findById(resourceId);
    toUser = resourceDoc?.postedBy;
  } else if (resourceType === 'Housing') {
    resourceDoc = await Housing.findById(resourceId);
    toUser = resourceDoc?.postedBy;
  }

  if (!resourceDoc || !toUser) return res.status(404).json({ error: 'Resource not found' });
  if (toUser.toString() === req.user.id) return res.status(400).json({ error: 'Cannot contact yourself' });

  const contact = await Contact.create({
    resourceType,
    resource: resourceDoc._id,
    toUser,
    fromUser: req.user.id,
    message,
  });

  res.status(201).json({ contact });
});

router.get('/me', requireAuth, async (req, res) => {
  const messages = await Contact.find({ toUser: req.user.id, hiddenFor: { $ne: req.user.id } })
    .sort({ createdAt: -1 })
    .populate('fromUser', 'name email')
    .populate('replies.fromUser', 'name email')
    .populate({ path: 'resource', select: 'title address company rent date', strictPopulate: false });
  res.json({ messages });
});

router.get('/sent', requireAuth, async (req, res) => {
  const messages = await Contact.find({ fromUser: req.user.id, hiddenFor: { $ne: req.user.id } })
    .sort({ createdAt: -1 })
    .populate('toUser', 'name email')
    .populate('replies.fromUser', 'name email')
    .populate({ path: 'resource', select: 'title address company rent date', strictPopulate: false });
  res.json({ messages });
});

// clear conversation for current user only (do not delete messages for the other participant)
router.delete('/clear/:otherUserId', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.otherUserId;
    console.log(`contact.clear DELETE called by ${me} for other=${other}`);
    // Add current user to hiddenFor on messages between me and other
    const pairQuery1 = { toUser: me, fromUser: other };
    const pairQuery2 = { fromUser: me, toUser: other };
    await Contact.updateMany(pairQuery1, { $addToSet: { hiddenFor: me } });
    await Contact.updateMany(pairQuery2, { $addToSet: { hiddenFor: me } });
    // Remove messages where both participants have hidden the message
    const bothHiddenQuery = {
      $and: [
        { $or: [pairQuery1, pairQuery2] },
        { hiddenFor: { $all: [me, other] } },
      ],
    };
    const delRes = await Contact.deleteMany(bothHiddenQuery);
    console.log(`contact.clear DELETE: marked hidden for ${me}, deleted ${delRes.deletedCount} docs where both hidden`);
    return res.json({ success: true, deleted: delRes.deletedCount });
  } catch (err) {
    console.error('clear conversation error', err && err.stack ? err.stack : err);
    const details = process.env.NODE_ENV !== 'production' && err && err.message ? err.message : undefined;
    return res.status(500).json({ error: 'Failed to clear conversation', details });
  }
});

// POST variant for clearing conversation (some clients/proxies may not allow DELETE with body)
router.post('/clear', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.body.otherUserId || req.body.other || req.body.userId;
    console.log(`contact.clear POST called by ${me} with body other=${other}`);
    if (!other) return res.status(400).json({ error: 'Missing otherUserId' });
    const pairQuery1 = { toUser: me, fromUser: other };
    const pairQuery2 = { fromUser: me, toUser: other };
    await Contact.updateMany(pairQuery1, { $addToSet: { hiddenFor: me } });
    await Contact.updateMany(pairQuery2, { $addToSet: { hiddenFor: me } });
    const bothHiddenQuery = {
      $and: [
        { $or: [pairQuery1, pairQuery2] },
        { hiddenFor: { $all: [me, other] } },
      ],
    };
    const delRes = await Contact.deleteMany(bothHiddenQuery);
    console.log(`contact.clear POST: marked hidden for ${me}, deleted ${delRes.deletedCount} docs where both hidden`);
    return res.json({ success: true, deleted: delRes.deletedCount });
  } catch (err) {
    console.error('clear conversation (post) error', err && err.stack ? err.stack : err);
    const details = process.env.NODE_ENV !== 'production' && err && err.message ? err.message : undefined;
    return res.status(500).json({ error: 'Failed to clear conversation', details });
  }
});

router.post('/:id/read', requireAuth, async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact || contact.toUser.toString() !== req.user.id) return res.status(404).json({ error: 'Message not found' });
  contact.status = 'read';
  await contact.save();
  res.json({ contact });
});

router.post('/:id/reply', requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Reply message is required' });

  const contact = await Contact.findById(req.params.id);
  if (!contact) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  // Allow both toUser and fromUser to reply
  const isParticipant = contact.toUser.toString() === req.user.id || contact.fromUser.toString() === req.user.id;
  if (!isParticipant) {
    return res.status(403).json({ error: 'You are not part of this conversation' });
  }

  contact.replies.push({
    fromUser: req.user.id,
    message: message.trim(),
  });

  await contact.save();
  // Populate to get sender name/email in response
  await contact.populate('replies.fromUser', 'name email');
  res.json({ contact });
});

export default router;
