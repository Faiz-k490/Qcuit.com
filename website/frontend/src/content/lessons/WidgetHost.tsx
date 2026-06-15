/**
 * WidgetHost — resolves a WidgetDescriptor to a concrete React component.
 *
 * Lessons describe widgets declaratively (by string ``kind``); the engine
 * picks the right implementation at render time. New widgets are added by
 * extending the switch below and updating the WidgetKind union in types.ts.
 */

import React from 'react';
import type { WidgetDescriptor } from './types';
import { RotationSlider } from '../../components/widgets/RotationSlider';
import { BellPairBuilder } from '../../components/widgets/BellPairBuilder';
import { MeasurementHistogram } from '../../components/widgets/MeasurementHistogram';

export function WidgetHost({ widget }: { widget: WidgetDescriptor }) {
  const cfg = widget.config || {};
  switch (widget.kind) {
    case 'RotationSlider':
      return (
        <RotationSlider
          defaultAxis={(cfg.axis as any) || 'Y'}
          defaultTheta={typeof cfg.theta === 'number' ? (cfg.theta as number) : 0}
        />
      );
    case 'BellPairBuilder':
      return <BellPairBuilder />;
    case 'MeasurementHistogram':
      return <MeasurementHistogram />;
    case 'BlochSphere':
    case 'EntanglementGraph':
    case 'PresetCanvas':
    default:
      return (
        <div className="px-3 py-2 rounded border border-vegas-gold/20 bg-forest-light/20 font-body text-xs text-isabelline/60">
          Widget <span className="font-mono text-vegas-gold/80">{widget.kind}</span> is referenced
          but not yet wired here — open <a href="/visualizer" className="underline">Visualizer</a> to
          experiment with it directly.
        </div>
      );
  }
}

export default WidgetHost;
