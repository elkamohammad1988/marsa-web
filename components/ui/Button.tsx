import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "outline-light" | "ghost-pill" | "white";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 ring-offset-canvas disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  // Metallic magenta CTA: vertical #CE2A8C→#A5156A gradient, inset top highlight
  // + magenta glow (shadow-cta), white text (≥4.85:1). Hover brightens the glow
  // and lifts 1px; active presses down. Motion is transition-only (reduced-
  // motion users keep the static gradient + highlight).
  primary:
    "bg-cta-gradient text-on-brand shadow-cta hover:shadow-cta-hover hover:-translate-y-px active:translate-y-0 active:shadow-cta",
  outline:
    "border border-line bg-card/60 text-ink shadow-e1 hover:border-brand-strong/45 hover:bg-brand-blue/[0.08] hover:-translate-y-px active:translate-y-0",
  "outline-light": "border border-white/25 text-white hover:bg-white/10 hover:border-white/40",
  "ghost-pill": "text-ink hover:bg-ink/5",
  white:
    "bg-white text-surface-navy shadow-sm hover:bg-white/90 hover:-translate-y-0.5 active:translate-y-0",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  href?: undefined;
};

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  href: string;
};

export function Button(props: ButtonProps | AnchorProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
  const cls = cn(base, variants[variant], sizes[size], props.className);

  if (props.href !== undefined) {
    const { href, variant: _v, size: _s, className: _c, children, ...rest } =
      props as AnchorProps;
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  const { variant: _v, size: _s, className: _c, children, ...rest } = props as ButtonProps;
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
