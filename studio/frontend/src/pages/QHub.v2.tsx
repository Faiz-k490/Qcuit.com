/**
 * Q-Hub Community Page v2.0
 * 
 * Progressive Old Money aesthetic community space
 * Features: Channels, User Badges, LaTeX Support (mockup for now)
 */

import React, { useState } from 'react';

// Types
interface Message {
  id: string;
  user: string;
  badge: 'student' | 'researcher' | 'mentor' | 'admin';
  content: string;
  timestamp: string;
  reactions?: { emoji: string; count: number }[];
}

interface Channel {
  id: string;
  name: string;
  icon: string;
  unread?: number;
  description: string;
}

// Badge colors - Progressive Old Money palette
const badgeColors: Record<string, string> = {
  student: 'bg-vegas-gold/10 text-vegas-gold border-vegas-gold/30',
  researcher: 'bg-brass-light/10 text-brass-light border-brass-light/30',
  mentor: 'bg-isabelline/10 text-isabelline border-isabelline/30',
  admin: 'bg-muted-brick/10 text-muted-brick border-muted-brick/30',
};

// Sample channels
const channels: Channel[] = [
  { id: 'general', name: 'general', icon: '💬', description: 'General quantum computing discussion' },
  { id: 'homework-help', name: 'homework-help', icon: '📚', unread: 3, description: 'Get help with quantum computing assignments' },
  { id: 'quantum-theory', name: 'quantum-theory', icon: '🔬', description: 'Deep dives into quantum mechanics and theory' },
  { id: 'circuit-showcase', name: 'circuit-showcase', icon: '✨', description: 'Share your quantum circuits and get feedback' },
  { id: 'bugs', name: 'bugs', icon: '🐛', description: 'Report issues and help debug' },
  { id: 'resources', name: 'resources', icon: '📖', description: 'Share learning resources and papers' },
];

// Sample messages
const sampleMessages: Message[] = [
  {
    id: '1',
    user: 'Alice Chen',
    badge: 'student',
    content: 'Can someone explain why the Hadamard gate creates superposition? I understand the math but not the intuition.',
    timestamp: '2 min ago',
    reactions: [{ emoji: '👍', count: 3 }, { emoji: '💡', count: 1 }],
  },
  {
    id: '2',
    user: 'Dr. Marcus Webb',
    badge: 'researcher',
    content: 'Great question! Think of it this way: the Hadamard gate rotates the qubit state on the Bloch sphere by 180° around an axis halfway between X and Z. This maps |0⟩ → |+⟩ and |1⟩ → |−⟩.',
    timestamp: '1 min ago',
    reactions: [{ emoji: '🎯', count: 5 }, { emoji: '🙏', count: 2 }],
  },
  {
    id: '3',
    user: 'Jordan Taylor',
    badge: 'mentor',
    content: 'To add to that: in terms of the matrix, H = (1/√2)[[1,1],[1,-1]]. When you apply it to |0⟩ = [1,0]ᵀ, you get [1/√2, 1/√2]ᵀ which is an equal superposition of |0⟩ and |1⟩.',
    timestamp: 'just now',
  },
];

