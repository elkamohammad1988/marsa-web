import { BLOG_CAPTIONS, type BlogMotif } from "./captions";
import { cn } from "@/lib/utils";

export type { BlogMotif };

/**
 * Cover art for the six blog posts, one drawing each.
 *
 * The six PNGs these replace were five distinct photographs used twelve times:
 * posts 2 and 4 shared a cover byte for byte, and every one of them was also
 * doing duty somewhere else on the site as a "product shot" (`coin-blue.png`
 * was blog post 1; `card-phone.png`, rendered as *"Marsa Mastercard and mobile
 * app"*, was blog post 6).
 *
 * A motif per post rather than a decorative pattern per post: each one draws
 * the thing the article is actually about, so the cover carries meaning
 * instead of filling a rectangle. `BlogPost.cover` is now the motif name, which
 * means the type system will not let a seventh post ship without someone
 * deciding what its cover shows.
 *
 * Social sharing and `BlogPosting.image` are served by the generated card at
 * `app/blog/[slug]/opengraph-image.tsx` — a crawler needs a real bitmap at a
 * real URL, which is the one job this markup cannot do.
 */

/* ----------------------------------------------------------------- motifs */

function Corridor() {
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full" fill="none" aria-hidden>
      {[16, 40, 64, 88].map((y, i) => (
        <g key={y}>
          <path
            d={`M34 ${y + 3} C 80 ${y + 3}, 96 55, 150 55`}
            stroke="rgb(var(--brand-strong))"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity={0.28 + i * 0.12}
          />
          <circle cx="30" cy={y + 3} r="4.5" fill="rgb(var(--brand-soft))" />
          <circle cx="30" cy={y + 3} r="4.5" stroke="rgb(var(--brand-strong))" strokeWidth="1" />
        </g>
      ))}
      <circle cx="154" cy="55" r="20" fill="rgb(var(--brand) / 0.16)" />
      <circle cx="154" cy="55" r="20" stroke="rgb(var(--brand-strong))" strokeWidth="1.6" />
      <text
        x="154"
        y="59"
        textAnchor="middle"
        fill="rgb(var(--ink))"
        fontSize="11"
        fontWeight="700"
        letterSpacing="0.5"
      >
        IBAN
      </text>
    </svg>
  );
}

function Spread() {
  const mid = "M12 78 C 52 70, 78 48, 116 40 S 172 26, 190 22";
  const marked = "M12 92 C 52 86, 78 68, 116 62 S 172 52, 190 50";
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full" fill="none" aria-hidden>
      <path
        d={`${mid} L190 50 C 172 52, 132 62, 116 62 S 52 86, 12 92 Z`}
        fill="rgb(var(--brand) / 0.20)"
      />
      <path d={mid} stroke="rgb(var(--brand-strong))" strokeWidth="2" strokeLinecap="round" />
      <path
        d={marked}
        stroke="rgb(var(--ink-muted))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 5"
      />
      <text x="12" y="16" fill="rgb(var(--brand-strong))" fontSize="9" fontWeight="700">
        MID-MARKET
      </text>
      <text x="12" y="106" fill="rgb(var(--ink-subtle))" fontSize="9" fontWeight="700">
        WITH MARKUP
      </text>
    </svg>
  );
}

function RateLine() {
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full" fill="none" aria-hidden>
      {[26, 50, 74].map((y) => (
        <line key={y} x1="10" y1={y} x2="190" y2={y} stroke="rgb(var(--line-dark))" strokeWidth="1" />
      ))}
      <path
        d="M12 82 L38 66 L64 74 L90 44 L116 54 L142 30 L168 38 L190 18"
        stroke="rgb(var(--brand-strong))"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="142" cy="30" r="14" fill="rgb(var(--brand) / 0.18)" />
      <circle cx="142" cy="30" r="5" fill="rgb(var(--brand-strong))" />
      <text x="12" y="102" fill="rgb(var(--ink-subtle))" fontSize="9" fontWeight="700">
        EUR / USD
      </text>
    </svg>
  );
}

