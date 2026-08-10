import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "outline-light" | "ghost-pill" | "white";
type Size = "sm" | "md" | "lg";

/**
 * `whitespace-nowrap` is load-bearing, not a nicety.
 *
 * Every variant here is a fixed-height pill (`h-12` at `lg`), so a label that
 * wraps to a second line does not grow the button — it overflows it, and the
 * text is clipped by the radius. That is exactly what "Check IBAN" was doing on
 * /tools/iban-checker: as a flex item beside a `w-full` input it was allowed to
 * shrink below its content width, so it rendered as "Check" over "IBAN" inside
 * a 48px pill. A pill button with wrapped text always reads as broken, so the
 * rule belongs to the component rather than to each call site.
 *
 * Paired with `flex-none` so the button holds its intrinsic width when it sits
 * in a row next to something greedy.
 */
const base =
  "relative inline-flex flex-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 ring-offset-canvas disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  // Metallic magenta CTA: vertical #CE2A8C→#A5156A gradient, inset top highlight
  // + magenta glow (shadow-cta), white text (≥4.85:1). Hover brightens the glow
  // and lifts 1px; active presses down. `sheen` adds one band of light crossing
  // the fill on hover — the thing that makes a metallic surface read as metal
  // rather than as a gradient. It plays once per entry and leaves nothing
  // behind, so a reduced-motion visitor keeps the static gradient + highlight.
  primary:
    "sheen bg-cta-gradient text-on-brand shadow-cta hover:shadow-cta-hover hover:-translate-y-px active:translate-y-0 active:shadow-cta",
  outline:
    "border border-line bg-card/60 text-ink shadow-e1 hover:border-brand-strong/45 hover:bg-brand/[0.08] hover:-translate-y-px active:translate-y-0",
  "outline-light": "border border-white/25 text-white hover:bg-white/10 hover:border-white/40",
  "ghost-pill": "text-ink hover:bg-ink/5",
  white:
    "bg-white text-surface-deep shadow-sm hover:bg-white/90 hover:-translate-y-0.5 active:translate-y-0",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

function classesFor(variant: Variant, size: Size, className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

/**
 * A button's appearance with none of its behaviour — a `<span>`, not a link.
 *
 * For the call to action *inside* an already-clickable card. Reaching for
 * `<Button href>` there produces an `<a>` nested in an `<a>`, which is invalid
 * HTML: the browser repairs it by closing the outer anchor early, so the
 * server's markup and the client's disagree and React throws away the whole
 * tree and re-renders it. That is exactly what `/blog` was doing — the featured
 * card wrapped a `Button href` pointing at the same post, and the resulting
 * hydration failure was visible only in the production build.
 *
 * The card itself carries the href, so this needs no interactivity of its own;
 * `group-hover` on the parent still drives the hover state.
 */
export function ButtonLabel({
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return <span className={classesFor(variant, size, className)}>{children}</span>;
}

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
  const cls = classesFor(variant, size, props.className);

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
