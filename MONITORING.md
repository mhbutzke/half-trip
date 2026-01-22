# Half Trip - Monitoring Setup Guide

This guide explains how to set up and configure monitoring for the Half Trip application.

## Overview

Half Trip uses multiple monitoring and observability tools:

1. **Vercel Analytics** - Page views, traffic, user engagement
2. **Vercel Speed Insights** - Web Vitals and performance metrics
3. **Supabase Monitoring** - Database, auth, storage, and realtime metrics
4. **Custom Application Monitoring** - Business metrics and error tracking

---

## 1. Vercel Analytics

### What It Tracks

- Page views and unique visitors
- Traffic sources and geographic distribution
- Top pages and user flows
- Real-time visitor count

### Setup

✅ **Already integrated!** The `@vercel/analytics` package is installed and configured in `src/app/layout.tsx`.

No additional configuration needed - it works automatically when deployed to Vercel.

### Accessing the Dashboard

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Navigate to **Analytics** tab
4. View real-time and historical data

### Key Metrics to Monitor

| Metric                   | Target      | Alert If                 |
| ------------------------ | ----------- | ------------------------ |
| Daily Active Users       | Growing     | Drops > 20% day-over-day |
| Page Views               | Growing     | Drops > 30% day-over-day |
| Bounce Rate              | < 60%       | > 70%                    |
| Average Session Duration | > 2 minutes | < 1 minute               |

---

## 2. Vercel Speed Insights

### What It Tracks

- **LCP (Largest Contentful Paint)** - Loading performance
- **FID (First Input Delay)** - Interactivity
- **CLS (Cumulative Layout Shift)** - Visual stability
- **FCP (First Contentful Paint)** - Initial render
- **TTFB (Time to First Byte)** - Server response time

### Setup

✅ **Already integrated!** The `@vercel/speed-insights` package is installed and configured.

### Accessing the Dashboard

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Navigate to **Speed Insights** tab
4. View Web Vitals scores and trends

### Performance Targets

| Metric | Good    | Needs Improvement | Poor     |
| ------ | ------- | ----------------- | -------- |
| LCP    | < 2.5s  | 2.5s - 4s         | > 4s     |
| FID    | < 100ms | 100ms - 300ms     | > 300ms  |
| CLS    | < 0.1   | 0.1 - 0.25        | > 0.25   |
| FCP    | < 1.8s  | 1.8s - 3s         | > 3s     |
| TTFB   | < 600ms | 600ms - 1800ms    | > 1800ms |

### Optimization Tips

If Web Vitals are poor:

**LCP Issues:**

- Optimize images with `next/image`
- Reduce JavaScript bundle size
- Use Suspense boundaries for data fetching
- Enable CDN caching

**FID Issues:**

- Reduce main thread work
- Code-split heavy components
- Defer non-critical JavaScript
- Use Web Workers for heavy computation

**CLS Issues:**

- Set explicit width/height on images
- Reserve space for dynamic content
- Avoid inserting content above existing content
- Use CSS `aspect-ratio`

---

## 3. Supabase Monitoring

### What It Tracks

- **Database:** Queries, connections, table sizes, performance
- **Auth:** Sign-ups, logins, active users
- **Storage:** Usage, bandwidth, file operations
- **Realtime:** Active connections, messages, errors
- **API:** Request count, errors, latency

### Accessing the Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to different monitoring sections:
   - **Reports** - Overview of all metrics
   - **Database** > **Query Performance** - Slow queries
   - **Auth** > **Users** - User metrics
   - **Storage** > **Usage** - Storage metrics
   - **API** > **Logs** - API request logs

### Key Metrics to Monitor

#### Database

| Metric             | Target      | Alert If |
| ------------------ | ----------- | -------- |
| Active Connections | < 80% limit | > 80%    |
| Query Time (p95)   | < 100ms     | > 500ms  |
| Database Size      | < 80% limit | > 80%    |
| Index Hit Rate     | > 95%       | < 90%    |

**Common Issues:**

- Too many connections → Enable connection pooling
- Slow queries → Add indexes
- High CPU usage → Optimize queries or upgrade plan

#### Auth

| Metric            | Target  | Alert If    |
| ----------------- | ------- | ----------- |
| Failed Login Rate | < 5%    | > 10%       |
| Daily Sign-ups    | Growing | Drops > 50% |
| Active Sessions   | Growing | Drops > 30% |

**Common Issues:**

- High failed login rate → Possible brute force attack
- Sign-ups failing → Check email configuration

#### Storage

