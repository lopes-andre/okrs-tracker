# Deployment Guide

Production deployment guide for the OKRs Tracker application.

## Overview

| Component | Recommended Platform |
|-----------|---------------------|
| Frontend | Vercel |
| Database | Supabase Cloud |
| Storage | Supabase Storage |

## Prerequisites

Before deploying:

1. A [Vercel](https://vercel.com) account
2. A [Supabase](https://supabase.com) project (production)
3. A custom domain (optional but recommended)
4. OAuth credentials configured (if using Google login)

## Supabase Production Setup

### 1. Create Production Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and region (pick closest to your users)
4. Set a strong database password
5. Wait for project initialization

### 2. Run Migrations

In the Supabase SQL Editor, run migrations in order:

```sql
-- Run each file from supabase/migrations/ in order
-- 001_extensions_and_types.sql
-- 002_helper_functions.sql
-- ... through 014_realtime.sql
```

Or use Supabase CLI:

```bash
# Link to your production project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 3. Configure Authentication

#### Email Authentication

1. Go to **Authentication → Providers → Email**
2. Enable **Confirm email** for production
3. Enable **Protect against leaked passwords**
4. Configure email templates (optional)

#### Google OAuth (Optional)

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Add production callback URL:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   https://your-domain.com/auth/callback
   ```
3. In Supabase: **Authentication → Providers → Google**
4. Enable and paste Client ID and Secret

### 4. Configure Storage

1. Go to **Storage**
2. Create bucket: `plan-backups`
3. Set as **Private**
4. Enable RLS (should be default)

### 5. Security Settings

1. **Rate Limiting**: Configure in **Settings → API**
2. **Realtime**: Only enable for tables that need it
3. **RLS**: Verify policies are active on all tables

### 6. Get Production Credentials

From **Settings → API**:

| Setting | Use |
|---------|-----|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `service_role` key | `SUPABASE_SECRET_KEY` (optional) |

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Select the `okrs-tracker` project

### 2. Configure Environment Variables

In Vercel project settings, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |
| `SUPABASE_SECRET_KEY` | Your Supabase service role key |

### 3. Configure Build Settings

Vercel should auto-detect Next.js. Verify:

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### 4. Deploy

Click "Deploy" and wait for build completion.

### 5. Configure Domain (Optional)

1. Go to project **Settings → Domains**
2. Add your custom domain
3. Configure DNS as instructed
4. Enable HTTPS (automatic)

Don't forget to update:
- Supabase OAuth callback URLs
- Any hardcoded URLs in the codebase

## Environment Configuration

### Production Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional (for server-side operations)
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Environment-Specific Configuration

The app automatically adapts to environment:

| Feature | Development | Production |
|---------|-------------|------------|
| React Query DevTools | Enabled | Disabled |
| Console logging | Enabled | Minimal |
| Error details | Full | User-friendly |
| Refetch on focus | Disabled | Enabled |

## CI/CD Pipeline

### Automatic Deployments

Vercel automatically deploys:
- **Production**: On push to `main` branch
- **Preview**: On pull request creation

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### GitHub Actions (Alternative)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run test:run
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Database Migrations in Production

### Using Supabase CLI

```bash
# Create new migration locally
supabase migration new add_feature

# Edit the migration file

# Push to production
supabase db push --linked
```

### Using SQL Editor

For simple changes, use the Supabase Dashboard SQL Editor directly.

### Migration Best Practices

1. **Test locally first**: `supabase db reset`
2. **Backup before migrations**: Export via Dashboard
3. **Use transactions**: Wrap changes in `BEGIN; ... COMMIT;`
4. **Handle data**: Consider existing data in migrations
5. **Test rollback**: Ensure you can revert if needed

## Monitoring

### Vercel Analytics

Enable in Vercel project settings for:
- Page load times
- Web vitals
- Traffic patterns

### Supabase Dashboard

Monitor:
- **Database**: Query performance, connections
- **Auth**: Sign-ups, active users
- **Storage**: Usage, bandwidth
- **Logs**: API errors, slow queries

### Error Tracking (Optional)

Consider adding:
- [Sentry](https://sentry.io) for error tracking
- [LogRocket](https://logrocket.com) for session replay

## Performance Optimization

### Vercel Edge

The app uses Edge Runtime where beneficial:
- Middleware runs at the edge
- Static pages are cached at CDN

### Database Optimization

1. **Indexes**: Verify indexes on frequently queried columns
2. **Views**: Use pre-computed views for complex queries
3. **Connection pooling**: Enabled by default in Supabase

### Caching Strategy

| Resource | Cache Duration |
|----------|----------------|
| Static assets | Long (via Vercel) |
| API responses | Short (via React Query) |
| Database views | Computed on access |

## Security Checklist

- [ ] Environment variables are set in Vercel (not committed)
- [ ] Supabase RLS policies are enabled
- [ ] Email confirmation enabled for production
- [ ] Leaked password protection enabled
- [ ] OAuth redirect URLs are production URLs
- [ ] Service role key is not exposed to client
- [ ] Rate limiting configured
- [ ] HTTPS enabled (automatic with Vercel)

## Rollback Procedures

### Vercel Rollback

1. Go to Vercel project **Deployments**
2. Find previous working deployment
3. Click **...** → **Promote to Production**

### Database Rollback

1. Restore from backup in Supabase Dashboard
2. Or run compensating SQL to undo changes

## Troubleshooting Production

### Build Failures

1. Check Vercel build logs
2. Verify environment variables
3. Test build locally: `npm run build`

### Runtime Errors

1. Check Vercel Function logs
2. Check Supabase logs
3. Verify API keys are correct

### Database Connection Issues

1. Check Supabase status page
2. Verify connection string
3. Check for connection pool exhaustion

See [Troubleshooting](./troubleshooting.md) for more solutions.
