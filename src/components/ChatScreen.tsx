import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Eye, Navigation, Terminal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { audioService } from '../audio';
import { socketService } from '../socket';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ChatScreen({ topic, roomId, points, onPointsSpent, nodeId }: { topic: string, roomId: string, points: number, onPointsSpent: (c: number, t: string) => void, nodeId: string | null }) {
  const [messages, setMessages] = useState<Array<{ id: string, text: string, isSelf: boolean, system?: boolean, boost?: string }>>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add initial system message
    setMessages([{
      id: 'sys-1',
      text: `CONNECTION ESTABLISHED. TOPIC: "${topic}". REMEMBER: Identity is earned, not given.`,
      isSelf: false,
      system: true
    }]);

    const handleReceive = (data: any) => {
      audioService.playKeystroke();
      setMessages(prev => [...prev, { id: data.id, text: data.text, isSelf: false, boost: data.boost }]);
    };
    
    const handleSystem = (data: any) => {
      audioService.playAlert();
      setMessages(prev => [...prev, { id: Date.now().toString(), text: data.text, isSelf: false, system: true }]);
    };

    const handlePartnerDisconnect = () => {
      setMessages(prev => [...prev, { id: 'sys-dis', text: 'PARTNER HAS DISCONNECTED.', isSelf: false, system: true }]);
    };

    const handleMessageUpdate = (data: any) => {
       setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, boost: data.boost } : m));
    };

    socketService.on('receive_message', handleReceive);
    socketService.on('system_message', handleSystem);
    socketService.on('partner_disconnected', handlePartnerDisconnect);
    socketService.on('message_updated', handleMessageUpdate);

    return () => {
      socketService.off('receive_message', handleReceive);
      socketService.off('system_message', handleSystem);
      socketService.off('partner_disconnected', handlePartnerDisconnect);
      socketService.off('message_updated', handleMessageUpdate);
    };
  }, [topic]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBoost = (messageId: string, type: string) => {
    audioService.playAlert();
    socketService.emit('boost_message', { roomId, messageId, type, nodeId });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    audioService.playKeystroke();

    if (input.startsWith('/accept ')) {
       const type = input.split(' ')[1];
       if (type) {
         socketService.emit('accept_reveal', { type });
         setInput('');
         return;
       }
    }

    const newMsg = { id: Date.now().toString(), text: input, isSelf: true };
    setMessages(prev => [...prev, newMsg]);
    socketService.emit('send_message', { roomId, text: input });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)] border border-[var(--phos-color)]/20 max-w-4xl mx-auto shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
      <button 
        onClick={() => { audioService.playKeystroke(); socketService.emit('leave_pool', {}); }} 
        className="absolute top-2 right-2 p-1 px-2 hover:bg-[var(--phos-color)]/20 text-[10px] font-mono uppercase border border-[var(--phos-color)]/30 text-red-500 z-30 bg-black/60 backdrop-blur-sm"
      >
          Disconnect
      </button>

      {/* Identity Store / Actions Sidebar */}
      <div className="border-b border-[var(--phos-color)]/20 p-2 pt-10 sm:pt-2 flex gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap text-[10px] sm:text-xs scrollbar-hide relative z-20 bg-black/20">
        <span className="phosphor-dim uppercase py-1 hidden lg:inline">Exchange Points:</span>
        <button 
          onClick={() => onPointsSpent(300, 'Age')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex items-center gap-1 group whitespace-nowrap"
          title="Cost: 300 pts"
        >
           <Eye size={12} className="group-hover:animate-pulse" />
           <span>Age (300)</span>
        </button>
        <button 
          onClick={() => onPointsSpent(400, 'Gender')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex items-center gap-1 group whitespace-nowrap"
          title="Cost: 400 pts"
        >
           <Eye size={12} className="group-hover:animate-pulse" />
           <span>Gender (400)</span>
        </button>
        <button 
          onClick={() => onPointsSpent(500, 'City')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex items-center gap-1 group whitespace-nowrap"
          title="Cost: 500 pts"
        >
           <Navigation size={12} className="group-hover:animate-pulse" />
           <span>City (500)</span>
        </button>
        <button 
          onClick={() => onPointsSpent(600, 'Music')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex items-center gap-1 group whitespace-nowrap"
          title="Cost: 600 pts"
        >
           <Eye size={12} className="group-hover:animate-pulse" />
           <span>Music (600)</span>
        </button>
        
        <button 
          onClick={() => {
             audioService.playKeystroke();
             socketService.emit('trigger_activity', {});
          }}
          className="border border-[var(--phos-color)]/40 px-2 sm:px-3 py-1 bg-[var(--phos-color)]/10 hover:bg-[var(--phos-color)]/20 hover:text-white transition-colors flex items-center gap-1 group ml-auto sticky right-0 z-10"
          title="Inject Activity"
        >
           <Terminal size={12} className="group-hover:animate-pulse" />
           <span className="hidden sm:inline">Inject Activity</span>
           <span className="sm:hidden">Inject</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 relative z-10 backdrop-blur-[1px] scrollbar-hide">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
               "max-w-[85%] sm:max-w-[80%] break-words p-2 sm:p-3 relative group",
               m.system ? "mx-auto text-center border-y border-[var(--phos-color)]/30 text-[10px] sm:text-xs text-[var(--phos-color)] uppercase max-w-full my-3 sm:my-4 phosphor-dim" :
               m.isSelf ? "ml-auto border border-[var(--phos-color)]/50 bg-[var(--phos-color)]/5 text-[var(--phos-color)]" : 
               "mr-auto border border-white/10 text-white/90",
               m.boost === 'highlight' ? "shadow-[0_0_15px_var(--phos-color)] border-[var(--phos-color)] phosphor-glow" : "",
               m.boost === 'glitch' ? "fx-jitter" : "",
               m.boost === 'redact' ? "bg-black text-black hover:text-[var(--phos-color)] transition-colors cursor-pointer" : ""
            )}
            dir="auto"
          >
            {m.system && <span className="mr-2">***</span>}
            <span className={cn(
              "font-sans", 
              m.system ? "font-mono" : "text-[13px] sm:text-base leading-relaxed",
              m.boost === 'redact' ? "select-none" : ""
            )}>
              {m.text}
            </span>
            {m.system && <span className="ml-2">***</span>}

            {/* Boost Controls for self messages */}
            {!m.system && m.isSelf && !m.boost && (
              <div className="absolute -top-6 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 p-1 border border-[var(--phos-color)]/20 z-20">
                <button onClick={() => handleBoost(m.id, 'highlight')} className="text-[8px] uppercase px-1 hover:bg-[var(--phos-color)]/20">Glow (50)</button>
                <button onClick={() => handleBoost(m.id, 'glitch')} className="text-[8px] uppercase px-1 hover:bg-[var(--phos-color)]/20">Jitter (150)</button>
                <button onClick={() => handleBoost(m.id, 'redact')} className="text-[8px] uppercase px-1 hover:bg-[var(--phos-color)]/20">Hide (200)</button>
              </div>
            )}
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Base */}
      <form onSubmit={sendMessage} className="border-t border-[var(--phos-color)]/30 p-1 sm:p-2 flex bg-black/60 relative z-20">
        <div className="flex items-center phosphor-dim px-2 sm:px-3">
          <span className="animate-pulse">{'>'}</span>
        </div>
        <input 
          type="text" 
          value={input}
          onChange={(e) => {
            if (e.target.value.length > input.length) {
               audioService.playKeystroke();
            }
            setInput(e.target.value);
          }}
          className="flex-1 bg-transparent border-none outline-none text-[var(--phos-color)] phosphor-glow font-sans text-sm sm:text-base py-2 px-1"
          placeholder="Message..."
          autoFocus /* eslint-disable-line jsx-a11y/no-autofocus */
          autoComplete="off"
          dir="auto"
        />
        <button type="submit" disabled={!input.trim()} className="px-2 sm:px-4 text-[var(--phos-color)] phosphor-dim hover:text-white hover:phosphor-glow disabled:opacity-30 uppercase text-[10px] sm:text-xs font-bold">
          Send
        </button>
      </form>
    </div>
  );
}
