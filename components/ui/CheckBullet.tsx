import { cn } from "@/lib/utils";

type CheckBulletProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "green" | "blue" | "white";
};

export function CheckBullet({ children, className, tone = "green" }: CheckBulletProps) {
  const dot =
    tone === "blue"
      ? "bg-brand-blue text-on-brand"
      : tone === "white"
        ? "bg-white text-brand-strong"
        : "bg-success/15 text-success";
  return (
    <li className={cn("flex items-start gap-3 text-sm", className)}>
      <span
        className={cn(
          "mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full",
          dot,
        )}
        aria-hidden
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6.2L4.6 8.8L10 3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}
