# Half Trip - Production Deployment Checklist

Use this checklist to ensure a smooth production deployment.

## Pre-Deployment

### Code Quality

- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds locally (`pnpm build`)
- [ ] No console errors in production build
- [ ] All TypeScript errors resolved
- [ ] Code reviewed and approved

### Environment Configuration

- [ ] `.env.example` is up to date with all required variables
- [ ] `.env` file is in `.gitignore`
- [ ] No secrets committed to repository
- [ ] Environment variables documented

### Database

- [ ] All migrations created and tested locally
- [ ] Migrations are sequential and properly numbered
- [ ] RLS policies tested
- [ ] Storage bucket policies configured
- [ ] Seed data removed (or production-safe)

### Security

- [ ] Auth redirect URLs validated
- [ ] CORS configuration reviewed
- [ ] API routes have proper authorization
- [ ] File upload size limits enforced
- [ ] Input validation implemented
- [ ] XSS protection verified
- [ ] SQL injection protection via Supabase

### Performance

- [ ] Images optimized
- [ ] Large components code-split
- [ ] Lighthouse score >90 locally
- [ ] Bundle size reviewed
- [ ] Database queries optimized
- [ ] Proper indexing on database tables

## Deployment Steps

### Supabase Setup

- [ ] Production project created
- [ ] Database password saved securely
- [ ] All migrations applied (00001-00005)
- [ ] Tables verified in Table Editor
- [ ] Storage buckets created (avatars, trip-covers, attachments, receipts)
- [ ] Auth settings configured
  - [ ] Site URL set
  - [ ] Redirect URLs added
  - [ ] Email templates customized (optional)
- [ ] API credentials copied (URL and anon key)

### Vercel Setup

- [ ] GitHub repository connected
- [ ] Framework preset set to Next.js
- [ ] Build command: `pnpm build`
- [ ] Install command: `pnpm install`
- [ ] Environment variables configured:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `NEXT_PUBLIC_APP_URL`
  - [ ] `RESEND_API_KEY` (optional)
- [ ] Initial deployment triggered

### Resend Setup (Optional)

- [ ] Account created
- [ ] API key generated
- [ ] API key added to Vercel
- [ ] Test email sent successfully
- [ ] Domain verified (optional, for custom sender)

### DNS & Domain (Optional)

- [ ] Custom domain added in Vercel
- [ ] DNS records configured
- [ ] SSL certificate provisioned
- [ ] Environment variables updated with custom domain
- [ ] Supabase auth URLs updated

## Post-Deployment Verification

### Functional Testing

- [ ] Landing page loads
- [ ] User registration works
  - [ ] Form validation
  - [ ] Email confirmation
  - [ ] Profile creation
- [ ] User login works
  - [ ] Email/password login
  - [ ] Redirect to trips page
  - [ ] Session persistence
- [ ] Password reset works
  - [ ] Request reset email
  - [ ] Click email link
  - [ ] Set new password
  - [ ] Login with new password
- [ ] Trip management works
  - [ ] Create trip
  - [ ] Edit trip
  - [ ] Archive trip
  - [ ] Delete trip
- [ ] Invite system works
  - [ ] Generate invite link
  - [ ] Accept invite (logged out)
  - [ ] Accept invite (logged in)
  - [ ] Send email invite
- [ ] Participant management works
  - [ ] View participants
  - [ ] Promote to organizer
  - [ ] Remove participant
  - [ ] Leave trip
- [ ] Activities work
  - [ ] Add activity
  - [ ] Edit activity
  - [ ] Delete activity
  - [ ] Drag-and-drop reorder
  - [ ] Move between days
  - [ ] Upload attachments
- [ ] Expenses work
  - [ ] Add expense
  - [ ] Edit expense
  - [ ] Delete expense
  - [ ] Equal split
  - [ ] By amount split
  - [ ] By percentage split
  - [ ] Upload receipt
- [ ] Notes work
  - [ ] Add note
  - [ ] Edit note
  - [ ] Delete note
- [ ] Balance works
  - [ ] View balance
  - [ ] Calculate settlements
  - [ ] Mark settlement paid
  - [ ] View settlement history
