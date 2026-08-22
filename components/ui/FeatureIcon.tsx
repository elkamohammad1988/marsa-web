import { cn } from "@/lib/utils";

type Tone = "brand" | "alt" | "deep" | "card";

/**
 * `brand` is a lit tile rather than a flat 10%-gold square: a warm-to-cool
 * gradient, a 1px inset rim to catch the light, and a soft gold cast beneath
 * it. At this size a single translucent fill has no edge a viewer can find, so
 * the icon read as floating on the card instead of sitting in a container.
 *
 * The three stops now run the identity in miniature — lit gold at the top-left
 * corner, the gold itself through the middle, water at the bottom-right — which
 * is what the brief means by tonal variation rather than one flat gold. It is
 * the same light every other gold surface is under, and it costs one gradient.
 *
 * Nothing here moves and nothing here glows, for the same reason. A feature
 * grid is six to nine of these at once, several times down a page: a bloom
 * behind each one turns gold from an emphasis into wallpaper, and a tile that
 * lifts and grows on hover is answering a hover the card underneath it is
 * already answering.
 */
const tones: Record<Tone, string> = {
  brand:
    "bg-gradient-to-br from-gold-light/22 via-gold/12 to-halo/18 text-brand-strong ring-1 ring-inset ring-brand-strong/25",
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
        "inline-flex items-center justify-center rounded-2xl",
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
