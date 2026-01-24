# CI/CD Pipeline Guide

> Established: 2026-01-24

This document describes the CI/CD pipeline, deployment workflow, and operational procedures for the OKRs Tracker application.

## Table of Contents

- [Overview](#overview)
- [Local Development](#local-development)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Deployment Workflow](#deployment-workflow)
- [Environment Configuration](#environment-configuration)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Rollback Procedures](#rollback-procedures)
- [Branch Protection](#branch-protection)
- [Monitoring Deployments](#monitoring-deployments)

---

## Overview

### Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15.1 (App Router) |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel (recommended) |
| CI/CD | GitHub Actions |
| Testing | Vitest + React Testing Library |

### Deployment Strategy

- **Main branch** → Production
- **Preview branches** → Preview deployments on Vercel
- **Feature branches** → Local development only (or preview if configured)

---

## Local Development

### Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start local Supabase (if using local development)
supabase start

# Start development server
npm run dev
```

### Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Tests with coverage |
| `npm run test:ci` | CI-optimized test run |

### Pre-Commit Script

Run the validation script before committing:

```bash
./scripts/pre-commit-check.sh
```

Or run each step manually:

```bash
npm run lint && npm run test:run && npm run build
```

---

## Pre-Deployment Checklist

### Before Every Deployment

| Check | Command | Passing Criteria |
|-------|---------|------------------|
| TypeScript compiles | `npm run build` | No type errors |
| Linting passes | `npm run lint` | No errors (warnings OK) |
| Tests pass | `npm run test:run` | All tests green |
| Bundle size | Check build output | No unexpected increases |

### For Major Releases

- [ ] All feature branches merged and tested
- [ ] Database migrations reviewed and tested locally
- [ ] Environment variables documented
- [ ] Breaking changes documented in changelog
- [ ] Performance baseline compared (see `docs/performance-baseline.md`)
- [ ] Error monitoring verified

### For Database Migrations

- [ ] Migration tested on local Supabase
- [ ] Migration reviewed for backward compatibility
- [ ] Rollback script prepared (if needed)
- [ ] Data backup taken (for production)

---

## Deployment Workflow

### Automated Deployment (Vercel)

1. **Push to main** → Triggers production deployment
2. **Push to feature branch** → Triggers preview deployment
3. **Pull request** → Creates preview deployment with unique URL

### Manual Deployment Steps

If deploying manually:

```bash
# 1. Ensure clean working directory
git status

# 2. Pull latest changes
git pull origin main

# 3. Install dependencies
npm ci

# 4. Run full validation
./scripts/pre-commit-check.sh

# 5. Build production bundle
npm run build

# 6. Deploy (Vercel CLI example)
vercel --prod
```

### Database Migrations

Migrations are applied automatically via Supabase when:
- Pushing to a linked Supabase project
- Running `supabase db push` manually

```bash
# View pending migrations
supabase migration list

# Apply migrations to production
supabase db push --db-url $PRODUCTION_DATABASE_URL
```

---

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | `eyJ...` |

### Environment-Specific Settings

| Setting | Development | Preview | Production |
|---------|-------------|---------|------------|
| Supabase Project | Local | Staging | Production |
| Debug Logging | Enabled | Enabled | Disabled |
| Error Stack Traces | Full | Full | Hidden |
| Analytics | Disabled | Disabled | Enabled |

### Vercel Environment Setup

```bash
# Set production environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL production

# Set preview environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
```

---

## GitHub Actions Workflows

### Recommended: CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:ci

      - name: Build
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()
        with:
          files: ./coverage/lcov.info
```

### Recommended: Preview Deployment

```yaml
name: Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          github-comment: true
```

### Recommended: Production Deployment

```yaml
name: Production

on:
  push:
    branches: [main]

jobs:
  deploy-production:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

---

## Rollback Procedures

### Vercel Rollback

```bash
# List recent deployments
vercel list

# Rollback to previous production deployment
vercel rollback

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Via Vercel Dashboard

1. Go to Vercel Dashboard → Project → Deployments
2. Find the previous working deployment
3. Click the three dots menu → "Promote to Production"

### Database Rollback

For database migrations, prepare rollback scripts:

```sql
-- Example rollback: migrations/20260124000001_rollback.sql
-- Undo the changes made in the original migration
DROP FUNCTION IF EXISTS get_member_workload_stats;
```

Apply rollback:

```bash
supabase db execute --file migrations/rollback.sql
```

### Emergency Procedures

1. **Identify the issue** - Check logs, error reports
2. **Rollback deployment** - Use Vercel rollback immediately
3. **Notify stakeholders** - Update status page if applicable
4. **Investigate root cause** - Review logs and changes
5. **Prepare fix** - Create hotfix branch
6. **Test fix** - Full validation on preview
7. **Deploy fix** - Merge to main after approval

---

## Branch Protection

### Recommended Settings for `main`

| Setting | Value |
|---------|-------|
| Require pull request | Yes |
| Required approvals | 1+ |
| Dismiss stale approvals | Yes |
| Require status checks | Yes |
| Required checks | `validate` (CI workflow) |
| Require branches up to date | Yes |
| Restrict pushes | Admins only |
| Allow force pushes | No |
| Allow deletions | No |

### Branch Naming Convention

| Pattern | Purpose |
|---------|---------|
| `main` | Production-ready code |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `hotfix/*` | Emergency fixes |
| `docs/*` | Documentation updates |
| `refactor/*` | Code refactoring |

---

## Monitoring Deployments

### Deployment Verification

After each deployment, verify:

1. **Health check** - App loads without errors
2. **Core functionality** - Test login, dashboard, key features
3. **Error monitoring** - Check for new errors in logs
4. **Performance** - Compare Core Web Vitals

### Automated Monitoring

Consider setting up:

- **Uptime monitoring** - Vercel Analytics, UptimeRobot
- **Error tracking** - Sentry, LogRocket
- **Performance** - Vercel Speed Insights
- **Log aggregation** - Vercel Logs, Datadog

### Post-Deployment Checklist

- [ ] Deployment completed without errors
- [ ] Application accessible at production URL
- [ ] Login functionality works
- [ ] Dashboard loads with data
- [ ] No new errors in monitoring
- [ ] Core Web Vitals within thresholds

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Build fails | TypeScript errors | Fix type errors locally first |
| Tests fail in CI | Environment differences | Ensure tests pass locally with `npm run test:ci` |
| Deployment stuck | Vercel queue | Wait or cancel and retry |
| 500 errors after deploy | Missing env vars | Check Vercel environment configuration |
| Database connection fails | Wrong credentials | Verify Supabase URL and keys |

### Getting Help

1. Check Vercel deployment logs
2. Check browser console for client errors
3. Check Supabase logs for database errors
4. Review recent commits for changes
5. Consult `docs/error-handling.md` for error patterns

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/pre-commit-check.sh` | Local validation script |
| `.github/workflows/ci.yml` | CI workflow (to be created) |
| `docs/performance-baseline.md` | Performance thresholds |
| `docs/error-handling.md` | Error handling guide |
