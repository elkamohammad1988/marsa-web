import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Section surfaces, named for the role they play in the page rhythm.
 *
 * These were `white | cream | navy | blue | blue-tint`, which described a
 * light theme the site stopped having: `white` painted near-black, `cream`
 * painted near-black, and `navy` painted the darkest magenta-black of the
 * three. Reading a page's source told you nothing about how it looked.
 */
type Tone = "canvas" | "alt" | "deep" | "brand" | "tint";

const tones: Record<Tone, string> = {
  canvas: "bg-canvas text-ink",
  alt: "bg-surface-alt text-ink",
  deep: "bg-surface-deep text-white",
  brand: "bg-brand text-on-brand",
  tint: "bg-surface-tint text-ink",
};

type SectionProps = HTMLAttributes<HTMLElement> & {
  tone?: Tone;
  size?: "sm" | "md" | "lg";
};

export function Section({ tone = "canvas", size = "md", className, ...props }: SectionProps) {
  const padding =
    size === "lg"
      ? "py-14 md:py-20 lg:py-24"
      : size === "sm"
        ? "py-8 md:py-12"
        : "py-10 md:py-14 lg:py-16";
  return <section className={cn(tones[tone], padding, className)} {...props} />;
}
