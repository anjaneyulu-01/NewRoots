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
    // Reuse the same mail-sending flow/key as OTP emails
    const data = await sendEmail({
      to,
      subject: 'Reset your NewRoots Password',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50; text-align: center;">Password Reset Request</h2>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Hello,
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            We received a request to reset the password associated with your NewRoots account. 
            Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            <strong>Link expires in 1 hour.</strong> If you did not request this reset, you can safely ignore this email.
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Or copy and paste this link in your browser:
          </p>
          
          <p style="font-size: 12px; color: #999; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
            ${link}
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            © 2026 NewRoots. All rights reserved.
          </p>
        </div>
      `,
    });
    console.log('✅ Password reset email sent to:', to);
    return data;
  } catch (err) {
    console.error('❌ Brevo reset email failed:', err?.response?.data || err.message);
    throw err;
  }
}

