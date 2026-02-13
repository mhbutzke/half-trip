import { describe, expect, it } from 'vitest';
import { config } from './proxy';

function toRegExp(matcher: string): RegExp {
  return new RegExp(`^${matcher}$`);
}

describe('proxy matcher', () => {
  const matcher = toRegExp(config.matcher[0]);

  it('matches protected application routes', () => {
    expect(matcher.test('/settings')).toBe(true);
    expect(matcher.test('/api/google-calendar/connect')).toBe(true);
  });

  it('does not match next internals and static assets', () => {
    expect(matcher.test('/_next/webpack-hmr')).toBe(false);
    expect(matcher.test('/manifest.webmanifest')).toBe(false);
    expect(matcher.test('/sw.js')).toBe(false);
    expect(matcher.test('/workbox-123abc.js')).toBe(false);
    expect(matcher.test('/icons/icon-192x192.png')).toBe(false);
    expect(matcher.test('/favicon.ico')).toBe(false);
  });
});
