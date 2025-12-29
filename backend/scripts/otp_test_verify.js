import 'dotenv/config';
import fetch from 'node-fetch';

const email = process.argv[2];
const code = process.argv[3];
const port = process.env.PORT || 5001;
const url = `http://localhost:${port}/api/auth/verify-email-otp`;

if (!email || !code) {
  console.error('Usage: node otp_test_verify.js <email> <code>');
  process.exit(1);
}

(async () => {
  try {
    console.log('Verifying OTP for', email);
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, code }) });
    const j = await r.json();
    console.log('STATUS', r.status);
    console.log(JSON.stringify(j, null, 2));
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
    process.exit(2);
  }
})();
