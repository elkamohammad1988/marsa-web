import { cn } from "@/lib/utils";

/**
 * Sign out.
 *
 * A real form posting to a real endpoint, not a button with an `onClick`. It
 * therefore works before hydration, with JavaScript disabled, and if the
 * bundle fails to load — and signing out is the one control where "it did
 * nothing and I do not know why" is least acceptable, because the person is
 * usually trying to leave a shared machine.
 *
 * Being a form is also what makes the `SameSite=Lax` cookie a CSRF defence
 * here: the endpoint rejects a cross-site POST outright (`lib/same-origin.ts`),
 * so no other page can end somebody's session for them.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className={cn(
          "inline-flex h-9 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink",
          "transition-colors hover:bg-ink/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          className,
        )}
      >
        Sign out
      </button>
    </form>
  );
}
