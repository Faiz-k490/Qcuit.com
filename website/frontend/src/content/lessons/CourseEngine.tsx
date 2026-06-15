/**
 * CourseEngine — Curriculum reader (Phase 4, Pillar F).
 *
 * Renders the manifest from content/lessons/index.ts:
 *   - Sidebar lists both tracks with completion checkmarks.
 *   - Main pane renders the current lesson's sections (Read · Watch · Do).
 *   - Continue / Mark-Complete buttons advance the order index.
 *
 * Progress lives in localStorage under ``qcuit:lessons:<slug>:done``.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { LESSONS } from './index';
import type { Lesson, LessonSection } from './types';
import { WidgetHost } from './WidgetHost';
import { examplesForLesson, RunnableExample } from './runnableExamples';

const DONE_KEY = (slug: string) => `qcuit:lessons:${slug}:done`;

function isDone(slug: string): boolean {
  try {
    return window.localStorage.getItem(DONE_KEY(slug)) === '1';
  } catch {
    return false;
  }
}

function setDone(slug: string, done: boolean) {
  try {
    if (done) window.localStorage.setItem(DONE_KEY(slug), '1');
    else window.localStorage.removeItem(DONE_KEY(slug));
  } catch {
    /* ignore */
  }
}

const TRACK_GUIDE = {
  core: {
    label: 'Foundation',
    title: 'Start here with no quantum background',
    copy: 'This track builds the mental model QML needs: states, gates, measurement, interference, entanglement, algorithms, and noise.',
    pitfalls: [
      'Do not treat amplitudes like ordinary hidden probabilities.',
      'Do not skip measurement; QML predictions come from measured expectations.',
      'Do not memorize gates before you understand what they do to a state.',
    ],
  },
  qml: {
    label: 'QML',
    title: 'Move here after the circuit basics',
    copy: 'This track translates ML ideas into quantum circuits: encoders, ansatze, losses, gradients, training loops, and first classifiers.',
    pitfalls: [
      'Do not claim advantage without a classical baseline.',
      'Do not ignore encoding cost, shots, and noise.',
      'Do not scale depth blindly; barren plateaus can erase gradients.',
    ],
  },
};

function SectionCard({ section, idx }: { section: LessonSection; idx: number }) {
  const tone: Record<LessonSection['kind'], string> = {
    read: 'border-vegas-gold/20 bg-forest-light/15',
    watch: 'border-vegas-gold/25 bg-forest-light/25',
    do: 'border-vegas-gold/40 bg-vegas-gold/5',
  };
  const label: Record<LessonSection['kind'], string> = {
    read: 'Read',
    watch: 'Watch',
    do: 'Do',
  };
  return (
    <section className={`px-5 py-4 rounded border ${tone[section.kind]} mb-3`}>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold">
          §{idx + 1} · {label[section.kind]}
        </span>
        <h3 className="font-display text-base text-isabelline">{section.title}</h3>
      </div>
      <div className="font-body text-[14px] text-isabelline/85 leading-relaxed space-y-3 lesson-prose">
        {section.body}
      </div>
      {section.widget && (
        <div className="mt-4 pt-4 border-t border-vegas-gold/15">
          <WidgetHost widget={section.widget} />
        </div>
      )}
    </section>
  );
}

function RunnableLessonCard({ example }: { example: RunnableExample }) {
  return (
    <article className="grid min-w-0 gap-4 border border-vegas-gold/20 bg-[#0d171f] p-4 lg:grid-cols-[0.78fr_1.22fr]">
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/70">
            {example.level}
          </span>
          <span className="border border-isabelline/10 px-2 py-1 font-mono text-[10px] text-isabelline/42">
            {example.secondary}
          </span>
        </div>
        <h3 className="font-display text-xl text-isabelline">{example.title}</h3>
        <p className="mt-2 font-body text-sm leading-6 text-isabelline/62">{example.body}</p>
        <a
          href={example.href}
          className="mt-4 inline-flex items-center bg-vegas-gold px-4 py-2 font-body text-sm font-semibold text-deep-jungle hover:bg-brass-light"
        >
          {example.action}
        </a>
      </div>
      <pre className="min-w-0 overflow-x-auto border border-isabelline/10 bg-[#0b1320] p-4">
        <code className="block whitespace-pre font-mono text-[11px] leading-5 text-isabelline/78">
          {example.code}
        </code>
      </pre>
    </article>
  );
}

