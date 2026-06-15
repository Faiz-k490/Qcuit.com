/**
 * NotebookPanel — Phase 3 Reproducibility Index UI
 *
 * Three sub-views:
 *   Recent     — hashes saved in this browser session (localStorage)
 *   Gallery    — curated benchmarks from /api/notebook/gallery
 *   Inspector  — paste a hash → full artifact + copyable BibTeX + permalink
 *
 * Heritage palette: deep-jungle / isabelline / vegas-gold. No new deps.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────
interface GalleryItem {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  shots: number;
  seed: number;
  run_hash: string;
  url: string;
  circuit: Record<string, any>;
  noise_config: Record<string, any>;
}

interface NotebookArtifact {
  run_hash: string;
  schema_version: string;
  created_at: string;
  circuit: Record<string, any>;
  noise_config: Record<string, any>;
  shots: number;
  seed: number;
  results: {
    probabilities: Record<string, number>;
    statevector_real: number[];
    statevector_imag: number[];
    counts: Record<string, number>;
  };
  metadata: Record<string, any>;
}

interface RecentEntry {
  run_hash: string;
  url: string;
  savedAt: string;
  label?: string;
}

const RECENT_KEY = 'qcuit:notebook:recent';
const RECENT_MAX = 25;

// ─── Recent-runs persistence ─────────────────────────────────────────
function readRecent(): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function writeRecent(entries: RecentEntry[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(entries.slice(0, RECENT_MAX)));
  } catch {
    /* ignore quota */
  }
}

export function pushRecentNotebook(entry: RecentEntry) {
  const existing = readRecent().filter((e) => e.run_hash !== entry.run_hash);
  const next = [entry, ...existing].slice(0, RECENT_MAX);
  writeRecent(next);
  window.dispatchEvent(new CustomEvent('qcuit:notebook:recent-changed'));
}

// ─── Tabs ────────────────────────────────────────────────────────────
type View = 'recent' | 'gallery' | 'inspector';

const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: 'recent', label: 'Recent', hint: 'Saved in this session' },
  { id: 'gallery', label: 'Gallery', hint: '10 curated benchmarks' },
  { id: 'inspector', label: 'Inspector', hint: 'Paste a hash to view' },
];

