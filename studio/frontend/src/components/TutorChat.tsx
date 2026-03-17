/**
 * TutorChat — Gemini AI Quantum Tutor Side-Panel
 *
 * Anti-SaaS UI: No chat bubbles. Continuous academic transcript with thin
 * horizontal rules. AI responses use serif (font-display) for explanations
 * and monospace for code. NEVER auto-fetches — only triggers on explicit
 * user action ("Consult Tutor" button or Enter key).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCircuit } from '../store/CircuitContext';

// ── Types ────────────────────────────────────────────────────────
interface ChatTurn {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// ── Simple Markdown renderer (code blocks + inline code + bold + italic) ──
function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push(
        <pre
          key={key++}
          className="font-mono text-xs text-vegas-gold bg-deep-jungle/80 border border-vegas-gold/15 rounded p-3 my-3 overflow-x-auto leading-relaxed"
        >
          {lang && (
            <span className="block text-[10px] text-vegas-gold/40 uppercase tracking-wider mb-2">
              {lang}
            </span>
          )}
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Heading lines
    if (line.startsWith('### ')) {
      nodes.push(
        <h4 key={key++} className="font-display text-sm text-isabelline mt-4 mb-1">
          {line.slice(4)}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={key++} className="font-display text-base text-isabelline mt-4 mb-1">
          {line.slice(3)}
        </h3>
      );
      i++;
      continue;
    }

    // Regular paragraph — process inline formatting
    if (line.trim() === '') {
      nodes.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }

    nodes.push(
      <p key={key++} className="font-display text-[13px] text-isabelline/85 leading-relaxed my-1">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return nodes;
}

function renderInline(text: string): React.ReactNode[] {
  // Handle **bold**, *italic*, and `inline code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={k++} className="text-isabelline font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={k++} className="text-vegas-gold/80 italic">{match[4]}</em>);
    } else if (match[5]) {
      parts.push(
        <code key={k++} className="font-mono text-[12px] text-vegas-gold bg-deep-jungle/60 px-1 py-0.5 rounded">
          {match[6]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// ── Main Component ───────────────────────────────────────────────
export function TutorChat() {
  const { state } = useCircuit();
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isLoading]);

  // Build SDK-compatible chat_history from our turns
  const buildChatHistory = useCallback(() => {
    return history.map((turn) => ({
      role: turn.role,
      parts: turn.content,
    }));
  }, [history]);

  // ── EXPLICIT trigger only ──
  const handleSubmit = useCallback(async () => {
    const message = input.trim();
    if (!message || isLoading) return;

    setInput('');
    setError(null);

    const userTurn: ChatTurn = { role: 'user', content: message, timestamp: Date.now() };
    setHistory((prev) => [...prev, userTurn]);
    setIsLoading(true);

    try {
      const chatHistory = buildChatHistory();
      const response = await fetch('/api/agent/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: message,
          circuit_state: state,
          chat_history: chatHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Error ${response.status}`);
        setIsLoading(false);
        return;
      }

      const modelTurn: ChatTurn = {
        role: 'model',
        content: data.reply,
        timestamp: Date.now(),
      };
      setHistory((prev) => [...prev, modelTurn]);
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, state, buildChatHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setError(null);
  };

  return (
    <div className="h-full flex flex-col bg-deep-jungle border-l border-vegas-gold/20">
      {/* ── Header ── */}
      <div className="px-3 py-3 border-b border-vegas-gold/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs text-vegas-gold tracking-wider uppercase">
            Tutor
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-vegas-gold/40" />
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="font-body text-[10px] text-isabelline/30 hover:text-isabelline/60 transition-colors uppercase tracking-wider"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Transcript (scrollable) ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {history.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="font-display text-lg text-vegas-gold/30 mb-3">
              Quantum Tutor
            </div>
            <p className="font-body text-xs text-isabelline/30 leading-relaxed max-w-[220px] mx-auto">
              Ask about your circuit and the tutor will explain the quantum
              phenomena, show <span className="font-mono text-vegas-gold/40">qcuit</span> code,
              and guide your learning.
            </p>
            <div className="mt-6 space-y-2">
              {[
                'What does my circuit do?',
                'Show me the qcuit code',
                'Explain entanglement',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="block w-full text-left px-3 py-2 border border-vegas-gold/10 text-isabelline/40 font-body text-xs hover:border-vegas-gold/30 hover:text-isabelline/60 transition-colors rounded-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((turn, i) => (
          <div key={i}>
            {/* Thin horizontal rule between messages (Anti-SaaS) */}
            {i > 0 && <hr className="border-vegas-gold/15 my-4" />}

            {turn.role === 'user' ? (
              /* ── User message: compact, labeled ── */
              <div className="mb-1">
                <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
                  You
                </span>
                <p className="font-body text-[13px] text-isabelline/70 mt-1 leading-relaxed">
                  {turn.content}
                </p>
              </div>
            ) : (
              /* ── Model response: serif, academic ── */
              <div className="mb-1">
                <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
                  Tutor
                </span>
                <div className="mt-1">{renderMarkdown(turn.content)}</div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <>
            {history.length > 0 && <hr className="border-vegas-gold/15 my-4" />}
            <div className="mb-1">
              <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
                Tutor
              </span>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-vegas-gold/60 rounded-full animate-pulse" />
                <span className="inline-block w-1.5 h-1.5 bg-vegas-gold/40 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="inline-block w-1.5 h-1.5 bg-vegas-gold/20 rounded-full animate-pulse [animation-delay:300ms]" />
                <span className="font-display text-xs text-isabelline/30 ml-1 italic">
                  Analyzing circuit…
                </span>
              </div>
            </div>
          </>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-3 px-3 py-2 border border-muted-brick/30 rounded-sm">
            <span className="font-mono text-[10px] text-muted-brick/70 uppercase tracking-widest">
              Error
            </span>
            <p className="font-body text-xs text-muted-brick/80 mt-1">{error}</p>
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="border-t border-vegas-gold/15 px-3 py-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your circuit…"
            rows={2}
            className="flex-1 resize-none px-3 py-2 rounded-sm bg-forest-light/40 border border-vegas-gold/15 text-isabelline/80 placeholder-isabelline/25 font-body text-xs leading-relaxed focus:outline-none focus:border-vegas-gold/40 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="self-end px-3 py-2 rounded-sm bg-vegas-gold/90 text-deep-jungle font-body text-[11px] font-semibold uppercase tracking-wider hover:bg-vegas-gold disabled:opacity-30 disabled:cursor-default transition-all"
          >
            Ask
          </button>
        </div>
        <div className="mt-1.5 font-body text-[9px] text-isabelline/20 tracking-wide">
          Enter to send · Shift+Enter for newline · Circuit context sent automatically
        </div>
      </div>
    </div>
  );
}

export default TutorChat;
