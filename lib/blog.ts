import type { BlogMotif } from "@/components/art/captions";

export type BlogPost = {
  slug: string;
  title: string;
  /**
   * The `<title>` for search results, when the headline is too long to be one.
   *
   * The document title is `${title} · Marsa`, and Google truncates around 60
   * characters — so every one of these headlines was being cut mid-phrase in
   * the results page, losing exactly the qualifier that made it worth clicking
   * ("…— And how an EU IBAN solves the prob…").
   *
   * It is a separate field rather than a shortened `title` because the two
   * jobs genuinely differ: the headline on the page can afford to be long and
   * specific, and the one in a search result cannot.
   * `tests/seo.test.ts` asserts the budget for every post, so a seventh post
   * with a long headline fails the gate rather than shipping truncated.
   */
  seoTitle?: string;
  excerpt: string;
  /**
   * ISO 8601 (`YYYY-MM-DD`).
   *
   * Previously a display string like "March 30, 2025", which
   * `blogPostingSchema` passed straight through to `datePublished`. Schema.org
   * requires ISO 8601, so Google's Rich Results test rejected the value and
   * none of the posts was eligible for an article rich result (audit F5).
   * Render it with `formatPostDate`, never directly.
   */
  date: string;
  category: string;
  /**
   * Which cover is drawn, not which file is loaded.
   *
   * This was a path into `public/images/`, and the six paths behind it resolved
   * to five distinct photographs — posts 2 and 4 were byte-identical, and every
   * one of them was also being used elsewhere as a product shot. A union type
   * means a seventh post cannot ship until someone has decided what its cover
   * actually shows.
   */
  cover: BlogMotif;
  body: { heading?: string; paragraphs: string[] }[];
};