// ─── Small UI bits ───────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      },
      () => setCopied(false),
    );
  };
  return (
    <button
      onClick={onCopy}
      className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-vegas-gold/25 text-vegas-gold/80 hover:bg-vegas-gold/10 hover:border-vegas-gold/50 transition-all"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

function HashChip({ hash }: { hash: string }) {
  return (
    <span className="font-mono text-[10px] text-vegas-gold/80 bg-deep-jungle/60 border border-vegas-gold/20 rounded px-1.5 py-0.5">
      {hash.slice(0, 12)}…
    </span>
  );
}

// ─── Recent view ─────────────────────────────────────────────────────
function RecentView({ onInspect }: { onInspect: (hash: string) => void }) {
  const [entries, setEntries] = useState<RecentEntry[]>(() => readRecent());

  useEffect(() => {
    const refresh = () => setEntries(readRecent());
    window.addEventListener('qcuit:notebook:recent-changed', refresh);
    return () => window.removeEventListener('qcuit:notebook:recent-changed', refresh);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-display text-lg text-isabelline/60 italic">No saved runs yet.</p>
        <p className="font-body text-xs text-isabelline/40 mt-2 leading-relaxed">
          Build a circuit in the <span className="text-vegas-gold">Visualizer</span> and click{' '}
          <span className="text-vegas-gold">Save as Notebook</span> to record a citable, hashed
          run.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {entries.map((e) => (
        <li
          key={e.run_hash}
          className="flex items-center gap-3 px-3 py-2 rounded-sm border border-vegas-gold/15 bg-forest-light/20 hover:border-vegas-gold/35 transition-colors"
        >
          <HashChip hash={e.run_hash} />
          <span className="font-body text-xs text-isabelline/70 flex-1 truncate">
            {e.label || 'Notebook'}
          </span>
          <span className="font-mono text-[10px] text-isabelline/35">
            {new Date(e.savedAt).toLocaleString()}
          </span>
          <button
            onClick={() => onInspect(e.run_hash)}
            className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-vegas-gold/25 text-vegas-gold/80 hover:bg-vegas-gold/10 hover:border-vegas-gold/50 transition-all"
          >
            Inspect
          </button>
          <a
            href={`/n/${e.run_hash}`}
            className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-vegas-gold/25 text-vegas-gold/80 hover:bg-vegas-gold/10 hover:border-vegas-gold/50 transition-all"
          >
            Open
          </a>
        </li>
      ))}
    </ul>
  );
}

// ─── Gallery view ────────────────────────────────────────────────────
function GalleryView({ onInspect }: { onInspect: (hash: string) => void }) {
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/notebook/gallery')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(String(err)));
  }, []);

  if (error) {
    return (
      <p className="font-body text-xs text-red-300/80 px-2">
        Failed to load gallery: {error}
      </p>
    );
  }
  if (!items) {
    return <p className="font-mono text-xs text-isabelline/40 px-2">Loading…</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {items.map((item) => (
        <div
          key={item.slug}
          className="px-3 py-2.5 rounded-sm border border-vegas-gold/15 bg-forest-light/20 hover:border-vegas-gold/35 transition-colors"
        >
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="font-display text-sm text-isabelline">{item.title}</h3>
            <HashChip hash={item.run_hash} />
          </div>
          <p className="font-body text-[11px] text-isabelline/55 leading-relaxed mb-2">
            {item.summary}
          </p>
          <div className="flex items-center gap-1 mb-2">
            {item.tags.map((t) => (
              <span
                key={t}
                className="font-mono text-[9px] uppercase tracking-wider text-vegas-gold/60 px-1 py-0.5 rounded bg-deep-jungle/40"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onInspect(item.run_hash)}
              className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-vegas-gold/25 text-vegas-gold/80 hover:bg-vegas-gold/10 hover:border-vegas-gold/50 transition-all"
            >
              Inspect
            </button>
            <CopyButton text={item.run_hash} label="Hash" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Inspector view ──────────────────────────────────────────────────
function InspectorView({
  initialHash,
  onClearInitial,
}: {
  initialHash: string | null;
  onClearInitial: () => void;
}) {
  const [hashInput, setHashInput] = useState('');
  const [artifact, setArtifact] = useState<NotebookArtifact | null>(null);
  const [bibtex, setBibtex] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHash = useCallback(async (hash: string) => {
    setLoading(true);
    setError(null);
    setArtifact(null);
    setBibtex('');
    try {
      const res = await fetch(`/api/notebook/${hash}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Notebook not found on this server.');
        throw new Error(`HTTP ${res.status}`);
      }
      const data: NotebookArtifact = await res.json();
      setArtifact(data);

      const bibRes = await fetch(`/api/notebook/${hash}/bibtex`);
      if (bibRes.ok) setBibtex(await bibRes.text());
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialHash) {
      setHashInput(initialHash);
      fetchHash(initialHash);
      onClearInitial();
    }
  }, [initialHash, fetchHash, onClearInitial]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = hashInput.trim();
    if (trimmed) fetchHash(trimmed);
  };

  const sortedProbs = useMemo(() => {
    if (!artifact) return [];
    return Object.entries(artifact.results.probabilities || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [artifact]);

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={hashInput}
          onChange={(e) => setHashInput(e.target.value)}
          placeholder="Paste a SHA-256 run hash…"
          className="flex-1 px-3 py-1.5 rounded-sm border border-vegas-gold/25 bg-deep-jungle/60 font-mono text-xs text-isabelline placeholder:text-isabelline/30 focus:outline-none focus:border-vegas-gold/60"
        />
        <button
          type="submit"
          disabled={loading || !hashInput.trim()}
          className="px-4 py-1.5 rounded-sm bg-vegas-gold/90 text-deep-jungle font-body text-xs font-semibold hover:bg-vegas-gold disabled:opacity-40 transition-all"
        >
          {loading ? 'Loading…' : 'Inspect'}
        </button>
      </form>

      {error && (
        <div className="px-3 py-2 rounded-sm border border-red-400/30 bg-red-500/10 font-body text-xs text-red-200/80">
          {error}
        </div>
      )}

      {artifact && (
        <div className="space-y-4">
          {/* Header */}
          <div className="px-4 py-3 rounded-sm border border-vegas-gold/20 bg-forest-light/20">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60">
                  Run hash · schema {artifact.schema_version}
                </div>
                <div className="font-mono text-xs text-isabelline break-all mt-0.5">
                  {artifact.run_hash}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <CopyButton text={artifact.run_hash} label="Hash" />
                <CopyButton text={`${window.location.origin}/n/${artifact.run_hash}`} label="URL" />
                <a
                  href={`/n/${artifact.run_hash}`}
                  className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-vegas-gold/25 text-vegas-gold/80 hover:bg-vegas-gold/10 hover:border-vegas-gold/50 transition-all"
                >
                  Open
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-[11px] font-body">
              <KV k="Created" v={artifact.created_at} />
              <KV k="Qubits" v={String(artifact.metadata?.num_qubits ?? artifact.circuit?.numQubits ?? '—')} />
              <KV k="Depth" v={String(artifact.metadata?.depth ?? '—')} />
              <KV k="Kernel" v={String(artifact.metadata?.kernel ?? '—')} />
              <KV k="Shots" v={String(artifact.shots)} />
              <KV k="Seed" v={String(artifact.seed)} />
              <KV k="Noise (depolar.)" v={String(artifact.noise_config?.depolarizing ?? 0)} />
              <KV k="qcuit version" v={String(artifact.metadata?.qcuit_version ?? '—')} />
            </div>
          </div>

          {/* Probabilities */}
          <div className="px-4 py-3 rounded-sm border border-vegas-gold/15 bg-forest-light/15">
            <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60 mb-2">
              Probabilities (top 12)
            </div>
            {sortedProbs.length === 0 ? (
              <p className="font-body text-xs text-isabelline/40">No outcomes recorded.</p>
            ) : (
              <ul className="space-y-1">
                {sortedProbs.map(([bits, p]) => (
                  <li key={bits} className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-isabelline/70 w-20">|{bits}⟩</span>
                    <div className="flex-1 h-2 rounded bg-deep-jungle/60 overflow-hidden">
                      <div
                        className="h-full bg-vegas-gold/70"
                        style={{ width: `${Math.max(2, p * 100)}%` }}
                      />
                    </div>
                    <span className="text-isabelline/50 w-14 text-right">
                      {(p * 100).toFixed(2)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* BibTeX */}
          {bibtex && (
            <div className="px-4 py-3 rounded-sm border border-vegas-gold/15 bg-forest-light/15">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60">
                  BibTeX
                </div>
                <CopyButton text={bibtex} label="Copy BibTeX" />
              </div>
              <pre className="font-mono text-[11px] text-isabelline/80 leading-relaxed whitespace-pre-wrap bg-deep-jungle/60 rounded px-3 py-2 overflow-x-auto">
                {bibtex}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-isabelline/40">{k}</div>
      <div className="font-mono text-[11px] text-isabelline/80 break-all">{v}</div>
    </div>
  );
}

// ─── Panel shell ─────────────────────────────────────────────────────
export function NotebookPanel() {
  const [view, setView] = useState<View>('recent');
  const [inspectHash, setInspectHash] = useState<string | null>(null);

  const handleInspect = (hash: string) => {
    setInspectHash(hash);
    setView('inspector');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-vegas-gold/15 pb-2">
        {VIEWS.map((v) => {
          const active = v.id === view;
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              title={v.hint}
              className={`px-3 py-1.5 rounded-sm font-body text-xs transition-all ${
                active
                  ? 'bg-vegas-gold/15 text-vegas-gold border border-vegas-gold/40'
                  : 'text-isabelline/55 hover:text-isabelline hover:bg-vegas-gold/5 border border-transparent'
              }`}
            >
              {v.label}
            </button>
          );
        })}
        <div className="ml-auto font-mono text-[10px] text-isabelline/35 uppercase tracking-wider">
          Reproducibility Index · Phase 3
        </div>
      </div>

      {view === 'recent' && <RecentView onInspect={handleInspect} />}
      {view === 'gallery' && <GalleryView onInspect={handleInspect} />}
      {view === 'inspector' && (
        <InspectorView
          initialHash={inspectHash}
          onClearInitial={() => setInspectHash(null)}
        />
      )}
    </div>
  );
}

export default NotebookPanel;