function LessonLaunches({ examples }: { examples: RunnableExample[] }) {
  if (examples.length === 0) return null;
  return (
    <section className="mb-5 border border-vegas-gold/18 bg-vegas-gold/5 p-4">
      <div className="mb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/70">
          Run this lesson
        </span>
        <h2 className="mt-1 font-display text-2xl text-isabelline">
          Open it preloaded, then repeat it from Python.
        </h2>
      </div>
      <div className="grid gap-3">
        {examples.map((example) => (
          <RunnableLessonCard key={example.title} example={example} />
        ))}
      </div>
    </section>
  );
}

function LessonView({
  lesson,
  done,
  onMarkComplete,
  onContinue,
  hasNext,
}: {
  lesson: Lesson;
  done: boolean;
  onMarkComplete: (v: boolean) => void;
  onContinue: () => void;
  hasNext: boolean;
}) {
  const examples = examplesForLesson(lesson.slug);

  return (
    <article>
      <header className="mb-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/70 mb-1">
          {lesson.track === 'core' ? 'Foundation' : 'QML'} · Lesson {lesson.order} · ~{lesson.duration_min} min
        </div>
        <h1 className="font-display text-3xl text-isabelline">{lesson.title}</h1>
        {lesson.subtitle && (
          <p className="font-display text-sm italic text-vegas-gold/70 mt-1">{lesson.subtitle}</p>
        )}

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className="px-4 py-2 rounded border border-vegas-gold/15 bg-deep-jungle/40">
            <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60 mb-1">Objectives</div>
            <ul className="font-body text-[12px] text-isabelline/80 space-y-0.5">
              {lesson.objectives.map((o) => (
                <li key={o} className="flex gap-2"><span className="text-vegas-gold/50">·</span><span>{o}</span></li>
              ))}
            </ul>
          </div>
          {lesson.prerequisites.length > 0 && (
            <div className="px-4 py-2 rounded border border-vegas-gold/15 bg-deep-jungle/40">
              <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60 mb-1">Prerequisites</div>
              <ul className="font-body text-[12px] text-isabelline/80 space-y-0.5">
                {lesson.prerequisites.map((p) => (
                  <li key={p} className="font-mono">{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </header>

      <LessonLaunches examples={examples} />

      {lesson.sections.map((s, i) => (
        <SectionCard key={i} section={s} idx={i} />
      ))}

      <footer className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => onMarkComplete(!done)}
          className={`px-4 py-1.5 rounded font-body text-xs font-semibold transition-all ${
            done
              ? 'bg-vegas-gold/20 text-vegas-gold border border-vegas-gold/40'
              : 'bg-vegas-gold text-deep-jungle hover:bg-brass-light'
          }`}
        >
          {done ? '✓ Completed (click to undo)' : 'Mark Complete'}
        </button>
        {hasNext && (
          <button
            onClick={onContinue}
            className="px-4 py-1.5 rounded border border-vegas-gold/30 text-vegas-gold/85 hover:bg-vegas-gold/10 font-body text-xs transition-all"
          >
            Continue →
          </button>
        )}
      </footer>
    </article>
  );
}

export function CourseEngine() {
  // Track + lesson selection
  const [trackId, setTrackId] = useState<'core' | 'qml'>('core');
  const tracks = useMemo(
    () => ({
      core: LESSONS.core,
      qml: LESSONS.qml,
    }),
    [],
  );
  const activeList = tracks[trackId];
  const guide = TRACK_GUIDE[trackId];

  const [activeIdx, setActiveIdx] = useState<number>(0);
  useEffect(() => {
    setActiveIdx(0);
  }, [trackId]);

  // Completion state (live mirror of localStorage)
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    [...LESSONS.core, ...LESSONS.qml].forEach((l) => {
      m[l.slug] = isDone(l.slug);
    });
    return m;
  });

  const markComplete = useCallback((slug: string, v: boolean) => {
    setDone(slug, v);
    setDoneMap((m) => ({ ...m, [slug]: v }));
  }, []);

  const lesson = activeList[activeIdx];

  const completedCount = activeList.filter((l) => doneMap[l.slug]).length;
  const progressPct = activeList.length ? (completedCount / activeList.length) * 100 : 0;

  const goNext = useCallback(() => {
    setActiveIdx((i) => Math.min(activeList.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeList.length]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 min-h-[70vh]">
      {/* Sidebar */}
      <aside className="border-r border-vegas-gold/15 bg-forest-light/10 p-4">
        <div className="flex items-center gap-1 mb-4">
          <button
            onClick={() => setTrackId('core')}
            className={`flex-1 px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-all ${
              trackId === 'core'
                ? 'bg-vegas-gold/20 text-vegas-gold border border-vegas-gold/40'
                : 'border border-vegas-gold/15 text-isabelline/55 hover:border-vegas-gold/35'
            }`}
          >
            Foundation · {LESSONS.core.length}
          </button>
          <button
            onClick={() => setTrackId('qml')}
            className={`flex-1 px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-all ${
              trackId === 'qml'
                ? 'bg-vegas-gold/20 text-vegas-gold border border-vegas-gold/40'
                : 'border border-vegas-gold/15 text-isabelline/55 hover:border-vegas-gold/35'
            }`}
          >
            QML · {LESSONS.qml.length}
          </button>
        </div>

        <div className="mb-3">
          <div className="flex justify-between items-baseline">
            <span className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60">Progress</span>
            <span className="font-mono text-[10px] text-isabelline/60">{completedCount} / {activeList.length}</span>
          </div>
          <div className="h-1.5 mt-1 rounded bg-deep-jungle/60 overflow-hidden">
            <div className="h-full bg-vegas-gold/70 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="mb-4 border border-vegas-gold/15 bg-deep-jungle/35 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60 mb-1">
            {guide.label} guide
          </div>
          <h2 className="font-body text-sm font-semibold text-isabelline">{guide.title}</h2>
          <p className="mt-2 font-body text-[12px] leading-5 text-isabelline/60">{guide.copy}</p>
          <div className="mt-3 border-t border-vegas-gold/10 pt-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-isabelline/35 mb-2">
              Common traps
            </div>
            <ul className="space-y-1.5">
              {guide.pitfalls.map((pitfall) => (
                <li key={pitfall} className="flex gap-2 font-body text-[11px] leading-4 text-isabelline/55">
                  <span className="mt-1 text-muted-brick">!</span>
                  <span>{pitfall}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ol className="space-y-1">
          {activeList.map((l, i) => {
            const active = i === activeIdx;
            const completed = doneMap[l.slug];
            const launches = examplesForLesson(l.slug);
            return (
              <li key={l.slug}>
                <button
                  onClick={() => setActiveIdx(i)}
                  className={`w-full flex items-start gap-2 px-2.5 py-1.5 rounded text-left transition-all border ${
                    active
                      ? 'border-vegas-gold/40 bg-vegas-gold/10'
                      : 'border-transparent hover:bg-vegas-gold/5 hover:border-vegas-gold/15'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] flex-shrink-0 ${
                      completed
                        ? 'bg-vegas-gold text-deep-jungle'
                        : 'border border-vegas-gold/35 text-vegas-gold/60'
                    }`}
                  >
                    {completed ? '✓' : l.order}
                  </span>
                  <span className={`font-body text-[12px] leading-snug ${active ? 'text-isabelline' : 'text-isabelline/65'}`}>
                    {l.title}
                  </span>
                </button>
                {launches.length > 0 && (
                  <div className="ml-6 mt-1 flex flex-wrap gap-1.5">
                    {launches.map((launch) => (
                      <a
                        key={`${l.slug}-${launch.title}`}
                        href={launch.href}
                        className="border border-vegas-gold/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-vegas-gold/70 hover:bg-vegas-gold hover:text-deep-jungle"
                      >
                        {launch.secondary}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </aside>

      {/* Main */}
      <main className="p-8 max-w-3xl">
        {lesson ? (
          <LessonView
            lesson={lesson}
            done={!!doneMap[lesson.slug]}
            onMarkComplete={(v) => markComplete(lesson.slug, v)}
            onContinue={goNext}
            hasNext={activeIdx < activeList.length - 1}
          />
        ) : (
          <p className="font-body text-sm text-isabelline/60">No lesson selected.</p>
        )}
      </main>
    </div>
  );
}

export default CourseEngine;
