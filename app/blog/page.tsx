import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { ButtonLabel } from "@/components/ui/Button";
import { BlogCard } from "@/components/sections/BlogCard";
import { BlogCover } from "@/components/art/BlogCover";
import { Pagination } from "@/components/sections/Pagination";
import { posts, featuredPost, formatPostDate } from "@/lib/blog";
import { clampPage, pageCount, paginate } from "@/lib/pagination";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description:
    "Clear insights on global finance, payments, and business growth, by the Marsa team.",
  path: "/blog",
});

const PAGE_SIZE = 4;

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const rest = posts.filter((p) => p.slug !== featuredPost.slug);
  const totalPages = pageCount(rest.length, PAGE_SIZE);
  const page = clampPage(pageParam, totalPages);
  const pagePosts = paginate(rest, page, PAGE_SIZE);

  return (
    <>
      <section className="bg-surface-alt pb-12 pt-10 md:pb-16 md:pt-14">
        <Container>
          <Heading level="display" className="max-w-4xl">
            Blog
          </Heading>
          <p className="mt-4 max-w-3xl text-base text-ink-muted md:text-lg">
            Notes on cross-border payments: how the rails actually work, what the fees are for,
            and where the money goes while you wait for it.
          </p>

          {page === 1 && (
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group mt-10 block overflow-hidden rounded-card-lg"
            >
              {/*
                Was a flat `aspect-[16/8]` — 568px tall at container width, and
                the generated cover art is a sparse motif, so the card read as
                a very large rectangle of near-black with eight small currency
                chips adrift in the middle of it. Shortening it toward a
                letterbox concentrates the same art and puts the headline back
                in proportion to the space it sits in.
              */}
              <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[16/7] lg:aspect-[21/8]">
                <BlogCover
                  motif={featuredPost.cover}
                  category={featuredPost.category}
                  className="transition-transform duration-500 group-hover:scale-105"
                />
                {/* Scrim: the title sits on the art, so it needs its own
                    contrast floor rather than borrowing the art's. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-10">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-3xl">
                      <div className="text-xs">{formatPostDate(featuredPost.date)}</div>
                      <h2 className="mt-2 text-balance text-2xl font-semibold md:text-3xl lg:text-4xl">
                        {featuredPost.title}
                      </h2>
                    </div>
                    {/*
                      A label, not a link. The whole card is already an anchor
                      to this same post, and nesting a second one is invalid
                      HTML that cost this page its hydration.

                      `outline-light` rather than the solid white fill it
                      carried. White was the only one on the site, and it read
                      as a sticker applied to the cover rather than as this
                      page's own control — the same note `PricingPlanCard`
                      already records about its badge. It also outranked the
                      gold primary in the navbar directly above it, which is
                      backwards: reading an article is the secondary action on
                      a page whose primary ask is opening an account.
                    */}
                    <ButtonLabel variant="outline-light" size="md">
                      Read article
                    </ButtonLabel>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </Container>
      </section>

      <section className="bg-canvas py-12 md:py-16">
        <Container>
          {page > 1 && (
            <p className="mb-8 text-sm text-ink-muted">
              Page {page} of {totalPages}
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pagePosts.map((p) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-12">
              <Pagination currentPage={page} totalPages={totalPages} basePath="/blog" />
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
