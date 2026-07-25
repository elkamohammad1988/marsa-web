import { cn } from "@/lib/utils";

type Tone = "blue" | "cream" | "navy" | "white";

const tones: Record<Tone, string> = {
  blue: "bg-brand-blue/10 text-brand-strong",
  cream: "bg-surface-cream text-ink",
  navy: "bg-surface-navy text-white",
  white: "bg-card text-brand-strong border border-line",
};

type FeatureIconProps = {
  children: React.ReactNode;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function FeatureIcon({
  children,
  tone = "blue",
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
