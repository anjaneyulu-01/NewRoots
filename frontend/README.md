# Frontend - NewRoots

This document describes the frontend for NewRoots.

Tech

- React with Vite, TailwindCSS
- Axios for API calls

Getting started (local)

1. Copy environment variables:

   - Create `frontend/.env` from `frontend/.env.example` and update `VITE_API_URL`.

2. Install dependencies and run dev server:

```bash
cd frontend
npm install
npm run dev
```

3. Build for production:

```bash
npm run build
npm run preview
```

Notes

- Vite uses `VITE_` prefixed env vars. Keep secrets out of the frontend in production.
- `VITE_API_URL` should point to the backend base URL (e.g., `https://api.example.com`).
- If you deploy frontend separately (Vercel/Netlify), configure the env var in your deployment settings.
