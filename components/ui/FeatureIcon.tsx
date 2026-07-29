import { cn } from "@/lib/utils";

type Tone = "brand" | "alt" | "deep" | "card";

const tones: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand-strong",
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
