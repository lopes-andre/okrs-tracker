import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-input border border-border bg-bg-0 px-4 py-2 text-body text-text-strong shadow-input transition-all duration-fast file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-text-strong placeholder:text-text-subtle focus:border-border-strong focus:shadow-input-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
