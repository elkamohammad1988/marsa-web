import { Container } from "@/components/ui/Container";

/**
 * The shell around sign-in, registration and the two recovery pages.
 *
 * A route group — `(auth)` contributes nothing to the URL — so these five
 * pages share a layout without sharing a path segment. `/login` is a better
 * address than `/auth/login` for a page people are sent to by name.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-12 md:py-20">
      <Container>{children}</Container>
    </div>
  );
}
