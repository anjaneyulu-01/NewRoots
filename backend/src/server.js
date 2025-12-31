
// Only load dotenv in development; Render injects env vars in production
import "dotenv/config"; // harmless in production


// Validate required environment variables for production
const requiredVars = [
  'EMAIL_FROM', // Used as sender address for all outgoing emails
  'JWT_SECRET', // Used for signing/verifying JWT tokens
  'MONGO_ATLAS', // MongoDB Atlas connection string
  'SMTP_HOST', // SMTP server for sending emails
  'SMTP_PORT', // SMTP port
  'SMTP_SECURE', // SMTP secure flag (true/false)
  'SMTP_USER', // SMTP username
  'SMTP_PASS', // SMTP password
];
if (process.env.NODE_ENV === 'production') {
  requiredVars.forEach((v) => {
    if (!process.env[v]) {
      console.error(`Missing required env variable: ${v}`);
      process.exit(1);
    }
  });
}


import app from "./app.js";

// Render requires trust proxy for correct client IP and secure cookies
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`NewRoots backend listening on port ${PORT}`);
});