function Currencies() {
  const codes = ["EUR", "USD", "GBP", "CHF", "PLN", "SEK", "CAD", "JPY"];
  return (
    <div className="grid w-full max-w-[22rem] grid-cols-4 gap-2" aria-hidden>
      {codes.map((code, i) => (
        <span
          key={code}
          className={cn(
            "rounded-lg border py-2 text-center text-[0.62em] font-semibold leading-none tracking-wide",
            i === 0
              ? "border-brand-strong/60 bg-brand/[0.18] text-brand-strong"
              : "border-line-dark bg-card text-ink-muted",
          )}
        >
          {code}
        </span>
      ))}
    </div>
  );
}

function Payout() {
  return (
    <div className="flex w-full max-w-[22rem] flex-col gap-2" aria-hidden>
      {[
        { label: "Marketplace payout", value: "+$4,820.00", live: true },
        { label: "Converted at interbank", value: "€4,441.60", live: false },
        { label: "Settled to EU IBAN", value: "NL•• •••• 4417", live: false },
      ].map((row, i) => (
        <span
          key={row.label}
          className={cn(
            "flex items-center justify-between rounded-xl border px-3 py-2.5",
            i === 0 ? "border-brand-strong/50 bg-brand/[0.14]" : "border-line-dark bg-card",
          )}
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                row.live ? "bg-success" : "bg-line-dark",
              )}
            />
            <span className="text-[0.6em] font-medium leading-none text-ink-muted">
              {row.label}
            </span>
          </span>
          <span
            className={cn(
              "text-[0.62em] font-semibold leading-none tabular-nums",
              i === 0 ? "text-success" : "text-ink",
            )}
          >
            {row.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function Ledger() {
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full" fill="none" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i} opacity={0.4 + i * 0.3}>
          <rect
            x={26 + i * 8}
            y={18 + i * 24}
            width={148 - i * 16}
            height="20"
            rx="6"
            fill="rgb(var(--card))"
            stroke="rgb(var(--line-dark))"
            strokeWidth="1.2"
          />
          <rect
            x={34 + i * 8}
            y={24 + i * 24}
            width={i === 2 ? 60 : 40}
            height="8"
            rx="4"
            fill="rgb(var(--brand-strong))"
            opacity={i === 2 ? 0.9 : 0.35}
          />
        </g>
      ))}
      <path
        d="M100 42 V 60 M100 66 V 84"
        stroke="rgb(var(--brand-strong))"
        strokeWidth="1.4"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      <text x="26" y="106" fill="rgb(var(--ink-subtle))" fontSize="9" fontWeight="700">
        ONE TREASURY VIEW
      </text>
    </svg>
  );
}

const MOTIFS: Record<BlogMotif, () => React.ReactNode> = {
  corridor: Corridor,
  spread: Spread,
  "rate-line": RateLine,
  currencies: Currencies,
  payout: Payout,
  ledger: Ledger,
};

/* -------------------------------------------------------------- component */

export function BlogCover({
  motif,
  category,
  className,
}: {
  motif: BlogMotif;
  /** Rendered as the eyebrow, and named in the accessible description. */
  category: string;
  className?: string;
}) {
  const Motif = MOTIFS[motif];

  return (
    <div
      role="img"
      aria-label={`${BLOG_CAPTIONS[motif]} Category: ${category}.`}
      // Same container-query sizing as `BrandArt`: a cover renders at three
      // very different widths (a 3-up card, the featured slot, the article
      // hero) and the type inside it has to track the box, not the window.
      className={cn(
        "relative flex h-full w-full flex-col justify-center overflow-hidden bg-surface-deep p-[6%] text-[clamp(8px,9cqh,22px)] [container-type:size]",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-mesh-deep opacity-90" />
      <span className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <span className="pointer-events-none absolute inset-0 bg-noise" />

      <span className="relative mb-[4%] inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[0.56em] font-semibold uppercase leading-none tracking-[0.16em] text-brand-strong">
        <span className="h-1 w-1 rounded-full bg-brand-strong" />
        {category}
      </span>

      <span className="relative flex max-h-[72%] w-full flex-1 items-center justify-center">
        <Motif />
      </span>
    </div>
  );
}
