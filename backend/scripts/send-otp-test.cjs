const fetch = global.fetch || require('node-fetch');

(async () => {
  try {
    const res = await fetch('http://localhost:5001/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test+brevo@example.com' }),
    });
    const body = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', body);
  } catch (e) {
    console.error('Request failed:', e);
    process.exit(1);
  }
})();
