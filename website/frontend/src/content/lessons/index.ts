/**
 * Lesson manifest for the Qcuit Curriculum (Phase 4).
 *
 * Add a new lesson by:
 *   1. Creating <slug>.tsx under core/ or qml/ with a default-exported Lesson.
 *   2. Importing it below and appending to the appropriate track array.
 *
 * The manifest test in src/content/lessons/__tests__/manifest.test.ts
 * enforces: slugs unique across tracks, prerequisites resolve, and the
 * order field forms a dense 1..N sequence within each track.
 */

import type { Lesson, LessonManifest } from './types';

// ── Core 12 ────────────────────────────────────────────────────────
import core01 from './core/01-why-quantum';
import core02 from './core/02-qubit-bloch';
import core03 from './core/03-single-qubit-gates';
import core04 from './core/04-superposition-measurement';
import core05 from './core/05-two-qubits-entanglement';
import core06 from './core/06-cnot-entangling';
import core07 from './core/07-ghz-multi';
import core08 from './core/08-phase-interference';
import core09 from './core/09-deutsch-jozsa';
import core10 from './core/10-grover';
import core11 from './core/11-qft';
import core12 from './core/12-noise';

// ── QML 5 ──────────────────────────────────────────────────────────
import qml01 from './qml/01-neural-to-quantum';
import qml02 from './qml/02-encoding-data';
import qml03 from './qml/03-ansatze';
import qml04 from './qml/04-training-loops';
import qml05 from './qml/05-parity-classifier';

export const LESSONS: LessonManifest = {
  core: [
    core01, core02, core03, core04, core05, core06,
    core07, core08, core09, core10, core11, core12,
  ],
  qml: [qml01, qml02, qml03, qml04, qml05],
};

export const ALL_LESSONS: Lesson[] = [...LESSONS.core, ...LESSONS.qml];

/**
 * Lookup a lesson by slug. Returns null if not found.
 */
export function getLesson(slug: string): Lesson | null {
  return ALL_LESSONS.find((l) => l.slug === slug) ?? null;
}
