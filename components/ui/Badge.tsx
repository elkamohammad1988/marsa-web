import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "blue" | "navy" | "cream" | "white" | "ink";

const tones: Record<Tone, string> = {
  blue: "bg-brand-blue text-on-brand",
  navy: "bg-surface-navy text-white",
  cream: "bg-surface-cream text-ink",
  white: "bg-card text-ink border border-line",
  ink: "bg-ink text-canvas",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function Badge({ tone = "blue", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
