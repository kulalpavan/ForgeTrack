const http = require('http');

// Step 1: Login to get token
const loginBody = JSON.stringify({ identifier: '4SF24CI115', password: '4SF24CI115' });
const loginOpts = {
  hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
};

const loginReq = http.request(loginOpts, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const { token } = JSON.parse(data);
    console.log('Step 1 - Login:', res.statusCode === 200 ? 'OK' : 'FAILED');

    // Step 2: Call /api/auth/me with the token
    const meOpts = {
      hostname: 'localhost', port: 5000, path: '/api/auth/me', method: 'GET',
      headers: { 'x-auth-token': token }
    };
    const meReq = http.request(meOpts, (r2) => {
      let d2 = '';
      r2.on('data', c => d2 += c);
      r2.on('end', () => {
        console.log('Step 2 - /auth/me:', r2.statusCode === 200 ? 'OK' : 'FAILED ('+r2.statusCode+')');
        console.log('Response:', d2);
      });
    });
    meReq.end();
  });
});
loginReq.write(loginBody);
loginReq.end();