- [ ] Real-time updates work
  - [ ] Open same trip in two browsers
  - [ ] Changes sync automatically
  - [ ] Presence indicators show online users
- [ ] Offline mode works
  - [ ] Enable offline in DevTools
  - [ ] App loads from cache
  - [ ] Create expense offline
  - [ ] Re-enable online
  - [ ] Verify sync completes
- [ ] PWA works
  - [ ] Install prompt appears (mobile)
  - [ ] App installs successfully
  - [ ] Standalone mode works
  - [ ] Service worker caches assets

### Performance Testing

- [ ] Lighthouse audit run
  - [ ] Performance score >90
  - [ ] Accessibility score >90
  - [ ] Best Practices score >90
  - [ ] SEO score >90
  - [ ] PWA checks pass
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] Largest Contentful Paint <2.5s
- [ ] Cumulative Layout Shift <0.1
- [ ] No hydration errors
- [ ] No console errors

### Security Testing

- [ ] Unauthorized users redirected to login
- [ ] RLS policies prevent unauthorized data access
- [ ] File uploads restricted to allowed types
- [ ] File size limits enforced
- [ ] XSS attempts blocked
- [ ] Auth redirect URLs work only for app domain

### Browser Testing

- [ ] Chrome (desktop)
- [ ] Safari (desktop)
- [ ] Firefox (desktop)
- [ ] Chrome (mobile)
- [ ] Safari (iOS)
- [ ] Samsung Internet (Android)

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Color contrast sufficient
- [ ] Focus indicators visible

## Monitoring Setup

### Vercel

- [ ] Web Analytics enabled
- [ ] Error tracking reviewed
- [ ] Deployment logs checked

### Supabase

- [ ] Database reports reviewed
- [ ] API usage monitored
- [ ] Storage usage checked
- [ ] Alerts configured

### Error Monitoring (Optional)

- [ ] Sentry integrated (optional)
- [ ] Error alerts configured
- [ ] Performance monitoring active

### Uptime Monitoring (Optional)

- [ ] UptimeRobot configured (or similar)
- [ ] Alert emails set up
- [ ] Status page created

## Documentation

- [ ] README.md updated with production URL
- [ ] DEPLOYMENT.md reviewed and accurate
- [ ] API documentation updated (if any)
- [ ] User guide created (optional)
- [ ] Support channels documented

## Communication

- [ ] Team notified of deployment
- [ ] Beta testers invited
- [ ] Social media announcement (optional)
- [ ] Product Hunt launch (optional)
- [ ] Blog post published (optional)

## Maintenance Plan

- [ ] Backup strategy documented
- [ ] Incident response plan created
- [ ] Maintenance window scheduled
- [ ] Update procedure documented
- [ ] Rollback procedure documented

## Success Metrics

Define and track:

- [ ] User registration rate
- [ ] Daily active users
- [ ] Trip creation rate
- [ ] Expense tracking usage
- [ ] Error rate
- [ ] Page load times
- [ ] User retention

## Known Issues

Document any known issues or limitations:

1. (Example) PWA install prompt only appears after 2 visits
2. (Example) Email invites may take up to 5 minutes to arrive
3. (Add your own)

## Rollback Plan

If deployment has critical issues:

1. [ ] Identify issue and severity
2. [ ] Revert to previous Vercel deployment (instant)
3. [ ] Notify users if needed
4. [ ] Fix issue locally
5. [ ] Test fix thoroughly
6. [ ] Redeploy

## Post-Launch Tasks (First Week)

- [ ] Monitor error logs daily
- [ ] Review user feedback
- [ ] Check performance metrics
- [ ] Verify database growth rate
- [ ] Verify storage usage
- [ ] Verify API usage
- [ ] Address any bugs reported
- [ ] Plan next iteration

## Post-Launch Tasks (First Month)

- [ ] Review analytics data
- [ ] User survey (optional)
- [ ] Performance optimization
- [ ] Feature prioritization
- [ ] Scale infrastructure if needed

---

**Deployment Date**: ********\_********

**Deployed By**: ********\_********

**Production URL**: ********\_********

**Notes**:

---

---

---
