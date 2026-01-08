import Link from "next/link";
import { ArrowRight, Target, BarChart3, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-1">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-bg-0 via-bg-1 to-bg-0" />
        
        {/* Content */}
        <div className="relative container-main py-8">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-semibold text-lg">OKRs</span>
            </div>
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Sign In
              </Button>
            </Link>
          </nav>

          {/* Hero content */}
          <div className="max-w-3xl mx-auto text-center pb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-bg-0 border border-border-soft shadow-card mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-text-muted" />
              <span className="text-caption text-text-muted">
                Personal OKR Tracking Made Simple
              </span>
            </div>

            <h1 className="font-heading text-h1-mobile md:text-h1 text-text-strong mb-6 text-balance animate-fade-in-up">
              Track Your Goals.
              <br />
              <span className="text-text-muted">Achieve More.</span>
            </h1>

            <p className="text-body-lg text-text-muted max-w-xl mx-auto mb-10 animate-fade-in-up stagger-1">
              A premium personal OKR tracker designed for ambitious individuals. 
              Set annual objectives, define quarterly key results, and watch your 
              progress unfold with beautiful analytics.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up stagger-2">
              <Link href="/plans">
                <Button size="lg" className="gap-2">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  Sign In to Your Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="section bg-bg-0 border-t border-border-soft">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="font-heading text-h2-mobile md:text-h2 text-text-strong mb-4">
              Everything You Need
            </h2>
            <p className="text-body text-text-muted max-w-lg mx-auto">
              A complete toolkit for personal goal management and progress tracking.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="card card-padding card-hover group">
              <div className="w-12 h-12 rounded-card bg-bg-1 flex items-center justify-center mb-5 group-hover:bg-accent/5 transition-colors">
                <Target className="w-6 h-6 text-text-muted group-hover:text-accent transition-colors" />
              </div>
              <h3 className="font-heading text-h5 text-text-strong mb-2">
                Objectives & Key Results
              </h3>
              <p className="text-body-sm text-text-muted">
                Define annual objectives with quarterly key results. Support for 
                metrics, milestones, counts, rates, and averages.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card card-padding card-hover group">
              <div className="w-12 h-12 rounded-card bg-bg-1 flex items-center justify-center mb-5 group-hover:bg-accent/5 transition-colors">
                <BarChart3 className="w-6 h-6 text-text-muted group-hover:text-accent transition-colors" />
              </div>
              <h3 className="font-heading text-h5 text-text-strong mb-2">
                Progress Analytics
              </h3>
              <p className="text-body-sm text-text-muted">
                Visual dashboards with pace indicators, forecasts, and trend 
                analysis. Know exactly where you stand.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card card-padding card-hover group">
              <div className="w-12 h-12 rounded-card bg-bg-1 flex items-center justify-center mb-5 group-hover:bg-accent/5 transition-colors">
                <Calendar className="w-6 h-6 text-text-muted group-hover:text-accent transition-colors" />
              </div>
              <h3 className="font-heading text-h5 text-text-strong mb-2">
                Weekly Reviews
              </h3>
              <p className="text-body-sm text-text-muted">
                Guided review flows to reflect on progress, identify blockers, 
                and plan your next moves.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border-soft">
        <div className="container-main">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-medium text-sm">OKRs Tracker</span>
            </div>
            <p className="text-small text-text-subtle">
              © {new Date().getFullYear()} Personal OKR Tracker. Built for achievers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
