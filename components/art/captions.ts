/**
 * What every illustration on this site depicts, in words.
 *
 * This is a plain data module, deliberately, and it is the fix for audit
 * finding F1 rather than a by-product of it.
 *
 * F1 reads as "eleven of seventeen images are byte-identical duplicates", but
 * the duplication was the symptom. The defect was that **a picture and the
 * sentence describing it lived in different places and nothing tied them
 * together**: the file sat in `public/images/`, the `alt` string sat at each
 * call site, and `card-phone.png` could therefore be rendered on the homepage
 * as *"Marsa Mastercard and mobile app"* while actually being the cover
 * photograph of blog post 6. That is a WCAG 1.1.1 failure — a screen-reader
 * user told something untrue — and no amount of care at the call site would
 * have caught it, because the call site had no way to know.
 *
 * Keying both records off the same unions the components render means a slot
 * cannot exist without a description, and a description cannot survive the slot
 * it describes. The types are declared here rather than in the `.tsx` so that
 * `lib/blog.ts` and the test suite can both reach them without importing JSX.
 */

/** The six product illustrations, drawn by `BrandArt.tsx`. */
export type ArtName =
  | "card-and-phone"
  | "card-stack"
  | "coin"
  | "coin-warm"
  | "phone-accounts"
  | "phone-home";

/** The six blog covers, drawn by `BlogCover.tsx` — one motif per post. */
export type BlogMotif =
  | "corridor"
  | "spread"
  | "rate-line"
  | "currencies"
  | "payout"
  | "ledger";

export const ART_CAPTIONS: Record<ArtName, string> = {
  "card-and-phone":
    "Illustration of a Marsa payment card resting against a phone showing an account balance of €12,480.55 with send and convert actions.",
  "card-stack":
    "Illustration of three Marsa payment cards fanned out, each unbranded and marked as a concept.",
  coin: "Illustration of the Marsa mark struck as a coin coming to rest, with ripples spreading out around it.",
  "coin-warm":
    "Illustration of the Marsa mark struck as a warm-toned coin, with ripples spreading out around it.",
  "phone-accounts":
    "Illustration of the Marsa app listing euro, dollar and pound balances side by side, with an option to open another currency.",
  "phone-home":
    "Illustration of the Marsa app home screen: a total balance of €12,480.55, send and convert actions, and a thirty-day balance line.",
};

export const BLOG_CAPTIONS: Record<BlogMotif, string> = {
  corridor:
    "Cover illustration of payments from several countries converging into a single European account.",
  spread:
    "Cover illustration of the gap between a mid-market rate and a marked-up rate, shaded as the cost.",
  "rate-line":
    "Cover illustration of an exchange-rate line with one point marked, and the payout it settles at.",
  currencies:
    "Cover illustration of a grid of currency codes held side by side in one account.",
  payout: "Cover illustration of a marketplace payout landing in a European IBAN.",
  ledger:
    "Cover illustration of layered account rails stacked into a single treasury view.",
};

export const ART_NAMES = Object.keys(ART_CAPTIONS) as ArtName[];
export const BLOG_MOTIFS = Object.keys(BLOG_CAPTIONS) as BlogMotif[];