// Sidebar Channel Item
const ChannelItem = ({ 
  channel, 
  active, 
  onClick 
}: { 
  channel: Channel; 
  active: boolean; 
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded text-left font-body
      transition-all duration-200
      ${active 
        ? 'bg-vegas-gold/10 text-vegas-gold border-l-2 border-vegas-gold' 
        : 'text-isabelline/60 hover:text-isabelline hover:bg-forest-light/50 border-l-2 border-transparent'
      }
    `}
  >
    <span className="text-base">{channel.icon}</span>
    <span className="flex-1 text-sm">#{channel.name}</span>
    {channel.unread && (
      <span className="px-2 py-0.5 rounded-full bg-vegas-gold text-deep-jungle text-xs font-semibold">
        {channel.unread}
      </span>
    )}
  </button>
);

// Message Component
const MessageItem = ({ message }: { message: Message }) => (
  <div className="group flex gap-4 px-6 py-4 hover:bg-forest-light/20 transition-colors border-b border-vegas-gold/5">
    {/* Avatar */}
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vegas-gold to-brass-dark flex items-center justify-center text-sm font-semibold text-deep-jungle shrink-0">
      {message.user.split(' ').map(n => n[0]).join('')}
    </div>
    
    {/* Content */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-body font-semibold text-isabelline">{message.user}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border font-body ${badgeColors[message.badge]}`}>
          {message.badge}
        </span>
        <span className="text-isabelline/40 text-xs font-body">{message.timestamp}</span>
      </div>
      
      {/* Message content with LaTeX-style rendering */}
      <p className="text-isabelline/80 text-sm leading-relaxed font-body">
        {message.content.split(/(\|[^|]+⟩|\[[^\]]+\])/g).map((part, i) => {
          if (part.match(/^\|.*⟩$/) || part.match(/^\[.*\]$/)) {
            return (
              <span key={i} className="font-mono text-vegas-gold bg-vegas-gold/10 px-1.5 py-0.5 rounded">
                {part}
              </span>
            );
          }
          return part;
        })}
      </p>
      
      {/* Reactions */}
      {message.reactions && (
        <div className="flex items-center gap-2 mt-3">
          {message.reactions.map((reaction, i) => (
            <button
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-forest-light/50 hover:bg-vegas-gold/10 border border-vegas-gold/20 transition-colors text-xs"
            >
              <span>{reaction.emoji}</span>
              <span className="text-isabelline/60 font-body">{reaction.count}</span>
            </button>
          ))}
          <button className="opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-full hover:bg-vegas-gold/10 border border-transparent hover:border-vegas-gold/20 transition-all text-isabelline/40 text-xs font-body">
            + Add
          </button>
        </div>
      )}
    </div>
  </div>
);

