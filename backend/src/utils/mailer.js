import axios from 'axios';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

if (!process.env.BREVO_API_KEY) {
  throw new Error('BREVO_API_KEY is missing');
}

if (!process.env.EMAIL_FROM) {
  throw new Error('EMAIL_FROM is missing');
}

async function sendEmail({ to, subject, htmlContent }) {
  const response = await axios.post(
    BREVO_API_URL,
    {
      sender: {
        email: process.env.EMAIL_FROM.trim(), // MUST be plain email
        name: 'NewRoots',
      },
      to: [{ email: to }],
      subject,
      htmlContent,
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
  return response.data;
}

export async function sendOtpEmail(to, otp) {
  try {
    const data = await sendEmail({
      to,
      subject: 'Your NewRoots OTP Code',
      htmlContent: `
        <h2>Your OTP: ${otp}</h2>
        <p>This code is valid for 10 minutes.</p>
      `,
    });
    console.log('✅ OTP email sent to:', to);
    return data;
  } catch (err) {
    console.error('❌ Brevo OTP email failed:', err?.response?.data || err.message);
    throw err;
  }
}

export async function sendPasswordResetEmail(to, link) {
  try {
    const data = await sendEmail({
      to,
      subject: 'Reset your NewRoots password',
      htmlContent: `
        <h2>Reset your password</h2>
        <p>Click the link below to set a new password. This link expires in 1 hour.</p>
        <p><a href="${link}">Reset Password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });
    console.log('✅ Password reset email sent to:', to);
    return data;
  } catch (err) {
    console.error('❌ Brevo reset email failed:', err?.response?.data || err.message);
    throw err;
  }
}