const allPosts: BlogPost[] = [
  {
    slug: "why-non-eu-companies-struggle-with-european-payments",
    seoTitle: "Why non-EU companies need an EU IBAN",
    title:
      "Why non-EU companies struggle to receive payments from European clients — and how an EU IBAN solves the problem",
    excerpt:
      "Why European clients hesitate to pay non-EU accounts, and how a local IBAN removes the friction, delays, and lost margin.",
    date: "2025-03-30",
    category: "Business",
    cover: "corridor",
    body: [
      {
        paragraphs: [
          "For non-EU businesses, receiving payments from European clients has become a major bottleneck. Many operators — from Amazon sellers to Shopify brands, SaaS companies, and freelancers — struggle with delays, lost funds, and rejected transactions.",
          "At the core of the issue is a simple reason: European companies often prefer not to send money outside the EU or SEPA. Combined with the rise of open banking, IBAN checks, and fraud prevention, a foreign bank account without a local IBAN has become an operational risk for European buyers.",
        ],
      },
      {
        heading: "The hidden friction in cross-border payments",
        paragraphs: [
          "The challenges are bigger than most people think. They include delayed SWIFT transfers, higher fees, missing references, stricter compliance reviews, and forced FX conversion.",
          "Together, these friction points cost hours of operational time and drain margins. For small and mid-sized businesses operating at scale, they translate into real lost revenue every month.",
        ],
      },
      {
        heading: "Why a European IBAN changes the equation",
        paragraphs: [
          "With a European multi-currency IBAN, settlements happen inside the eurozone rails. Funds move in minutes instead of days, fees drop by an order of magnitude, and compliance reviews are far less aggressive because counterparties see a trusted local IBAN.",
          "This is the mechanism that lets non-EU operators establish a foothold in Europe without incorporating locally — a genuine advantage for growth-stage companies.",
        ],
      },
      {
        heading: "What this means in practice",
        paragraphs: [
          "For non-EU operators the path is simple: get a multi-currency IBAN, set it as your default receiving account, and let SEPA settlements cut both cost and friction with European partners.",
        ],
      },
    ],
  },
  {
    slug: "fx-savings-strategy-for-import-export-businesses",
    seoTitle: "FX savings playbook for import-export",
    title: "The FX savings playbook for import-export businesses in 2026",
    excerpt:
      "How to cut foreign-exchange costs on every international payment — practical strategies and tools for 2026.",
    date: "2026-02-20",
    category: "Business",
    cover: "spread",
    body: [
      {
        paragraphs: [
          "Import-export margins are often thinner than the headline numbers suggest. A business can win on sourcing and logistics and still hand a meaningful slice of every deal to its bank in foreign-exchange costs. The good news is that FX is one of the most controllable line items in the whole operation.",
          "This playbook lays out how importers and exporters can stop overpaying on currency conversion — without hiring a treasury team or taking on speculative risk.",
        ],
      },
      {
        heading: "Where the money actually leaks",
        paragraphs: [
          "Most FX costs are invisible because they are baked into the exchange rate rather than charged as a fee. A provider quotes a rate that already includes a markup — the spread between the real mid-market rate and the rate you actually receive. On a large supplier payment, even a two or three percent spread adds up quickly: on a €50,000 invoice, a 3% spread is €1,500 that never appears on a statement as a fee.",
          "Add flat SWIFT charges, intermediary-bank lifting fees, and padding on weekends and holidays, and the true all-in cost of a transfer is often several times the advertised fee.",
        ],
      },
      {
        heading: "Rule 1: Anchor every deal to the mid-market rate",
        paragraphs: [
          "The mid-market rate is the midpoint between the buy and sell price of a currency pair — the rate banks use between themselves. Before you accept any quote, compare it to the live mid-market rate. If the gap is more than a fraction of a percent, you are paying a markup you can negotiate away or route around.",
          "Pricing your own invoices against the mid-market rate, rather than an inflated one, also protects your margin on the receiving side.",
        ],
      },
      {
        heading: "Rule 2: Hold currencies, don't convert on every invoice",
        paragraphs: [
          "If you both pay and receive in the same currency, converting each transaction back to your home currency is pure leakage. A multi-currency account lets you hold EUR, USD, GBP and others, and settle like for like — you only convert the true surplus, and only when the rate suits you.",
          "For many businesses this single change removes the majority of their conversion volume.",
        ],
      },
      {
        heading: "Rule 3: Batch and time your conversions",
        paragraphs: [
          "Dozens of small conversions cost more than a few larger ones, because each carries fixed overhead and a fresh spread. Consolidate conversions where you can, and use rate alerts or limit orders so you convert at a level you have chosen in advance rather than whatever the market happens to be doing on payment day.",
          "None of this requires speculation. The goal is simply to stop giving away margin by default — and to make FX a deliberate decision instead of an afterthought.",
        ],
      },
    ],
  },
  {
    slug: "how-fx-rates-impact-cross-border-payouts",
    seoTitle: "How FX rates cut into cross-border payouts",
    title:
      "How FX rates impact cross-border payouts — and how to save up to 87% on every transfer",
    excerpt:
      "The hidden cost of FX spreads and the simple rule that will save your business thousands.",
    date: "2026-01-16",
    category: "Treasury",
    cover: "rate-line",
    body: [
      {
        paragraphs: [
          "When you send money across borders, two numbers matter: the exchange rate you see quoted in the news, and the rate you actually receive. The gap between them is where most cross-border payout costs hide — and closing that gap is the single biggest lever you have.",
          "Here is how FX rates shape the real cost of a payout, and the simple rule that keeps more of every transfer in your pocket.",
        ],
      },
      {
        heading: "The rate you see versus the rate you get",
        paragraphs: [
          "The rate quoted by search engines and financial media is the mid-market rate. Most payment providers don't give you that rate. Instead they add a margin on top — often between one and four percent — and present the result as a great rate with no fees. The fee is real; it is just embedded in the exchange rate.",
        ],
      },
      {
        heading: "Anatomy of a marked-up transfer",
        paragraphs: [
          "Imagine sending the equivalent of €10,000 to a supplier. At the true mid-market rate you would convert the full amount. With a 3% marked-up rate, roughly €300 of value quietly disappears into the spread. Add a flat SWIFT fee and a possible intermediary-bank charge, and the same transfer can cost noticeably more than it should — every single time you repeat it.",
          "For a business making regular payouts, that recurring leakage compounds into a large number over a year.",
        ],
      },
      {
        heading: "The mid-market rule",
        paragraphs: [
          "The rule is simple: only accept transfers priced at or very close to the mid-market rate, and know the all-in cost before you confirm. When you convert at the interbank rate instead of a padded one, the markup — the largest component of most transfers — collapses toward zero. That is where the dramatic savings on cross-border payouts come from.",
        ],
      },
      {
        heading: "Putting it into practice",
        paragraphs: [
          "Check the live mid-market rate before every payout, favour providers that quote it transparently, and hold balances in the currencies you pay most often so you are not forced to convert at a bad moment. Small habits, applied consistently, turn FX from a silent tax into a managed, predictable cost.",
        ],
      },
    ],
  },
  {
    slug: "the-rise-of-multi-currency-accounts",
    seoTitle: "Multi-currency accounts for freelancers",
    title: "The rise of multi-currency accounts for global freelancers — why you need one",
    excerpt:
      "Freelancers in 100+ countries are switching to multi-currency IBANs. Here's what changed in 2026.",
    date: "2026-04-12",
    category: "Freelance",
    cover: "currencies",
    body: [
      {
        paragraphs: [
          "Freelancing has gone fully global. A designer in Lisbon invoices a client in New York, a developer in Warsaw bills a startup in Berlin, and a copywriter in Cape Town works for agencies across three continents. What hasn't kept up, for many, is the bank account underneath all of it.",
          "A traditional single-currency account quietly taxes every international payment. That is why multi-currency accounts have become the default tool for freelancers who get paid from more than one country.",
        ],
      },
      {
        heading: "Why freelancers outgrow a single-currency account",
        paragraphs: [
          "When a US dollar payment lands in a euro account, it is converted automatically — usually at a marked-up rate, sometimes with a receiving fee on top. Do that across a dozen invoices a month and the cumulative loss rivals a paid subscription you never signed up for.",
          "There is also friction: clients may hesitate to send an international wire, payments arrive slowly, and reconciling which invoice matches which deposit becomes a chore.",
        ],
      },
      {
        heading: "What a multi-currency IBAN actually gives you",
        paragraphs: [
          "A multi-currency account lets you hold and receive several currencies under one login. You keep dollars as dollars and euros as euros, converting only when you choose and at a transparent rate. For freelancers, that means keeping the value you earned instead of donating a slice to conversion on arrival.",
        ],
      },
      {
        heading: "Getting paid like a local",
        paragraphs: [
          "The bigger unlock is local receiving details. With a European IBAN, EU clients can pay you as easily as they would pay a domestic supplier — no international-wire hesitation, no lifting fees, faster settlement. Looking like a local counterparty removes a surprising amount of friction from getting hired and getting paid.",
        ],
      },
      {
        heading: "Choosing an account",
        paragraphs: [
          "Look for genuine local details rather than just a wallet balance, transparent mid-market conversion, and clear limits that fit your invoice sizes. Set your multi-currency IBAN as the default on your invoices, and let each currency sit until converting actually makes sense. It is a small setup change with an outsized effect on take-home income.",
        ],
      },
    ],
  },
  {
    slug: "amazon-fba-payouts-using-eu-iban",
    seoTitle: "Amazon FBA payouts and the EU IBAN",
    title: "Amazon FBA payouts: Why cross-border sellers now need a European IBAN",
    excerpt:
      "Marketplaces tightened payout rules in 2026. A European IBAN is no longer optional for cross-border sellers.",
    date: "2026-03-30",
    category: "E-commerce",
    cover: "payout",
    body: [
      {
        paragraphs: [
          "For cross-border Amazon FBA sellers, getting paid used to be an afterthought: plug in any account and wait for the disbursement. Today it is a strategic decision. Marketplaces have tightened payout and verification rules, and sellers using mismatched or foreign accounts increasingly face delays, holds, or outright rejection.",
          "A European IBAN has quietly moved from nice-to-have to a practical requirement for selling into EU marketplaces.",
        ],
      },
      {
        heading: "How marketplace payouts work",
        paragraphs: [
          "Amazon disburses proceeds in the currency of the store you sell in. Sell on Amazon.de and your payouts are in euros; sell on Amazon.co.uk and they are in pounds. If your bank account cannot receive that currency locally, Amazon either converts it — at its own rate — or routes it through slower international rails.",
        ],
      },
      {
        heading: "Why non-EU accounts get rejected or delayed",
        paragraphs: [
          "Marketplace risk systems compare the seller's details, the store region, and the payout account. A payout account that does not match the selling region raises flags, triggers extra verification, and can freeze funds while checks run. Home-country accounts without local EU details are the most common cause of this friction.",
        ],
      },
      {
        heading: "How a European IBAN fixes it",
        paragraphs: [
          "A European multi-currency IBAN gives you a receiving account that belongs to the same rails your EU payouts travel on. Euro disbursements settle locally, in your name, without forced conversion — faster, cheaper, and far less likely to be held. You can then convert to your home currency on your own terms, at a transparent rate.",
        ],
      },
      {
        heading: "Setting it up",
        paragraphs: [
          "Open a multi-currency IBAN, verify it, and set it as the disbursement account for each European marketplace you sell on. Keep the seller name and account name consistent to sail through verification. It is a one-time setup that removes a recurring source of payout risk — and stops the marketplace's FX desk from taking a cut of every sale.",
        ],
      },
    ],
  },
  {
    slug: "how-to-build-a-modern-treasury-system",
    seoTitle: "Building a modern treasury system",
    title: "How to build a modern treasury system for import-export businesses",
    excerpt:
      "A practical five-step playbook to consolidate accounts, hold currencies, hedge FX, and accelerate growth in 2026.",
    date: "2026-03-30",
    category: "Treasury",
    cover: "ledger",
    body: [
      {
        paragraphs: [
          "Treasury used to be the preserve of large corporates with dedicated teams. For import-export businesses operating across currencies and borders, a lightweight version of the same discipline is now within reach — and it is the difference between margins that hold and margins that quietly erode.",
          "Here is a practical, five-step framework for building a modern treasury system without enterprise overhead.",
        ],
      },
      {
        heading: "Step 1: Consolidate your accounts",
        paragraphs: [
          "Scattered accounts across banks and countries make cash impossible to see clearly. Start by consolidating receiving and paying into as few multi-currency accounts as possible. One place to view balances across currencies turns guesswork into a dashboard, and cuts the number of transfers — and fees — between your own accounts.",
        ],
      },
      {
        heading: "Step 2: Hold Multiple Currencies",
        paragraphs: [
          "If you earn in dollars and pay suppliers in dollars, converting to your home currency and back is a self-inflicted cost. Hold the currencies you regularly transact in and settle like for like. Convert only the genuine surplus, and only when it makes sense — not automatically on every invoice.",
        ],
      },
      {
        heading: "Step 3: Hedge What You Can't Absorb",
        paragraphs: [
          "You don't need to speculate to manage currency risk. Identify the exposures large enough to hurt if the rate moved against you, and cover those with simple tools such as forward rates or limit orders that lock in a level you are comfortable with. Leave small, routine flows unhedged; the cost of managing them outweighs the risk.",
        ],
      },
      {
        heading: "Step 4: Automate Reconciliation",
        paragraphs: [
          "Matching payments to invoices by hand does not scale. Use clear payment references, export transactions to your accounting software, and let categorisation happen automatically. Clean, current books are what make every other treasury decision possible.",
        ],
      },
      {
        heading: "Step 5: Build a cash buffer",
        paragraphs: [
          "Cross-border trade means timing gaps — you pay suppliers before customers pay you. A deliberate cash buffer, sized to your longest payment cycle, keeps those gaps from becoming crises. With consolidated accounts and clean books, sizing that buffer becomes a calculation rather than a guess.",
          "None of these steps require a treasury department. Together they turn currency and cash from sources of stress into a system you control — and a durable edge over competitors still leaving it to chance.",
        ],
      },
    ],
  },
];

