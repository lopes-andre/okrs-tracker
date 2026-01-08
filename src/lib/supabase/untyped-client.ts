import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates an untyped Supabase client for API operations.
 * This avoids TypeScript inference issues with complex queries.
 * Type safety is maintained at the API function level instead.
 */
export function createUntypedClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
