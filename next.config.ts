import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  async headers() { return [{ source: '/(.*)', headers: [
    {key: 'X-Content-Type-Options', value: 'nosniff'},
    {key: 'Referrer-Policy', value: 'same-origin'},
    {key: 'X-Frame-Options', value: process.env.NODE_ENV === 'development' ? 'SAMEORIGIN' : 'DENY'},
  ]}]; },
};
export default config;
