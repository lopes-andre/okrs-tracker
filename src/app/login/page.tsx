"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Target, Loader2, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn, signUp } from "@/app/(auth)/actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth_callback_error" 
      ? "Authentication failed. Please try again." 
      : null
  );
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupSuccess, setSignupSuccess] = useState<{ email: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      const result = mode === "signin" 
        ? await signIn(formData) 
        : await signUp(formData);
      
      if (result?.error) {
        setError(result.error);
      } else if ('success' in result && result.success && 'email' in result) {
        // Signup successful - show confirmation message
        setSignupSuccess({ email: result.email as string });
      }
    } catch {
      // Redirect happens in server action, this catch is for other errors
    } finally {
      setIsLoading(false);
    }
  }

  // Show success message after signup
  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-bg-1 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <span className="font-heading font-semibold text-xl">OKRs Tracker</span>
        </Link>

        {/* Success Card */}
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-6">
              {/* Success Icon */}
              <div className="mx-auto w-16 h-16 rounded-full bg-status-success/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-status-success" />
              </div>

              {/* Success Message */}
              <div className="space-y-2">
                <h2 className="font-heading font-semibold text-h3 text-text-strong">
                  Check your email
                </h2>
                <p className="text-body text-text-muted leading-relaxed">
                  We&apos;ve sent a confirmation link to
                </p>
                <p className="text-body font-medium text-text-strong">
                  {signupSuccess.email}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-bg-1 rounded-card p-4 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-status-success mt-0.5 shrink-0" />
                  <p className="text-body-sm text-text-muted">
                    Click the link in the email to verify your account
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-status-success mt-0.5 shrink-0" />
                  <p className="text-body-sm text-text-muted">
                    After verification, you&apos;ll be redirected to your dashboard
                  </p>
                </div>
              </div>

              {/* Back to Sign In */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setSignupSuccess(null);
                    setMode("signin");
                  }}
                  className="inline-flex items-center gap-2 text-body-sm text-text-muted hover:text-text-strong transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </button>
              </div>

              {/* Help Text */}
              <p className="text-small text-text-subtle">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setSignupSuccess(null)}
                  className="text-text-strong hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-small text-text-subtle mt-8">
          © {new Date().getFullYear()} OKRs Tracker. All rights reserved.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-1 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
          <Target className="w-6 h-6 text-white" />
        </div>
        <span className="font-heading font-semibold text-xl">OKRs Tracker</span>
      </Link>

      {/* Login Card */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-h3">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </CardTitle>
          <CardDescription>
            {mode === "signin" 
              ? "Sign in to your account to continue" 
              : "Sign up to start tracking your OKRs"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-button bg-status-danger/10 border border-status-danger/20 text-status-danger text-body-sm">
              {error}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    className="text-small text-text-muted hover:text-text-strong transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                disabled={isLoading}
              />
              {mode === "signup" && (
                <p className="text-small text-text-subtle">
                  Must be at least 6 characters
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full bg-accent hover:bg-accent-hover text-white" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === "signin" ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                mode === "signin" ? "Sign In" : "Create Account"
              )}
            </Button>
          </form>

          <p className="text-center text-small text-text-muted mt-6">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="text-text-strong font-medium hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className="text-text-strong font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-small text-text-subtle mt-8">
        © {new Date().getFullYear()} OKRs Tracker. All rights reserved.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
