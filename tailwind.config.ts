import type { Config } from "tailwindcss";

/**
 * Colours are driven by CSS custom properties (see styles/globals.css), stored
 * as space-separated RGB channels (`--ink: 246 234 241`) so Tailwind's
 * `<alpha-value>` opacity modifiers (`bg-ink/5`, `ring-brand-blue/30`,
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
          // Legacy `blue*` names kept for zero-churn; values are Rose Quartz.
          // `blue`/`blue-deep`/`blue-soft` are PALE — use as fills/tints only.
          // `strong` is the accessible, theme-flipping rose for text/links/rings.
          blue: withAlpha("--brand"),
          "blue-deep": withAlpha("--brand-deep"),
          "blue-soft": withAlpha("--brand-soft"),
          strong: withAlpha("--brand-strong"),
        },
        accent: {
          DEFAULT: withAlpha("--accent"),
          soft: withAlpha("--accent-soft"),
        },
        // Text/icon colour guaranteed readable on the rose button fill.
        "on-brand": withAlpha("--on-brand"),
        warning: withAlpha("--warning"),
        danger: withAlpha("--danger"),
        surface: {
          navy: withAlpha("--surface-navy"),
          "navy-2": withAlpha("--surface-navy-2"),
          cream: withAlpha("--surface-cream"),
          "cream-2": withAlpha("--surface-cream-2"),
          "blue-tint": withAlpha("--surface-tint"),
          "blue-tint-2": withAlpha("--surface-tint-2"),
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
         * magenta ambient (rgba(204,31,134,~0.12)). Used consistently:
         * e1 = resting card, e2 = raised/hover, e3 = floating/modal.
         */
        e1: "0 1px 2px rgba(0,0,0,0.45), 0 10px 26px -14px rgba(0,0,0,0.6), 0 10px 34px -18px rgba(204,31,134,0.12)",
        e2: "0 2px 6px rgba(0,0,0,0.5), 0 20px 44px -18px rgba(0,0,0,0.65), 0 16px 44px -18px rgba(204,31,134,0.20)",
        e3: "0 10px 16px rgba(0,0,0,0.55), 0 34px 74px -26px rgba(0,0,0,0.72), 0 26px 66px -22px rgba(204,31,134,0.24)",
        // The metallic CTA stack: inner top highlight + inner rim + magenta glow.
        cta: "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 0 0 1px rgba(255,255,255,0.06), 0 8px 22px -8px rgba(206,42,140,0.5)",
        "cta-hover": "inset 0 1px 0 rgba(255,255,255,0.34), inset 0 0 0 1px rgba(255,255,255,0.08), 0 12px 30px -8px rgba(238,79,165,0.66)",
        // Back-compat aliases (older components) → mapped onto the new system.
        card: "0 1px 2px rgba(0,0,0,0.45), 0 10px 26px -14px rgba(0,0,0,0.6), 0 10px 34px -18px rgba(204,31,134,0.12)",
        nav: "0 8px 30px -12px rgba(0,0,0,0.6), 0 10px 34px -18px rgba(204,31,134,0.14)",
        elevated: "0 10px 16px rgba(0,0,0,0.55), 0 34px 74px -26px rgba(0,0,0,0.72), 0 26px 66px -22px rgba(204,31,134,0.24)",
        glow: "0 20px 60px -28px rgb(var(--brand) / 0.6)",
        "glow-sm": "0 10px 30px -16px rgb(var(--brand) / 0.55)",
        "glow-lg": "0 30px 90px -30px rgb(var(--brand) / 0.55)",
      },
      backgroundImage: {
        // Decorative gradient (tiles, glows, illustration fills).
        "brand-gradient":
          "linear-gradient(135deg, rgb(var(--brand-soft)) 0%, rgb(var(--brand)) 55%, rgb(var(--brand-deep)) 100%)",
        // Interactive CTA — vertical metallic magenta. Pair only with text-on-brand.
        "cta-gradient":
          "linear-gradient(180deg, rgb(var(--cta-from)) 0%, rgb(var(--cta-to)) 100%)",
        "radial-glow":
          "radial-gradient(60% 60% at 50% 0%, rgb(var(--brand) / 0.20) 0%, transparent 72%)",
        // Atmospheric magenta glow (#3A0F2B → transparent) behind hero/headers.
        "atmosphere":
          "radial-gradient(60% 55% at 50% 0%, rgba(58,15,43,0.9) 0%, rgba(58,15,43,0.35) 32%, transparent 68%)",
        // Layered light sources for hero / section backdrops.
        "mesh-deep":
          "radial-gradient(58% 68% at 14% 4%, rgb(var(--brand) / 0.38) 0%, transparent 58%), radial-gradient(46% 58% at 86% 16%, rgb(var(--brand-strong) / 0.16) 0%, transparent 60%), radial-gradient(72% 82% at 50% 112%, rgba(58,15,43,0.55) 0%, transparent 64%)",
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
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(238,79,165,0.0)", opacity: "0.92" },
          "50%": { boxShadow: "0 0 12px 1px rgba(238,79,165,0.55)", opacity: "1" },
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
      },
    },
  },
  plugins: [],
};

export default config;