| Metric              | Target      | Alert If |
| ------------------- | ----------- | -------- |
| Storage Used        | < 80% limit | > 80%    |
| Bandwidth           | < 80% limit | > 80%    |
| Upload Success Rate | > 95%       | < 90%    |

**Common Issues:**

- Storage full → Clean up old files or upgrade plan
- Upload failures → Check RLS policies

#### Realtime

| Metric                | Target  | Alert If    |
| --------------------- | ------- | ----------- |
| Active Connections    | Growing | Drops > 50% |
| Message Delivery Rate | > 99%   | < 95%       |
| Connection Errors     | < 1%    | > 5%        |

**Common Issues:**

- Connection drops → Check network, verify RLS policies
- High error rate → Review realtime subscriptions

### Setting Up Alerts

1. Go to Supabase Dashboard > Project Settings > **Alerts**
2. Configure email notifications for:
   - Database CPU > 80%
   - Database Connections > 80%
   - Storage > 80% of limit
   - API Error Rate > 5%
3. Add team email addresses
4. Test alerts

---

## 4. Custom Application Monitoring

### Built-in Monitoring Utils

The app includes custom monitoring utilities in `src/lib/monitoring/`:

```typescript
import {
  trackMetric,
  trackAction,
  trackBusinessEvent,
  trackApiCall,
  performanceMonitor,
  supabaseMetrics,
} from '@/lib/monitoring';
```

### Tracking User Actions

```typescript
import { trackAction } from '@/lib/monitoring';

// Track when user creates an expense
function handleCreateExpense(expense: Expense) {
  trackAction('expense_created', {
    category: expense.category,
    amount: expense.amount,
    has_receipt: !!expense.receipt_url,
  });
}

// Track when user joins a trip
function handleJoinTrip(tripId: string) {
  trackAction('trip_joined', { tripId });
}
```

### Tracking Business Events

```typescript
import { trackBusinessEvent } from '@/lib/monitoring';

// Track trip creation
async function createTrip(data: TripData) {
  const trip = await createTripAction(data);

  trackBusinessEvent('trip_created', 1, {
    style: trip.style,
    duration_days: calculateDuration(trip.start_date, trip.end_date),
    has_cover: !!trip.cover_image_url,
  });

  return trip;
}
```

### Tracking Performance

```typescript
import { performanceMonitor } from '@/lib/monitoring';

// Manual performance tracking
async function expensiveOperation() {
  performanceMonitor.start('calculate_balance');

  const balance = await calculateBalance();

  performanceMonitor.end('calculate_balance', {
    participants: balance.length,
    expenses: totalExpenses,
  });

  return balance;
}

// Automatic performance tracking
async function calculateBalanceWithTracking() {
  return performanceMonitor.measure('calculate_balance', async () => await calculateBalance(), {
    tripId: 'abc123',
  });
}
```

### Tracking Supabase Operations

```typescript
import { monitorSupabaseQuery } from '@/lib/monitoring/supabase-monitoring';

// Wrap database queries
async function getTripExpenses(tripId: string) {
  return monitorSupabaseQuery('expenses', 'select', async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from('expenses').select('*').eq('trip_id', tripId);

    if (error) throw error;
    return data;
  });
}
```

### Error Tracking

```typescript
import { trackError } from '@/lib/monitoring';

try {
  await performAction();
} catch (error) {
  trackError({
    message: error.message,
    stack: error.stack,
    context: {
      action: 'create_expense',
      userId,
      tripId,
    },
    userId,
    tripId,
    timestamp: Date.now(),
    severity: 'high',
  });

  throw error;
}
```

---

## 5. Integration with External Services

### Sentry (Optional)

For production-grade error tracking, consider integrating Sentry:

```bash
# Install Sentry SDK
pnpm add @sentry/nextjs
```

```typescript
// src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Filter out sensitive data
      return event;
    },
  });
}

// Enhance error tracking
export function trackError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    contexts: { custom: context },
  });
}
```

### Mixpanel / Amplitude (Optional)

For advanced product analytics:

```bash
# Install analytics SDK
pnpm add mixpanel-browser
# or
pnpm add @amplitude/analytics-browser
```

```typescript
// src/lib/monitoring/analytics.ts
import mixpanel from 'mixpanel-browser';

if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN);
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  mixpanel.track(event, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  mixpanel.identify(userId);
  if (traits) {
    mixpanel.people.set(traits);
  }
}
```

### LogRocket (Optional)

For session replay and debugging:

```bash
# Install LogRocket
pnpm add logrocket
```

