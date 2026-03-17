/**
 * Q-Hub Community Page
 * 
 * Discord/Forum-style community space for quantum computing enthusiasts
 * Features: Channels, User Badges, LaTeX Support, Real-time Chat
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

// Badge colors
const badgeColors: Record<string, string> = {
  student: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  researcher: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  mentor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  admin: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
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
      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
      transition-all duration-200
      ${active 
        ? 'bg-violet-500/20 text-white' 
        : 'text-zinc-400 hover:text-white hover:bg-white/5'
      }
    `}
  >
    <span className="text-lg">{channel.icon}</span>
    <span className="flex-1 text-sm font-medium">#{channel.name}</span>
    {channel.unread && (
      <span className="px-2 py-0.5 rounded-full bg-violet-500 text-white text-xs font-bold">
        {channel.unread}
      </span>
    )}
  </button>
);

// Message Component
const MessageItem = ({ message }: { message: Message }) => (
  <div className="group flex gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors">
    {/* Avatar */}
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-bold shrink-0">
      {message.user.split(' ').map(n => n[0]).join('')}
    </div>
    
    {/* Content */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-white">{message.user}</span>
        <span className={`px-2 py-0.5 rounded text-xs border ${badgeColors[message.badge]}`}>
          {message.badge}
        </span>
        <span className="text-zinc-500 text-xs">{message.timestamp}</span>
      </div>
      
      {/* Message content with LaTeX-style rendering */}
      <p className="text-zinc-300 text-sm leading-relaxed">
        {message.content.split(/(\|[^|]+⟩|\[[^\]]+\])/g).map((part, i) => {
          if (part.match(/^\|.*⟩$/) || part.match(/^\[.*\]$/)) {
            return (
              <span key={i} className="font-mono text-cyan-400 bg-cyan-500/10 px-1 rounded">
                {part}
              </span>
            );
          }
          return part;
        })}
      </p>
      
      {/* Reactions */}
      {message.reactions && (
        <div className="flex items-center gap-2 mt-2">
          {message.reactions.map((reaction, i) => (
            <button
              key={i}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-xs"
            >
              <span>{reaction.emoji}</span>
              <span className="text-zinc-400">{reaction.count}</span>
            </button>
          ))}
          <button className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-full hover:bg-white/10 transition-all text-zinc-500 text-xs">
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
    <div className="p-4 border-t border-white/[0.05]">
      {/* Preview */}
      {showPreview && input && (
        <div className="mb-3 p-3 rounded-lg bg-black/40 border border-white/[0.05]">
          <div className="text-xs text-zinc-500 mb-1">Preview:</div>
          <div className="text-zinc-300">
            {input.split(/(\$[^$]+\$|\|[^|]+⟩)/g).map((part, i) => {
              if (part.match(/^\$.*\$$/) || part.match(/^\|.*⟩$/)) {
                return (
                  <span key={i} className="font-mono text-cyan-400 bg-cyan-500/10 px-1 rounded">
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
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className={`p-1 rounded transition-colors ${showPreview ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Toggle LaTeX preview"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>
        
        <button className="px-6 py-3 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-medium transition-colors">
          Send
        </button>
      </div>
      
      {/* Helper text */}
      <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
        <span>💡 Tip: Use <code className="bg-white/10 px-1 rounded">|ψ⟩</code> for bra-ket notation</span>
        <span>Use <code className="bg-white/10 px-1 rounded">$H = 1/√2$</code> for inline math</span>
      </div>
    </div>
  );
};

export function QHub() {
  const navigate = (path: string) => { window.location.href = path; };
  const [activeChannel, setActiveChannel] = useState('homework-help');
  const currentChannel = channels.find(c => c.id === activeChannel);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-black/40 border-r border-white/[0.05] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.05]">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back to Home</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <div>
              <h1 className="font-bold text-white">Q-Hub</h1>
              <p className="text-xs text-zinc-500">Community Space</p>
            </div>
          </div>
        </div>
        
        {/* Channels */}
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 py-2">
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
        <div className="p-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-bold">
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">Guest User</div>
              <div className="text-xs text-zinc-500">Sign in to chat</div>
            </div>
            <button className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors">
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
        <header className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentChannel?.icon}</span>
              <h2 className="text-lg font-bold text-white">#{currentChannel?.name}</h2>
            </div>
            <p className="text-sm text-zinc-500">{currentChannel?.description}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors" title="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
            <button className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors" title="Pin messages">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M2 12h20" />
              </svg>
            </button>
            <button className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors" title="Members">
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
          <div className="px-6 py-8 border-b border-white/[0.05]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center mb-4">
              <span className="text-3xl">{currentChannel?.icon}</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Welcome to #{currentChannel?.name}!</h3>
            <p className="text-zinc-400">{currentChannel?.description}</p>
          </div>
          
          {/* Message list */}
          <div className="divide-y divide-white/[0.02]">
            {sampleMessages.map(message => (
              <MessageItem key={message.id} message={message} />
            ))}
          </div>
        </div>
        
        {/* Input */}
        <LaTeXInput />
      </main>
      
      {/* Right Sidebar - Members */}
      <aside className="w-60 bg-black/40 border-l border-white/[0.05] p-4 hidden lg:block">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#050505]" />
              </div>
              <div>
                <div className="text-sm text-white">{member.name}</div>
                <div className={`text-xs ${badgeColors[member.badge].split(' ')[1]}`}>{member.badge}</div>
              </div>
            </div>
          ))}
        </div>
        
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-8 mb-4">
          Offline — 12
        </h3>
        
        <div className="space-y-3 opacity-50">
          {['Bob Smith', 'Carol Davis', 'David Wilson'].map((name, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">
                {name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-sm text-zinc-500">{name}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default QHub;
