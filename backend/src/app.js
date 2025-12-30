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
// CORS configuration — must be registered before routes.
const allowedOrigins = [
	'https://newroots-1.onrender.com',
	'http://localhost:5173',
	'http://localhost:3000',
];
const corsOptions = {
	origin: (origin, callback) => {
		// Allow requests with no origin (e.g., curl, mobile apps, server-to-server)
		if (!origin) return callback(null, true);
		// If origin is in our whitelist, allow it; otherwise explicitly deny
		if (allowedOrigins.includes(origin)) return callback(null, true);
		// Do not throw an error from the origin check — return false so CORS
		// middleware will not set the Access-Control-Allow-Origin header.
		return callback(null, false);
	},
	credentials: true,
	methods: ['GET','POST','PUT','DELETE','OPTIONS','HEAD','PATCH'],
	allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(cors(corsOptions));
// Handle preflight requests for all routes
app.options('*', cors(corsOptions));
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

// Generic error handler — always return JSON and avoid crashing the process.
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err && err.stack ? err.stack : err);
	if (res.headersSent) return next(err);
	const status = err && err.status ? err.status : 500;
	const message = err && err.message ? err.message : 'Internal Server Error';
	// In non-production include an error id or stack when DEBUG_EMAIL is true
	const payload = process.env.NODE_ENV !== 'production' || process.env.DEBUG_EMAIL === 'true'
		? { message, stack: err && err.stack }
		: { message };
	return res.status(status).json({ error: payload });
});

export default app;
