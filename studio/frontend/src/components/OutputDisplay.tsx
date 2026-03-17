// In frontend/src/components/OutputDisplay.tsx
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { SimulationResult } from '../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type OutputDisplayProps = {
  results: SimulationResult | null;
  view: 'histogram' | 'code';
  validationErrors?: string[];
};

export function OutputDisplay({
  results,
  view,
}: OutputDisplayProps) {

  // --- View 1: Histogram ---
  if (view === 'histogram') {
    const hasResults = results && Object.keys(results.probabilities).length > 0;

    const sortedEntries = hasResults
      ? Object.entries(results.probabilities).sort(([, a], [, b]) => b - a)
      : [];

    const generateColors = (probs: number[]) =>
      probs.map(p => `rgba(197, 160, 89, ${Math.max(0.4, p)})`);

    const chartData = {
      labels: sortedEntries.map(([label]) => `|${label}⟩`),
      datasets: [{
        label: 'Probability',
        data: sortedEntries.map(([, prob]) => prob),
        backgroundColor: generateColors(sortedEntries.map(([, prob]) => prob)),
        borderColor: 'rgba(197, 160, 89, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }],
    };

    return (
      <div className="h-full overflow-auto p-4" style={{ backgroundColor: '#0A1F1C' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-body text-sm font-semibold text-isabelline">Probabilities</span>
          {hasResults && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-vegas-gold/15 text-vegas-gold border border-vegas-gold/20">
              {sortedEntries.length} states
            </span>
          )}
        </div>

        {!hasResults ? (
          <div className="h-[calc(100%-50px)] flex flex-col items-center justify-center gap-2">
            <span className="font-body text-sm text-isabelline/40">No simulation results yet</span>
            <span className="font-body text-xs text-isabelline/30">Click "Simulate" to run the circuit</span>
          </div>
        ) : (
          <div style={{ height: 'calc(100% - 50px)' }}>
            <Bar
              data={chartData}
              options={{
                maintainAspectRatio: false,
                indexAxis: sortedEntries.length > 8 ? 'y' : 'x',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(17,42,38,0.95)',
                    borderColor: 'rgba(197,160,89,0.3)',
                    borderWidth: 1,
                    titleFont: { family: "'Inter', sans-serif", size: 11 },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
                    titleColor: '#F5F2EA',
                    bodyColor: '#C5A059',
                    callbacks: {
                      label: (ctx) => `${((ctx.raw as number) * 100).toFixed(2)}%`
                    }
                  }
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    max: sortedEntries.length > 8 ? 1 : undefined,
                    grid: { color: 'rgba(197,160,89,0.08)' },
                    ticks: { color: 'rgba(245,242,234,0.5)', font: { family: "'JetBrains Mono', monospace", size: 10 } }
                  },
                  y: {
                    beginAtZero: true,
                    max: sortedEntries.length > 8 ? undefined : 1,
                    grid: { color: 'rgba(197,160,89,0.08)' },
                    ticks: {
                      color: 'rgba(245,242,234,0.5)',
                      font: { family: "'JetBrains Mono', monospace", size: 10 },
                      callback: sortedEntries.length > 8 ? undefined : (value) => `${((value as number) * 100).toFixed(0)}%`
                    }
                  },
                },
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // --- View 2: Code (legacy fallback, v5 handles code in its own right panel) ---
  return (
    <div className="h-full flex flex-col p-4" style={{ backgroundColor: '#0A1F1C' }}>
      <pre className="font-mono text-xs text-isabelline/80 whitespace-pre-wrap leading-relaxed flex-1 overflow-auto">
        {results?.code.qiskit || '# Click "Simulate" to generate code.'}
      </pre>
    </div>
  );
}
