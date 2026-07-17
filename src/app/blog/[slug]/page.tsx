"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { getPost, POSTS } from "@/lib/blog";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const post = params?.slug ? getPost(params.slug) : undefined;

  if (!post) {
    return (
      <MarketingLayout>
        <div className="max-w-[760px] mx-auto px-6 py-24">
          <p className="font-mono text-[10px] tracking-[0.18em] text-t4 mb-4">404 · ARTICLE NOT FOUND</p>
          <h1 className="font-mono font-bold text-[28px] text-t1 mb-4">This article doesn't exist.</h1>
          <Link href="/blog" className="font-mono text-[12px] text-t1 underline">← Back to all posts</Link>
        </div>
      </MarketingLayout>
    );
  }

  const related = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <MarketingLayout>
      <article className="max-w-[760px] mx-auto px-6 py-20" style={{ background: K.void }}>
        <Link href="/blog" className="font-mono text-[10px] tracking-[0.18em] text-t4 hover:text-t1 transition-colors">← ALL POSTS</Link>
        <div className="mt-6 mb-2 h-0.5 w-16" style={{ background: `linear-gradient(90deg,${post.color},transparent)` }} />
        <p className="font-mono text-[10px] tracking-[0.14em] mt-5" style={{ color: post.color }}>{post.tag.toUpperCase()}</p>
        <h1 className="font-mono font-bold text-[clamp(26px,5vw,40px)] leading-[1.1] tracking-[-0.03em] text-t1 mt-3 mb-4">{post.title}</h1>
        <div className="flex gap-4 mb-10">
          <span className="font-mono text-[11px] text-t4">{post.date}</span>
          <span className="font-mono text-[11px] text-t4">{post.readTime} read</span>
        </div>
        <div className="space-y-6">
          {post.body.map((para, i) => (
            <p key={i} className="font-sans text-[16px] leading-[1.8] text-t3">{para}</p>
          ))}
        </div>
        <div className="mt-14 pt-8 border-t border-g800">
          <p className="font-mono text-[10px] tracking-[0.18em] text-t4 mb-5">RELATED READS</p>
          <div className="grid grid-cols-2 gap-4">
            {related.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="p-5 bg-g900 border border-g800 rounded-sm transition-all relative overflow-hidden"
                onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {(e.currentTarget.style.background = K.g850);(e.currentTarget.style.transform = "translateY(-2px)");}} onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {(e.currentTarget.style.background = K.g900);(e.currentTarget.style.transform = "none");}}>
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg,transparent,${r.color},transparent)` }} />
                <p className="font-mono text-[10px] mb-2" style={{ color: r.color }}>{r.tag.toUpperCase()}</p>
                <h3 className="font-mono font-bold text-[15px] tracking-[-0.01em] text-t1 mb-2">{r.title}</h3>
                <span className="font-mono text-[10px] text-t1">Read →</span>
              </Link>
            ))}
          </div>
        </div>
      </article>
    </MarketingLayout>
  );
}
