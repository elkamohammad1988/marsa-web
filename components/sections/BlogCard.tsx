import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatPostDate, type BlogPost } from "@/lib/blog";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="card-hover flex flex-col overflow-hidden rounded-card border border-line bg-card">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10]">
        <Image
          src={post.cover}
          alt={post.title}
          fill
          sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 100vw"
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="text-xs text-ink-muted">{formatPostDate(post.date)}</div>
        <h3 className="mt-2 line-clamp-3 text-base font-semibold text-ink">
          <Link href={`/blog/${post.slug}`} className="hover:text-brand-strong">
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