// LaTeX Input Component
const LaTeXInput = () => {
  const [input, setInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="p-6 border-t border-vegas-gold/10 bg-deep-jungle/50 heritage-texture">
      {/* Preview */}
      {showPreview && input && (
        <div className="mb-4 p-3 rounded-lg bg-forest-light/50 border border-vegas-gold/20">
          <div className="text-xs text-vegas-gold/60 mb-2 font-body uppercase tracking-wider">Preview:</div>
          <div className="text-isabelline/80 font-body">
            {input.split(/(\$[^$]+\$|\|[^|]+⟩)/g).map((part, i) => {
              if (part.match(/^\$.*\$$/) || part.match(/^\|.*⟩$/)) {
                return (
                  <span key={i} className="font-mono text-vegas-gold bg-vegas-gold/10 px-1.5 py-0.5 rounded">
                    {part.replace(/\$/g, '')}
                  </span>
                );
              }
              return part;
            })}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setShowPreview(true)}
            placeholder="Type a message... Use $math$ or |ψ⟩ for LaTeX"
            className="w-full px-4 py-3 rounded-lg bg-forest-light/50 border border-vegas-gold/20 text-isabelline placeholder-isabelline/30 resize-none focus:outline-none focus:border-vegas-gold/50 focus:ring-1 focus:ring-vegas-gold/20 transition-all font-body"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className={`p-1.5 rounded transition-colors ${showPreview ? 'text-vegas-gold' : 'text-isabelline/40 hover:text-isabelline/70'}`}
              title="Toggle LaTeX preview"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>
        
        <button className="px-6 py-3 rounded-lg bg-vegas-gold hover:bg-brass-light text-deep-jungle font-semibold transition-colors font-body">
          Send
        </button>
      </div>
      
      {/* Helper text */}
      <div className="mt-3 flex items-center gap-4 text-xs text-isabelline/40 font-body">
        <span>💡 Tip: Use <code className="bg-forest-light/50 px-1.5 py-0.5 rounded font-mono">|ψ⟩</code> for bra-ket notation</span>
        <span>Use <code className="bg-forest-light/50 px-1.5 py-0.5 rounded font-mono">$H = 1/√2$</code> for inline math</span>
      </div>
    </div>
  );
};

export function QHub() {
  const navigate = (path: string) => { window.location.href = path; };
  const [activeChannel, setActiveChannel] = useState('homework-help');
  const currentChannel = channels.find(c => c.id === activeChannel);

  return (
    <div className="min-h-screen bg-deep-jungle text-isabelline flex heritage-texture">
      {/* Sidebar */}
      <aside className="w-64 bg-forest-light/30 border-r border-vegas-gold/10 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-vegas-gold/10">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-isabelline/50 hover:text-isabelline transition-colors mb-6 font-body text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to Home</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-vegas-gold to-brass-dark flex items-center justify-center">
              <span className="text-deep-jungle font-display font-bold text-lg">Q</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-isabelline text-lg">Q-Hub</h1>
              <p className="text-xs text-isabelline/50 font-body">Community Space</p>
            </div>
          </div>
        </div>
        
        {/* Channels */}
        <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <div className="text-[10px] font-semibold text-vegas-gold/60 uppercase tracking-widest px-3 py-3 font-body">
            Channels
          </div>
          {channels.map(channel => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              active={activeChannel === channel.id}
              onClick={() => setActiveChannel(channel.id)}
            />
          ))}
        </div>
        
        {/* User */}
        <div className="p-5 border-t border-vegas-gold/10 bg-deep-jungle/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vegas-gold to-brass-dark flex items-center justify-center text-sm font-bold text-deep-jungle">
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-isabelline truncate font-body">Guest User</div>
              <div className="text-xs text-isabelline/40 font-body">Sign in to chat</div>
            </div>
            <button className="p-2 rounded-lg hover:bg-vegas-gold/10 text-isabelline/40 hover:text-isabelline transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Channel Header */}
        <header className="px-6 py-5 border-b border-vegas-gold/10 flex items-center justify-between bg-forest-light/20">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">{currentChannel?.icon}</span>
              <h2 className="text-xl font-display font-bold text-isabelline">#{currentChannel?.name}</h2>
            </div>
            <p className="text-sm text-isabelline/50 font-body">{currentChannel?.description}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-lg hover:bg-vegas-gold/10 text-isabelline/40 hover:text-isabelline transition-colors" title="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
            <button className="p-2.5 rounded-lg hover:bg-vegas-gold/10 text-isabelline/40 hover:text-isabelline transition-colors" title="Pin messages">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M2 12h20" />
              </svg>
            </button>
            <button className="p-2.5 rounded-lg hover:bg-vegas-gold/10 text-isabelline/40 hover:text-isabelline transition-colors" title="Members">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </button>
          </div>
        </header>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {/* Welcome message */}
          <div className="px-6 py-10 border-b border-vegas-gold/10">
            <div className="w-16 h-16 rounded-xl bg-vegas-gold/10 border border-vegas-gold/30 flex items-center justify-center mb-4">
              <span className="text-4xl">{currentChannel?.icon}</span>
            </div>
            <h3 className="text-2xl font-display font-bold text-isabelline mb-2">Welcome to #{currentChannel?.name}!</h3>
            <p className="text-isabelline/60 font-body">{currentChannel?.description}</p>
          </div>
          
          {/* Message list */}
          <div>
            {sampleMessages.map(message => (
              <MessageItem key={message.id} message={message} />
            ))}
          </div>
        </div>
        
        {/* Input */}
        <LaTeXInput />
      </main>
      
      {/* Right Sidebar - Members */}
      <aside className="w-60 bg-forest-light/30 border-l border-vegas-gold/10 p-5 hidden lg:block">
        <h3 className="text-[10px] font-semibold text-vegas-gold/60 uppercase tracking-widest mb-5 font-body">
          Online — 3
        </h3>
        
        <div className="space-y-3">
          {[
            { name: 'Dr. Marcus Webb', badge: 'researcher', status: 'online' },
            { name: 'Jordan Taylor', badge: 'mentor', status: 'online' },
            { name: 'Alice Chen', badge: 'student', status: 'online' },
          ].map((member, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vegas-gold to-brass-dark flex items-center justify-center text-xs font-bold text-deep-jungle">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-vegas-gold border-2 border-deep-jungle" />
              </div>
              <div>
                <div className="text-sm text-isabelline font-body">{member.name}</div>
                <div className={`text-xs font-body ${badgeColors[member.badge].split(' ')[1]}`}>{member.badge}</div>
              </div>
            </div>
          ))}
        </div>
        
        <h3 className="text-[10px] font-semibold text-vegas-gold/60 uppercase tracking-widest mt-8 mb-5 font-body">
          Offline — 12
        </h3>
        
        <div className="space-y-3 opacity-40">
          {['Bob Smith', 'Carol Davis', 'David Wilson'].map((name, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-charcoal flex items-center justify-center text-xs font-bold text-isabelline/50">
                {name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-sm text-isabelline/60 font-body">{name}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default QHub;
