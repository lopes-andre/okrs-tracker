import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill border px-2.5 py-0.5 text-small font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-border-soft bg-bg-1 text-text-muted",
        secondary:
          "border-transparent bg-bg-2 text-text-muted",
        success:
          "border-status-success/20 bg-status-success/10 text-status-success",
        warning:
          "border-status-warning/20 bg-status-warning/10 text-status-warning",
        danger:
          "border-status-danger/20 bg-status-danger/10 text-status-danger",
        info:
          "border-status-info/20 bg-status-info/10 text-status-info",
        outline:
          "border-border bg-transparent text-text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
