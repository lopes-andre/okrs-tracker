# Troubleshooting

Common issues and solutions for the OKRs Tracker application.

## Setup Issues

### "Invalid API key" or "Failed to fetch"

**Symptoms**: App shows connection errors, data doesn't load

**Causes**:
1. Missing or incorrect environment variables
2. Trailing spaces in `.env.local`
3. Using wrong key type

**Solutions**:

```bash
# Verify environment variables
cat .env.local

# Check for trailing spaces
cat -A .env.local | grep SUPABASE
```

Ensure:
- `NEXT_PUBLIC_SUPABASE_URL` is your project URL (not dashboard URL)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the `anon` key (not `service_role`)
- No trailing spaces after values

### "relation does not exist"

**Symptoms**: Database queries fail with table not found errors

**Causes**:
1. Migrations not run
2. Migrations run out of order
3. Connected to wrong database

**Solutions**:

```bash
# If using local Supabase
supabase db reset

# Verify migrations in SQL Editor
SELECT * FROM pg_tables WHERE schemaname = 'public';
```

For Supabase Cloud:
1. Run migrations in order (001 through 014)
2. Check for errors in SQL Editor output

### "401 Unauthorized" on login

**Symptoms**: Login fails even with correct credentials

**Causes**:
1. Auth not configured in Supabase
2. OAuth callback URLs incorrect
3. Stale session/cookies

**Solutions**:

1. Verify auth is enabled: **Authentication → Providers**
2. Check callback URLs match your domain
3. Clear browser cookies for `localhost` or your domain

For OAuth:
```
Authorized redirect URIs:
- http://localhost:3000/auth/callback
- https://your-project.supabase.co/auth/v1/callback
```

### Port 3000 already in use

**Symptoms**: `Error: listen EADDRINUSE`

**Solutions**:

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or run on different port
npm run dev -- -p 3001
```

## Runtime Issues

### Data not updating after mutation

**Symptoms**: Changes don't appear until page refresh

**Causes**:
1. Query invalidation missing
2. Wrong query keys
3. Optimistic update not working

**Solutions**:

Check that mutation invalidates correct queries:

```typescript
// In hooks.ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  // Also invalidate related queries
  queryClient.invalidateQueries({ queryKey: queryKeys.plans.stats(planId) });
},
```

### "Permission denied" errors

**Symptoms**: CRUD operations fail with 42501 error

**Causes**:
1. User doesn't have required role
2. RLS policy not matching
3. Auth session expired

**Solutions**:

1. Check user's role in plan:
```sql
SELECT role FROM plan_members
WHERE plan_id = 'xxx' AND user_id = auth.uid();
```

2. Verify RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'tasks';
```

3. Refresh session by logging out and back in

### Charts not rendering

**Symptoms**: Recharts components show blank or error

**Causes**:
1. Data format incorrect
2. Missing required props
3. Container has no dimensions

**Solutions**:

1. Ensure data matches expected format:
```typescript
// Recharts expects array of objects
const data = [
  { name: "Jan", value: 100 },
  { name: "Feb", value: 200 },
];
```

2. Chart containers need explicit dimensions:
```tsx
<div style={{ width: "100%", height: 300 }}>
  <ResponsiveContainer>
    <LineChart data={data}>...</LineChart>
  </ResponsiveContainer>
</div>
```

### Toast notifications not showing

**Symptoms**: Actions complete but no feedback

**Causes**:
1. Toaster not in layout
2. Toast called incorrectly
3. z-index issues

**Solutions**:

1. Ensure `<Toaster />` is in root layout:
```tsx
// src/app/layout.tsx
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

2. Use toast correctly:
```typescript
import { useToast } from "@/components/ui/use-toast";

const { toast } = useToast();
toast({
  title: "Success",
  description: "Operation completed",
  variant: "success",
});
```

## Build Issues

### TypeScript errors in Recharts

**Symptoms**: Build fails with Recharts type errors

**Causes**:
- Recharts types don't match usage
- Strict TypeScript catches issues

**Solutions**:

```typescript
// Cast data when needed
const chartData = data as unknown as ChartDataPoint[];

// Or use type assertion for props
<Line dataKey="value" type="monotone" />
```

### "Module not found" errors

**Symptoms**: Import paths not resolving

**Causes**:
1. Wrong import path
2. File not exported from index
3. TypeScript path alias issue

**Solutions**:

1. Verify file exists at path
2. Check `tsconfig.json` paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

3. Restart TypeScript server in VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

### Build succeeds locally but fails in CI

**Symptoms**: Works on your machine, fails in GitHub Actions/Vercel

**Causes**:
1. Missing environment variables
2. Case sensitivity (macOS vs Linux)
3. Different Node versions

**Solutions**:

1. Check all env vars are set in CI
2. Match file import case exactly: `MyComponent` not `mycomponent`
3. Use `.nvmrc` to lock Node version

## Performance Issues

### Slow initial load

**Symptoms**: App takes long to show content

**Causes**:
1. Too many queries on mount
2. Large bundle size
3. No caching

**Solutions**:

1. Use Suspense for code splitting:
```tsx
const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <Skeleton />,
});
```

2. Check bundle with:
```bash
npm run build
# Look at output sizes
```

3. Verify React Query is caching:
```typescript
// In query-client.tsx
defaultOptions: {
  queries: {
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  },
},
```

### Database queries slow

**Symptoms**: Data loads slowly, especially lists

**Causes**:
1. Missing indexes
2. N+1 query pattern
3. Large result sets

**Solutions**:

1. Add indexes for filtered columns:
```sql
CREATE INDEX idx_tasks_plan_id_status ON tasks(plan_id, status);
```

2. Use joins instead of separate queries:
```typescript
// Instead of fetching KRs then check-ins separately
supabase.from("annual_krs")
  .select("*, check_ins(*)")
  .eq("plan_id", planId);
```

3. Paginate large lists:
```typescript
const { data } = await supabase
  .from("tasks")
  .select("*", { count: "exact" })
  .range(0, 19); // First 20
```

## Testing Issues

### Tests pass locally but fail in CI

**Symptoms**: Green locally, red in GitHub Actions

**Causes**:
1. Timezone differences
2. Race conditions
3. Environment differences

**Solutions**:

1. Mock dates consistently:
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});
```

2. Use `waitFor` for async operations:
```typescript
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
```

### Mock not being applied

See [Testing Guide - Troubleshooting](./testing.md#troubleshooting) for mock-specific issues.

## Getting Help

If you can't resolve an issue:

1. Check existing [GitHub Issues](https://github.com/lopes-andre/okrs-tracker/issues)
2. Search the codebase for similar patterns
3. Create a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, browser)
   - Relevant error messages/logs
