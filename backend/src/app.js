import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { apiLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import applicationRoutes from './routes/applications.js';
import housingRoutes from './routes/housing.js';
import jobRoutes from './routes/jobs.js';
import earningsRoutes from './routes/earnings.js';
import contactRoutes from './routes/contact.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', apiLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/housing', housingRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/contact', contactRoutes);

export default app;
