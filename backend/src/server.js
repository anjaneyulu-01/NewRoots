// Only load dotenv in development; Render injects env vars in production
import "dotenv/config"; // safe in production

// Validate required environment variables for production
const requiredVars = [
  'EMAIL_FROM',     // Brevo sender email
  'BREVO_API_KEY',  // Brevo HTTP API key
  'JWT_SECRET',     // JWT signing secret
  'MONGO_ATLAS',    // MongoDB connection string
];

if (process.env.NODE_ENV === 'production') {
  requiredVars.forEach((v) => {
    if (!process.env[v]) {
      console.error(`❌ Missing required env variable: ${v}`);
      process.exit(1);
    }
  });
}

import app from "./app.js";

// Render requires trust proxy for correct client IP and cookies
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 NewRoots backend listening on port ${PORT}`);
});
