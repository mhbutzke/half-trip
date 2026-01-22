# Half Trip - Operations Runbook

## Overview

This document provides operational procedures, monitoring guidelines, and troubleshooting steps for the Half Trip application.

**Last Updated:** January 2026
**Version:** 1.0.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Monitoring & Observability](#monitoring--observability)
3. [Alerting & Escalation](#alerting--escalation)
4. [Common Operations](#common-operations)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Incident Response](#incident-response)
7. [Performance Optimization](#performance-optimization)
8. [Backup & Recovery](#backup--recovery)
9. [Security](#security)
10. [Deployment](#deployment)

---

## Architecture Overview

### Technology Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Hosting:** Vercel
- **Monitoring:** Vercel Analytics, Vercel Speed Insights
- **Storage:** Supabase Storage (avatars, receipts, attachments)
- **Offline Support:** IndexedDB (Dexie.js), Service Workers (PWA)

### Key Services

| Service           | Purpose               | Critical? |
| ----------------- | --------------------- | --------- |
| Vercel            | Frontend hosting, CDN | Yes       |
| Supabase Database | Data storage          | Yes       |
| Supabase Auth     | User authentication   | Yes       |
| Supabase Storage  | File storage          | Medium    |
| Supabase Realtime | Live updates          | Medium    |
| Resend            | Email invitations     | Low       |

### Architecture Diagram

```
┌──────────────┐
│   Browser    │
│  (PWA/SPA)   │
└──────┬───────┘
       │
       ├─────────► Vercel CDN (Static Assets)
       │
       ├─────────► Next.js Server (Vercel Edge)
       │           └─► Server Actions
       │
       └─────────► Supabase
                   ├─► PostgreSQL (Database)
                   ├─► Auth (Sessions)
                   ├─► Storage (Files)
                   └─► Realtime (WebSockets)
```

---

## Monitoring & Observability

### Monitoring Tools

#### 1. Vercel Analytics

**Purpose:** Track page views, unique visitors, and user engagement

**Access:**

- Dashboard: `https://vercel.com/[your-team]/[project-name]/analytics`
- No configuration needed - automatic with `@vercel/analytics`

**Key Metrics:**

- Page views per day/week/month
- Unique visitors
- Top pages
- Traffic sources
- Geographic distribution

#### 2. Vercel Speed Insights

**Purpose:** Monitor Web Vitals and performance metrics

**Access:**

- Dashboard: `https://vercel.com/[your-team]/[project-name]/speed-insights`

**Key Metrics:**

- **LCP (Largest Contentful Paint):** Should be < 2.5s
- **FID (First Input Delay):** Should be < 100ms
- **CLS (Cumulative Layout Shift):** Should be < 0.1
- **FCP (First Contentful Paint):** Should be < 1.8s
- **TTFB (Time to First Byte):** Should be < 600ms

**Alert Thresholds:**

- 🟢 Good: LCP < 2.5s, FID < 100ms, CLS < 0.1
- 🟡 Needs Improvement: LCP 2.5-4s, FID 100-300ms, CLS 0.1-0.25
- 🔴 Poor: LCP > 4s, FID > 300ms, CLS > 0.25

#### 3. Supabase Dashboard

**Purpose:** Monitor database, auth, storage, and realtime performance

**Access:**

- Dashboard: `https://supabase.com/dashboard/project/[project-id]`

**Key Metrics:**

- Database:
  - Active connections
  - Query performance
  - Table sizes
  - Index usage
- Auth:
  - Daily active users
  - Sign-ups per day
  - Failed login attempts
- Storage:
  - Total storage used
  - Bandwidth usage
  - File uploads/downloads
- Realtime:
  - Active connections
  - Messages per second
  - Connection errors

**Alert Thresholds:**

- Database connections > 80% of limit
- Query response time > 2 seconds
- Storage > 80% of limit
- Failed auth attempts > 10/minute (potential attack)

#### 4. Application Logs

**Purpose:** Debug issues and track application behavior

**Access:**

- Vercel Logs: `https://vercel.com/[your-team]/[project-name]/logs`
- Browser Console: Developer Tools (development only)

**Log Levels:**

- `DEBUG`: Detailed information for debugging
- `INFO`: General informational messages
- `WARN`: Warning messages (potential issues)
- `ERROR`: Error messages (requires attention)

### Custom Monitoring

The application includes custom monitoring utilities in `src/lib/monitoring/`:

```typescript
import { trackMetric, trackAction, trackBusinessEvent } from '@/lib/monitoring';

// Track a user action
trackAction('expense_created', { category: 'food', amount: 50 });

// Track a business event
trackBusinessEvent('trip_created', 1, { style: 'adventure', participants: 4 });

// Track custom metric
trackMetric({
  type: 'performance',
  name: 'sync_duration',
  value: 1234,
  unit: 'ms',
  tags: { tripId: 'abc123' },
});
```

### Key Performance Indicators (KPIs)

#### User Engagement

- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- Average session duration
- Pages per session

#### Business Metrics

- Trips created per day/week/month
- Expenses added per trip
- Average trip participants
- Invite acceptance rate
- Active trips (in-progress)

#### Technical Metrics

- API response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database query performance
- Offline sync success rate
- PWA install rate

---

## Alerting & Escalation

### Alert Channels

1. **Email Alerts** (for non-critical issues)
2. **SMS/Phone** (for critical production issues)
3. **Slack** (for team notifications)

### Alert Configuration

#### Vercel Alerts

Configure in Vercel Dashboard > Settings > Alerts:

- Deployment failures
- Build errors
- Performance degradation (Web Vitals)
- Custom error thresholds

#### Supabase Alerts

Configure in Supabase Dashboard > Settings > Alerts:

- Database CPU > 80%
- Database connections > 80%
- Storage > 80%
- API error rate > 5%

### Escalation Matrix

| Severity      | Response Time     | Escalation Path                           |
| ------------- | ----------------- | ----------------------------------------- |
| P0 - Critical | 15 minutes        | On-call engineer → Engineering lead → CTO |
| P1 - High     | 1 hour            | On-call engineer → Engineering lead       |
| P2 - Medium   | 4 hours           | On-call engineer                          |
| P3 - Low      | Next business day | Engineering team                          |

### Severity Definitions

**P0 - Critical:**

- Complete service outage
- Data loss or corruption
- Security breach
- Payment processing failure

**P1 - High:**

- Major feature broken (auth, expenses, trips)
- Significant performance degradation (> 50% slower)
- Intermittent outages

**P2 - Medium:**

- Minor feature broken (notifications, realtime)
- Moderate performance issues
- High error rates in non-critical paths

**P3 - Low:**

- Cosmetic issues
- Documentation errors
- Minor bugs with workarounds

---

## Common Operations

### 1. User Account Management

#### View User Details

```sql
-- In Supabase SQL Editor
SELECT
  id,
  email,
  created_at,
  name,
  avatar_url
FROM users
WHERE email = 'user@example.com';
```

#### Disable User Account

```sql
-- Disable auth account
UPDATE auth.users
SET banned_until = NOW() + INTERVAL '30 days'
WHERE email = 'user@example.com';
```

#### Delete User Account (GDPR)

```sql
-- This cascades to all user data due to foreign keys
DELETE FROM users WHERE id = 'user-uuid';

-- Also delete from auth
DELETE FROM auth.users WHERE id = 'user-uuid';
```

### 2. Trip Management

#### View Trip Statistics

```sql
SELECT
  t.name,
  t.destination,
  COUNT(DISTINCT tm.user_id) as participants,
  COUNT(DISTINCT e.id) as expenses,
  COALESCE(SUM(e.amount), 0) as total_expenses
FROM trips t
LEFT JOIN trip_members tm ON t.id = tm.trip_id
LEFT JOIN expenses e ON t.id = e.trip_id
WHERE t.id = 'trip-uuid'
GROUP BY t.id, t.name, t.destination;
```

#### Archive Inactive Trips

```sql
-- Archive trips older than 6 months with no recent activity
UPDATE trips
SET archived_at = NOW()
WHERE end_date < NOW() - INTERVAL '6 months'
  AND archived_at IS NULL
  AND updated_at < NOW() - INTERVAL '6 months';
```

### 3. Database Maintenance

#### Check Database Size

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Analyze Query Performance

```sql
-- Enable query timing
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM expenses WHERE trip_id = 'trip-uuid';
```

#### Rebuild Indexes (if performance degrades)

```sql
REINDEX TABLE expenses;
REINDEX TABLE activities;
REINDEX TABLE trip_members;
```

### 4. Storage Management

#### Check Storage Usage

```bash
# In Supabase Dashboard > Storage
# View bucket sizes and file counts
```

#### Clean Up Orphaned Files

```sql
-- Find files not referenced in database
-- (Run this as a scheduled job)
SELECT * FROM storage.objects
WHERE bucket_id = 'receipts'
  AND name NOT IN (
    SELECT receipt_url FROM expenses WHERE receipt_url IS NOT NULL
  );
```

### 5. Monitoring Realtime Connections

#### View Active Realtime Connections

```sql
-- In Supabase Dashboard > Realtime
-- Monitor active channels and connection count
```

#### Troubleshoot Realtime Issues

1. Check Supabase Dashboard > API > Realtime (ensure enabled)
2. Verify JWT tokens are valid
3. Check browser console for WebSocket errors
4. Verify RLS policies allow realtime access

---

## Troubleshooting Guide

### Common Issues

#### Issue: Users Can't Log In

**Symptoms:**

- Login fails with "Invalid credentials"
- Email confirmation not received

**Diagnosis:**

1. Check Supabase Dashboard > Auth > Users
2. Verify user exists and email is confirmed
3. Check Supabase Dashboard > Auth > Email Templates (ensure working)
4. Review error logs in Vercel

**Solution:**

```sql
-- Manually confirm email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';

-- Reset password
-- Use Supabase Dashboard > Auth > Users > Send Password Reset
```

#### Issue: Slow Page Load

**Symptoms:**

- LCP > 4 seconds
- Users complain about slow loading

**Diagnosis:**

1. Check Vercel Speed Insights for bottlenecks
2. Review Chrome DevTools Network tab
3. Check Supabase Dashboard for slow queries
4. Verify CDN is working

**Solution:**

- Optimize images with next/image
- Add database indexes for slow queries
- Enable React Suspense boundaries
- Review and optimize expensive calculations
- Consider adding more aggressive caching

#### Issue: Realtime Updates Not Working

**Symptoms:**

- Changes don't appear for other users
- WebSocket connection errors in console

**Diagnosis:**

1. Check browser console for WebSocket errors
2. Verify Supabase Realtime is enabled
3. Check RLS policies allow access
4. Test connection with `supabaseMetrics.trackRealtime()`

**Solution:**

```typescript
// Test realtime connection
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const channel = supabase
  .channel('test')
  .on('broadcast', { event: 'test' }, (payload) => {
    console.log('Received:', payload);
  })
  .subscribe();

channel.send({
  type: 'broadcast',
  event: 'test',
  payload: { message: 'hello' },
});
```

#### Issue: Offline Sync Failing

**Symptoms:**

- Changes made offline not syncing
- Sync queue has errors

**Diagnosis:**

1. Open DevTools > Application > IndexedDB
2. Check `halftrip_db` > `sync_queue` table
3. Look for entries with `retries >= 3`
4. Check browser console for sync errors

**Solution:**

```typescript
// Access sync diagnostics
import { syncEngine } from '@/lib/sync/sync-engine';

// View failed entries
const failedCount = await syncEngine.getFailedCount();
console.log('Failed entries:', failedCount);

// Retry failed entries
await syncEngine.retryFailedEntries();

// Clear failed entries (last resort)
await syncEngine.clearFailedEntries();
```

#### Issue: High Error Rate

**Symptoms:**

- Vercel logs show many 500 errors
- Users report "Something went wrong"

**Diagnosis:**

1. Check Vercel Logs for error patterns
2. Review Supabase logs for database errors
3. Check if specific routes/actions are failing
4. Verify environment variables are set

**Solution:**

- Fix identified bugs in code
- Add better error handling
- Improve validation
- Add retry logic for transient errors
- Scale database if connection limit reached

---

## Incident Response

### Incident Response Process

1. **Detection**
   - Alert received or user report
   - Verify issue is real and not isolated

2. **Assessment**
   - Determine severity (P0-P3)
   - Identify affected users/features
   - Check monitoring dashboards

3. **Communication**
   - Update status page (if available)
   - Notify team via Slack
   - Email affected users (if P0/P1)

4. **Mitigation**
   - Apply immediate fix or workaround
   - Rollback deployment if needed
   - Scale resources if capacity issue

5. **Resolution**
   - Implement permanent fix
   - Verify fix in production
   - Monitor for recurrence

6. **Post-Mortem**
   - Document what happened
   - Identify root cause
   - Create action items to prevent recurrence

### Incident Response Commands

#### Rollback Deployment

```bash
# In Vercel Dashboard
# Go to Deployments > [previous deployment] > Promote to Production

# Or via CLI
vercel rollback [deployment-url]
```

#### Emergency Database Restore

```bash
# In Supabase Dashboard
# Go to Settings > Backups > Restore
# Select backup and confirm
```

#### Scale Database

```bash
# In Supabase Dashboard
# Go to Settings > Billing > Upgrade Plan
# Or increase connection pooling
```

### Post-Incident Checklist

- [ ] Incident fully resolved and verified
- [ ] Root cause identified
- [ ] Documentation updated
- [ ] Post-mortem document created
- [ ] Action items assigned
- [ ] Monitoring/alerts improved
- [ ] Team debriefed
- [ ] Users notified of resolution

---

## Performance Optimization

### Database Optimization

#### Add Missing Indexes

```sql
-- Check for missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
ORDER BY n_distinct DESC;

-- Add index if query is slow
CREATE INDEX CONCURRENTLY idx_expenses_trip_date
ON expenses(trip_id, date);
```

#### Optimize Slow Queries

```sql
-- Use EXPLAIN ANALYZE to identify bottlenecks
EXPLAIN (ANALYZE, BUFFERS)
SELECT e.*, u.name as paid_by_name
FROM expenses e
JOIN users u ON e.paid_by = u.id
WHERE e.trip_id = 'trip-uuid'
ORDER BY e.date DESC;
```

### Frontend Optimization

#### Code Splitting

```typescript
// Use dynamic imports for heavy components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/heavy'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

#### Image Optimization

```typescript
// Use next/image for automatic optimization
import Image from 'next/image';

<Image
  src={avatarUrl}
  alt="Avatar"
  width={40}
  height={40}
  quality={85}
/>
```

#### React Query Caching

```typescript
// Optimize cache times based on data change frequency
const { data } = useQuery({
  queryKey: ['trip', tripId],
  queryFn: () => getTripById(tripId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### Caching Strategy

| Data Type     | Strategy                | TTL        |
| ------------- | ----------------------- | ---------- |
| User profile  | React Query             | 10 minutes |
| Trip details  | React Query + IndexedDB | 5 minutes  |
| Expenses      | React Query + IndexedDB | 2 minutes  |
| Activities    | React Query + IndexedDB | 2 minutes  |
| Static assets | Vercel CDN              | 365 days   |
| API responses | Vercel Edge             | 60 seconds |

---

## Backup & Recovery

### Automated Backups

**Supabase Database:**

- Automatic daily backups (retained for 7 days on Free tier, 30 days on Pro)
- Point-in-time recovery available on Pro+ plans

**User Files (Storage):**

- Replicated across multiple availability zones
- Manual backup recommended for critical files

### Manual Backup Procedures

#### Export Database

```bash
# Using Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql

# Or in Supabase Dashboard
# Go to Database > Backups > Download
```

#### Export User Data (GDPR Request)

```typescript
// Create an admin endpoint to export user data
async function exportUserData(userId: string) {
  const user = await getUserProfile(userId);
  const trips = await getUserTrips(userId);
  const expenses = await getUserExpenses(userId);

  return {
    user,
    trips,
    expenses,
    exported_at: new Date().toISOString(),
  };
}
```

### Recovery Procedures

#### Restore from Backup

```bash
# In Supabase Dashboard
# 1. Go to Settings > Backups
# 2. Select backup to restore
# 3. Click "Restore" and confirm
# 4. Wait for restore to complete (5-15 minutes)
# 5. Verify data integrity
```

#### Disaster Recovery Plan

**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** 24 hours

**Steps:**

1. Confirm disaster scope (database, storage, or full outage)
2. Notify team and users of incident
3. Restore database from latest backup
4. Restore files from storage backup (if needed)
5. Verify critical functionality
6. Gradually restore traffic
7. Monitor for issues
8. Conduct post-mortem

---

## Security

### Security Best Practices

1. **Authentication:**
   - Use Supabase Auth (don't roll your own)
   - Enforce email verification
   - Implement rate limiting on login attempts

2. **Authorization:**
   - Use RLS (Row Level Security) policies
   - Never bypass RLS in application code
   - Regularly audit RLS policies

3. **Data Protection:**
   - Encrypt sensitive data at rest
   - Use HTTPS for all connections
   - Sanitize user inputs

4. **API Security:**
   - Validate all server action inputs with Zod
   - Use CSRF tokens (built into Next.js)
   - Implement rate limiting

### Security Monitoring

#### Monitor for Suspicious Activity

```sql
-- Failed login attempts
SELECT
  email,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM auth.audit_log_entries
WHERE action = 'login'
  AND result = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
```

#### Audit RLS Policies

```sql
-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Incident Response for Security Issues

**If you suspect a security breach:**

1. Immediately disable affected accounts
2. Rotate API keys and secrets
3. Review audit logs
4. Notify affected users
5. Report to security team
6. Document incident
7. Implement fixes
8. Conduct security audit

---

## Deployment

### Production Deployment Process

1. **Pre-Deployment Checklist**
   - [ ] All tests passing (`pnpm test`)
   - [ ] Lint checks passing (`pnpm lint`)
   - [ ] Build succeeds (`pnpm build`)
   - [ ] Environment variables configured
   - [ ] Database migrations tested
   - [ ] Rollback plan prepared

2. **Deployment Steps**

   ```bash
   # 1. Create feature branch
   git checkout -b feature/new-feature

   # 2. Make changes and commit
   git add .
   git commit -m "feat: add new feature"

   # 3. Push to GitHub
   git push origin feature/new-feature

   # 4. Create Pull Request
   # Review in GitHub

   # 5. Merge to main
   # Vercel automatically deploys

   # 6. Monitor deployment
   # Check Vercel Dashboard for build status

   # 7. Verify in production
   # Test critical paths
   ```

3. **Database Migrations**

   ```bash
   # In Supabase Dashboard
   # Go to SQL Editor > New Query
   # Paste migration SQL
   # Run and verify

   # Or use Supabase CLI
   supabase db push
   ```

4. **Post-Deployment**
   - Monitor error rates for 30 minutes
   - Check Web Vitals for degradation
   - Verify critical features work
   - Monitor user feedback

### Environment Variables

#### Required for Production

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Resend (optional)
RESEND_API_KEY=re_xxx

# App URL
NEXT_PUBLIC_APP_URL=https://halftrip.app

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://your-analytics.com/api
```

### Vercel Configuration

**Build Settings:**

- Framework: Next.js
- Build Command: `pnpm build`
- Output Directory: `.next`
- Install Command: `pnpm install`
- Node Version: 20.x

**Environment Variables:**
Configure in Vercel Dashboard > Settings > Environment Variables

---

## Appendix

### Useful Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [GitHub Repository](https://github.com/your-org/half-trip)
- [Documentation](./README.md)
- [Error Handling Guide](./ERROR_HANDLING.md)
- [PWA Testing Guide](./PWA_TESTING.md)
- [Sync Testing Guide](./SYNC_TESTING.md)

### Team Contacts

| Role             | Name | Contact |
| ---------------- | ---- | ------- |
| Engineering Lead | -    | -       |
| On-Call Engineer | -    | -       |
| DevOps           | -    | -       |
| Product Manager  | -    | -       |

### Maintenance Windows

- **Database Maintenance:** Sundays 2:00-4:00 AM UTC
- **Deployment Window:** Monday-Thursday 10:00 AM - 4:00 PM local time
- **No-Deploy Period:** Friday 4:00 PM - Monday 10:00 AM (avoid production changes)

---

## Version History

| Version | Date       | Changes                    |
| ------- | ---------- | -------------------------- |
| 1.0.0   | 2026-01-21 | Initial operations runbook |

---

**Questions or issues with this runbook?**
Contact the engineering team or create an issue in the repository.
