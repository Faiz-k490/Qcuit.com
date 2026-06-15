import React, { useEffect, useState } from 'react';

interface ASCIIDisplayProps {
  asciiOutput: string;
  animated?: boolean;
  delay?: number;
}

export const ASCIIDisplay: React.FC<ASCIIDisplayProps> = ({ 
  asciiOutput, 
  animated = true,
  delay = 0 
}) => {
  const [displayedLines, setDisplayedLines] = useState<number>(0);
  const lines = asciiOutput.split('\n');

  useEffect(() => {
    if (animated) {
      const timeout = setTimeout(() => {
        let currentLine = 0;
        const interval = setInterval(() => {
          if (currentLine <= lines.length) {
            setDisplayedLines(currentLine);
            currentLine++;
          } else {
            clearInterval(interval);
          }
        }, 150);
        return () => clearInterval(interval);
      }, delay);
      return () => clearTimeout(timeout);
    } else {
      setDisplayedLines(lines.length);
    }
  }, [animated, delay, lines.length]);

  return (
    <div className="w-full bg-forest-light/50 border border-vegas-gold/15 rounded-lg overflow-hidden">
      {/* ASCII Display Header */}
      <div className="bg-forest-light border-b border-vegas-gold/10 px-4 py-2.5">
        <span className="font-mono text-xs text-isabelline/40">circuit.draw() output</span>
      </div>

      {/* ASCII Content */}
      <div className="p-6 font-mono text-sm">
        <div className="space-y-0.5">
          {lines.map((line, index) => {
            const isVisible = index < displayedLines;
            
            return (
              <div 
                key={index}
                className={`
                  transition-all duration-500 ease-out
                  ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
                `}
                style={{ 
                  transitionDelay: isVisible ? `${index * 50}ms` : '0ms'
                }}
              >
                <span className="text-vegas-gold whitespace-pre">{line}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
