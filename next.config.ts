import {networkInterfaces} from 'node:os';
import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1',...Object.values(networkInterfaces()).flat().filter(n=>n?.family==='IPv4'&&!n.internal).map(n=>n!.address)],
  async headers() { return [{ source: '/(.*)', headers: [
    {key: 'X-Content-Type-Options', value: 'nosniff'},
    {key: 'Referrer-Policy', value: 'same-origin'},
    {key: 'X-Frame-Options', value: process.env.NODE_ENV === 'development' ? 'SAMEORIGIN' : 'DENY'},
  ]}]; },
};
export default config;
