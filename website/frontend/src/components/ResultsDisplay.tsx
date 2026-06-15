import React, { useEffect, useState } from 'react';

interface ResultItem {
  state: string;
  count: number;
}

interface ResultsDisplayProps {
  results: ResultItem[];
  animated?: boolean;
  delay?: number;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
  results, 
  animated = true,
  delay = 0 
}) => {
  const [animatedResults, setAnimatedResults] = useState<ResultItem[]>(
    results.map(r => ({ ...r, count: 0 }))
  );
  
  const maxCount = Math.max(...results.map(r => r.count));
  const totalShots = results.reduce((sum, r) => sum + r.count, 0);

  useEffect(() => {
    if (animated) {
      const timeout = setTimeout(() => {
        const duration = 1500;
        const steps = 30;
        const stepDuration = duration / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
          if (currentStep <= steps) {
            const progress = currentStep / steps;
            setAnimatedResults(
              results.map(r => ({
                ...r,
                count: Math.round(r.count * progress)
              }))
            );
            currentStep++;
          } else {
            clearInterval(interval);
            setAnimatedResults(results);
          }
        }, stepDuration);

        return () => clearInterval(interval);
      }, delay);
      return () => clearTimeout(timeout);
    } else {
      setAnimatedResults(results);
    }
  }, [animated, delay, results]);

  return (
    <div className="w-full bg-deep-jungle/50 border border-vegas-gold/10 rounded-lg overflow-hidden">
      {/* Results Header */}
      <div className="bg-forest-light border-b border-vegas-gold/10 px-4 py-2.5 flex items-center justify-between">
        <span className="font-mono text-xs text-isabelline/40">Measurement Results</span>
        <span className="font-mono text-xs text-isabelline/30">{totalShots.toLocaleString()} shots</span>
      </div>

      {/* Results Content */}
      <div className="p-6">
        <div className="space-y-4">
          {animatedResults.map((result, index) => {
            const percentage = (result.count / totalShots) * 100;
            const barWidth = (result.count / maxCount) * 100;
            
            return (
              <div 
                key={result.state}
                className="group"
                style={{ 
                  animationDelay: `${index * 200}ms`
                }}
              >
                <div className="flex items-center gap-4">
                  {/* State Label */}
                  <div className="w-16 flex-shrink-0">
                    <span className="font-mono text-sm text-isabelline/80">
                      |{result.state}⟩
                    </span>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="flex-1 h-8 bg-forest-light/50 rounded-full overflow-hidden relative">
                    {/* Animated Bar */}
                    <div 
                      className="h-full bg-gradient-to-r from-vegas-gold/40 to-vegas-gold/80 rounded-full transition-all duration-700 ease-out flex items-center"
                      style={{ width: `${barWidth}%` }}
                    >
                      {/* Count Label inside bar */}
                      {barWidth > 15 && (
                        <span className="font-mono text-xs text-deep-jungle font-medium px-3">
                          {result.count.toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    {/* Count Label outside bar (if bar is too small) */}
                    {barWidth <= 15 && result.count > 0 && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-xs text-isabelline/60">
                        {result.count.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Percentage */}
                  <div className="w-14 text-right flex-shrink-0">
                    <span className="font-mono text-xs text-isabelline/50">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Entanglement Note */}
        <div className="mt-6 pt-4 border-t border-vegas-gold/10">
          <p className="font-body text-xs text-isabelline/50 text-center">
            Notice: Only |00⟩ and |11⟩ appear — that's quantum entanglement!
          </p>
        </div>
      </div>
    </div>
  );
};
