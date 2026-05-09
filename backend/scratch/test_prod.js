const https = require('https');

const body = JSON.stringify({ identifier: '4SF24CI115', password: '4SF24CI115' });

const options = {
  hostname: 'forgetrack-jade.vercel.app',
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('Testing Vercel production login...');
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', data.slice(0, 300));
  });
});

req.on('error', e => console.error('ERROR:', e.message));
req.write(body);
req.end();
