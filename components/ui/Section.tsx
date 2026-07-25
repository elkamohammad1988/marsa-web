import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "white" | "cream" | "navy" | "blue" | "blue-tint";

const tones: Record<Tone, string> = {
  white: "bg-canvas text-ink",
  cream: "bg-surface-cream text-ink",
  navy: "bg-surface-navy text-white",
  blue: "bg-brand-blue text-on-brand",
  "blue-tint": "bg-surface-blue-tint text-ink",
};

type SectionProps = HTMLAttributes<HTMLElement> & {
  tone?: Tone;
  size?: "sm" | "md" | "lg";
};

export function Section({ tone = "white", size = "md", className, ...props }: SectionProps) {
  const padding =
    size === "lg"
      ? "py-14 md:py-20 lg:py-24"
      : size === "sm"
        ? "py-8 md:py-12"
        : "py-10 md:py-14 lg:py-16";
  return <section className={cn(tones[tone], padding, className)} {...props} />;
}
