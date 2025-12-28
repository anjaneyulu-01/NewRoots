# NewRoots Platform

A social-impact web platform to help newcomers find low-cost housing, work, events, and connect with organizers, workers, and artists.

## Tech Stack
- Frontend: React (Vite) + Tailwind CSS + Google Maps
- Backend: Node.js + Express + MongoDB (Mongoose)
- Auth: JWT
- Single user type (abilities depend on actions)

## Monorepo Structure
- `backend/` — Express API server
- `frontend/` — React UI

## Setup

### Prerequisites
- Node.js LTS
- MongoDB running locally or in the cloud

### Backend
1. Copy `backend/.env.example` to `backend/.env` and set values.
2. Install and run:
```bash
cd backend
npm install
npm run dev
```
API will listen on port `5000`.

### Frontend
1. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_GOOGLE_MAPS_API_KEY`.
2. Install and run:
```bash
cd frontend
npm install
npm run dev
```
UI will listen on `http://localhost:5173` and proxy `/api` to backend.

## Key API Endpoints
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Events: `POST /api/events`, `GET /api/events`, `GET /api/events/me`
- Apply: `POST /api/events/:id/apply`
- Owner actions: `GET /api/events/:id/applications`, approve/reject/payment
- Applications: `GET /api/applications/me`, `GET /api/applications/incoming`
- Earnings: `GET /api/earnings/me`
- Housing: `POST /api/housing`, `GET /api/housing`
- Jobs: `POST /api/jobs`, `GET /api/jobs`

## Security & Best Practices
- JWT auth for protected routes
- Ownership checks for event approvals
- Basic rate limiting on `/api`
- Input validation via Joi

## UI/UX Notes
- Bright, friendly colors (blue/teal primary, green secondary, amber accent)
- Gradient cards, smooth hover effects
- Fully responsive dashboard layout

