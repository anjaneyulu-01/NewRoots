
import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

// Validate required SMTP environment variables at startup
const requiredSmtpVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
];
for (const v of requiredSmtpVars) {
  if (!process.env[v]) {
    throw new Error(`Missing required SMTP environment variable: ${v}`);
  }
}

// Brevo (Sendinblue) SMTP: port 587, secure false, domain-based sender
const port = Number(process.env.SMTP_PORT);
const secure = port === 465; // Only use secure for port 465

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email (OTP, verification, etc.)
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} [text] - Plain text content (optional)
 * @returns {Promise<void>}
 */
export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error('EMAIL_FROM env variable is required');
  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    // Log full error for Render logs
    console.error('Email send failed:', err && err.stack ? err.stack : err);
    // Rethrow for route handler to catch and respond with JSON
    throw err;
  }
}

// Example usage: sendOtpEmail
/**
 * Send OTP email (example usage)
 * @param {string} to - Recipient email address
 * @param {string} otp - One-time password
 */
export async function sendOtpEmail(to, otp) {
  return sendEmail({
    to,
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    html: `<h2>Your OTP: ${otp}</h2><p>This code is valid for 10 minutes.</p>`,
  });
}