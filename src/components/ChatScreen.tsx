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
  const [messages, setMessages] = useState<Array<{ id: string, text: string, isSelf: boolean, system?: boolean, boost?: string, reactions?: Record<string, number> }>>([]);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [timerExpiresAt, setTimerExpiresAt] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const emojis = ['🔥', '👍', '❤️', '😂', '😮', '💀'];

  useEffect(() => {
    if (!roomId) return;
    
    const handleTimerSync = (data: any) => {
       setTimerExpiresAt(data.expiresAt);
    };

    socketService.on('chat_timer_sync', handleTimerSync);
    return () => {
      socketService.off('chat_timer_sync', handleTimerSync);
    };
  }, [roomId]);

  useEffect(() => {
    if (!timerExpiresAt) return;
    const interval = setInterval(() => {
       const remaining = Math.max(0, Math.floor((timerExpiresAt - Date.now()) / 1000));
       setSecondsRemaining(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerExpiresAt]);

  const handleProlong = () => {
    if (points >= 200) {
      audioService.playAlert();
      socketService.emit('extend_chat_timer', {});
    }
  };

  useEffect(() => {
    if (!roomId) return;

    // Add initial system message
    setMessages([{
      id: 'sys-1',
      text: `CONNECTION ESTABLISHED. TOPIC: "${topic}". REMEMBER: Identity is earned, not given. / ارتباط برقرار شد. موضوع: "${topic}". به یاد داشته باشید: هویت را باید به دست آورد، نه اینکه بخشیده شود.`,
      isSelf: false,
      system: true
    }]);

    const handleReceive = (data: any) => {
      audioService.playKeystroke();
      setMessages(prev => [...prev, { id: data.id, text: data.text, isSelf: false, boost: data.boost, reactions: {} }]);
    };
    
    const handleSystem = (data: any) => {
      audioService.playAlert();
      setMessages(prev => [...prev, { id: Date.now().toString(), text: data.text, isSelf: false, system: true }]);
    };

    const handlePartnerDisconnect = () => {
      setMessages(prev => [...prev, { id: 'sys-dis', text: 'PARTNER HAS DISCONNECTED. / هم‌صحبت شما از محیط گفتگو خارج شد.', isSelf: false, system: true }]);
    };

    const handleMessageUpdate = (data: any) => {
       setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, boost: data.boost } : m));
    };

    const handleReceiveReaction = (data: any) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
          const newReactions = { ...(m.reactions || {}) };
          newReactions[data.emoji] = (newReactions[data.emoji] || 0) + 1;
          return { ...m, reactions: newReactions };
        }
        return m;
      }));
    };

    socketService.on('receive_message', handleReceive);
    socketService.on('system_message', handleSystem);
    socketService.on('partner_disconnected', handlePartnerDisconnect);
    socketService.on('message_updated', handleMessageUpdate);
    socketService.on('receive_reaction', handleReceiveReaction);

    return () => {
      socketService.off('receive_message', handleReceive);
      socketService.off('system_message', handleSystem);
      socketService.off('partner_disconnected', handlePartnerDisconnect);
      socketService.off('message_updated', handleMessageUpdate);
      socketService.off('receive_reaction', handleReceiveReaction);
    };
  }, [topic, roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBoost = (messageId: string, type: string) => {
    audioService.playAlert();
    socketService.emit('boost_message', { roomId, messageId, type, nodeId });
  };

  const handleReaction = (messageId: string, emoji: string) => {
    audioService.playKeystroke();
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const newReactions = { ...(m.reactions || {}) };
        newReactions[emoji] = (newReactions[emoji] || 0) + 1;
        return { ...m, reactions: newReactions };
      }
      return m;
    }));
    socketService.emit('send_reaction', { roomId, messageId, emoji });
    setShowEmojiPicker(null);
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

  if (!roomId) return (
    <div className="flex items-center justify-center h-full font-mono animate-pulse">
        &gt; INITIALIZING_CHAT_PROTOCOLS...
    </div>
  );

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-color)] border border-[var(--phos-color)]/20 max-w-4xl mx-auto shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden ${secondsRemaining !== null && secondsRemaining < 15 ? 'fx-jitter' : ''}`}>
      {/* Intense red flash for emergency */}
      {secondsRemaining !== null && secondsRemaining < 10 && secondsRemaining % 2 === 0 && (
         <div className="absolute inset-0 bg-red-900/10 pointer-events-none z-50" />
      )}
      
      <button 
        onClick={() => { audioService.playKeystroke(); socketService.emit('leave_pool', {}); }} 
        className="absolute top-2 right-2 p-1 px-2 hover:bg-[var(--phos-color)]/20 text-[9px] sm:text-[10px] font-mono uppercase border border-[var(--phos-color)]/30 text-red-500 z-30 bg-black/60 backdrop-blur-sm"
      >
          Disconnect / قطع اتصال
      </button>

      {secondsRemaining !== null && (
        <div className="absolute top-2 left-2 flex items-center gap-2 z-30 bg-black/60 backdrop-blur-sm p-1 px-2 border border-yellow-500/30">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-tighter text-yellow-500/70 font-mono">Memory Decay / زوال حافظه</span>
            <span className={cn(
               "text-xs sm:text-sm font-bold font-mono phosphor-glow leading-none",
               secondsRemaining < 30 ? "text-red-500 fx-jitter" : "text-yellow-500"
            )}>
              {Math.floor(secondsRemaining / 60)}:{Math.floor(secondsRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <button 
            onClick={handleProlong}
            disabled={points < 200}
            className="bg-yellow-500/10 border border-yellow-500/40 text-yellow-500 text-[8px] px-1.5 py-1 uppercase hover:bg-yellow-500/20 disabled:opacity-30 transition-all font-bold ml-1"
          >
            Delay (200) / تمدید
          </button>
        </div>
      )}

      {/* Identity Store / Actions Sidebar */}
      <div className="border-b border-[var(--phos-color)]/20 p-2 pt-10 sm:pt-2 flex gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap text-[10px] sm:text-xs scrollbar-hide relative z-20 bg-black/20">
        <span className="phosphor-dim uppercase py-1 hidden lg:inline">Exchange:</span>
        <button 
          onClick={() => onPointsSpent(300, 'Age')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex flex-col items-center group whitespace-nowrap"
          title="Cost: 300 pts"
        >
           <div className="flex items-center gap-1">
             <Eye size={12} className="group-hover:animate-pulse" />
             <span>Age (300)</span>
           </div>
           <span className="font-sans text-[8px] opacity-70">سن</span>
        </button>
        <button 
          onClick={() => onPointsSpent(400, 'Gender')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex flex-col items-center group whitespace-nowrap"
          title="Cost: 400 pts"
        >
           <div className="flex items-center gap-1">
             <Eye size={12} className="group-hover:animate-pulse" />
             <span>Gender (400)</span>
           </div>
           <span className="font-sans text-[8px] opacity-70">جنسیت</span>
        </button>
        <button 
          onClick={() => onPointsSpent(500, 'City')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex flex-col items-center group whitespace-nowrap"
          title="Cost: 500 pts"
        >
           <div className="flex items-center gap-1">
             <Navigation size={12} className="group-hover:animate-pulse" />
             <span>City (500)</span>
           </div>
           <span className="font-sans text-[8px] opacity-70">شهر</span>
        </button>
        <button 
          onClick={() => onPointsSpent(600, 'Music')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex flex-col items-center group whitespace-nowrap"
          title="Cost: 600 pts"
        >
           <div className="flex items-center gap-1">
             <Eye size={12} className="group-hover:animate-pulse" />
             <span>Music (600)</span>
           </div>
           <span className="font-sans text-[8px] opacity-70">موسیقی</span>
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
           <div className="flex flex-col items-center">
             <span className="hidden sm:inline">Inject Activity</span>
             <span className="sm:hidden">Inject</span>
             <span className="font-sans text-[8px] opacity-70">فعالیت</span>
           </div>
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

            {/* Reactions Display */}
            {m.reactions && Object.keys(m.reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(m.reactions).map(([emoji, count]) => (
                  <span key={emoji} className="bg-black/60 border border-[var(--phos-color)]/20 px-1 py-0.5 rounded text-[10px] flex items-center gap-1 phosphor-glow">
                    <span>{emoji}</span>
                    <span className="opacity-70">{count}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Controls for messages */}
            {!m.system && (
              <div className={cn(
                "absolute -top-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 p-0.5 border border-[var(--phos-color)]/20 z-20",
                m.isSelf ? "right-0" : "left-0"
              )}>
                {/* Emoji Trigger */}
                <button 
                  onClick={() => setShowEmojiPicker(showEmojiPicker === m.id ? null : m.id)} 
                  className="text-[8px] uppercase px-1 hover:bg-[var(--phos-color)]/20"
                >
                  React / واکنش
                </button>
                
                {/* Boost Controls for self messages */}
                {m.isSelf && !m.boost && (
                  <>
                    <button onClick={() => handleBoost(m.id, 'highlight')} className="text-[8px] uppercase px-1 hover:bg-[var(--phos-color)]/20 border-l border-[var(--phos-color)]/10">Glow (50)</button>
                    <button onClick={() => handleBoost(m.id, 'glitch')} className="text-[8px] uppercase px-1 hover:bg-[var(--phos-color)]/20 border-l border-[var(--phos-color)]/10">Jitter (150)</button>
                    <button onClick={() => handleBoost(m.id, 'redact')} className="text-[8px] uppercase px-1 hover:bg-[var(--phos-color)]/20 border-l border-[var(--phos-color)]/10">Hide (200)</button>
                  </>
                )}
              </div>
            )}

            {/* Emoji Picker Modal-ish */}
            {showEmojiPicker === m.id && (
              <div className={cn(
                "absolute -top-14 bg-black/90 border border-[var(--phos-color)]/40 p-1 flex gap-2 z-30 shadow-xl",
                m.isSelf ? "right-0" : "left-0"
              )}>
                {emojis.map(e => (
                  <button 
                    key={e} 
                    onClick={() => handleReaction(m.id, e)}
                    className="hover:scale-125 transition-transform p-1"
                  >
                    {e}
                  </button>
                ))}
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
          placeholder="Message... / پیام..."
          autoFocus /* eslint-disable-line jsx-a11y/no-autofocus */
          autoComplete="off"
          dir="auto"
        />
        <button type="submit" disabled={!input.trim()} className="px-2 sm:px-4 text-[var(--phos-color)] flex flex-col items-center phosphor-dim hover:text-white hover:phosphor-glow disabled:opacity-30 uppercase text-[10px] sm:text-xs font-bold pt-1">
          <span>Send</span>
          <span className="font-sans text-[9px] lowercase opacity-70">ارسال</span>
        </button>
      </form>
    </div>
  );
}
