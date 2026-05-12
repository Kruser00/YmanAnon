import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Cpu } from 'lucide-react';
import { audioService } from '../audio';

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const bootSteps = [
      { text: 'BIOS Check... OK', delay: 300 },
      { text: 'Loading memory blocks... [1024 OK]', delay: 600 },
      { text: 'Initializing neural engine...', delay: 1000 },
      { text: 'Establishing secure websocket...', delay: 1500 },
      { text: 'Bypass protocol active...', delay: 2000 },
      { text: 'Loading anonymity layer...', delay: 2500 },
      { text: 'Generating unique identity matrix...', delay: 3000 },
      { text: 'Terminal.fa ready.', delay: 3800 }
    ];

    bootSteps.forEach(({ text, delay }) => {
      setTimeout(() => {
        setLogs(prev => [...prev, text]);
        setProgress(Math.floor((delay / 4000) * 100));
        audioService.playKeystroke();
      }, delay);
    });

    const timer = setTimeout(onComplete, 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      className="flex flex-col items-center justify-center h-full max-w-md mx-auto w-full space-y-4"
    >
      <Cpu size={48} className="text-[var(--phos-color)] mb-4 animate-pulse opacity-80" />
      <span className="phosphor-glow text-xl tracking-widest text-center">INITIALIZING TERMINAL.FA</span>
      
      <div className="w-full flex-col flex text-left font-mono text-xs space-y-1 mt-6 px-4">
         {logs.map((log, i) => (
           <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
             <span className="opacity-50 inline-block w-24">[{new Date().toISOString().substring(11,23)}]</span>
             <span className="phosphor-glow ml-2">{log}</span>
           </motion.div>
         ))}
      </div>

      <div className="w-full px-4 mt-8">
        <div className="w-full h-1 bg-[var(--phos-color)]/20 relative overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-[var(--phos-color)]"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <div className="text-right text-[10px] font-mono opacity-50 mt-1 uppercase">{progress}% allocated</div>
      </div>
    </motion.div>
  );
}
