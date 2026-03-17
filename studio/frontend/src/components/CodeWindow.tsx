import React from 'react';

interface CodeWindowProps {
  code: string;
  showLineNumbers?: boolean;
  highlightedLines?: number[];
  title?: string;
}

// Simple syntax highlighting for Python
const highlightSyntax = (code: string): React.ReactElement[][] => {
  const lines = code.split('\n');
  
  return lines.map((line) => {
    // Tokenize the line with regex for Python syntax
    const tokens: React.ReactElement[] = [];
    let remaining = line;
    let keyIndex = 0;
    
    // Match patterns in order of priority
    const patterns = [
      { regex: /^(\s*#.*)$/, type: 'comment' },  // Full line comments
      { regex: /^(\s+)/, type: 'whitespace' },    // Leading whitespace (1+ chars)
      { regex: /^(from|import|class|def|return|if|else|elif|for|while|try|except|finally|with|as|pass|break|continue|lambda|yield|async|await|global|nonlocal|assert|del|raise|in|is|and|or|not|True|False|None)\b/, type: 'keyword' },
      { regex: /^([A-Z][a-zA-Z0-9_]*)/, type: 'class' },  // Class names (PascalCase)
      { regex: /^([a-z_][a-zA-Z0-9_]*)(?=\s*\()/, type: 'function' },  // Function calls
      { regex: /^([a-z_][a-zA-Z0-9_]*)/, type: 'variable' },  // Variables
      { regex: /^(["'])(?:\\.|[^\\])*?\1/, type: 'string' },  // Strings
      { regex: /^(\d+\.?\d*)/, type: 'number' },  // Numbers
      { regex: /^(:|=|,|\.|\(|\)|\[|\]|\{|\}|\+|-|\*|\/|%|<|>|!|&|\||\^|~)/, type: 'operator' },
    ];
    
    while (remaining.length > 0) {
      let matched = false;
      
      for (const pattern of patterns) {
        const match = remaining.match(pattern.regex);
        if (match && match[0].length > 0) {
          const text = match[0];
          const className = getColorClass(pattern.type);
          
          tokens.push(
            <span key={keyIndex++} className={className}>
              {text}
            </span>
          );
          
          remaining = remaining.slice(text.length);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        tokens.push(
          <span key={keyIndex++} className="text-isabelline/80">
            {remaining[0]}
          </span>
        );
        remaining = remaining.slice(1);
      }
    }
    
    return tokens;
  });
};

const getColorClass = (type: string): string => {
  switch (type) {
    case 'keyword':
      return 'text-code-keyword';
    case 'string':
      return 'text-code-string';
    case 'function':
      return 'text-code-function';
    case 'class':
      return 'text-code-variable';
    case 'variable':
      return 'text-isabelline/80';
    case 'comment':
      return 'text-code-comment';
    case 'number':
      return 'text-code-variable';
    case 'operator':
      return 'text-isabelline/60';
    default:
      return 'text-isabelline/80';
  }
};

export const CodeWindow: React.FC<CodeWindowProps> = ({ 
  code, 
  showLineNumbers = true,
  highlightedLines = [],
  title = "bell_state.py"
}) => {
  const lines = code.split('\n');
  const highlightedContent = highlightSyntax(code);

  return (
    <div className="w-full bg-code-bg border border-vegas-gold/10 rounded-lg overflow-hidden shadow-2xl">
      {/* Code Window Header */}
      <div className="bg-forest-light border-b border-vegas-gold/10 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-brick/60" />
          <div className="w-3 h-3 rounded-full bg-vegas-gold/60" />
          <div className="w-3 h-3 rounded-full bg-terminal-green/60" />
        </div>
        <span className="font-mono text-xs text-isabelline/40">{title}</span>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto">
        <div className="font-mono text-sm leading-relaxed">
          {lines.map((_, index) => {
            const isHighlighted = highlightedLines.includes(index + 1);
            
            return (
              <div 
                key={index}
                className={`
                  flex
                  ${isHighlighted ? 'bg-vegas-gold/10 -mx-4 px-4 border-l-2 border-vegas-gold' : ''}
                `}
              >
                {showLineNumbers && (
                  <span className="text-vegas-gold/30 text-xs w-8 text-right mr-4 select-none flex-shrink-0 pt-0.5">
                    {index + 1}
                  </span>
                )}
                <div className="flex-1">
                  {highlightedContent[index]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
