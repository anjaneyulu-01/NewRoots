import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import { requireEventOwner } from '../middleware/ownership.js';
import Event from '../models/Event.js';
import Application from '../models/Application.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

async function saveBase64Image(base64) {
  const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  const ext = match[1].split('/')[1] || 'png';
  const data = match[2];
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const filepath = path.join(uploadsDir, filename);
  // ensure uploads directory exists
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(filepath, Buffer.from(data, 'base64'));
  return `/uploads/${filename}`;
}

const eventSchema = Joi.object({
  title: Joi.string().min(3).required(),
  description: Joi.string().allow(''),
  date: Joi.date().required(),
  // allow extra fields inside location (e.g. _id) when frontend sends full object
  location: Joi.object({ address: Joi.string().allow(''), lat: Joi.number(), lng: Joi.number() }).unknown(true),
}).unknown(true);

router.post('/', requireAuth, async (req, res) => {
  const { error, value } = eventSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  let image = req.body.imageUrl || undefined;
  if (!image && req.body.imageData) {
    try {
      image = await saveBase64Image(req.body.imageData);
    } catch (e) {
      console.error('image save failed', e);
    }
  }
  const event = await Event.create({ ...value, image, createdBy: req.user.id });
  res.status(201).json({ event });
});

router.get('/', async (req, res) => {
  const { q } = req.query;
  const filter = q ? { title: new RegExp(q, 'i') } : {};
  const events = await Event.find(filter).sort({ date: 1 }).limit(200).populate('createdBy', 'name email');
  // normalize to include `creator` for frontend convenience
  const out = events.map((e) => {
    const obj = e.toObject();
    obj.creator = obj.createdBy || null;
    return obj;
  });
  res.json({ events: out });
});

router.get('/me', requireAuth, async (req, res) => {
  const events = await Event.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
  const counts = await Promise.all(
    events.map(async (e) => ({
      eventId: e._id,
      applicants: await Application.countDocuments({ event: e._id }),
    }))
  );
  res.json({ events, counts });
});

// Update event (owner only)
router.put('/:id', requireAuth, requireEventOwner, async (req, res) => {
  const { error, value } = eventSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  let image = req.body.imageUrl || req.event.image;
  if (!image && req.body.imageData) {
    try { image = await saveBase64Image(req.body.imageData); } catch (e) { console.error('image save failed', e); }
  }
  Object.assign(req.event, { ...value, image });
  await req.event.save();
  res.json({ event: req.event });
});

// Delete event (owner only)
router.delete('/:id', requireAuth, requireEventOwner, async (req, res) => {
  // remove related applications
  await Application.deleteMany({ event: req.params.id });
  // use deleteOne() on the mongoose document (remove() was removed/deprecated)
  await req.event.deleteOne();
  res.json({ success: true });
});

// Applications for a specific event (owner only)
router.get('/:id/applications', requireAuth, requireEventOwner, async (req, res) => {
  const apps = await Application.find({ event: req.params.id }).populate('applicant', 'name email');
  res.json({ applications: apps });
});

const applySchema = Joi.object({
  amount: Joi.number().min(0).default(0),
  // flexible form object containing applicant details
  form: Joi.object({
    fullName: Joi.string().min(2).required(),
    phone: Joi.string().min(6).required(),
    dob: Joi.string().allow(''),
    details: Joi.string().allow(''),
  }).required().unknown(true),
}).unknown(true);

router.post('/:id/apply', requireAuth, async (req, res) => {
  const { error, value } = applySchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  // Prevent duplicate application
  const existing = await Application.findOne({ event: req.params.id, applicant: req.user.id });
  if (existing) return res.status(409).json({ error: 'Already applied' });
  const app = await Application.create({ event: req.params.id, applicant: req.user.id, amount: value.amount, form: value.form });
  res.status(201).json({ application: app });
});

router.post('/:id/applications/:appId/approve', requireAuth, requireEventOwner, async (req, res) => {
  const app = await Application.findById(req.params.appId);
  if (!app || app.event.toString() !== req.params.id) return res.status(404).json({ error: 'Application not found' });
  app.status = 'approved';
  await app.save();
  res.json({ application: app });
});

router.post('/:id/applications/:appId/reject', requireAuth, requireEventOwner, async (req, res) => {
  const app = await Application.findById(req.params.appId);
  if (!app || app.event.toString() !== req.params.id) return res.status(404).json({ error: 'Application not found' });
  app.status = 'rejected';
  await app.save();
  res.json({ application: app });
});

// Delete an application (owner only) - removes the notification/application
router.delete('/:id/applications/:appId', requireAuth, requireEventOwner, async (req, res) => {
  try {
    const app = await Application.findById(req.params.appId);
    if (!app || app.event.toString() !== req.params.id) return res.status(404).json({ error: 'Application not found' });
    await app.deleteOne();
    console.log(`Application ${req.params.appId} deleted by owner ${req.user.id} for event ${req.params.id}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('delete application error', err && err.stack ? err.stack : err);
    const details = process.env.NODE_ENV !== 'production' && err && err.message ? err.message : undefined;
    return res.status(500).json({ error: 'Failed to delete application', details });
  }
});

// POST fallback to delete an application (for proxies/clients that block DELETE)
router.post('/:id/applications/:appId/delete', requireAuth, requireEventOwner, async (req, res) => {
  try {
    const app = await Application.findById(req.params.appId);
    if (!app || app.event.toString() !== req.params.id) return res.status(404).json({ error: 'Application not found' });
    await app.deleteOne();
    console.log(`Application (POST delete) ${req.params.appId} deleted by owner ${req.user.id} for event ${req.params.id}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('delete application (post) error', err && err.stack ? err.stack : err);
    const details = process.env.NODE_ENV !== 'production' && err && err.message ? err.message : undefined;
    return res.status(500).json({ error: 'Failed to delete application', details });
  }
});

router.post('/:id/applications/:appId/payment', requireAuth, requireEventOwner, async (req, res) => {
  const { status } = req.body; // 'pending' | 'paid'
  if (!['pending', 'paid'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const app = await Application.findById(req.params.appId);
  if (!app || app.event.toString() !== req.params.id) return res.status(404).json({ error: 'Application not found' });
  app.paymentStatus = status;
  await app.save();
  res.json({ application: app });
});

export default router;
