import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import { apiLimiter } from './middleware/rateLimit.js';

import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import applicationRoutes from './routes/applications.js';
import housingRoutes from './routes/housing.js';
import jobRoutes from './routes/jobs.js';
import earningsRoutes from './routes/earnings.js';
import contactRoutes from './routes/contact.js';

import path from 'path';
import { fileURLToPath } from 'url';

connectDB();

const app = express();

// ✅ CORS (JWT-based, no cookies)
const allowedOrigins = [
  'https://newroots-1.onrender.com',
  'https://newroots.onrender.com',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS','HEAD','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// Set JSON body size limit to 2MB to support compressed base64 image uploads
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(morgan('dev'));
app.use('/api', apiLimiter);

// Health checks
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/housing', housingRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/contact', contactRoutes);

// Static uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Error handlers
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV !== 'production'
      ? err.message
      : 'Internal Server Error',
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'NewRoots backend running 🚀' });
});

export default app;
