import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import Housing from '../models/Housing.js';

const router = express.Router();

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
  const listing = await Housing.create({ ...value, postedBy: req.user.id });
  res.status(201).json({ housing: listing });
});

router.get('/', async (req, res) => {
  const { q } = req.query;
  const filter = q ? { $or: [{ title: new RegExp(q, 'i') }, { address: new RegExp(q, 'i') }] } : {};
  const listings = await Housing.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ housing: listings });
});

export default router;
