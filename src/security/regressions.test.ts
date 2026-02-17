import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

function readRepoFile(...segments: string[]) {
  return fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8');
}

function listMigrations(): string[] {
  const dir = path.join(process.cwd(), 'supabase', 'migrations');
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => path.join(dir, name));
}

function anyMigrationContains(needle: RegExp): boolean {
  for (const file of listMigrations()) {
    const content = fs.readFileSync(file, 'utf8');
    if (needle.test(content)) return true;
  }
  return false;
}

describe('Security regressions (repo-level)', () => {
  test('AviationStack edge function uses HTTPS and has a timeout', () => {
    const content = readRepoFile('supabase', 'functions', 'fetch-flight-data', 'index.ts');

    expect(content).toContain('https://api.aviationstack.com/v1/flights');
    expect(content).toContain('AbortController');
  });

  test('Email cron edge functions must enforce a shared secret', () => {
    const daily = readRepoFile('supabase', 'functions', 'send-daily-summary', 'index.ts');
    const reminders = readRepoFile('supabase', 'functions', 'send-trip-reminders', 'index.ts');

    // Keep the assertion simple and explicit so it catches accidental removals.
    expect(daily).toContain('X-Cron-Secret');
    expect(reminders).toContain('X-Cron-Secret');
  });

  test('Migrations must define trip_participants and trip_groups tables', () => {
    expect(
      anyMigrationContains(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?trip_participants\b/i)
    ).toBe(true);
    expect(
      anyMigrationContains(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?trip_groups\b/i)
    ).toBe(true);
  });

  test('Migrations must define link_guest_to_user RPC', () => {
    expect(anyMigrationContains(/FUNCTION\s+(?:public\.)?link_guest_to_user\b/i)).toBe(true);
  });

  test('Migrations must harden SECURITY DEFINER helpers with SET search_path', () => {
    // is_trip_member / is_trip_organizer are called from RLS policies.
    expect(
      anyMigrationContains(/FUNCTION\s+(?:public\.)?is_trip_member\b[\s\S]*SET\s+search_path/i)
    ).toBe(true);
    expect(
      anyMigrationContains(/FUNCTION\s+(?:public\.)?is_trip_organizer\b[\s\S]*SET\s+search_path/i)
    ).toBe(true);
  });

  test('Auth emails must not build callback URLs from the Origin header', () => {
    const content = readRepoFile('src', 'lib', 'supabase', 'auth.ts');

    // We allow reading request headers for other reasons, but origin-derived URLs are brittle and spoofable.
    expect(content).toContain('NEXT_PUBLIC_APP_URL');
    expect(content).not.toMatch(/headersList\\.get\\('origin'\\)/);
  });
});
