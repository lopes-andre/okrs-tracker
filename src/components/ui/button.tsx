/**
 * Button Component
 *
 * A polymorphic button component built on Radix UI Slot with CVA variants.
 * Supports multiple visual variants and sizes for consistent UI.
 *
 * @example
 * // Default button
 * <Button onClick={handleClick}>Click me</Button>
 *
 * @example
 * // Secondary variant with small size
 * <Button variant="secondary" size="sm">Secondary</Button>
 *
 * @example
 * // As a link using asChild
 * <Button asChild>
 *   <Link href="/page">Navigate</Link>
 * </Button>
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button style variants using class-variance-authority.
 * Provides consistent styling across the application.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-body-sm font-medium transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-white hover:bg-accent-hover shadow-sm",
        secondary:
          "bg-bg-0 text-text-strong border border-border hover:bg-bg-1 shadow-sm",
        ghost:
          "text-text-strong hover:bg-accent-muted",
        outline:
          "border border-border bg-transparent text-text-strong hover:bg-bg-1",
        link:
          "text-text-strong underline-offset-4 hover:underline",
        danger:
          "bg-status-danger text-white hover:bg-status-danger/90 shadow-sm",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-4 text-small",
        lg: "h-12 px-8 text-body",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * Props for the Button component.
 *
 * @property variant - Visual style variant: "default" | "secondary" | "ghost" | "outline" | "link" | "danger"
 * @property size - Button size: "default" | "sm" | "lg" | "icon" | "icon-sm"
 * @property asChild - If true, renders as a Radix Slot, merging props with child element
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
