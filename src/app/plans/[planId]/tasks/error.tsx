"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { handleComponentError } from "@/lib/error-reporter";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TasksError({ error, reset }: ErrorProps) {
  const params = useParams();
  const planId = params.planId as string;

  useEffect(() => {
    handleComponentError(error, {
      componentStack: error.stack || null,
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-status-danger/30 bg-status-danger/5">
        <CardHeader className="pb-3 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-status-danger/10">
              <AlertTriangle className="w-8 h-8 text-status-danger" />
            </div>
          </div>
          <CardTitle className="text-xl text-status-danger">
            Tasks Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-muted text-center">
            Failed to load tasks. Your tasks are safe — this is just a display issue.
          </p>

          {process.env.NODE_ENV === "development" && error.message && (
            <pre className="p-3 bg-bg-1 rounded-md text-xs text-text-muted overflow-auto max-h-32 border">
              {error.message}
            </pre>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Tasks
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/plans/${planId}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
