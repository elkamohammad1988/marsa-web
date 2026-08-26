import type { Config } from "tailwindcss";

/**
 * Colours are driven by CSS custom properties (see styles/globals.css), stored
 * as space-separated RGB channels (`--ink: 246 234 241`) so Tailwind's
 * `<alpha-value>` opacity modifiers (`bg-ink/5`, `ring-brand/30`,
 * `from-ink/70`) keep working.
 *
 * The site has exactly one palette. It is *not* a light theme with a dark
 * override — there is no second set of values anywhere, and nothing adds a
 * `.dark` class to <html>.
 */
const withAlpha = (varName: string) => `rgb(var(${varName}) / <alpha-value>)`;

const config: Config = {
  /**
   * Kept as "class", deliberately, even though nothing sets the class.
   *
   * It is what makes a stray `dark:` variant inert rather than live: under the
   * default "media" strategy such a variant would activate for every visitor
   * whose OS prefers dark — i.e. most of them — silently applying a value
   * nobody designed against, on a palette that is already dark.
   * `tests/contrast.test.ts` forbids `dark:` outright; this is the belt to that
   * brace.
   */
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        // Base page + elevated surfaces. `canvas` is the body background,
        // `card` is an elevated panel that sits on top of it. Both flip in dark.
        canvas: withAlpha("--canvas"),
        card: withAlpha("--card"),
        brand: {
          // Named for the job, not the hue. These were `blue`, `blue-deep` and
          // `blue-soft` — kept "for zero-churn" through the rebrand, so the
          // whole codebase asked for `bg-brand-blue` and got magenta. A token
          // whose name contradicts its value is worse than a churny rename:
          // it makes every colour decision in the codebase unreadable. Which is
          // also why the gold palette did not rename these: the roles did not
          // change, only the hue filling them.
          //
          // DEFAULT is the fill (CTAs, progress rail, logo tile, large key
          // numbers) and carries `on-brand` — a near-black — at 9.0:1. `deep`
          // is the shaded face: gradient undersides, pressed states, a gold
          // hairline that must sit down rather than glow. `strong` is the
          // accessible bright gold for text, links and focus rings.
          DEFAULT: withAlpha("--brand"),
          deep: withAlpha("--brand-deep"),
          soft: withAlpha("--brand-soft"),
          strong: withAlpha("--brand-strong"),
        },
        /*
         * One step of the raw gold scale, not six.
         *
         * `gold-highlight`, `gold-soft`, `gold-deep`, `gold-dark` and the
         * `gold` DEFAULT were the specular ends of the scale, and every caller
         * they had was a light effect: the coin's rim, the nav indicator's lit
         * centre, the skeleton sweep, the gradient icon tile, the metallic
         * button. All of those are gone, and a colour nothing can ask for is
         * not a palette, it is a note.
         *
         * `gold-light` survives because it is a *state*: the primary button's
         * hover is one step brighter up the scale (13.41:1 against the same
         * near-black label), and that is a real interaction rather than a
         * decoration. Prefer the `brand-*` roles everywhere else.
         */
        gold: {
          light: withAlpha("--gold-light"),
        },
        accent: {
          DEFAULT: withAlpha("--accent"),
        },
        /*
         * `halo` — the cool second light source — is gone.
         *
         * It existed only to sit behind the warm gold in a blurred backdrop, and
         * every backdrop that used it has been removed: the hero mesh, the art
         * panel mesh, the blog-cover mesh, the share-card radials and the one
         * gradient icon tile. A decorative-only colour with nothing decorative
         * left to colour is a token that reads as configurable and is not.
         */
        // Text/icon colour guaranteed readable on the rose button fill.
        "on-brand": withAlpha("--on-brand"),
        warning: withAlpha("--warning"),
        danger: withAlpha("--danger"),
        // Surfaces by elevation and role, not by the colour they used to be.
        // `deep` was `navy` and `alt` was `cream` — both near-black now, on a
        // site with no navy and no cream anywhere in it.
        surface: {
          deep: withAlpha("--surface-deep"), // deepest band: hero, spotlight
          "deep-2": withAlpha("--surface-deep-2"),
          alt: withAlpha("--surface-alt"), // the alternating section surface
          "alt-2": withAlpha("--surface-alt-2"),
          tint: withAlpha("--surface-tint"), // inputs, inner panels
          "tint-2": withAlpha("--surface-tint-2"),
        },
        ink: {
          DEFAULT: withAlpha("--ink"),
          muted: withAlpha("--ink-muted"),
          subtle: withAlpha("--ink-subtle"),
        },
        line: {
          DEFAULT: withAlpha("--line"),
          dark: withAlpha("--line-dark"),
        },
        success: withAlpha("--success"),
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["clamp(2.75rem, 5.5vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.035em" }],
        "display-sm": ["clamp(2.1rem, 4vw, 3.25rem)", { lineHeight: "1.08", letterSpacing: "-0.03em" }],
      },
      /**
       * Radii — tightened, because the old scale was doing the talking.
       *
       * 20 / 28 / 36px on every panel, beside `rounded-full` on every button,
       * is the single most recognisable silhouette of a generated landing
       * page: it reads as "soft SaaS" before a word has been read, and it
       * flattens the difference between a data panel, a marketing card and a
       * button into one shape. A 28px radius on a 400px-wide card also eats
       * its corners, so tables and figures inside it never align to the edge.
       *
       * 10 / 14 / 18px keeps the surfaces friendly without rounding them into
       * pills, and lets a corner read as a corner. Money products earn trust
       * with crisp edges — the numbers are the soft part of nothing.
       *
       * ## The whole rule, in four lines
       *
       * These three keys are only the *panel* track. The full system, which
       * this pass unified and which every new element should follow:
       *
       *   • **Panels** — cards, sheets, tables, alerts, drawn tiles:
       *     `rounded-card` (10px), or `rounded-card-lg` (14px) for the large
       *     ones. `rounded-hero` (18px) is the outermost frame.
       *   • **Controls** — button, input, select, textarea, tab, a segment of a
       *     segmented control, a link styled as a control: `rounded-lg` (8px).
       *     A group *wrapping* controls takes `rounded-xl` (12px), which is not
       *     a fourth opinion but arithmetic: 8px of inner corner plus 4px of
       *     padding is a 12px outer corner, and any other value leaves the two
       *     radii non-concentric.
       *   • **Labels** — badges, status chips, inline metadata: `rounded-md`
       *     (6px). A label is not a control and must not borrow its shape.
       *   • **`rounded-full`** — only where the element genuinely *is* a circle
       *     or a capsule track: status dots, avatars, circular icon holders,
       *     progress rails and their fills, the spinner.
       *
       * What this replaced was not a scale, it was a habit. The same
       * Personal/Business switch rendered as a pill on `/pricing` and as a
       * 12px group on `/get-started`; `rounded-xl` sat on alerts, inner panels,
       * a text input and a dropdown item alike; `rounded-[10px]` was
       * `rounded-card` spelled out longhand in three files; and thirty-odd
       * pills were tabs, buttons and badges wearing the one shape reserved for
       * things that are actually round.
       */
      borderRadius: {
        card: "10px",
        "card-lg": "14px",
        hero: "18px",
      },
      boxShadow: {
        /**
         * Elevation system — 3 levels of plain black drop.
         * e1 = resting panel, e2 = raised/hover, e3 = floating/modal.
         *
         * Each level used to carry a warm ambient (rgba(212,175,55,~0.12-0.22))
         * on the argument that a gold light in the room would cast it. It is a
         * good argument and it was the wrong call at this scale: applied to
         * every panel on the site, a coloured shadow stops being a light
         * direction and becomes a tint under everything, and a page where each
         * surface glows faintly gold has no way left to say *this* one matters.
         * The blooms are also the tell people read fastest as generated.
         *
         * Depth is now carried by the surface ladder — which is calibrated for
         * exactly this, each rung ≥1.03 apart — and the shadow only seats an
         * element on it. Shorter and tighter too: the old spreads (26-74px)
         * were doing atmosphere, not elevation.
         */
        e1: "0 1px 2px rgba(0,0,0,0.40), 0 6px 16px -12px rgba(0,0,0,0.55)",
        e2: "0 2px 4px rgba(0,0,0,0.45), 0 12px 28px -16px rgba(0,0,0,0.6)",
        e3: "0 6px 12px rgba(0,0,0,0.5), 0 24px 52px -24px rgba(0,0,0,0.68)",
        /**
         * The CTA's seat. One hairline drop, and nothing else.
         *
         * This was a four-layer metallic stack: an inset top highlight, an
         * inset rim, a black drop and a gold bloom — the plating that made a
         * flat fill read as a lit metal face. The reasoning was sound and the
         * result was good, and it is still the wrong button for this product.
         *
         * A metallic gradient with a highlight rim and a reflection crossing it
         * is *decoration on the one element that least needs any*: the primary
         * action is already the only gold fill on the page, at the end of the
         * only sentence asking for it. Everything the plating added, the colour
         * had already said. What it cost is that the button stopped looking
         * made and started looking rendered — and a buyer reads a rendered
         * button as a template before they read it as craft.
         *
         * So the fill is flat `--brand`, the label is `--on-brand` at 9.0:1,
         * hover brightens one step up the gold scale, and this shadow does the
         * one job left: sit the button on the page rather than in it.
         */
        cta: "0 1px 2px rgba(0,0,0,0.35)",
        "cta-hover": "0 2px 6px -1px rgba(0,0,0,0.4)",
        /*
         * `card` and `elevated` are gone. They were byte-for-byte copies of
         * `e1` and `e3`, kept as back-compat aliases through the elevation
         * rework — so the codebase had two names for one shadow and no way to
         * tell from a call site which system it was written against. Every
         * caller now names the level.
         *
         * `nav` stays: it is its own value, not an alias, and the navbar is the
         * one element that needs a drop wide enough to separate it from a page
         * scrolling underneath it without reading as a raised panel.
         */
        nav: "0 6px 20px -12px rgba(0,0,0,0.6)",
        /*
         * `glow` is gone. It was a gold bloom under a gold element, dimmed
         * twice across two passes (0.40 → 0.18) on the argument that a gold
         * tile on the deepest surface would otherwise read as a cut-out. Its
         * last caller was the coin, which is also gone. A shadow the colour of
         * the thing casting it is a light effect, and this palette now spends
         * its gold on two things only: the action to take, and the number to
         * read.
         */
      },
      /*
       * `backgroundImage` is gone, and with it the last four decorative fills:
       *
       *   • `brand-gradient` and `cta-gradient` — the 135° and 180° metallic
       *     golds. The button gave up its plating two passes ago; the mark, the
       *     favicon, the home-screen icon and the drawn in-app button gave up
       *     theirs in this one, so nothing asks for a gold gradient any more.
       *   • `radial-glow` — a gold radial over the top third of the drawn phone
       *     screen.
       *   • `mesh-deep` — the two-light backdrop behind the illustrations and
       *     the blog covers. The hero dropped it first; the art panels kept it
       *     until this pass, where they became flat deep panels.
       *
       * `tests/dead-code.test.ts` reads these keys as valid `bg-*` roots, so a
       * class naming one of them now fails the same gate that catches a typo.
       */
      ringOffsetColor: {
        canvas: "rgb(var(--canvas))",
      },
      maxWidth: {
        container: "1200px",
      },
      /*
       * `dash-flow` is gone with the corridor arcs it animated — twelve dashed
       * paths crawling between six cards, on an infinite loop, in a colour left
       * over from the previous palette. `marquee` is the only infinite
       * animation left, and it is a ticker, where continuous motion is the
       * content rather than an effect.
       */
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        /**
         * Demo step change. Short and small on purpose: the panel is what the
         * reader is already looking at, so this is a settle, not an entrance.
         * `fade-up`'s 700ms and 18px would make every click feel like a page
         * load.
         */
        "step-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        /** A new activity row arriving at the top of the list, from above. */
        "row-in": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.5s ease both",
        "scale-in": "scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        marquee: "marquee 38s linear infinite",
        "step-in": "step-in 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
        "row-in": "row-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
