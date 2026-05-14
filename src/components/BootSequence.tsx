import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Cpu } from 'lucide-react';
import { audioService } from '../audio';

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [degaussing, setDegaussing] = useState(true);

  useEffect(() => {
    audioService.playDegauss();
    const degaussTimer = setTimeout(() => setDegaussing(false), 800);

    const getRandomCmd = () => {
       const parts = ["MOV", "PUSH", "CALL", "INT", "JZ", "CMP", "XOR", "LEA", "SUB", "ADD"];
       const regs = ["EAX", "EBX", "ECX", "EDX", "ESI", "EDI", "R8", "R9"];
       const hex = (len=6) => "0x" + Math.floor(Math.random() * Math.pow(16, len)).toString(16).toUpperCase().padStart(len, '0');
       
       const seed = Math.random();
       if (seed < 0.3) return `${parts[Math.floor(Math.random()*parts.length)]} ${regs[Math.floor(Math.random()*regs.length)]}, ${hex()}`;
       if (seed < 0.6) return `CALL mem[${hex(4)}] // ADDR_RESOLUTION`;
       if (seed < 0.8) return `${parts[Math.floor(Math.random()*parts.length)]} [${hex()}], ${regs[Math.floor(Math.random()*regs.length)]}`;
       return `SYSTEM_SIGNAL_INTERRUPT: ERR_${hex(4)}`;
    };

    const bootSteps = [
      { text: 'BIOS CHECK... [SECURE_NODE_0x1] OK', delay: 400 },
      { text: `MEM_BLOCK_INIT: ${Math.random().toString(16).slice(2, 10).toUpperCase()} [OK]`, delay: 700 },
      { text: 'ESTABLISHING SECURE_WS... CARRIER_DETECTED', delay: 1100 },
      { text: `TUNNEL_ID: 0x${Math.floor(Math.random()*1000000).toString(16)} ACTIVE`, delay: 1400 },
      { text: 'BYPASSING RESTRICTIONS... ACCESS_GRANTED', delay: 1700 },
      { text: 'ANONYMITY LAYER: LOADED (AES-256_SIGNAL)', delay: 2000 },
      { text: `ENCRYPT_KEY: ${btoa(Math.random().toString()).slice(0, 16).toUpperCase()}`, delay: 2300 },
      { text: 'IDENTITY MATRIX: STABILIZED // NODE_SYNCED', delay: 2600 },
      { text: 'ECHO-7 CORE: AWAKENING... بیداری هسته اکو-۷', delay: 3000 },
      { text: 'KNOWLEDGE IS TEMPORARY. / دانش موقتی است.', delay: 3400 },
      { text: 'NOTHING IS SAVED. / هیچ چیز ذخیره نمی‌شود.', delay: 3800 },
      { text: 'USE YOUR TIME WISELY. / از زمان خود عاقلانه استفاده کنید.', delay: 4200 },
      { text: 'TERMINAL.FA READY.', delay: 4500 }
    ];

    bootSteps.forEach(({ text, delay }) => {
      setTimeout(() => {
        setLogs(prev => [...prev.slice(-12), `[${getRandomCmd()}] ${text}`]);
        setProgress(Math.min(100, Math.floor((delay / 4200) * 100)));
        audioService.playKeystroke();
      }, delay);
    });

    const timer = setTimeout(onComplete, 4600);
    return () => {
      clearTimeout(timer);
      clearTimeout(degaussTimer);
    };
  }, []); 

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      className="flex flex-col items-center justify-center h-full max-w-md mx-auto w-full space-y-4 relative overflow-hidden"
    >
      {/* Background glitch codes */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] font-mono text-[8px] flex flex-wrap gap-4 p-4 items-start justify-center content-start select-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.span 
            key={i} 
            initial={{ opacity: 0 }} 
            animate={{ opacity: [0, 1, 0] }} 
            transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 5 }}
          >
            0x{Math.floor(Math.random() * 0xFFFFFF).toString(16)}
          </motion.span>
        ))}
      </div>

      {degaussing && (
        <motion.div 
           initial={{ scaleX: 20, scaleY: 0, opacity: 1, backgroundColor: '#fff' }}
           animate={{ scaleX: 1, scaleY: 1, opacity: 0 }}
           transition={{ duration: 0.6, ease: "easeOut" }}
           className="fixed inset-0 z-[200] pointer-events-none"
        />
      )}
      <Cpu size={32} className="text-[var(--phos-color)] mb-2 sm:mb-4 animate-pulse opacity-80" />
      <span className="phosphor-glow text-base sm:text-xl tracking-widest text-center">INITIALIZING TERMINAL.FA</span>
      
      <div className="w-full flex-col flex text-left font-mono text-[9px] sm:text-xs space-y-0.5 sm:space-y-1 mt-4 sm:mt-6 px-4 max-h-[160px] sm:max-h-none overflow-hidden">
         {logs.map((log, i) => (
           <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex">
             <span className="opacity-40 inline-block w-20 sm:w-24 shrink-0">[{new Date().toISOString().substring(11,19)}]</span>
             <span className="phosphor-glow ml-1 sm:ml-2 truncate">{log}</span>
           </motion.div>
         ))}
      </div>

      <div className="w-full px-8 mt-4 sm:mt-8">
        <div className="w-full h-0.5 sm:h-1 bg-[var(--phos-color)]/20 relative overflow-hidden">
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
