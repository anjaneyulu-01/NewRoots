import 'dotenv/config';
const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT || 587;
console.log('Loaded .env from backend/.env');
if (!host) {
  console.log('SMTP_HOST is not set');
  process.exit(4);
}
// mask host for output
const maskedHost = host.replace(/.(?=.{3})/g, '*');
console.log('SMTP_HOST=', maskedHost);
console.log('SMTP_PORT=', port);
console.log('SMTP_USER_SET=', !!process.env.SMTP_USER);
console.log('SMTP_PASS_SET=', !!process.env.SMTP_PASS);

import net from 'net';
const s = new net.Socket();
s.setTimeout(5000);
s.on('connect', () => {
  console.log('REACHABLE');
  s.destroy();
  process.exit(0);
}).on('timeout', () => {
  console.log('UNREACHABLE_TIMEOUT');
  process.exit(2);
}).on('error', (e) => {
  console.log('UNREACHABLE_ERROR', e.message);
  process.exit(3);
}).connect(Number(port), host);
