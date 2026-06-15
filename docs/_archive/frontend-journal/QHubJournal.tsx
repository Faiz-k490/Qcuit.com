import React, { useEffect, useMemo, useState } from 'react';

interface AuthorInfo {
  title?: string;
  name: string;
  affiliation?: string;
  bio?: string;
}

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  abstract: string;
  content?: string;
  featured_image?: string;
  category: string;
  topics: string[];
  reading_time: number;
  published_at?: string;
  author: AuthorInfo;
}

const fallbackPosts: BlogPost[] = [
  {
    id: 3,
    title: 'Understanding Noise-Aware Circuits',
    slug: 'understanding-noise-aware-circuits',
    abstract:
      'A brief introduction to handling decoherence in everyday quantum programming.',
    content: `# Introduction to Noise\n\nWhen building quantum circuits, noise is an unavoidable reality. It alters the state of our qubits in unpredictable ways over time.\n\n## Simulating Noise\n\nUsing Qiskit's Aer simulator, we can inject depolarizing or thermal relaxation noise to see how our ideal circuits perform under real-world conditions.\n\n> Always test your circuits with at least a small noise model before assuming they will run perfectly on real hardware.`,
    category: 'Tutorial',
    topics: ['noise', 'circuits', 'fundamentals'],
    reading_time: 1,
    published_at: '2026-03-17T00:00:00Z',
    author: {
      name: 'Faizan',
      affiliation: 'Qcuit',
    },
  },
];

function formatDate(value?: string): string {
  if (!value) return 'In Press';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'In Press';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function markdownToHtml(md: string): string {
  let html = md
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  const paragraphs = html
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (/^<h[1-3]>/.test(block) || /^<blockquote>/.test(block) || /^<pre>/.test(block)) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br />')}</p>`;
    });

  return paragraphs.join('\n');
}

