import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Generates per-request CSP with nonce for inline script protection.
 * Removes unsafe-inline from script-src; keeps it for style-src (Tailwind).
 * Google Maps requires unsafe-eval (uses new Function() internally).
 */
function applyCSP(response: NextResponse, nonce: string): void {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://maps.googleapis.com https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.googleapis.com https://*.gstatic.com https://*.supabase.co https://*.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://places.googleapis.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  // Pass nonce to server components via request header
  response.headers.set('x-nonce', nonce);
}

export async function proxy(request: NextRequest) {
  // Generate per-request nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Run Supabase auth middleware (session refresh, redirects)
  const response = await updateSession(request);

  // Apply CSP with nonce to the response
  applyCSP(response, nonce);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match app and API routes, but skip Next.js internals and static assets.
     * This avoids intercepting dev HMR websocket endpoints (/_next/webpack-hmr)
     * and PWA assets (manifest.webmanifest, sw.js), which should never redirect to login.
     */
    '/((?!_next/|favicon.ico|manifest.webmanifest|sw.js|workbox-[^/]+\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)',
  ],
};
