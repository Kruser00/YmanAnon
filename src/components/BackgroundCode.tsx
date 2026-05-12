import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function BackgroundCode({ mood, corruption = 0 }: { mood?: string | null, corruption?: number }) {
  const [leakedLines, setLeakedLines] = useState<string[]>([]);
  
  const instructions = ['LOAD', 'STORE', 'JMP', 'CALL', 'RET', 'PUSH', 'POP', 'ADD', 'SUB', 'XOR', 'CMP', 'SYS.ALLOC', 'SYS.FREE', 'MOV', 'NOP', 'INT', 'HALT', 'STI', 'CLI', 'SHL', 'SHR'];
  const registers = ['REG_A', 'REG_B', 'REG_X', 'REG_Y', 'EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP', 'FLAGS'];

  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    const interval = setInterval(() => {
      const addr = `0x${(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase().slice(0,6)}`;
      const instr = instructions[Math.floor(Math.random() * instructions.length)];
      const reg = registers[Math.floor(Math.random() * registers.length)];
      const val = `0x${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()}`;
      
      let newLine = `${addr} ${instr} ${reg}, ${val}`;
      const crit = Math.random();
      if (crit < 0.05 && mood) newLine = `${addr} CRITICAL_EMOTION_${mood.toUpperCase()}`;
      else if (crit < 0.15) newLine = `${addr} ERR_MEM_LEAK_AT_${val}`;

      setLeakedLines(prev => [...prev.slice(isMobile ? -40 : -80), newLine]);
    }, isMobile ? 400 : (250 - (corruption * 20)));

    return () => clearInterval(interval);
  }, [mood, corruption]);

  return (
    <div className={cn(
      "absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10",
      corruption > 3 ? "fx-jitter" : "",
      corruption > 0 ? "blur-[0.6px]" : "blur-[0.2px]"
    )}>
      <div className={cn(
        "flex flex-col font-mono text-[8px] sm:text-[9px] leading-tight text-[var(--phos-color)]",
        corruption > 4 ? "fx-leak-blur" : ""
      )}>
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
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
