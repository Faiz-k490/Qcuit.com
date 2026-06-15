/**
 * useMode — Shared platform-mode state (Learn / Visualize / Lab).
 *
 * Persisted in localStorage and synced across components via a tiny
 * publish/subscribe store so the menu bar, router shells, and any panel
 * can read/write the current mode without prop drilling.
 *
 * Modes:
 *   - 'explore'  : quantum/QML curriculum surface (/explore)
 *   - 'build'    : circuit visualizer + code (/visualizer)
 *   - 'lab'      : research-grade QML panels (/lab)
 */

import { useEffect, useState, useCallback } from 'react';

export type AppMode = 'explore' | 'build' | 'lab';

const STORAGE_KEY = 'qcuit:mode';

function readInitial(): AppMode {
  if (typeof window === 'undefined') return 'build';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as AppMode | null;
    if (stored === 'explore' || stored === 'build' || stored === 'lab') {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return 'build';
}

const listeners = new Set<(m: AppMode) => void>();
let current: AppMode = readInitial();

function broadcast(mode: AppMode) {
  current = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn(mode));
}

export function setMode(mode: AppMode) {
  if (mode === current) return;
  broadcast(mode);
}

export function getMode(): AppMode {
  return current;
}

export function useMode(): [AppMode, (m: AppMode) => void] {
  const [mode, setLocal] = useState<AppMode>(current);

  useEffect(() => {
    const fn = (m: AppMode) => setLocal(m);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const update = useCallback((m: AppMode) => setMode(m), []);
  return [mode, update];
}

export const MODE_META: Record<AppMode, { label: string; href: string; description: string }> = {
  explore: {
    label: 'Learn',
    href: '/explore',
    description: 'Guided quantum and QML lessons',
  },
  build: {
    label: 'Visualize',
    href: '/visualizer',
    description: 'Interactive circuit, code, and state views',
  },
  lab: {
    label: 'QML Lab',
    href: '/lab',
    description: 'Train, benchmark, and export QML workflows',
  },
};
