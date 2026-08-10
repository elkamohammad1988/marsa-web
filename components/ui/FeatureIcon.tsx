import { cn } from "@/lib/utils";

type Tone = "brand" | "alt" | "deep" | "card";

/**
 * `brand` is a lit tile rather than a flat 10%-magenta square: a warm-to-cool
 * gradient, a 1px inset rim to catch the light, and a soft magenta cast beneath
 * it. At this size a single translucent fill has no edge a viewer can find, so
 * the icon read as floating on the card instead of sitting in a container.
 */
const tones: Record<Tone, string> = {
  brand:
    "bg-gradient-to-br from-brand/25 via-brand/10 to-halo/15 text-brand-strong ring-1 ring-inset ring-brand-strong/25 shadow-glow-sm",
  alt: "bg-surface-alt text-ink",
  deep: "bg-surface-deep text-white",
  card: "bg-card text-brand-strong border border-line",
};

type FeatureIconProps = {
  children: React.ReactNode;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function FeatureIcon({
  children,
  tone = "brand",
  size = "md",
  className,
}: FeatureIconProps) {
  const sizes = {
    sm: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
    md: "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6",
    lg: "h-14 w-14 [&_svg]:h-7 [&_svg]:w-7",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-2xl transition-transform duration-300",
        // Driven by `group-hover` on the card that contains it, so the icon
        // answers a hover anywhere on the card rather than only on itself.
        "group-hover:-translate-y-0.5 group-hover:scale-105",
        tones[tone],
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}
