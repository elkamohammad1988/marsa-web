import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-full border border-line bg-canvas px-5 text-sm text-ink placeholder:text-ink-subtle",
          "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-strong/30",
          className,
        )}
        {...props}
      />
    );
  },
);
