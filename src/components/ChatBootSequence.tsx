import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { audioService } from '../audio';

export function ChatBootSequence({ onComplete }: { onComplete: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    audioService.playBootUp();
    
    let isMounted = true;
    let i = 0;
    
    // Simulate rapid retro terminal output
    const interval = setInterval(() => {
      if (!isMounted) return;
      const memLoc = `0x${(Math.random() * 0xFFFFF).toString(16).padStart(5, '0').toUpperCase()}`;
      
      const lines = [
         `[SYS] ALLOCATING BUFFER ${memLoc} ... OK`,
         `[DRV] START MODEM HANDSHAKE ... WAIT`,
         `[NET] NEGOTIATING BAUD RATE ... 56000`,
         `[SEC] EXCHANGING ENCRYPTION KEYS [RSA-4096]`,
         `[INT] RESOLVING PEER IDENTITY MATRIX ...`,
         `[SYS] DOWNLOAD SEED: [${Array(20).fill(0).map(()=>Math.random()>0.5?'1':'0').join('')}]`,
         `[MOD] SYNCING FREQUENCY SHIFT KEYING ... DONE`
      ];
      
      setLogs(prev => [...prev.slice(-15), lines[i % lines.length] + ` ... TIME:${Date.now()%1000}ms`]);
      i++;
    }, 100);

    const timer = setTimeout(() => {
      clearInterval(interval);
      onComplete();
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-start justify-end h-full p-8 font-mono text-xs overflow-hidden"
    >
      <div className="flex flex-col space-y-1 w-full text-left">
        {logs.map((log, idx) => (
          <div key={idx} className="phosphor-dim opacity-70 w-full whitespace-nowrap overflow-hidden text-ellipsis">
             &gt; {log}
          </div>
        ))}
      </div>
      <div className="mt-8 text-center w-full">
        <span className="phosphor-glow uppercase text-xl animate-pulse tracking-[0.3em]">CONNECTION ACTIVE</span>
      </div>
    </motion.div>
  );
}
