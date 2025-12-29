import 'dotenv/config';
import fetch from 'node-fetch';

const email = process.argv[2] || 'rowdy18143@gmail.com';
const port = process.env.PORT || 5001;
const url = `http://localhost:${port}/api/auth/send-email-otp`;

(async () => {
  try {
    console.log('Sending OTP to', email);
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    const j = await r.json();
    console.log('STATUS', r.status);
    console.log(JSON.stringify(j, null, 2));
    if (j && j.preview) {
      console.log('\nFetching preview page to extract OTP...');
      const pv = await fetch(j.preview);
      const html = await pv.text();
      const m = html.match(/(\d{6})/);
      if (m) console.log('Detected OTP in preview:', m[1]);
      else console.log('No OTP detected in preview HTML (open preview URL in browser):', j.preview);
    }
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
    process.exit(2);
  }
})();
