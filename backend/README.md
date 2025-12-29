# Backend - NewRoots

This document describes the backend for the NewRoots project.

Quick overview

- Tech: Node.js, Express, Mongoose (MongoDB).
- Main responsibilities: authentication (email OTP / JWT), resource CRUD (events, jobs, housing), messaging (contacts), applications, and background scripts.

Getting started (local)

1. Copy environment variables:

   - Create `backend/.env` from `backend/.env.example` and fill secrets.

2. Install dependencies:

```bash
cd backend
npm install
```

3. Run the server in development:

```bash
npm run dev
# or
node src/server.js
```

Important environment variables (see `backend/.env.example`):

- `MONGO_LOCAL` or `MONGO_ATLAS` - MongoDB connection string.
- `JWT_SECRET` - Secret used to sign JWT tokens.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` - SMTP settings for sending OTP and notifications.

Notes

- The backend expects a `CLIENT_URL` env var for generating links in emails.
- Nodemailer is used for sending OTP emails. If you use a dev-only SMTP provider (Ethereal), update the `.env` accordingly.
- There are a few maintenance scripts in `backend/scripts` (should be removed or gated in production).

API

See `docs/API.md` for the documented endpoints and request/response shapes.
