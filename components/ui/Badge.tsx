import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "brand" | "deep" | "alt" | "card" | "ink";

const tones: Record<Tone, string> = {
  brand: "bg-brand text-on-brand",
  deep: "bg-surface-deep text-white",
  alt: "bg-surface-alt text-ink",
  card: "bg-card text-ink border border-line",
  ink: "bg-ink text-canvas",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function Badge({ tone = "brand", className, ...props }: BadgeProps) {
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
