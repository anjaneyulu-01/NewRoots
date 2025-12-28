import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import Housing from '../models/Housing.js';
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

const housingSchema = Joi.object({
  title: Joi.string().min(3).required(),
  description: Joi.string().allow(''),
  address: Joi.string().allow(''),
  lat: Joi.number().optional(),
  lng: Joi.number().optional(),
  rent: Joi.number().min(0).required(),
  contact: Joi.string().allow(''),
});

router.post('/', requireAuth, async (req, res) => {
  const { error, value } = housingSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  let image = req.body.imageUrl || undefined;
  if (!image && req.body.imageData) {
    try {
      image = await saveBase64Image(req.body.imageData);
    } catch (e) {
      console.error('image save failed', e);
    }
  }
  const listing = await Housing.create({ ...value, image, postedBy: req.user.id });
  res.status(201).json({ housing: listing });
});

// Get current user's housing listings
router.get('/me', requireAuth, async (req, res) => {
  const listings = await Housing.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
  res.json({ housing: listings });
});

// Update a listing (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  const listing = await Housing.findById(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.postedBy.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { error, value } = housingSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  let image = req.body.imageUrl || listing.image;
  if (!image && req.body.imageData) {
    try { image = await saveBase64Image(req.body.imageData); } catch (e) { console.error('image save failed', e); }
  }
  Object.assign(listing, { ...value, image });
  await listing.save();
  res.json({ housing: listing });
});

// Delete a listing (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  const listing = await Housing.findById(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.postedBy.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await listing.remove();
  res.json({ success: true });
});

router.get('/', async (req, res) => {
  const { q } = req.query;
  const filter = q ? { $or: [{ title: new RegExp(q, 'i') }, { address: new RegExp(q, 'i') }] } : {};
  const listings = await Housing.find(filter).sort({ createdAt: -1 }).limit(200).populate('postedBy', 'name email');
  const out = listings.map((h) => { const obj = h.toObject(); obj.poster = obj.postedBy || null; return obj; });
  res.json({ housing: out });
});

// Apply to a housing listing
const applyHousingSchema = Joi.object({
  amount: Joi.number().min(0).default(0),
  form: Joi.object({
    fullName: Joi.string().min(2).required(),
    phone: Joi.string().min(6).required(),
    dob: Joi.string().allow(''),
    details: Joi.string().allow(''),
  }).required().unknown(true),
}).unknown(true);

router.post('/:id/apply', requireAuth, async (req, res) => {
  const { error, value } = applyHousingSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const existing = await Application.findOne({ housing: req.params.id, applicant: req.user.id });
  if (existing) return res.status(409).json({ error: 'Already applied' });
  const app = await Application.create({ housing: req.params.id, applicant: req.user.id, amount: value.amount, form: value.form });
  res.status(201).json({ application: app });
});

export default router;
