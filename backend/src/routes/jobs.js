import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import Job from '../models/Job.js';

const router = express.Router();

const jobSchema = Joi.object({
  title: Joi.string().min(3).required(),
  description: Joi.string().allow(''),
  company: Joi.string().allow(''),
  address: Joi.string().allow(''),
  lat: Joi.number().optional(),
  lng: Joi.number().optional(),
  pay: Joi.number().min(0).optional(),
  contact: Joi.string().allow(''),
});

router.post('/', requireAuth, async (req, res) => {
  const { error, value } = jobSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const job = await Job.create({ ...value, postedBy: req.user.id });
  res.status(201).json({ job });
});

router.get('/', async (req, res) => {
  const { q } = req.query;
  const filter = q ? { $or: [{ title: new RegExp(q, 'i') }, { company: new RegExp(q, 'i') }, { address: new RegExp(q, 'i') }] } : {};
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ jobs });
});

export default router;
