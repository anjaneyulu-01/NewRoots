import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import { requireEventOwner } from '../middleware/ownership.js';
import Event from '../models/Event.js';
import Application from '../models/Application.js';

const router = express.Router();

const eventSchema = Joi.object({
  title: Joi.string().min(3).required(),
  description: Joi.string().allow(''),
  date: Joi.date().required(),
  location: Joi.object({ address: Joi.string().allow(''), lat: Joi.number(), lng: Joi.number() }),
});

router.post('/', requireAuth, async (req, res) => {
  const { error, value } = eventSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const event = await Event.create({ ...value, createdBy: req.user.id });
  res.status(201).json({ event });
});

router.get('/', async (req, res) => {
  const { q } = req.query;
  const filter = q ? { title: new RegExp(q, 'i') } : {};
  const events = await Event.find(filter).sort({ date: 1 }).limit(200);
  res.json({ events });
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

// Applications for a specific event (owner only)
router.get('/:id/applications', requireAuth, requireEventOwner, async (req, res) => {
  const apps = await Application.find({ event: req.params.id }).populate('applicant', 'name email');
  res.json({ applications: apps });
});

const applySchema = Joi.object({
  note: Joi.string().allow(''),
  amount: Joi.number().min(0).default(0),
});

router.post('/:id/apply', requireAuth, async (req, res) => {
  const { error, value } = applySchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  // Prevent duplicate application
  const existing = await Application.findOne({ event: req.params.id, applicant: req.user.id });
  if (existing) return res.status(409).json({ error: 'Already applied' });
  const app = await Application.create({ event: req.params.id, applicant: req.user.id, ...value });
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
