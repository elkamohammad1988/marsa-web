import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { BlogCard } from "@/components/sections/BlogCard";
import { CTACard } from "@/components/sections/CTACard";
import { JsonLd } from "@/components/JsonLd";
import { posts, readingTimeMinutes } from "@/lib/blog";
import { buildMetadata } from "@/lib/seo";
import { blogPostingSchema, breadcrumbSchema } from "@/lib/schema";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.cover,
    type: "article",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const body = post.body;
  const readTime = `${readingTimeMinutes(post)} min read`;

  return (
    <>
      <JsonLd
        data={[
          blogPostingSchema(post),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <section className="bg-surface-cream pb-10 pt-10 md:pt-14">
        <Container>
          <div className="text-xs font-medium text-ink-muted">
            <Link href="/blog" className="hover:text-brand-strong">
              ← Back To Articles
            </Link>
          </div>
          <Heading level="h1" className="mt-6 max-w-4xl">
            {post.title}
          </Heading>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
            <span>{post.date}</span>
            <span aria-hidden>•</span>
            <span>{post.category}</span>
            <span aria-hidden>•</span>
            <span>{readTime}</span>
          </div>
        </Container>
      </section>

      <section className="bg-canvas py-10 md:py-12">
        <Container>
          <div className="relative aspect-[16/8] w-full overflow-hidden rounded-card-lg">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Container>
      </section>

      <section className="bg-canvas pb-12 pt-4 md:pb-16 md:pt-6">
        <Container>
          <article className="mx-auto max-w-3xl">
            {body.map((block, i) => (
              <div key={i} className="mt-8 first:mt-0">
                {block.heading && (
                  <h2 className="mt-10 text-2xl font-semibold text-ink md:text-3xl">
                    {block.heading}
                  </h2>
                )}
                {block.paragraphs.map((p, j) => (
                  <p key={j} className="mt-4 text-base leading-relaxed text-ink md:text-[17px]">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </article>
        </Container>
      </section>

      <section className="bg-canvas pb-12 md:pb-16">
        <Container>
          <Heading level="h2">Recommended Blogs</Heading>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Button href="/blog" variant="outline" size="md">
              See All Articles
            </Button>
          </div>
        </Container>
      </section>

      <CTACard
        eyebrow="For Individuals"
        title="Your Money, Accessible Everywhere You Go"
        description="Up To 2% FX Fees, Free SEPA Transfers, And Support In 180+ Countries."
        primaryCta={{ label: "Open A Personal Account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        imageSrc="/images/coin-blue.png"
        imageAlt="Marsa coin"
      />
    </>
  );
}
