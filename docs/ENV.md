# Environment Variables

This document lists environment variables used by the project and their purpose.

Root (`.env` or .env.example)
- `CLIENT_URL` - URL of the frontend (used in emails and redirects)

Backend (`backend/.env`)
- `MONGO_LOCAL` or `MONGO_ATLAS` - MongoDB connection string
- `PORT` - server port (default 5000)
- `NODE_ENV` - `development` or `production`
- `JWT_SECRET` - secret for signing JWT tokens (must be strong)
- `JWT_EXPIRES_IN` - token expiry (e.g., `7d`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - SMTP server credentials used by Nodemailer for OTP and notifications
- `EMAIL_FROM` - the From header used when sending emails
- `LOG_LEVEL` - `info`, `debug`, etc.

Frontend (`frontend/.env`)
- `VITE_API_URL` - Base URL for backend API (e.g., `http://localhost:5000`)
- `VITE_GOOGLE_MAPS_API_KEY` - (optional) Google Maps API key for location picker

Security notes
- Never commit real secrets to the repo. Use `.env` files locally and configure env vars in CI/CD or hosting provider.
- When deploying, rotate secrets and set secure SMTP credentials (or use a transactional email provider like SendGrid/Mailgun).
