import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { BlogCover } from "@/components/art/BlogCover";
import { formatPostDate, type BlogPost } from "@/lib/blog";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    /*
      The hover is the border and the title, not a zoom.

      The cover carried `hover:scale-105` — a 5% push-in over 300ms, and one of
      the two shapes the brief names as animated card lifting. Two things were
      wrong with it beyond the taste question. It was on the *image* rather than
      on the card, so it fired only when the pointer was over the art and not
      when it was over the title beside it, which is the opposite of what a card
      hover is for. And it zoomed a drawing: `BlogCover` is vector markup sized
      by a container query, so scaling it enlarges type that was set to fit.

      `group` moves the state to the card, where the whole surface answers at
      once — a hairline stepping up to `line-dark` and the title taking the
      accent. Both are colour changes, so nothing moves and nothing reflows.
    */
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-card transition-colors duration-150 hover:border-line-dark">
      <Link
        href={`/blog/${post.slug}`}
        className="relative block aspect-[16/10] overflow-hidden"
      >
        <BlogCover motif={post.cover} category={post.category} />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="text-xs text-ink-muted">{formatPostDate(post.date)}</div>
        <h3 className="mt-2 line-clamp-3 text-base font-semibold text-ink">
          <Link
            href={`/blog/${post.slug}`}
            className="transition-colors group-hover:text-brand-strong"
          >
            {post.title}
          </Link>
        </h3>
        <div className="mt-auto pt-4">
          <Button href={`/blog/${post.slug}`} variant="outline" size="sm">
            Read More
          </Button>
        </div>
      </div>
    </article>
  );
}
