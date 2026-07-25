import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Level = "display" | "h1" | "h2" | "h3" | "h4" | "eyebrow";

const levels: Record<Level, { cls: string }> = {
  display: { cls: "text-display font-bold text-balance" },
  h1: { cls: "text-display-sm font-bold text-balance" },
  h2: {
    cls: "text-3xl md:text-4xl lg:text-[44px] lg:leading-[1.1] font-bold text-balance",
  },
  h3: { cls: "text-xl md:text-2xl font-semibold" },
  h4: { cls: "text-lg md:text-xl font-semibold" },
  eyebrow: {
    cls: "text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong",
  },
};

type HeadingProps = {
  level?: Level;
  className?: string;
  children?: ReactNode;
};

export function Heading({ level = "h2", className, children }: HeadingProps) {
  const cls = cn(levels[level].cls, className);
  switch (level) {
    case "display":
    case "h1":
      return <h1 className={cls}>{children}</h1>;
    case "h2":
      return <h2 className={cls}>{children}</h2>;
    case "h3":
      return <h3 className={cls}>{children}</h3>;
    case "h4":
      return <h4 className={cls}>{children}</h4>;
    case "eyebrow":
      return <span className={cls}>{children}</span>;
    default: {
      const _exhaustive: never = level;
      return null;
    }
  }
}
