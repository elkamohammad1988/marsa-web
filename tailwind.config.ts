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
        // The gold scale itself, for the few places that need a specific step
        // rather than a role — chiefly the specular highlights in the water
        // reflection. Prefer the `brand-*` roles everywhere else.
        gold: {
          DEFAULT: withAlpha("--gold"),
          light: withAlpha("--gold-light"),
          soft: withAlpha("--gold-soft"),
          deep: withAlpha("--gold-deep"),
          dark: withAlpha("--gold-dark"),
          highlight: withAlpha("--gold-highlight"),
        },
        accent: {
          DEFAULT: withAlpha("--accent"),
          soft: withAlpha("--accent-soft"),
        },
        // The cool second light source — see `--halo` in globals.css. Blurred
        // decoration only: it is never a text colour and never a fill behind
        // text, so it carries no contrast obligation.
        halo: withAlpha("--halo"),
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
        // Back-compat aliases (older components) → mapped onto the new system.
        card: "0 1px 2px rgba(0,0,0,0.40), 0 6px 16px -12px rgba(0,0,0,0.55)",
        nav: "0 6px 20px -12px rgba(0,0,0,0.6)",
        elevated: "0 6px 12px rgba(0,0,0,0.5), 0 24px 52px -24px rgba(0,0,0,0.68)",
        /**
         * Gold blooms, cut again — 0.40 → 0.18, 0.36 → 0.16.
         *
         * The previous pass dimmed these from "lamp" to "soft halo" and that
         * was the right direction stopped one step early. A halo behind a tile
         * is still a light effect, and this palette now spends its gold on two
         * things only: the action you should take, and the number you should
         * read. What is left here is barely a bloom — just enough that a gold
         * element on the deepest surface is not a cut-out — and most call
         * sites are better off asking for `e1` instead.
         */
        glow: "0 12px 32px -22px rgb(var(--brand) / 0.18)",
        "glow-sm": "0 6px 18px -14px rgb(var(--brand) / 0.16)",
        "glow-lg": "0 18px 48px -28px rgb(var(--brand) / 0.16)",
      },
      backgroundImage: {
        // Decorative gradient (tiles, glows, illustration fills). Lit face at
        // the top-left, shaded face at the bottom-right — a gold surface under
        // a single light, rather than three arbitrary stops of the same hue.
        "brand-gradient":
          "linear-gradient(135deg, rgb(var(--gold-light)) 0%, rgb(var(--gold)) 52%, rgb(var(--gold-deep)) 100%)",
        // Interactive CTA — vertical metallic gold. Pair only with text-on-brand.
        "cta-gradient":
          "linear-gradient(180deg, rgb(var(--cta-from)) 0%, rgb(var(--cta-to)) 100%)",
        "radial-glow":
          "radial-gradient(60% 60% at 50% 0%, rgb(var(--brand) / 0.14) 0%, transparent 72%)",
        /**
         * The wash behind hero/headers: deep water first, a gold cast second.
         *
         * This was a single magenta-black (#3A0F2B), i.e. the accent darkened.
         * Under gold that recipe gives an olive-brown fog. The two layers here
         * are the palette's actual thesis — a cool medium with a warm light
         * *inside* it — and they are ordered so the gold is the smaller, higher
         * layer: light entering water, not water tinted gold.
         */
        "atmosphere":
          "radial-gradient(60% 55% at 50% 0%, rgba(9,38,45,0.92) 0%, rgba(9,38,45,0.38) 34%, transparent 68%), radial-gradient(34% 30% at 50% -2%, rgb(var(--brand) / 0.10) 0%, transparent 62%)",
        // Layered light sources for hero / section backdrops. Gold leads, the
        // water halo sits behind and lower, and the floor is deep water.
        "mesh-deep":
          "radial-gradient(58% 68% at 14% 4%, rgb(var(--brand) / 0.11) 0%, transparent 58%), radial-gradient(46% 58% at 86% 16%, rgb(var(--halo) / 0.26) 0%, transparent 60%), radial-gradient(72% 82% at 50% 112%, rgba(9,38,45,0.55) 0%, transparent 64%)",
      },
      ringOffsetColor: {
        canvas: "rgb(var(--canvas))",
      },
      maxWidth: {
        container: "1200px",
      },
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
        /* Dash offset animation for the money-route arcs. */
        "dash-flow": {
          "0%": { strokeDashoffset: "220" },
          "100%": { strokeDashoffset: "0" },
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
        "dash-flow": "dash-flow 3.2s linear infinite",
        "step-in": "step-in 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
        "row-in": "row-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