function ArticleCard({ post, onOpen }: { post: BlogPost; onOpen: (slug: string) => void }) {
  return (
    <article className="bg-isabelline border border-vegas-gold/20 rounded-sm overflow-hidden transition-colors duration-300 hover:border-brass-light flex flex-col">
      {post.featured_image && (
        <div className="w-full h-48 bg-deep-jungle/5 relative border-b border-vegas-gold/10">
          <img 
            src={post.featured_image} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-10 flex flex-col flex-1">
        <div className="flex items-center justify-end pb-4 mb-6 border-b border-vegas-gold/10">
          <span className="text-xs text-deep-jungle/50">{post.reading_time} min read</span>
        </div>

        <h2 className="font-display text-3xl text-deep-jungle leading-tight mb-5">
          <button className="text-left hover:text-brass-light transition-colors" onClick={() => onOpen(post.slug)}>
            {post.title}
          </button>
        </h2>

        <section className="mb-7 border-l-2 border-vegas-gold/30 pl-5">
          <p className="font-display italic text-deep-jungle/75 leading-relaxed">{post.abstract}</p>
        </section>

        <div className="mt-auto flex items-start justify-between gap-6">
          <div>
            <p className="font-display text-deep-jungle">
              By {post.author.title ? `${post.author.title} ` : ''}{post.author.name}
            </p>
            <p className="text-sm text-deep-jungle/55">{post.author.affiliation || 'Independent Researcher'}</p>
          </div>
          <div className="text-right text-xs text-deep-jungle/50">
            <p>{formatDate(post.published_at)}</p>
          </div>
        </div>

        {post.topics.length > 0 ? (
          <p className="mt-5 text-xs text-deep-jungle/50">
            <span className="font-display tracking-[0.18em] uppercase text-vegas-gold/70 mr-2">Topics</span>
            {post.topics.join(', ')}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function BlogFeed({ posts, onOpen }: { posts: BlogPost[]; onOpen: (slug: string) => void }) {
  return (
    <section className="space-y-8">
      {posts.map((post) => (
        <ArticleCard key={post.id} post={post} onOpen={onOpen} />
      ))}
    </section>
  );
}

function ArticleView({ post, onBack }: { post: BlogPost; onBack: () => void }) {
  const html = useMemo(() => markdownToHtml(post.content || ''), [post.content]);

  return (
    <article className="bg-isabelline border border-vegas-gold/20 rounded-sm overflow-hidden">
      {post.featured_image && (
        <div className="w-full h-[400px] bg-deep-jungle/5 relative border-b border-vegas-gold/10">
          <img 
            src={post.featured_image} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      )}
      <header className="p-12 border-b border-vegas-gold/10">
        <button onClick={onBack} className="text-xs text-deep-jungle/50 hover:text-vegas-gold mb-8 tracking-[0.1em] uppercase">
          Back to Notes
        </button>

        <h1 className="font-display text-5xl text-deep-jungle leading-tight mb-6">{post.title}</h1>

        <div className="mb-8">
          <p className="font-display text-xl text-deep-jungle">
            By {post.author.title ? `${post.author.title} ` : ''}{post.author.name}
          </p>
          <p className="text-deep-jungle/55">{post.author.affiliation || 'Independent Researcher'}</p>
        </div>

        <section className="border-l-4 border-vegas-gold/30 pl-6 py-2 bg-forest-light/5">
          <h2 className="text-xs font-display tracking-[0.2em] uppercase text-vegas-gold/70 mb-3">Abstract</h2>
          <p className="font-display italic text-deep-jungle/75 leading-relaxed">{post.abstract}</p>
        </section>
      </header>

      <div className="p-12">
        <div
          className="prose-academic text-deep-jungle max-w-none [&_h1]:font-display [&_h1]:text-3xl [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-7 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:leading-relaxed [&_p]:mb-5 [&_blockquote]:border-l-4 [&_blockquote]:border-vegas-gold/30 [&_blockquote]:pl-5 [&_blockquote]:italic [&_code]:font-mono [&_code]:bg-forest-light/20 [&_code]:px-1 [&_code]:py-0.5 [&_pre]:bg-deep-jungle [&_pre]:text-isabelline [&_pre]:p-4 [&_pre]:overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <footer className="px-12 pb-10">
        <div className="border-t border-vegas-gold/10 pt-6 text-xs text-deep-jungle/50">
          <span className="font-display tracking-[0.18em] uppercase text-vegas-gold/70 mr-2">Topics</span>
          {post.topics.join(', ')}
        </div>
      </footer>
    </article>
  );
}

function CallForPapers() {
  return (
    <section className="mt-14 bg-isabelline border border-vegas-gold/20 rounded-sm p-12">
      <h2 className="font-display text-3xl text-deep-jungle mb-4 text-center">Call for Research Notes</h2>
      <p className="text-center text-deep-jungle/70 leading-relaxed max-w-2xl mx-auto mb-10">
        Qcuit Research Notes welcomes concise articles on quantum ML, HEP workflows, reproducible
        benchmarks, and practical systems work. Submissions are editorially reviewed for clarity,
        rigor, and practical relevance.
      </p>

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <h3 className="font-display text-xl text-deep-jungle mb-3">Submission Guidelines</h3>
          <ol className="text-deep-jungle/70 space-y-2 list-decimal list-inside leading-relaxed">
            <li>Submit article in Markdown format.</li>
            <li>Include a structured abstract (150-250 words).</li>
            <li>Provide author affiliation and short professional biography.</li>
            <li>Include references where applicable.</li>
          </ol>
        </div>

        <div>
          <h3 className="font-display text-xl text-deep-jungle mb-3">Editorial Contact</h3>
          <p className="text-deep-jungle/70 leading-relaxed mb-4">
            Email submissions and cover letter to the editorial office.
          </p>
          <a href="mailto:submissions@qcuit.com" className="font-display text-vegas-gold hover:text-brass-light border-b border-vegas-gold/30 hover:border-brass-light/40 transition-colors">
            submissions@qcuit.com
          </a>
          <p className="text-xs text-deep-jungle/50 mt-3">Typical response window: 2-3 weeks.</p>
        </div>
      </div>
    </section>
  );
}

export function QHub() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const slugFromPath = path.startsWith('/hub/') ? path.replace('/hub/', '') : null;

    async function loadFeed() {
      try {
        const res = await fetch('/api/posts');
        const data = await res.json();
        const apiPosts = (data.posts || []) as BlogPost[];
        setPosts(apiPosts.length > 0 ? apiPosts : fallbackPosts);
      } catch {
        setPosts(fallbackPosts);
      } finally {
        setLoading(false);
      }
    }

    async function loadSingle(slug: string) {
      try {
        const res = await fetch(`/api/posts/${slug}`);
        if (!res.ok) {
          setActiveSlug(null);
          return;
        }
        const data = await res.json();
        const post = data.post as BlogPost;
        setPosts([post, ...fallbackPosts.filter((p) => p.slug !== post.slug)]);
        setActiveSlug(slug);
      } catch {
        const fallback = fallbackPosts.find((p) => p.slug === slug);
        setActiveSlug(fallback ? slug : null);
      } finally {
        setLoading(false);
      }
    }

    if (slugFromPath) {
      loadSingle(slugFromPath);
    } else {
      loadFeed();
    }
  }, []);

  const activePost = activeSlug ? posts.find((p) => p.slug === activeSlug) || null : null;

  const openPost = (slug: string) => {
    window.history.pushState({}, '', `/hub/${slug}`);
    setActiveSlug(slug);
  };

  const backToFeed = () => {
    window.history.pushState({}, '', '/hub');
    setActiveSlug(null);
  };

  return (
    <div className="min-h-screen bg-deep-jungle text-deep-jungle px-6 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Main Navigation back to landing */}
        <a href="/" className="inline-flex items-center gap-2 text-xs text-vegas-gold/70 hover:text-vegas-gold mb-10 tracking-[0.1em] uppercase transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Qcuit
        </a>

        <header className="mb-12 border-b border-vegas-gold/20 pb-8">
          <p className="text-[11px] font-display tracking-[0.28em] uppercase text-vegas-gold/70 mb-3">Qcuit Research Notes</p>
          <h1 className="font-display text-5xl text-isabelline leading-tight">Library Notes</h1>
          <p className="mt-4 text-isabelline/70 max-w-3xl leading-relaxed">
            Supporting notes for the Qcuit open-source library: quantum ML, HEP workflows, reproducibility, and practical systems research.
          </p>
        </header>

        {loading ? (
          <div className="bg-isabelline border border-vegas-gold/20 rounded-sm p-10 text-deep-jungle/70">Loading notes archive...</div>
        ) : activePost ? (
          <ArticleView post={activePost} onBack={backToFeed} />
        ) : (
          <>
            <BlogFeed posts={posts} onOpen={openPost} />
            <CallForPapers />
          </>
        )}
      </div>
    </div>
  );
}

export default QHub;
