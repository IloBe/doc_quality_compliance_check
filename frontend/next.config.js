const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  outputFileTracingRoot: path.join(__dirname),
  // Allow both localhost and 127.0.0.1 as dev origins (suppresses cross-origin warning)
  allowedDevOrigins: ['localhost', '127.0.0.1', '172.31.240.1'],
  // Proxy /api/* and /health to the FastAPI backend.
  // This makes auth cookies first-party (SameSite=lax compatible),
  // because the browser sees only localhost:3000 — no cross-origin cookie blocked.
  async rewrites() {
    const backendOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${backendOrigin}/health`,
      },
    ];
  },
};
