import React, { useEffect, useState } from 'react';

// Shared interface with QHubJournal
interface BlogPost {
  id: number;
  title: string;
  slug: string;
  abstract: string;
  category: string;
  topics: string[];
  reading_time: number;
  published_at?: string;
  author: {
    title?: string;
    name: string;
    affiliation?: string;
  };
}

// ─── Dynamic Volume/Issue Helper ──────────────────────────────────────────
// Resolves the database mismatch by deriving Volume/Issue purely from timestamps.
// 2026 = Volume I, 2027 = Volume II, etc.
// Month = Issue (Jan = I, Feb = II, etc.)
function getRomanNumeral(num: number): string {
  const roman: Record<string, number> = {
    M: 1000, CM: 900, D: 500, CD: 400,
    C: 100, XC: 90, L: 50, XL: 40,
    X: 10, IX: 9, V: 5, IV: 4, I: 1
  };
  let result = '';
  for (let key in roman) {
    while (num >= roman[key]) {
      result += key;
      num -= roman[key];
    }
  }
  return result || 'I';
}

function getVolumeAndIssue(dateString?: string) {
  if (!dateString) return { volume: 'I', issue: 'I' };
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return { volume: 'I', issue: 'I' };

  const startYear = 2026;
  const volNum = Math.max(1, d.getFullYear() - startYear + 1);
  const issueNum = d.getMonth() + 1; // 1-12

  return {
    volume: getRomanNumeral(volNum),
    issue: getRomanNumeral(issueNum)
  };
}

function formatDate(value?: string): string {
  if (!value) return 'In Press';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'In Press';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Skeleton Loader (Zero Layout Shift) ──────────────────────────────────
// Pulses with vegas-gold/10 to vegas-gold/20 gradient.
function SkeletonCard() {
  return (
    <div className="bg-isabelline border border-vegas-gold/30 rounded-sm p-10 h-full flex flex-col animate-pulse">
      <div className="flex justify-between items-center pb-4 mb-6 border-b border-vegas-gold/10">
        <div className="h-3 w-32 bg-vegas-gold/15 rounded" />
        <div className="h-3 w-16 bg-vegas-gold/10 rounded" />
      </div>
      <div className="h-8 w-3/4 bg-vegas-gold/20 rounded mb-4" />
      <div className="h-8 w-1/2 bg-vegas-gold/20 rounded mb-8" />
      <div className="border-l-2 border-vegas-gold/30 pl-5 mb-7 space-y-2">
        <div className="h-4 w-full bg-vegas-gold/10 rounded" />
        <div className="h-4 w-5/6 bg-vegas-gold/10 rounded" />
        <div className="h-4 w-4/6 bg-vegas-gold/10 rounded" />
      </div>
      <div className="mt-auto pt-6 flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-vegas-gold/20 rounded" />
          <div className="h-3 w-48 bg-vegas-gold/15 rounded" />
        </div>
        <div className="h-3 w-24 bg-vegas-gold/10 rounded" />
      </div>
    </div>
  );
}

// ─── Rendered Preview Card ────────────────────────────────────────────────
// The stark, crisp isabelline placard resting on the dark landing background.
function PreviewCard({ post }: { post: BlogPost }) {
  const { volume, issue } = getVolumeAndIssue(post.published_at);

  return (
    <article className="bg-isabelline border border-vegas-gold/30 rounded-sm p-10 flex flex-col h-full transition-all duration-300 hover:border-brass-light hover:shadow-lg hover:shadow-vegas-gold/5">
      <div className="flex justify-between items-center pb-4 mb-6 border-b border-deep-jungle/10">
        <span className="text-[11px] font-display tracking-[0.22em] uppercase text-deep-jungle/50">
          Vol. {volume}, Issue {issue}
        </span>
        <span className="text-xs text-deep-jungle/50">{post.reading_time} min read</span>
      </div>

      <h3 className="font-display text-2xl text-deep-jungle leading-tight mb-5 hover:text-vegas-gold transition-colors">
        <a href={`/hub/${post.slug}`}>{post.title}</a>
      </h3>

      <div className="mb-7 border-l-2 border-vegas-gold/30 pl-5">
        <p className="font-display italic text-deep-jungle/75 leading-relaxed text-sm line-clamp-3">
          {post.abstract}
        </p>
      </div>

      <div className="mt-auto pt-6 flex justify-between items-end">
        <div>
          <p className="font-display text-deep-jungle text-sm">
            By {post.author.title ? `${post.author.title} ` : ''}{post.author.name}
          </p>
          {post.author.affiliation && (
            <p className="text-xs text-deep-jungle/55 mt-0.5">{post.author.affiliation}</p>
          )}
        </div>
        <time className="text-xs text-deep-jungle/50">{formatDate(post.published_at)}</time>
      </div>
    </article>
  );
}

// ─── Main Section Component ───────────────────────────────────────────────
export function JournalPreviewSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPreviews() {
      try {
        const res = await fetch('/api/posts?per_page=3');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPosts(data.posts || []);
      } catch (err) {
        // Silent fallback in MVP, just don't show cards if backend fails.
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPreviews();
  }, []);

  return (
    <section className="py-24 px-8 bg-deep-jungle border-t border-vegas-gold/10">
      <div className="max-w-6xl mx-auto">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="font-body text-xs tracking-[0.3em] uppercase text-vegas-gold/60 block mb-4">
              Latest Research
            </span>
            <h2 className="font-display text-4xl text-isabelline">
              From The Journal
            </h2>
          </div>
          <a
            href="/hub"
            className="
              inline-flex items-center gap-2 px-6 py-2.5
              text-xs font-body tracking-[0.15em] uppercase
              border border-vegas-gold/50 text-vegas-gold
              hover:bg-vegas-gold hover:text-deep-jungle
              transition-all duration-300
            "
          >
            <span>View Full Archive</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : posts.length > 0 ? (
            posts.map(post => <PreviewCard key={post.id} post={post} />)
          ) : (
            <div className="col-span-3 text-center py-12 border border-vegas-gold/10 rounded-sm bg-vegas-gold/5">
              <p className="font-display italic text-isabelline/50">
                The inaugural issue is currently being typeset.
              </p>
            </div>
          )}
        </div>
        
      </div>
    </section>
  );
}
