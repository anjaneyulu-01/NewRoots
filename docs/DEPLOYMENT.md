# Deployment Guide

This document provides basic deployment guidance for NewRoots.

Options

1) Docker (recommended for portability)

- Build backend image (example):

```bash
# from repo root
cd backend
docker build -t newroots-backend .
# run with env file
docker run --env-file .env -p 5000:5000 newroots-backend
```

- Serve frontend separately (Vercel/Netlify) or build a static bundle and serve via CDN.

2) Heroku / Render / DigitalOcean App Platform

- Set environment variables in the platform UI.
- Ensure `MONGO_ATLAS` or external MongoDB is reachable from the host.

3) Vercel / Netlify (Frontend)

- Set `VITE_API_URL` in project settings to the backend URL.

Database

- Use a managed MongoDB (Atlas) for production. Set `MONGO_ATLAS` and remove local connection.

Email

- Use a production-grade transactional email provider or secure SMTP credentials.

TLS / HTTPS

- Use the hosting provider's TLS support or a reverse proxy with Let's Encrypt.

Scaling

- For higher load, run multiple backend instances behind a load balancer; ensure sticky sessions are not required (JWT stateless auth is recommended).

Monitoring

- Add logging (Loggly, Papertrail) and error monitoring (Sentry) as needed.
