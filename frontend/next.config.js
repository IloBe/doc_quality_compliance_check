const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  outputFileTracingRoot: path.join(__dirname),
  // Allow both localhost and 127.0.0.1 as dev origins (suppresses cross-origin warning)
  allowedDevOrigins: ['localhost', '127.0.0.1', '172.31.240.1'],
};
