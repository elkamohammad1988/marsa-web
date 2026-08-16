import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Which tag is emitted. Semantics only — it says nothing about size. */
type Level = "display" | "h1" | "h2" | "h3" | "h4" | "eyebrow";

/**
 * Which step of the type ladder is drawn. Every `Level` plus `panel`, which
 * has no tag of its own because it is a size a heading of *any* level can take.
 */
type Size = Level | "panel";

const sizes: Record<Size, string> = {
  display: "text-display font-bold text-balance",
  h1: "text-display-sm font-bold text-balance",
  h2: "text-3xl md:text-4xl lg:text-[44px] lg:leading-[1.1] font-bold text-balance",
  /**
   * The title of a panel or an application page — the auth card, the account
   * page, the operator dashboard.
   *
   * It exists because three call sites had already invented it independently
   * and none of them worked. Each passed a font size through `className`
   * (`text-2xl md:text-3xl`, `text-2xl md:text-[28px]`) expecting it to replace
   * the one `level` had chosen. `cn` concatenates, it does not merge, so both
   * font sizes reached the element and the winner was decided by the order
   * Tailwind happened to emit them in — which put `text-display-sm` after
   * `text-2xl` and *before* the `md:` variants. The result on `/login` was a
   * heading that rendered at 33.6px on a phone and 28px on a desktop: it got
   * smaller as the screen got larger, and no gate could see it, because every
   * class in the attribute was real and the markup was valid.
   *
   * Naming the step is what removes that. A caller asks for a size instead of
   * fighting one, and `tests/heading-scale.test.ts` fails the build if a font
   * size is passed through `className` again.
   */
  panel: "text-2xl md:text-3xl font-semibold text-balance",
  h3: "text-xl md:text-2xl font-semibold",
  h4: "text-lg md:text-xl font-semibold",
  eyebrow: "text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong",
};

type HeadingProps = {
  /** The tag to emit. Choose it for document structure, never for size. */
  level?: Level;
  /** The type step to draw. Defaults to the one matching `level`. */
  size?: Size;
  className?: string;
  children?: ReactNode;
};

export function Heading({ level = "h2", size, className, children }: HeadingProps) {
  const cls = cn(sizes[size ?? level], className);
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
