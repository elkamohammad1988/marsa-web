import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "outline-light" | "ghost-pill";
type Size = "sm" | "md" | "lg";

/**
 * `whitespace-nowrap` is load-bearing, not a nicety.
 *
 * Every variant here is a fixed-height control (`h-12` at `lg`), so a label that
 * wraps to a second line does not grow the button — it overflows it, and the
 * text is clipped. That is exactly what "Check IBAN" was doing on
 * /tools/iban-checker: as a flex item beside a `w-full` input it was allowed to
 * shrink below its content width, so it rendered as "Check" over "IBAN" inside
 * a 48px control. A button with wrapped text always reads as broken, so the
 * rule belongs to the component rather than to each call site.
 *
 * Paired with `flex-none` so the button holds its intrinsic width when it sits
 * in a row next to something greedy.
 *
 * ## `rounded-lg`, not `rounded-full`
 *
 * Every button on the site was a pill. A pill is a fine shape and it is also
 * the default shape of every generated landing page, and it was fighting the
 * product: the account panel, the converter, the demo and the admin tables are
 * all rectangles with 10px corners, so a fully-round button beside them read as
 * imported from somewhere else. Matching the button radius to the panel radius
 * is most of what makes the marketing pages and the application look like one
 * piece of software.
 */
const base =
  "relative inline-flex flex-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 ring-offset-canvas disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  /**
   * The gold CTA: one flat fill, near-black label, no plating.
   *
   * It was `sheen liquid-gold` — a vertical metallic gradient with a two-band
   * reflection crossing it on hover, an inset highlight rim, a lift and a
   * brightness multiply. Removing all of it is the single largest visual
   * change on the site, and the reason is that none of those layers was
   * carrying information. The button is the only gold fill on any page; it is
   * already the loudest thing in view before a single effect is applied, and
   * five effects stacked on the loudest element is how a page reads as
   * generated rather than designed.
   *
   * It is also the more readable button. `bg-brand` carries `text-on-brand` at
   * **9.03:1**; the gradient it replaces ran 11.75:1 at its lit end down to
   * **6.07:1** at its shaded end, and a label has to be legible across the
   * whole fill, not on average. A flat fill has no shaded end. Hover moves one
   * step up the gold scale to `--gold-light` — **13.41:1** with the same label
   * — so the interaction still brightens; it does it by changing colour rather
   * than by lighting a surface. `transition-colors` rather than
   * `transition-all`: nothing moves, so nothing needs easing.
   */
  /*
   * The disabled state is a colour change, not an opacity wash.
   *
   * `disabled:opacity-60` sat in `base` and applied to every variant, which is
   * fine over a neutral fill and wrong over this one: 60% of `--brand` over a
   * card composites to a murky olive (~#887732) carrying a near-black label at
   * about **2.6:1**. WCAG exempts inactive controls from contrast, so nothing
   * failed — it just looked broken, and it is on camera in the demo's poster
   * frame, where "Continue" is legitimately disabled until the SEPA transfer is
   * sent.
   *
   * Each variant now names its own disabled appearance instead, which is also
   * order-independent: `cn` concatenates, so an override living in `base` and a
   * competitor living in the variant would be settled by Tailwind's emit order
   * rather than by intent.
   */
  primary:
    "bg-brand text-on-brand shadow-cta hover:bg-gold-light hover:shadow-cta-hover disabled:bg-surface-tint disabled:text-ink-subtle disabled:shadow-none",
  outline:
    "border border-line bg-transparent text-ink hover:border-ink-subtle hover:bg-ink/[0.04] disabled:text-ink-subtle disabled:border-line",
  "outline-light":
    "border border-white/25 text-white hover:bg-white/10 hover:border-white/40 disabled:text-white/45 disabled:border-white/15",
  "ghost-pill": "text-ink hover:bg-ink/5 disabled:text-ink-subtle",
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
