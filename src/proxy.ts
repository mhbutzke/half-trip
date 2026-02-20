import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export default async function proxy(request: NextRequest) {
  return await updateSession(request);
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
