import 'dotenv/config';
import fetch from 'node-fetch';
import app from '../src/app.js';

const port = process.env.PORT || 5001;

(async () => {
  const server = app.listen(port, async () => {
    console.log('Test runner started server on port', port);
    try {
      const email = process.argv[2] || 'rowdy18143@gmail.com';
      const sendUrl = `http://localhost:${port}/api/auth/send-email-otp`;
      console.log('Sending OTP to', email);
      const r = await fetch(sendUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const j = await r.json();
      console.log('SEND STATUS', r.status);
      console.log(JSON.stringify(j, null, 2));
      if (j && j.preview) {
        console.log('Fetching preview page...');
        const pv = await fetch(j.preview);
        const html = await pv.text();
        const m = html.match(/(\d{6})/);
        const code = m ? m[1] : null;
        if (code) console.log('Detected OTP in preview:', code);
        else console.log('No OTP found in preview HTML; open preview:', j.preview);

        if (code) {
          const verifyUrl = `http://localhost:${port}/api/auth/verify-email-otp`;
          console.log('Verifying OTP automatically...');
          const rv = await fetch(verifyUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, code }) });
          const jv = await rv.json();
          console.log('VERIFY STATUS', rv.status);
          console.log(JSON.stringify(jv, null, 2));
        }
      }
    } catch (e) {
      console.error('ERROR', e && e.message ? e.message : e);
    } finally {
      server.close(() => {
        console.log('Test runner server stopped');
        process.exit(0);
      });
    }
  });
})();
