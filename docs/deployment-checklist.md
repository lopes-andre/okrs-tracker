# Deployment Checklist

This checklist covers all steps required for deploying OKRs Tracker to production.

## Pre-Deployment

### Code Quality
- [ ] All tests pass: `npm run test:run`
- [ ] Linting passes: `npm run lint`
- [ ] Type checking passes: `npm run build`
- [ ] No console.log statements in production code
- [ ] All TODO/FIXME items addressed or tracked

### Environment Configuration
- [ ] `.env.local` configured with production values
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set to production Supabase URL
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set to production anon key
- [ ] `NEXT_PUBLIC_SITE_URL` set to production domain (for OAuth)
- [ ] `SUPABASE_SECRET_KEY` configured securely (if using admin operations)

### Database
- [ ] All migrations applied to production database
- [ ] RLS policies enabled and tested
- [ ] Indexes verified for performance
- [ ] Database backups configured
- [ ] Connection pooling configured (if using external pooler)

### Security
- [ ] No secrets in code or version control
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting configured (Supabase or edge)
- [ ] RLS policies cover all tables

## Deployment Steps

### 1. Prepare Release
```bash
# Ensure on main branch with latest changes
git checkout main
git pull origin main

# Run full verification
npm run lint
npm run test:run
npm run build
```

### 2. Database Migration (if needed)
```bash
# Connect to production Supabase
# Run any new migrations in SQL Editor or via CLI
supabase db push --db-url "postgresql://..."
```

### 3. Deploy Application

#### Vercel (Recommended)
```bash
# Push to trigger deployment
git push origin main

# Or deploy directly
vercel --prod
```

#### Docker
```bash
docker build -t okrs-tracker .
docker push your-registry/okrs-tracker:latest
```

#### Manual
```bash
npm run build
# Upload .next/, public/, package.json to server
npm start
```

### 4. Verify Deployment
- [ ] Health check endpoint returns 200: `GET /api/health`
- [ ] Login flow works correctly
- [ ] Data loads correctly
- [ ] All main features functional

## Post-Deployment

### Monitoring
- [ ] Error tracking active (check for new errors)
- [ ] Performance metrics baseline established
- [ ] Uptime monitoring configured
- [ ] Alerts configured for critical issues

### Documentation
- [ ] Release notes updated
- [ ] CHANGELOG updated
- [ ] Any API changes documented

## Rollback Procedure

### Application Rollback
1. Identify the last working deployment
2. Redeploy previous version:
   ```bash
   # Vercel: Use dashboard to rollback
   # Or deploy specific commit:
   git checkout <last-working-commit>
   vercel --prod
   ```

### Database Rollback
1. **CAUTION**: Database rollbacks may cause data loss
2. Identify affected migration(s)
3. Create reverse migration if needed
4. Apply reverse migration to production
5. Consider restoring from backup for data recovery

### Emergency Contacts
- Platform Admin: [contact info]
- Database Admin: [contact info]
- On-call Engineer: [contact info]

## Environment-Specific Notes

### Development
- Uses local Supabase or development project
- Debug logging enabled
- Source maps enabled

### Staging (if applicable)
- Mirrors production configuration
- Uses staging Supabase project
- Used for final testing before production

### Production
- Debug logging disabled
- Source maps configured for error tracking only
- Performance optimizations enabled
- CDN caching configured

## Health Check Endpoint

The `/api/health` endpoint returns system status:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-26T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": { "status": "pass", "latency_ms": 15 },
    "storage": { "status": "pass", "latency_ms": 20 },
    "auth": { "status": "pass", "latency_ms": 10 }
  }
}
```

Response codes:
- `200`: All systems operational
- `503`: One or more dependencies unhealthy

## Performance Baselines

Target metrics for production:
- Time to First Byte (TTFB): < 200ms
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1
- API response time: < 500ms (p95)

## Security Checklist

- [ ] No exposed API keys or secrets
- [ ] HTTPS only (HTTP redirects to HTTPS)
- [ ] Secure headers configured (CSP, HSTS, etc.)
- [ ] Authentication required for protected routes
- [ ] RLS active on all database tables
- [ ] Input validation on all forms
- [ ] Rate limiting on auth endpoints
