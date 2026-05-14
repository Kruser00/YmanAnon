import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, TrendingUp, Eye, Box, Award, Coins } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { audioService } from '../audio';
import { socketService } from '../socket';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function OracleScreen({ onBack, nodeId, points }: { onBack: () => void, nodeId: string | null, points: number }) {
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [input, setInput] = useState('');
  const [bounty, setBounty] = useState(0);
  const [filter, setFilter] = useState<'active' | 'archive' | 'ai'>('ai');
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
     socketService.emit('request_oracle', {});
     socketService.on('oracle_data', (data) => setThreads(data));
     socketService.on('thread_details', (data) => {
       if (activeThread && activeThread.id === data.threadId) {
         setActiveThread((prev: any) => ({ ...prev, answers: data.answers }));
       }
     });
     socketService.on('oracle_updated', () => {
       socketService.emit('request_oracle', {});
       if (activeThread) {
         socketService.emit('request_thread_details', { threadId: activeThread.id });
       }
     });

     socketService.on('mainframe_response', (data) => {
       setIsAiLoading(false);
       setAiChat(prev => {
         const last = prev[prev.length - 1];
         if (last && last.role === 'ai' && !data.done) {
           return [...prev.slice(0, -1), { role: 'ai', text: last.text + data.text }];
         }
         if (data.text) {
           return [...prev, { role: 'ai', text: data.text }];
         }
         return prev;
       });
     });

     return () => {
       socketService.off('oracle_data');
       socketService.off('thread_details');
       socketService.off('oracle_updated');
       socketService.off('mainframe_response');
     };
  }, [activeThread?.id]);

  const handleAiPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isAiLoading) {
      if (points < 100) {
        setAiChat(prev => [...prev, { role: 'ai', text: "!!! ERROR: INSUFFICIENT_CREDITS. REQUIRES 100 CREDITS. !!!" }]);
        return;
      }
      audioService.playKeystroke();
      const prompt = input;
      setAiChat(prev => [...prev, { role: 'user', text: prompt }]);
      setIsAiLoading(true);
      socketService.emit('mainframe_prompt', { prompt: prompt });
      setInput('');
    }
  };

  useEffect(() => {
    if (activeThread && !activeThread.answers) {
      socketService.emit('request_thread_details', { threadId: activeThread.id });
    }
  }, [activeThread?.id]);

  const handlePostThread = (e: React.FormEvent) => {
    e.preventDefault();
    if(input.trim()) {
       audioService.playKeystroke();
       socketService.emit('post_oracle_thread', { question: input, bounty, nodeId });
       setInput('');
       setBounty(0);
    }
  };

  const handlePostAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if(input.trim() && activeThread) {
       audioService.playKeystroke();
       socketService.emit('post_oracle_answer', { threadId: activeThread.id, text: input, nodeId });
       setInput('');
    }
  };

  const handleVouch = (threadId: string, answerId: string) => {
     audioService.playAlert();
     socketService.emit('vouch_answer', { threadId, answerId, nodeId });
  };

  const handleResolve = () => {
    if (activeThread && activeThread.authorId === nodeId) {
      audioService.playAlert();
      socketService.emit('resolve_thread', { threadId: activeThread.id, nodeId });
      setActiveThread(null);
    }
  };

  const filteredThreads = threads.filter(t => filter === 'archive' ? t.isResolved : !t.isResolved);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full max-w-4xl mx-auto relative px-2 sm:px-0"
    >
        <div className="absolute -top-2 right-0 flex gap-1 sm:gap-2 z-20">
          <button 
            onClick={() => { audioService.playKeystroke(); setFilter('ai'); setActiveThread(null); }}
            className={cn(
              "px-2 py-1 text-[9px] sm:text-[10px] font-mono uppercase border transition-colors",
              filter === 'ai' ? "bg-[var(--phos-color)] text-black border-[var(--phos-color)]" : "hover:bg-[var(--phos-color)]/20 border-[var(--phos-color)]/30 text-[var(--phos-color)] bg-black/60"
            )}
          >
             NEURAL_CORE
          </button>
          <button 
            onClick={() => { audioService.playKeystroke(); setFilter('active'); setActiveThread(null); }}
            className={cn(
              "px-2 py-1 text-[9px] sm:text-[10px] font-mono uppercase border transition-colors",
              filter === 'active' ? "bg-[var(--phos-color)] text-black border-[var(--phos-color)]" : "hover:bg-[var(--phos-color)]/20 border-[var(--phos-color)]/30 text-[var(--phos-color)] bg-black/60"
            )}
          >
             ORACLE
          </button>
          <button 
            onClick={() => { audioService.playKeystroke(); setFilter('archive'); setActiveThread(null); }}
            className={cn(
              "px-2 py-1 text-[9px] sm:text-[10px] font-mono uppercase border transition-colors",
              filter === 'archive' ? "bg-[var(--phos-color)] text-black border-[var(--phos-color)]" : "hover:bg-[var(--phos-color)]/20 border-[var(--phos-color)]/30 text-[var(--phos-color)] bg-black/60"
            )}
          >
             ARCHIVE
          </button>
          <button onClick={() => { audioService.playKeystroke(); onBack(); }} className="px-2 py-1 hover:bg-[var(--phos-color)]/20 text-[9px] sm:text-[10px] font-mono uppercase border border-[var(--phos-color)]/30 text-red-400 bg-black/60">
             &lt; OUT
          </button>
        </div>

        <div className="border-b border-[var(--phos-color)]/30 pb-3 mb-4 mt-12 sm:mt-0">
           <h2 className="text-xl sm:text-2xl phosphor-glow uppercase tracking-widest flex items-center gap-2">
             {filter === 'ai' ? <Award size={20} className="animate-pulse" /> : filter === 'active' ? <Eye size={20} /> : <Database size={20} />} 
             {filter === 'ai' ? 'NEURAL CORE / هسته عصبی' : filter === 'active' ? 'THE ORACLE / اوراکل' : 'GLOBAL ARCHIVE / آرشیو'}
           </h2>
           <p className="phosphor-dim text-[10px] sm:text-[12px] font-mono mt-1 uppercase">
             {filter === 'ai' ? '> Accessing central mainframe intelligence. (100 pts/query)' : filter === 'active' ? '> Knowledge exchange between nodes.' : '> Verified wisdom archive.'}
           </p>
        </div>

        {filter === 'ai' ? (
          <div className="flex flex-col flex-1 overflow-hidden min-h-0 font-mono">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-hide pb-20">
              {aiChat.length === 0 && (
                <div className="opacity-40 text-center py-20 italic text-sm">
                  -- SYSTEM READY. AWAITING DATA INPUT FROM NODE ${nodeId?.substring(0,6)} --
                </div>
              )}
              {aiChat.map((msg, i) => (
                <div key={i} className={cn(
                  "p-3 border",
                  msg.role === 'user' ? "border-[var(--phos-color)]/20 bg-black/20 ml-8" : "border-white/10 bg-white/5 mr-8"
                )}>
                  <div className="text-[9px] uppercase opacity-50 mb-1">
                    {msg.role === 'user' ? `> NODE_${nodeId?.substring(0,6)}` : '> NEURAL_CORE'}
                  </div>
                  <div className={cn(
                    "text-xs sm:text-sm leading-relaxed",
                    msg.role === 'ai' ? "phosphor-glow" : ""
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiLoading && <div className="text-[var(--phos-color)] animate-pulse">&gt; PROCESSING_REQUEST...</div>}
            </div>
            
            <form onSubmit={handleAiPrompt} className="absolute bottom-4 left-0 right-0 flex gap-2 bg-black py-2">
               <input 
                  type="text" 
                  value={input}
                  onChange={e => { audioService.playKeystroke(); setInput(e.target.value) }}
                  placeholder="Ask the Mainframe... / پرسش از هسته..."
                  className="flex-1 bg-transparent border border-[var(--phos-color)]/30 p-2 sm:p-3 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] text-xs sm:text-sm"
                  autoFocus 
               />
               <button type="submit" disabled={!input || isAiLoading} className="border border-[var(--phos-color)] px-4 sm:px-6 uppercase text-xs sm:text-sm hover:bg-[var(--phos-color)]/20 disabled:opacity-30">ASK</button>
            </form>
          </div>
        ) : !activeThread ? (
         <div className="flex flex-col flex-1 overflow-hidden min-h-0">
           {filter === 'active' && (
             <form onSubmit={handlePostThread} className="mb-4 sm:mb-6 flex flex-col gap-2 border border-[var(--phos-color)]/10 p-3 bg-black/20">
               <input 
                  type="text" 
                  value={input}
                  onChange={e => { audioService.playKeystroke(); setInput(e.target.value) }}
                  placeholder="Ask a question to the mesh... / سوال از شبکه..."
                  className="bg-transparent border-b border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] font-sans text-xs sm:text-sm"
                  dir="auto"
               />
               <div className="flex justify-between items-center mt-1">
                 <div className="flex items-center gap-2">
                   <span className="text-[10px] uppercase opacity-50 font-mono">Bounty (pts):</span>
                   <input 
                     type="number"
                     min={0}
                     max={points}
                     step={50}
                     value={bounty} 
                     onChange={(e) => { audioService.playKeystroke(); setBounty(Math.max(0, Number(e.target.value))); }}
                     className="bg-black border border-[var(--phos-color)]/30 text-[var(--phos-color)] text-[10px] font-mono px-2 py-1 outline-none w-20"
                     placeholder="0"
                   />
                 </div>
                 <button type="submit" disabled={!input} className="border border-[var(--phos-color)] px-4 py-1 uppercase font-mono text-[10px] sm:text-xs hover:bg-[var(--phos-color)]/20 disabled:opacity-30 flex items-center gap-2">
                   <TrendingUp size={12} /> Transmit Query
                 </button>
               </div>
             </form>
           )}

           <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 font-mono scrollbar-hide pb-10">
             {filteredThreads.length === 0 ? (
               <div className="text-center py-20 opacity-30 font-mono italic text-sm">-- No fragments found in this sector --</div>
             ) : (
               filteredThreads.map(t => (
                  <div key={t.id} onClick={() => { audioService.playKeystroke(); setActiveThread(t) }} className="border border-[var(--phos-color)]/20 p-3 sm:p-4 hover:border-[var(--phos-color)]/60 cursor-pointer transition-colors group relative overflow-hidden">
                     {t.bounty > 0 && (
                       <div className="absolute top-0 right-0 bg-yellow-400 text-black px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-tighter">
                         +{t.bounty} PTS
                       </div>
                     )}
                     <div className="text-sm sm:text-lg phosphor-glow mb-1 sm:mb-2 leading-tight pr-14">{t.question}</div>
                     <div className="flex items-center gap-3 text-[9px] sm:text-xs opacity-60 uppercase">
                       <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                       <span className="flex items-center gap-1"><Box size={10} /> {t.answerCount || 0} Resp.</span>
                       {t.isResolved && <span className="text-green-500 flex items-center gap-1"><Award size={10} /> Resolved</span>}
                       <span className="opacity-0 group-hover:opacity-100 ml-auto transition-opacity text-[var(--phos-color)]">&gt; {t.isResolved ? 'Inspect' : 'Contribute'}</span>
                     </div>
                  </div>
               ))
             )}
           </div>
         </div>
       ) : (
         <div className="flex flex-col flex-1 min-h-0 font-mono overflow-hidden">
            <button onClick={() => { audioService.playKeystroke(); setActiveThread(null) }} className="self-start text-[9px] sm:text-xs uppercase opacity-80 hover:opacity-100 hover:bg-[var(--phos-color)]/20 mb-3 flex items-center gap-1 border border-[var(--phos-color)]/30 px-2 py-1 transition-colors">
              &lt; RETURN TO DIRECTORY
            </button>
            <div className="relative border border-[var(--phos-color)]/40 p-4 mb-4 sm:mb-6 bg-[var(--phos-color)]/5">
              <div className="text-lg sm:text-2xl phosphor-glow leading-relaxed">
                {activeThread.question}
              </div>
              {activeThread.bounty > 0 && !activeThread.isResolved && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400 px-2 py-0.5 rounded-full text-yellow-400 text-[9px] font-bold">
                  <Coins size={10} /> BOUNTY: {activeThread.bounty} PTS
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 mb-4 scrollbar-hide">
              {!activeThread.answers || activeThread.answers.length === 0 ? (
                 <div className="opacity-50 text-center py-10 text-xs sm:text-sm uppercase">&gt; NO RESPONSES RECEIVED YET</div>
              ) : activeThread.answers.map((a: any, idx: number) => (
                 <div key={idx} className="border-l-2 border-[var(--phos-color)]/40 pl-3 py-2 bg-black/10 relative group">
                    <div className="mb-1 text-xs sm:text-sm leading-relaxed">{a.text}</div>
                    <div className="flex justify-between items-center">
                       <div className="text-[8px] sm:text-[10px] opacity-40 uppercase">{new Date(a.timestamp).toLocaleString()} // {a.vouchCount > 5 ? 'VERIFIED EXPERT' : 'ANONYMOUS'}</div>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleVouch(activeThread.id, a.id); }}
                         className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] sm:text-[10px] border border-[var(--phos-color)]/30 px-2 hover:bg-[var(--phos-color)]/20 uppercase"
                       >
                         Commend (+5 Rep)
                       </button>
                    </div>
                 </div>
              ))}
            </div>

              {!activeThread.isResolved && (
                <div className="flex gap-2 pb-2">
                 <input 
                    type="text" 
                    value={input}
                    onChange={e => { audioService.playKeystroke(); setInput(e.target.value) }}
                    placeholder="Inject knowledge fragment..."
                    className="flex-1 bg-transparent border border-[var(--phos-color)]/30 p-2 sm:p-3 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] font-mono text-xs sm:text-sm"
                    autoFocus 
                 />
                 <button onClick={handlePostAnswer} disabled={!input} className="border border-[var(--phos-color)] px-4 sm:px-6 uppercase font-mono text-xs sm:text-sm hover:bg-[var(--phos-color)]/20 disabled:opacity-30">Contribute</button>
               </div>
              )}
              
              {!activeThread.isResolved && activeThread.authorId === nodeId && (
                <button 
                  onClick={handleResolve}
                  className="w-full border-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-500 p-2 uppercase font-mono text-xs hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Award size={14} /> Resolve & Award Bounty
                </button>
              )}
         </div>
       )}
    </motion.div>
  );
}
