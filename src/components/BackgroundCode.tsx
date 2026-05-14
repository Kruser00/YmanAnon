import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function BackgroundCode({ mood }: { mood?: string | null }) {
  const [leakedLines, setLeakedLines] = useState<string[]>([]);
  
  const instructions = ['LOAD', 'STORE', 'JMP', 'CALL', 'RET', 'PUSH', 'POP', 'ADD', 'SUB', 'XOR', 'CMP', 'SYS.ALLOC', 'SYS.FREE', 'MOV', 'NOP', 'INT', 'HALT', 'STI', 'CLI', 'SHL', 'SHR'];
  const registers = ['REG_A', 'REG_B', 'REG_X', 'REG_Y', 'EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP', 'FLAGS'];
  const structures = ['[CORE_DUMP]', '[NEURAL_SYNAPSE]', '[HASH_TABLE]', '[BUFFER_OUTF]', '[PACKET_TRACE]', '[SIGNAL_STREAM]'];

  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    const interval = setInterval(() => {
      const addr = `0x${(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase().slice(0,6)}`;
      const instr = instructions[Math.floor(Math.random() * instructions.length)];
      const reg = registers[Math.floor(Math.random() * registers.length)];
      const val = `0x${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()}`;
      const struct = structures[Math.floor(Math.random() * structures.length)];
      
      let newLine = `${addr} ${instr} ${reg}, ${val}`;
      const crit = Math.random();
      if (crit < 0.05 && mood) newLine = `${addr} CRITICAL_EMOTION_${mood.toUpperCase()} ${struct}`;
      else if (crit < 0.12) newLine = `${addr} ERR_MEM_LEAK_AT_${val} ${struct}`;
      else if (crit < 0.18) newLine = `${addr} ANALYZING_SIGNAL_${val}... OK`;
      else if (crit < 0.22) newLine = `${addr} FETCHING_CORE_PROTOCOL_${val.slice(0,3)}`;

      setLeakedLines(prev => [...prev.slice(isMobile ? -50 : -100), newLine]);
    }, isMobile ? 350 : 200);

    return () => clearInterval(interval);
  }, [mood]);

  return (
    <div className={cn(
      "absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10",
      "blur-[0.2px]"
    )}>
      <motion.div 
        animate={{ y: [0, -100] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="flex flex-col font-mono text-[8px] sm:text-[9px] leading-tight text-[var(--phos-color)]"
      >
        {leakedLines.map((line, i) => (
          <div 
            key={i} 
            className={cn(
              "whitespace-nowrap",
              line.includes('ERR') ? 'text-red-500 font-bold' : '',
              line.includes('CRITICAL') ? 'text-yellow-400' : ''
            )}
          >
            {line}
          </div>
        ))}
      </motion.div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
