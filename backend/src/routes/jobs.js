import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import Job from '../models/Job.js';
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
  let image = req.body.imageUrl || undefined;
  if (!image && req.body.imageData) {
    try {
      image = await saveBase64Image(req.body.imageData);
    } catch (e) {
      console.error('image save failed', e);
    }
  }
  const job = await Job.create({ ...value, image, postedBy: req.user.id });
  res.status(201).json({ job });
});

// Get current user's jobs
router.get('/me', requireAuth, async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
  res.json({ jobs });
});

// Update a job (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.postedBy.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { error, value } = jobSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  let image = req.body.imageUrl || job.image;
  if (!image && req.body.imageData) {
    try { image = await saveBase64Image(req.body.imageData); } catch (e) { console.error('image save failed', e); }
  }
  Object.assign(job, { ...value, image });
  await job.save();
  res.json({ job });
});

// Delete a job (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.postedBy.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await job.remove();
  res.json({ success: true });
});

router.get('/', async (req, res) => {
  const { q } = req.query;
  const filter = q ? { $or: [{ title: new RegExp(q, 'i') }, { company: new RegExp(q, 'i') }, { address: new RegExp(q, 'i') }] } : {};
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(200).populate('postedBy', 'name email');
  const out = jobs.map((j) => { const obj = j.toObject(); obj.poster = obj.postedBy || null; return obj; });
  res.json({ jobs: out });
});

// Apply to a job
const applyJobSchema = Joi.object({
  amount: Joi.number().min(0).default(0),
  form: Joi.object({
    fullName: Joi.string().min(2).required(),
    phone: Joi.string().min(6).required(),
    dob: Joi.string().allow(''),
    details: Joi.string().allow(''),
  }).required().unknown(true),
}).unknown(true);

router.post('/:id/apply', requireAuth, async (req, res) => {
  const { error, value } = applyJobSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const existing = await Application.findOne({ job: req.params.id, applicant: req.user.id });
  if (existing) return res.status(409).json({ error: 'Already applied' });
  const app = await Application.create({ job: req.params.id, applicant: req.user.id, amount: value.amount, form: value.form });
  res.status(201).json({ application: app });
});

export default router;