/**
 * Every post, newest first.
 *
 * The declared order ran 2025-03-30, 2026-02-20, 2026-01-16, 2026-04-12,
 * 2026-03-30, 2026-03-30 — so the blog index opened with a 16-month-old
 * article and the newest sat fourth, which reads as abandoned and is the wrong
 * internal-linking signal for crawlers (audit F4). Sorting here rather than at
 * each call site means every consumer — the index, the featured slot, the
 * sitemap — agrees on the order.
 *
 * `Array.prototype.sort` is stable, so the two posts sharing 2026-03-30 keep
 * their declared order rather than swapping between builds.
 */
export const posts: BlogPost[] = [...allPosts].sort((a, b) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
);

/** The newest post, promoted to the hero slot on the index. */
export const featuredPost = posts[0];

/**
 * A post's date as displayed to a reader.
 *
 * Mirrors the pattern already used for FX dates in `RateTicker`: parse the
 * date at UTC midnight so it cannot shift a day in a negative-offset timezone,
 * and format for the reader rather than storing a formatted string.
 */
export function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * The bitmap a crawler gets for a post: OpenGraph, Twitter, and
 * `BlogPosting.image`.
 *
 * On-page covers are drawn in markup (`components/art/BlogCover.tsx`), which a
 * social scraper cannot render — so the share card is generated separately at
 * build time by `app/blog/[slug]/opengraph-image.tsx` and addressed here. One
 * function, so the route and the three metadata consumers cannot drift apart.
 */
export function postSocialImage(slug: string): string {
  return `/blog/${slug}/opengraph-image`;
}

/** Estimated reading time in minutes, derived from the post body (~200 wpm). */
export function readingTimeMinutes(post: BlogPost): number {
  const text = post.body
    .flatMap((block) => [block.heading ?? "", ...block.paragraphs])
    .join(" ")
    .trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}
