/**
 * Lesson schema for the Qcuit Curriculum (Phase 4, Pillar F).
 *
 * Each .tsx module under content/lessons/{core,qml}/ exports a default
 * Lesson that conforms to this shape. The CourseEngine reads the manifest
 * in content/lessons/index.ts and renders lessons sequentially.
 *
 * Sections follow the "Read · Watch · Do" pedagogical pattern:
 *   - read  : narrative prose
 *   - watch : a short rendered visualisation (diagram, animation, table)
 *   - do    : an interactive widget that drives an existing Visualizer component
 */

import type { ReactNode } from 'react';

export type LessonTrack = 'core' | 'qml';

export type SectionKind = 'read' | 'watch' | 'do';

/**
 * Names of widgets the CourseEngine knows how to render in 'do' sections.
 * Keep this string-typed (rather than function-ref) so lesson modules stay
 * declarative and tree-shakeable.
 */
export type WidgetKind =
  | 'RotationSlider'
  | 'BellPairBuilder'
  | 'MeasurementHistogram'
  | 'BlochSphere'
  | 'EntanglementGraph'
  | 'PresetCanvas';

export interface WidgetDescriptor {
  kind: WidgetKind;
  /**
   * Free-form per-widget config — typed loosely on purpose so individual
   * lesson modules can pass exactly what the widget expects without
   * carrying every variant in this file.
   */
  config?: Record<string, unknown>;
}

export interface LessonSection {
  kind: SectionKind;
  title: string;
  body: ReactNode;
  widget?: WidgetDescriptor;
}

export interface Lesson {
  slug: string;
  title: string;
  subtitle?: string;
  track: LessonTrack;
  /**
   * 1-indexed ordering within the track. The manifest test enforces a
   * dense [1..N] sequence per track.
   */
  order: number;
  duration_min: number;
  objectives: string[];
  /** Other lesson slugs that should be read first. */
  prerequisites: string[];
  sections: LessonSection[];
}

export interface LessonManifest {
  core: Lesson[];
  qml: Lesson[];
}
