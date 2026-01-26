"use client";

import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-1">
      <Card className="max-w-md w-full">
        <CardHeader className="pb-3 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-bg-2">
              <FileQuestion className="w-8 h-8 text-text-muted" />
            </div>
          </div>
          <CardTitle className="text-xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-muted text-center">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/plans">
                <Home className="w-4 h-4 mr-2" />
                Go to Plans
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
