import nodemailer from 'nodemailer';

// Validate required env vars at startup
const requiredVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
];

for (const v of requiredVars) {
  if (!process.env[v]) {
    console.error(`❌ Missing env variable: ${v}`);
    process.exit(1);
  }
}

const port = Number(process.env.SMTP_PORT);
const secure = port === 465;

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify SMTP once at startup (VERY IMPORTANT)
transporter.verify()
  .then(() => console.log('✅ SMTP ready (Brevo connected)'))
  .catch(err => {
    console.error('❌ SMTP verification failed:', err);
    process.exit(1);
  });

export async function sendOtpEmail(to, otp) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}. Valid for 10 minutes.`,
    html: `
      <h2>Your OTP: ${otp}</h2>
      <p>This code is valid for 10 minutes.</p>
    `,
  });
}