```typescript
// src/lib/monitoring/logrocket.ts
import LogRocket from 'logrocket';

if (process.env.NEXT_PUBLIC_LOGROCKET_ID) {
  LogRocket.init(process.env.NEXT_PUBLIC_LOGROCKET_ID);
}

export function identifyUser(userId: string, info: { name: string; email: string }) {
  LogRocket.identify(userId, info);
}
```

---

## 6. Setting Up Alerts

### Vercel Alerts

Configure in Vercel Dashboard:

1. Go to Project Settings > **Notifications**
2. Add notification channels (email, Slack, Discord)
3. Configure alert triggers:
   - Deployment failures
   - Build errors
   - Performance degradation
   - Error thresholds

### Supabase Alerts

Configure in Supabase Dashboard:

1. Go to Project Settings > **Alerts**
2. Set thresholds for:
   - Database CPU usage
   - Database connections
   - Storage usage
   - API error rate
3. Add team email addresses

### Custom Alerts (Advanced)

Create a webhook endpoint to receive alerts:

```typescript
// src/app/api/alerts/route.ts
export async function POST(request: Request) {
  const alert = await request.json();

  // Send to Slack, Discord, email, SMS, etc.
  await notifyTeam(alert);

  return Response.json({ success: true });
}
```

Configure monitoring to send alerts:

```typescript
// src/lib/monitoring/alerts.ts
export async function sendAlert(alert: {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context?: Record<string, unknown>;
}) {
  if (process.env.NEXT_PUBLIC_ALERT_WEBHOOK) {
    await fetch(process.env.NEXT_PUBLIC_ALERT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
  }
}
```

---

## 7. Monitoring Dashboard (Future Enhancement)

For a centralized monitoring dashboard, consider:

1. **Grafana** - Open-source dashboards
2. **Datadog** - All-in-one monitoring
3. **New Relic** - APM and monitoring
4. **Custom Dashboard** - Build your own with Next.js

Example custom dashboard structure:

```
/dashboard
  ├── /api-performance - API response times
  ├── /user-metrics - DAU, MAU, retention
  ├── /business-metrics - Trips, expenses, users
  ├── /errors - Error rates and types
  └── /system-health - Database, storage, realtime
```

---

## 8. Best Practices

### DO:

✅ Monitor key business metrics (trips created, expenses added)
✅ Set up alerts for critical issues (database down, high error rate)
✅ Review dashboards regularly (daily/weekly)
✅ Track trends over time, not just absolute values
✅ Document what "normal" looks like for your app
✅ Test alerts to ensure they work

### DON'T:

❌ Track every single user action (too much noise)
❌ Set alerts for non-critical metrics
❌ Ignore alerts (they lose meaning if not acted on)
❌ Track personally identifiable information (PII)
❌ Log sensitive data (passwords, credit cards, etc.)

---

## 9. Monitoring Checklist

### Daily

- [ ] Check Vercel deployment status
- [ ] Review error rates in logs
- [ ] Check Supabase database health
- [ ] Monitor active user count

### Weekly

- [ ] Review Web Vitals trends
- [ ] Check for slow database queries
- [ ] Analyze user behavior patterns
- [ ] Review business metrics (growth, engagement)

### Monthly

- [ ] Full dashboard review
- [ ] Capacity planning (database, storage)
- [ ] Performance optimization opportunities
- [ ] Update alert thresholds if needed
- [ ] Review and update this document

---

## 10. Troubleshooting

### Metrics Not Showing

**Vercel Analytics:**

- Ensure app is deployed to Vercel
- Check that `@vercel/analytics` is imported in root layout
- Wait 24 hours for initial data

**Supabase Metrics:**

- Verify you're looking at the correct project
- Check that API requests are being made
- Ensure you have the correct permissions

### Slow Performance

1. Check Vercel Speed Insights for bottlenecks
2. Review Supabase slow queries
3. Check for N+1 queries
4. Verify indexes are in place
5. Review React re-renders

### High Error Rate

1. Check Vercel logs for error patterns
2. Review Supabase logs for database errors
3. Check browser console for client errors
4. Verify environment variables
5. Test locally to reproduce

---

## Resources

- [Vercel Analytics Docs](https://vercel.com/docs/analytics)
- [Vercel Speed Insights Docs](https://vercel.com/docs/speed-insights)
- [Supabase Monitoring Guide](https://supabase.com/docs/guides/platform/metrics)
- [Web Vitals](https://web.dev/vitals/)
- [Operations Runbook](./OPERATIONS.md)

---

**Questions?** Check the [Operations Runbook](./OPERATIONS.md) or contact the team.
