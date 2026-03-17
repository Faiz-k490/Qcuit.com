import React, { useState, useEffect } from 'react';

interface TerminalWindowProps {
  command: string;
  animated?: boolean;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({ 
  command, 
  animated = true 
}) => {
  const [copied, setCopied] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (animated) {
      setIsTyping(true);
      let index = 0;
      const interval = setInterval(() => {
        if (index <= command.length) {
          setDisplayedText(command.slice(0, index));
          index++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 80);
      return () => clearInterval(interval);
    } else {
      setDisplayedText(command);
    }
  }, [command, animated]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-code-bg border border-vegas-gold/20 rounded-lg shadow-2xl overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-forest-light border-b border-vegas-gold/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-brick/60" />
            <div className="w-3 h-3 rounded-full bg-vegas-gold/60" />
            <div className="w-3 h-3 rounded-full bg-terminal-green/60" />
          </div>
          <span className="font-mono text-xs text-isabelline/40">bash</span>
        </div>

        {/* Terminal Content */}
        <div className="p-4 font-mono text-sm">
          <div className="flex items-start gap-2">
            <span className="text-terminal-green flex-shrink-0">$</span>
            <div className="flex-1">
              <span className="text-terminal-green">
                {displayedText}
              </span>
              {isTyping && (
                <span className="inline-block w-2 h-5 bg-terminal-green animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        </div>

        {/* Copy Button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleCopy}
            className={`
              w-full py-2.5 px-4 rounded
              font-body text-sm tracking-wide uppercase
              transition-all duration-300
              flex items-center justify-center gap-2
              ${copied 
                ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/40' 
                : 'bg-vegas-gold/10 text-vegas-gold border border-vegas-gold/30 hover:bg-vegas-gold/20 hover:border-vegas-gold/50'
              }
            `}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy to Clipboard</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
