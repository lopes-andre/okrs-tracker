import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  actions,
  backHref,
  className,
}: PageHeaderProps) {
  const actionContent = actions || children;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8",
        className
      )}
    >
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-strong transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        )}
        <h1 className="font-heading text-h3-mobile md:text-h3 text-text-strong">
          {title}
        </h1>
        {description && (
          <p className="text-body-sm text-text-muted mt-1">{description}</p>
        )}
      </div>
      {actionContent && <div className="flex items-center gap-3">{actionContent}</div>}
    </div>
  );
}
