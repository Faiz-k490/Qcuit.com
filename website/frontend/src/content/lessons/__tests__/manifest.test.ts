/**
 * Manifest integrity test for the Curriculum.
 *
 *  1. Every lesson is a valid Lesson (slug, title, track, order, sections).
 *  2. Slugs are unique across tracks.
 *  3. Each track has a dense 1..N order sequence.
 *  4. Every prerequisite slug resolves to a known lesson.
 */

import { LESSONS, ALL_LESSONS, getLesson } from '../index';

describe('lesson manifest', () => {
  test('every lesson has the required core fields', () => {
    for (const lesson of ALL_LESSONS) {
      expect(typeof lesson.slug).toBe('string');
      expect(lesson.slug.length).toBeGreaterThan(0);
      expect(typeof lesson.title).toBe('string');
      expect(['core', 'qml']).toContain(lesson.track);
      expect(typeof lesson.order).toBe('number');
      expect(Array.isArray(lesson.objectives)).toBe(true);
      expect(Array.isArray(lesson.prerequisites)).toBe(true);
      expect(Array.isArray(lesson.sections)).toBe(true);
      expect(lesson.sections.length).toBeGreaterThan(0);
    }
  });

  test('slugs are unique across the whole manifest', () => {
    const slugs = ALL_LESSONS.map((l) => l.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  test('order is dense 1..N within each track', () => {
    for (const track of ['core', 'qml'] as const) {
      const ordered = [...LESSONS[track]]
        .sort((a, b) => a.order - b.order)
        .map((l) => l.order);
      for (let i = 0; i < ordered.length; i += 1) {
        expect(ordered[i]).toBe(i + 1);
      }
    }
  });

  test('all prerequisite slugs resolve to a known lesson', () => {
    for (const lesson of ALL_LESSONS) {
      for (const prereq of lesson.prerequisites) {
        const resolved = getLesson(prereq);
        if (!resolved) {
          throw new Error(`Lesson ${lesson.slug} references unknown prereq ${prereq}`);
        }
        expect(resolved).not.toBeNull();
      }
    }
  });

  test('core track has 12 lessons, qml track has 5', () => {
    expect(LESSONS.core.length).toBe(12);
    expect(LESSONS.qml.length).toBe(5);
  });
});
