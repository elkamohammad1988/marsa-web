import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Route-level loading state for the account area.
 *
 * Both pages under `/account` read from Postgres over HTTP before they can
 * render anything, so without this a navigation sits on the previous page with
 * no feedback for the length of a round trip. Mirrors the real layout closely
 * enough that the page does not jump when the data arrives.
 *
 * The `role="status"` line is the part that matters for a screen reader: the
 * skeletons are `aria-hidden`, so without it the wait is announced as nothing
 * at all.
 */
export default function AccountLoading() {
  return (
    <div className="py-10 md:py-14">
      <Container>
        <span className="sr-only" role="status">
          Loading your account…
        </span>

        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>

        <div className="pt-8">
          <Skeleton className="h-8 w-48" />

          <div className="mt-6 rounded-card-lg border border-line bg-card p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
