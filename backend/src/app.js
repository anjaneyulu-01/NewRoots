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
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
connectDB();

const app = express();
// Ensure CORS headers are always present (including on error responses)
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	if (req.method === 'OPTIONS') return res.sendStatus(200);
	next();
});
app.use(cors());
// capture raw request body for better diagnostics of JSON parse errors
app.use(express.json({
	verify: (req, _res, buf) => {
		try {
			req.rawBody = buf && buf.toString ? buf.toString() : '';
		} catch (e) {
			req.rawBody = undefined;
		}
	},
}));
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

// Serve uploaded images
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

export default app;

// Error handler to surface JSON parse errors with raw payload when debugging
app.use((err, req, res, next) => {
	if (err && err.type === 'entity.parse.failed') {
		console.error('JSON parse error on', req.method, req.originalUrl, 'error:', err.message);
		console.error('Raw body:', req.rawBody);
		const payload = process.env.DEBUG_EMAIL === 'true' ? { rawBody: req.rawBody } : undefined;
		return res.status(400).json({ error: 'Invalid JSON payload', details: err.message, payload });
	}
	next(err);
});
