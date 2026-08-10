"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A headline figure that counts up to itself the first time it is seen.
 *
 * **The final value is what renders.** The server emits the finished string,
 * the component mounts holding it, and the count only ever replaces it *after*
 * a browser has confirmed it can animate — so with JavaScript off, with a
 * bundle that never arrives, or under `prefers-reduced-motion`, the reader
 * simply gets the number. A statistic is content; it must never be something
 * an effect had to run for.
 *
 * The string is split rather than parsed away: `"€0"`, `"~5 min"`, `"30+"` and
 * `"180+"` all keep their prefix and suffix, and only the digits in the middle
 * move. Grouping and decimal places are copied from the source text, so
 * `"12,480.55"` counts through `"7,213.44"` and not `"7213.44"` — a separator
 * that appears only at the end of the animation is a visible width jump.
 */

const NUMERIC = /^(\D*?)([\d][\d,\s]*(?:\.\d+)?)(.*)$/s;

type Parsed = {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  grouped: boolean;
};

function parse(value: string): Parsed | null {
  const match = NUMERIC.exec(value);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const plain = digits.replace(/[,\s]/g, "");
  const target = Number(plain);
  if (!Number.isFinite(target)) return null;
  return {
    prefix,
    suffix,
    target,
    decimals: plain.includes(".") ? plain.split(".")[1].length : 0,
    grouped: /[,\s]/.test(digits),
  };
}

/** Fast out of the gate, long settle — the shape that reads as "arriving". */
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function CountUp({
  value,
  durationMs = 1400,
  className,
}: {
  value: string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    const parsed = parse(value);

    // Nothing to count, no observer to ask, or a reader who has asked for less
    // motion: the value is already correct on screen, so there is nothing to do.
    if (!node || !parsed || parsed.target === 0) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const format = new Intl.NumberFormat("en-GB", {
      minimumFractionDigits: parsed.decimals,
      maximumFractionDigits: parsed.decimals,
      useGrouping: parsed.grouped,
    });

    let frame = 0;
    let start = 0;
    let cancelled = false;

    const step = (now: number) => {
      if (cancelled) return;
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / durationMs);
      const current = parsed.target * easeOutExpo(progress);
      setDisplay(`${parsed.prefix}${format.format(current)}${parsed.suffix}`);
      if (progress < 1) frame = requestAnimationFrame(step);
      // The last frame is written from the source string, not from the
      // formatter, so the figure a reader is left looking at is byte-for-byte
      // the one that was authored — no rounding drift, no lost trailing zero.
      else setDisplay(value);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          setDisplay(`${parsed.prefix}${format.format(0)}${parsed.suffix}`);
          frame = requestAnimationFrame(step);
        }
      },
      { rootMargin: "0px", threshold: 0 },
    );
    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {/* The animated text is decoration over a value assistive technology
          already has; announcing every intermediate frame would be noise. */}
      <span aria-hidden>{display}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
