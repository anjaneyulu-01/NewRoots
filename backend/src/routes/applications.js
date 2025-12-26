import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Application from '../models/Application.js';
import Event from '../models/Event.js';

const router = express.Router();

// My applications
router.get('/me', requireAuth, async (req, res) => {
  const apps = await Application.find({ applicant: req.user.id })
    .sort({ createdAt: -1 })
    .populate('event', 'title date location');
  res.json({ applications: apps });
});

// Incoming approvals/requests for events I own
router.get('/incoming', requireAuth, async (req, res) => {
  const events = await Event.find({ createdBy: req.user.id }).select('_id');
  const ids = events.map((e) => e._id);
  const apps = await Application.find({ event: { $in: ids } })
    .sort({ createdAt: -1 })
    .populate('applicant', 'name email')
    .populate('event', 'title date location');
  res.json({ applications: apps });
});

export default router;
