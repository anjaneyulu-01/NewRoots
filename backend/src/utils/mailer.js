import axios from 'axios';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

if (!process.env.BREVO_API_KEY) {
  throw new Error('BREVO_API_KEY is missing');
}

if (!process.env.EMAIL_FROM) {
  throw new Error('EMAIL_FROM is missing');
}

export async function sendOtpEmail(to, otp) {
  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: {
          email: process.env.EMAIL_FROM.trim(), // MUST be plain email
          name: 'NewRoots',
        },
        to: [{ email: to }],
        subject: 'Your NewRoots OTP Code',
        htmlContent: `
          <h2>Your OTP: ${otp}</h2>
          <p>This code is valid for 10 minutes.</p>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ OTP email sent to:', to);
    return response.data;
  } catch (err) {
    console.error(
      '❌ Brevo email failed:',
      err?.response?.data || err.message
    );
    throw err;
  }
}
