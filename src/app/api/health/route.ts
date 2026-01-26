/**
 * Health Check Endpoint
 *
 * Returns the health status of the application and its dependencies.
 * Used for monitoring, load balancers, and deployment verification.
 *
 * GET /api/health
 *
 * Response:
 * - 200: All systems operational
 * - 503: One or more dependencies unhealthy
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    storage: CheckResult;
    auth: CheckResult;
  };
}

interface CheckResult {
  status: "pass" | "fail" | "warn";
  latency_ms?: number;
  message?: string;
}

// Track server start time for uptime calculation
const startTime = Date.now();

/**
 * Check database connectivity by running a simple query
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    // Simple query to verify database connectivity
    const { error } = await supabase.from("plans").select("id").limit(1);

    if (error) {
      // RLS might block this, but connection succeeded if we got here
      if (error.code === "PGRST301" || error.message.includes("permission")) {
        return {
          status: "pass",
          latency_ms: Date.now() - start,
          message: "Connected (RLS active)",
        };
      }
      throw error;
    }

    return {
      status: "pass",
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "fail",
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check storage service availability
 */
async function checkStorage(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    // List buckets to verify storage connectivity
    const { error } = await supabase.storage.listBuckets();

    if (error) {
      // May fail due to permissions, but connection succeeded
      if (error.message.includes("permission") || error.message.includes("policy")) {
        return {
          status: "pass",
          latency_ms: Date.now() - start,
          message: "Connected (permissions restricted)",
        };
      }
      throw error;
    }

    return {
      status: "pass",
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "fail",
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check auth service availability
 */
async function checkAuth(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    // Get session to verify auth service is responding
    const { error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return {
      status: "pass",
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "fail",
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const [database, storage, auth] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkAuth(),
  ]);

  const checks = { database, storage, auth };

  // Determine overall status
  const allPassing = Object.values(checks).every((c) => c.status === "pass");
  const anyFailing = Object.values(checks).some((c) => c.status === "fail");

  let status: HealthStatus["status"];
  if (allPassing) {
    status = "healthy";
  } else if (anyFailing) {
    status = "unhealthy";
  } else {
    status = "degraded";
  }

  const response: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  return NextResponse.json(response, {
    status: status === "healthy" ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
