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
      borderRadius: {
        card: "20px",
        "card-lg": "28px",
        hero: "36px",
      },
      boxShadow: {
        /**
         * Elevation system — 3 levels, each a soft black drop plus a faint
         * gold ambient (rgba(212,175,55,~0.12)). Used consistently:
         * e1 = resting card, e2 = raised/hover, e3 = floating/modal.
         *
         * The ambient tint is what stops a card on a cool surface from reading
         * as cut out of it: a warm bleed under a cool panel is the shadow a gold
         * light in the room would actually cast. It stays at the same alphas the
         * magenta ambient used, because the job was never the hue.
         */
        e1: "0 1px 2px rgba(0,0,0,0.45), 0 10px 26px -14px rgba(0,0,0,0.6), 0 10px 34px -18px rgba(212,175,55,0.12)",
        e2: "0 2px 6px rgba(0,0,0,0.5), 0 20px 44px -18px rgba(0,0,0,0.65), 0 16px 44px -18px rgba(212,175,55,0.18)",
        e3: "0 10px 16px rgba(0,0,0,0.55), 0 34px 74px -26px rgba(0,0,0,0.72), 0 26px 66px -22px rgba(212,175,55,0.22)",
        /**
         * The metallic CTA stack: inner top highlight + inner rim + a drop.
         *
         * The coloured half of that drop used to be `rgba(206,42,140,0.5)` at
         * rest and `rgba(238,79,165,0.66)` on hover — a magenta bloom bright
         * enough to be read as a light the button was emitting. That is the
         * visual grammar of game UI and crypto dashboards. Stripe, Mercury and
         * Revolut Business all seat a primary button on a neutral drop shadow
         * with no coloured bloom at all, because on a product that holds
         * money, "expensive" is conveyed by restraint.
         *
         * The fix is not to delete the glow — the metallic read depends on it —
         * but to demote it from a light source to an ambient tint, and to give
         * the button an actual neutral shadow to sit on, which it never had.
         * Rest drops 0.50 → 0.22; hover 0.66 → 0.30, still a clear brightening
         * on interaction. The restraint matters *more* under gold, not less:
         * a glowing gold button is the one thing on this list that would read
         * as a casino rather than a bank.
         *
         * The inner top highlight is warmed from white to `--gold-highlight`.
         * On a magenta fill a white inset read as a hard edge light; on gold it
         * read as a chip in the plating. Warm, it reads as the metal catching
         * the light — which is the whole point of the layer.
         */
        cta: "inset 0 1px 0 rgba(255,241,168,0.45), inset 0 0 0 1px rgba(255,241,168,0.10), 0 2px 6px -2px rgba(0,0,0,0.5), 0 8px 22px -10px rgba(212,175,55,0.22)",
        "cta-hover": "inset 0 1px 0 rgba(255,241,168,0.60), inset 0 0 0 1px rgba(255,241,168,0.14), 0 4px 10px -3px rgba(0,0,0,0.55), 0 12px 28px -10px rgba(245,215,110,0.30)",
        // Back-compat aliases (older components) → mapped onto the new system.
        card: "0 1px 2px rgba(0,0,0,0.45), 0 10px 26px -14px rgba(0,0,0,0.6), 0 10px 34px -18px rgba(212,175,55,0.12)",
        nav: "0 8px 30px -12px rgba(0,0,0,0.6), 0 10px 34px -18px rgba(212,175,55,0.14)",
        elevated: "0 10px 16px rgba(0,0,0,0.55), 0 34px 74px -26px rgba(0,0,0,0.72), 0 26px 66px -22px rgba(212,175,55,0.22)",
        /**
         * Gold blooms, dimmer than the magenta ones they replace (0.60 → 0.40,
         * 0.55 → 0.36). Gold sits ~0.45 luminance against surfaces at ~0.006;
         * at the old alphas the same declaration that read as a soft magenta
         * halo reads as a lamp, and a lamp behind a logo tile is the single
         * fastest way to make a payments product look like a slot machine.
         */
        glow: "0 20px 60px -28px rgb(var(--brand) / 0.40)",
        "glow-sm": "0 10px 30px -16px rgb(var(--brand) / 0.36)",
        "glow-lg": "0 30px 90px -30px rgb(var(--brand) / 0.36)",
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
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Slow, non-repeating-looking drift for the hero light sources.
        "aurora-a": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(6%, -8%, 0) scale(1.12)" },
          "66%": { transform: "translate3d(-5%, 6%, 0) scale(0.94)" },
        },
        "aurora-b": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1.05)" },
          "40%": { transform: "translate3d(-8%, 5%, 0) scale(0.92)" },
          "70%": { transform: "translate3d(7%, 9%, 0) scale(1.14)" },
        },
        /* Dash offset animation for the money-route arcs. */
        "dash-flow": {
          "0%": { strokeDashoffset: "220" },
          "100%": { strokeDashoffset: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Gentle glow breathing for the active progress-rail segment.
        "rail-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212,175,55,0.0)", opacity: "0.92" },
          "50%": { boxShadow: "0 0 12px 1px rgba(232,201,90,0.45)", opacity: "1" },
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
        /**
         * A decorative satellite travelling around the hero panel. Applied to a
         * wrapper centred on the panel, with the dot pushed out along one axis,
         * so a plain rotation reads as an orbit.
         */
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        /** Counter-rotation, so an orbiting label stays upright. */
        "orbit-reverse": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
        /** Slower, larger drift than `float` — for elements far behind glass. */
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -18px, 0)" },
        },
        /**
         * The scroll cue: a dot falling down a short track, on a loop.
         *
         * Keyed `0%, 100%` rather than `0%`→`100%` because it is an infinite
         * decorative cycle that must return to where it started — the same
         * shape as `glow-pulse` and `float`. The one-way `fill-mode: both`
         * animations are the ones that must end visible; this never fills, and
         * the track it runs in is drawn unconditionally.
         */
        "scroll-hint": {
          "0%, 100%": { opacity: "0", transform: "translateY(-4px)" },
          "30%": { opacity: "1", transform: "translateY(0)" },
          "70%": { opacity: "0", transform: "translateY(10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.5s ease both",
        "scale-in": "scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        float: "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3.5s ease-in-out infinite",
        "rail-pulse": "rail-pulse 2.4s ease-in-out infinite",
        marquee: "marquee 38s linear infinite",
        "aurora-a": "aurora-a 22s ease-in-out infinite",
        "aurora-b": "aurora-b 28s ease-in-out infinite",
        "dash-flow": "dash-flow 3.2s linear infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "step-in": "step-in 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
        "row-in": "row-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) both",
        orbit: "orbit 26s linear infinite",
        "orbit-reverse": "orbit-reverse 26s linear infinite",
        drift: "drift 11s ease-in-out infinite",
        "scroll-hint": "scroll-hint 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
