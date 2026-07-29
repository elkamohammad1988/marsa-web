import { cn } from "@/lib/utils";

/**
 * The Marsa mark: a coin coming to rest in the harbour, ripples spreading out.
 *
 * A `marsa` is the harbour a ship — or a payment — comes home to. The disc is
 * the money; the two arcs beneath are the water it lands in. It says the
 * tagline ("where your money lands") in one glyph, and the shapes stay legible
 * down to a 16px favicon. Drawn with `currentColor` so it inherits the tile.
 */
export function MarsaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="7" r="2.7" fill="currentColor" />
      <g
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M6.4 12.6q5.6 3.4 11.2 0" />
        <path d="M4.4 16.6q7.6 4.1 15.2 0" opacity="0.8" />
      </g>
    </svg>
  );
}

type LogoProps = {
  className?: string;
  /** Wordmark colour. The mark tile is always the rose→plum gradient. */
  tone?: "white" | "ink";
  /** Hide the wordmark and render only the mark tile. */
  markOnly?: boolean;
};

export function Logo({ className, tone = "ink", markOnly = false }: LogoProps) {
  return (
    <span className={cn("group inline-flex items-center gap-2.5 select-none", className)}>
      <span
        aria-hidden
        className="logo-tile relative grid h-9 w-9 place-items-center rounded-[11px] text-white shadow-glow-sm ring-1 ring-inset ring-white/15 transition-transform duration-300 group-hover:-translate-y-0.5"
      >
        <MarsaMark className="h-[22px] w-[22px]" />
      </span>
      {!markOnly && (
        <span
          role="img"
          aria-label="Marsa"
          className={cn(
            "font-display text-[22px] font-bold leading-none tracking-[-0.03em]",
            tone === "white" ? "text-white" : "text-ink",
          )}
        >
          marsa
        </span>
      )}
    </span>
  );
}
