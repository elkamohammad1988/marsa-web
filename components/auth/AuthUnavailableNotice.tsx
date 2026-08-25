import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/site";

/**
 * The heading and the explanation for an environment with no authentication.
 *
 * They live here, next to the block that renders under them, because five
 * pages need to say the same thing and the one arrangement that must never
 * happen is the page title promising a flow the body then withdraws. Before
 * this, `/register` was headed "Create an account", described the account it
 * would create, and then rendered a panel saying accounts were not open — three
 * claims, two of them false, inside one viewport.
 */
export const authOffTitle = "Accounts aren't open in this build";

export const authOffDescription =
  "Marsa is a concept build. Sign-up, email confirmation, sign-in, password reset and " +
  "per-row database permissions are all written and tested in this repository. They are not " +
  "switched on here, so there is no account to create and none to sign in to.";

/**
 * Shown in place of a form when the environment has no authentication.
 *
 * The site is meant to run with an empty environment, so this is a normal
 * state rather than a fault. What it must not read as is an unfinished side
 * project: it began as four lines naming `SUPABASE_URL`, `SUPABASE_ANON_KEY`
 * and `AUTH_SESSION_SECRET` in a box in the middle of an empty screen, which
 * is what anyone clicking "Log In" in the navbar saw. Setup instructions now
 * live where instructions live, in `AUTHENTICATION.md`, and what stays on the
 * page is a real action that actually works — the demo needs no configuration,
 * so nobody who arrives here leaves with nothing to do.
 */
export function AuthUnavailableNotice() {
  return (
    <div>
      {/*
        A rule and a paragraph, not a second card.

        This was a bordered, tinted panel holding a 44px lock in a tinted
        circle over centred copy — and it renders *inside* the auth shell's own
        card, on five pages. A card inside a card is the layout saying "these
        are two separate objects" about one thought, and the padlock was
        decoration: the heading two lines above already says accounts are not
        open, so the icon repeated it in a form nobody can read faster.

        The alignment was the other tell. The panel centred its text while
        everything around it is left-aligned, which is what makes a block look
        pasted in rather than written in.
      */}
      <div className="border-t border-line pt-5">
        <p className="text-sm leading-relaxed text-ink-muted">
          The demo is the part of Marsa that needs no account and no configuration. It walks the
          whole product in about a minute.
        </p>
        <Button href="/demo" size="md" className="mt-4">
          Try the interactive demo
        </Button>
      </div>

      {/*
        The underline is permanent, not `hover:underline`, and that is a WCAG
        1.4.1 fix rather than taste. A link inside a sentence may be
        distinguished by colour alone only if it clears 3:1 against the text
        around it; gold on this muted grey measures 1.20:1. Links that stand
        alone on their own line are deliberately untouched.
      */}
      <p className="mt-6 text-xs leading-relaxed text-ink-subtle">
        Building something similar?{" "}
        <a
          href={`${siteConfig.repoUrl}/blob/main/AUTHENTICATION.md`}
          className="text-brand-strong underline decoration-brand-strong/40 underline-offset-2 hover:decoration-brand-strong"
        >
          How the authentication is built
        </a>{" "}
        covers sessions, email confirmation, password reset, and the Postgres row-level
        security that decides who reads which row.
      </p>
    </div>
  );
}
