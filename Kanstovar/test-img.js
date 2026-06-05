const https = require('https');

https.get('https://opt.alif24.uz/uploads/1780664273793.png', (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Body snippet:', data.slice(0, 100)));
}).on('error', err => console.error(err));
