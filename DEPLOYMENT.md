# Half Trip - Production Deployment Guide

This guide walks you through deploying Half Trip to production using Vercel and Supabase.

## Prerequisites

Before deploying, ensure you have:

- [ ] Node.js 20+ installed locally
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Git repository pushed to GitHub
- [ ] Vercel account (free tier works)
- [ ] Supabase account (free tier works)
- [ ] Resend account for email invitations (optional but recommended)

## Step 1: Set Up Supabase Production Project

### 1.1 Create New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `half-trip-production` (or your preferred name)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose closest to your users (e.g., South America for Brazil)
   - **Pricing Plan**: Free tier is sufficient to start
5. Click "Create new project"
6. Wait for project to be provisioned (~2 minutes)

### 1.2 Get Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following values (you'll need these later):
   - **Project URL**: `https://your-project.supabase.co`
   - **anon/public key**: `eyJhbGc...` (the public key)
3. Go to **Settings** → **Database**
4. Copy the **Connection string** (Direct connection) if needed

### 1.3 Run Database Migrations

You have two options to run migrations:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your local project to the production project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

#### Option B: Using SQL Editor (Manual)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Run each migration file in order:
   - Copy contents of `supabase/migrations/00001_initial_schema.sql`
   - Paste into SQL Editor and click "Run"
   - Repeat for files 00002, 00003, 00004, and 00005

### 1.4 Verify Database Setup

1. Go to **Table Editor** in Supabase dashboard
2. Verify these tables exist:
   - users
   - trips
   - trip_members
   - activities
   - activity_attachments
   - expenses
   - expense_splits
   - trip_notes
   - trip_invites
   - settlements
3. Go to **Storage** → verify these buckets exist:
   - avatars
   - trip-covers
   - attachments
   - receipts

### 1.5 Configure Auth Settings

