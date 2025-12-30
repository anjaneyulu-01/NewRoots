// Nodemailer SMTP configuration using environment variables
// All values are injected by Render in production
import nodemailer from 'nodemailer';

// Create a reusable transporter object using SMTP
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // SMTP server
  port: Number(process.env.SMTP_PORT), // SMTP port
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // SMTP username
    pass: process.env.SMTP_PASS, // SMTP password
  },
});

// Example send function for OTP or notifications
export async function sendOtpEmail(to, otp) {
  const from = process.env.EMAIL_FROM; // e.g. 'NewRoots <noreply@yourdomain.com>'
  if (!from) throw new Error('EMAIL_FROM env variable is required');
  const mailOptions = {
    from,
    to,
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    html: `<h2>Your OTP: ${otp}</h2><p>This code is valid for 10 minutes.</p>`,
  };
  await transporter.sendMail(mailOptions);
}