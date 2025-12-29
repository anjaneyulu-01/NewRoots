# API Reference (summary)

This file provides a quick reference for the main API endpoints.

Auth
- `POST /api/auth/register` - register; now supports email OTP flows
- `POST /api/auth/login` - login with email/password, returns JWT
- `POST /api/auth/send-email-otp` - send OTP
- `POST /api/auth/verify-email-otp` - verify OTP
- `GET /api/auth/me` - current user info

Events
- `GET /api/events` - list events
- `POST /api/events` - create event (auth)
- `GET /api/events/:id` - get event
- `POST /api/events/:id/apply` - submit application
- `DELETE /api/events/:id/applications/:appId` - delete an application (owner)

Jobs
- `GET /api/jobs`
- `POST /api/jobs`
- `POST /api/jobs/:id/apply`

Housing
- `GET /api/housing`
- `POST /api/housing`
- `POST /api/housing/:id/apply`

Contact / Messaging
- `POST /api/contact` - send message (body: { resourceType, resourceId, message })
- `GET /api/contact/me` - inbox
- `GET /api/contact/sent` - sent messages
- `DELETE /api/contact/clear/:otherUserId` - hide conversation for current user

Notes
- Many endpoints require authentication via `Authorization: Bearer <token>` header.
- Ownership checks are enforced server-side for actions like deleting resources or viewing incoming applications.