1. Go to **Authentication** → **URL Configuration**
2. Add your production URL to **Site URL**: `https://your-app.vercel.app`
3. Add to **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/**` (for wildcard support)
4. Go to **Authentication** → **Email Templates**
5. Customize email templates if desired (optional)

## Step 2: Set Up Vercel Project

### 2.1 Create Vercel Project

1. Go to [https://vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `pnpm build`
   - **Install Command**: `pnpm install`
   - **Output Directory**: `.next` (default)

### 2.2 Configure Environment Variables

In Vercel project settings, go to **Settings** → **Environment Variables** and add:

| Variable Name                   | Value                          | Environment |
| ------------------------------- | ------------------------------ | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase Project URL      | Production  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key         | Production  |
| `NEXT_PUBLIC_APP_URL`           | `https://your-app.vercel.app`  | Production  |
| `RESEND_API_KEY`                | Your Resend API key (optional) | Production  |

**Important Notes:**

- Use the "Production" environment for all variables
- You can also add "Preview" and "Development" environments if needed
- Do NOT commit `.env` files to Git - they should remain local only

### 2.3 Deploy

1. Click "Deploy" button in Vercel
2. Wait for deployment to complete (~2-3 minutes)
3. Vercel will provide a URL like `https://your-app.vercel.app`

## Step 3: Set Up Email Service (Optional)

If you want email invitations to work:

### 3.1 Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day)
3. Verify your email address

### 3.2 Get API Key

1. Go to **API Keys** in Resend dashboard
2. Click "Create API Key"
3. Name it "Half Trip Production"
4. Copy the API key
5. Add it to Vercel environment variables as `RESEND_API_KEY`

### 3.3 Verify Domain (Optional - for production emails)

For the free tier, you can only send from `onboarding@resend.dev`:

- Emails will work but come from Resend's domain
- For custom domain emails (e.g., `noreply@yourapp.com`), you need to verify your domain

To verify your domain:

1. Go to **Domains** in Resend
2. Click "Add Domain"
3. Follow DNS verification steps

## Step 4: Configure Custom Domain (Optional)

### 4.1 Add Domain in Vercel

1. In Vercel project, go to **Settings** → **Domains**
2. Click "Add Domain"
3. Enter your domain (e.g., `halftrip.app`)
4. Follow DNS configuration instructions

### 4.2 Update Environment Variables

1. Update `NEXT_PUBLIC_APP_URL` in Vercel to your custom domain
2. Update Supabase **Site URL** and **Redirect URLs** to use custom domain
3. Redeploy the application for changes to take effect

### 4.3 Configure SSL

- Vercel automatically provides SSL certificates via Let's Encrypt
- Wait for DNS propagation (~24-48 hours)
- Verify HTTPS works correctly

## Step 5: Verify Production Deployment

### 5.1 Test Core Functionality

Open your production URL and verify:

- [ ] **Landing Page** loads correctly
- [ ] **User Registration** works
  - Create a new account
  - Check email for verification link
  - Verify email confirmation works
- [ ] **User Login** works
  - Login with registered account
  - Verify redirect to trips page
- [ ] **Trip Creation** works
  - Create a new trip
  - Verify trip appears in list
- [ ] **Invite System** works
  - Generate invite link
  - Open invite link in incognito window
  - Accept invite as another user
- [ ] **Activities** work
  - Add activity to trip
  - Edit activity
  - Delete activity
- [ ] **Expenses** work
  - Add expense
  - Test different split types
  - Upload receipt
- [ ] **Balance Calculation** works
  - View balance page
  - Verify calculations are correct
- [ ] **Offline Mode** works
  - Open DevTools → Application → Service Workers
  - Check "Offline" mode
  - Verify app loads from cache
  - Add expense offline
  - Go back online and verify sync
- [ ] **PWA Installation** works
  - Check for install prompt on mobile
  - Install app
  - Verify it works as standalone app

### 5.2 Test Real-time Features

1. Open the same trip in two different browsers/devices
2. Make a change in one browser (add expense, activity, etc.)
3. Verify the change appears in the other browser without refresh

### 5.3 Performance Check

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit for:
   - Performance (target: >90)
   - Accessibility (target: >90)
   - Best Practices (target: >90)
   - SEO (target: >90)
   - PWA (should show all checks green)

## Step 6: Monitoring and Maintenance

### 6.1 Enable Vercel Analytics

1. In Vercel project, go to **Analytics** tab
2. Enable Web Analytics (free)
3. Monitor page views, performance, and errors

### 6.2 Monitor Supabase

1. Go to Supabase project dashboard
2. Check **Database** → **Reports** for:
   - Database size
   - API requests
   - Active connections
3. Set up alerts for:
   - Database size approaching limit (500MB free tier)
   - High API usage

### 6.3 Set Up Error Monitoring (Optional)

For production error tracking, consider integrating:

- **Sentry**: For error tracking and performance monitoring
- **LogRocket**: For session replay and debugging

To integrate Sentry:

```bash
# Install Sentry
pnpm add @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard@latest -i nextjs

# Add SENTRY_DSN to Vercel environment variables
```

## Troubleshooting

### Build Failures

**Issue**: Build fails with "Module not found" error

**Solution**:

```bash
# Clear cache and rebuild locally
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

**Issue**: Build fails with TypeScript errors

**Solution**:

```bash
# Run type check locally
pnpm run lint
npx tsc --noEmit
```

### Database Issues

**Issue**: "relation does not exist" error

**Solution**:

- Verify all migrations ran successfully
- Check Supabase SQL Editor for errors
- Re-run migrations if needed

**Issue**: "permission denied" or RLS policy errors

**Solution**:

- Verify RLS policies are enabled
- Check that migration 00003 (RLS policies) ran successfully
- Test with authenticated user

### Auth Issues

**Issue**: Email confirmation not working

**Solution**:

- Check Supabase redirect URLs include `/auth/callback`
- Verify `NEXT_PUBLIC_APP_URL` is correct
- Check email spam folder

**Issue**: Users not redirected after login

**Solution**:

- Verify middleware.ts is deployed
- Check that all auth routes are public in middleware
- Clear browser cookies and try again

### Environment Variables

**Issue**: Changes to environment variables not reflecting

**Solution**:

1. Update variables in Vercel
2. Go to **Deployments** tab
3. Click "..." on latest deployment → "Redeploy"
4. Hard refresh browser (Ctrl+Shift+R)

### Service Worker Issues

**Issue**: Old version of app cached

**Solution**:

1. Open DevTools → Application → Service Workers
2. Click "Unregister" on service worker
3. Clear site data
4. Hard refresh (Ctrl+Shift+R)

## Security Checklist

Before going fully live, ensure:

- [ ] All environment variables are properly set
- [ ] No secrets committed to Git repository
- [ ] RLS policies are enabled on all tables
- [ ] Storage bucket policies are correctly configured
- [ ] Auth redirect URLs are restricted to your domain only
- [ ] CORS is properly configured in Supabase
- [ ] Rate limiting is enabled (Vercel provides this by default)

## Performance Optimization

For better performance in production:

1. **Enable Image Optimization**
   - Vercel provides automatic image optimization
   - Use `next/image` for all images

2. **Enable Compression**
   - Vercel enables gzip/brotli by default
   - No additional configuration needed

3. **Database Indexing**
   - All necessary indexes are already in migration 00002
   - Monitor slow queries in Supabase dashboard

4. **CDN Caching**
   - Vercel Edge Network caches static assets automatically
   - Configure caching headers for API routes if needed

## Scaling Considerations

As your app grows, consider:

1. **Database**
   - Monitor database size (500MB free tier limit)
   - Upgrade to Supabase Pro ($25/mo) for 8GB
   - Implement data archival for old trips

2. **Storage**
   - Free tier: 1GB storage
   - Implement file size limits
   - Compress images before upload

3. **API Limits**
   - Free tier: 500MB database egress/month
   - Monitor Supabase dashboard
   - Implement pagination for large datasets

4. **Realtime Connections**
   - Free tier: 200 concurrent realtime connections
   - Monitor active connections
   - Implement connection pooling if needed

## Backup Strategy

### Database Backups

Supabase automatically backs up your database:

- Daily backups for 7 days (free tier)
- Point-in-time recovery available on paid plans

To manually backup:

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or use pg_dump with connection string
pg_dump "postgresql://..." > backup.sql
```

### Storage Backups

Storage files are not automatically backed up. Consider:

- Implementing a backup script to copy files to another service
- Using Supabase Storage API to download all files periodically

## Post-Deployment Tasks

After successful deployment:

1. [ ] Update README.md with production URL
2. [ ] Share app with beta testers
3. [ ] Monitor error logs for first 24 hours
4. [ ] Set up uptime monitoring (e.g., UptimeRobot)
5. [ ] Create user documentation
6. [ ] Set up support email/channel
7. [ ] Plan for regular maintenance windows
8. [ ] Document incident response procedures

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

## Support

For issues or questions:

- Check this guide first
- Review [Next.js Docs](https://nextjs.org/docs)
- Check [Supabase Docs](https://supabase.com/docs)
- Open an issue on GitHub

---

**Last Updated**: January 2026
**Version**: 1.0.0
