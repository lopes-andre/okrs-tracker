# Supabase Security Settings

This document covers security settings that must be configured in the Supabase Dashboard and cannot be enforced via migrations.

## Password Protection for Leaked Passwords

### Warning Message

The Supabase Security Advisor may show:

> **Leaked password protection is disabled**
> Enable protection against leaked passwords. Leaked passwords are checked against a database of known leaked passwords (HaveIBeenPwned).

### How to Enable

1. Go to the **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers** → **Email**
3. Enable **"Protect against leaked passwords"**
4. Click **Save**

### What This Does

When enabled, Supabase will:
- Check new passwords against the HaveIBeenPwned database
- Reject passwords that have appeared in known data breaches
- Provide immediate feedback to users about password safety

### Trade-offs

**Pros:**
- Prevents users from using compromised passwords
- Adds an extra layer of account security
- Zero code changes required

**Cons:**
- Slight latency increase during password operations (external API call)
- May frustrate users with commonly-used passwords
- Requires external service availability

### Recommendation

**Enable this setting in production environments.** The security benefit outweighs the minimal latency impact.

---

## Other Dashboard Security Settings

### Email Confirmations

Location: **Authentication** → **Providers** → **Email**

- **Confirm email**: Require users to confirm their email address
- Recommended: **Enabled** for production

### MFA (Multi-Factor Authentication)

Location: **Authentication** → **MFA**

- Enable TOTP (Time-based One-Time Password) for additional security
- Can be enforced or optional per-user

### Rate Limiting

Location: **Project Settings** → **API**

- Configure rate limits to prevent brute-force attacks
- Adjust based on expected traffic patterns

### Realtime Security

Location: **Database** → **Realtime**

- Only enable Realtime for tables that genuinely need it
- Use RLS policies to restrict what data is broadcast

---

## Security Checklist

- [ ] Enable leaked password protection
- [ ] Enable email confirmation for production
- [ ] Review and enable MFA options
- [ ] Configure appropriate rate limits
- [ ] Audit Realtime-enabled tables
- [ ] Review RLS policies after schema changes
- [ ] Keep Supabase client libraries up to date

---

## Related Documents

- [Security Warnings Analysis](./security-warnings-analysis.md) - Analysis of function search_path warnings
- [RLS Security Fix Analysis](./rls-security-fix-analysis.md) - RLS policy review
- [Manual RLS Test Checklist](./manual-rls-test-checklist.md) - Testing procedures
