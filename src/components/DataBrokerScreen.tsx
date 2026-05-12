import React, { useState } from 'react';
import { motion } from 'motion/react';
import { audioService } from '../audio';
import { socketService } from '../socket';

export function DataBrokerScreen({ onBack, points, clearance }: { onBack: () => void, points: number, clearance: number }) {
  const [logs, setLogs] = useState<string[]>(['[DATA BROKER] Connection established.']);

  const logAction = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
    audioService.playKeystroke();
  };

  const buyClearance = () => {
    if (points >= 500) {
      socketService.emit('buy_clearance');
      logAction('>> Requesting Level 2 Clearance clearance...');
    } else {
      logAction('!! Insufficient funds for clearance upgrade.');
    }
  };

  const buyIntel = () => {
    if (points >= 50) {
      logAction('>> Purchasing regional metadata (simulated)...');
      socketService.emit('spend_points', { amount: 50 });
      setTimeout(() => logAction('>> Intel: "Synthwave" listeners are active in sector 4.'), 1000);
    } else {
      logAction('!! Insufficient funds for intel.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full max-w-2xl mx-auto py-8 justify-center relative"
    >
      <div className="mb-4 text-center border-b border-[var(--phos-color)]/30 pb-4 relative z-10 px-4">
        <h2 className="text-2xl fx-holo mb-2 uppercase tracking-[0.2em]">DATA BROKER</h2>
        <p className="phosphor-dim text-sm mt-2 font-mono">&gt; Spend pts to acquire privileged data and access rights.</p>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row gap-6 p-4">
         <div className="flex-1 space-y-4">
            <h3 className="font-mono text-xs uppercase opacity-70 border-b border-[var(--phos-color)]/20 pb-1">Available Contracts</h3>
            
            <button onClick={buyIntel} className="w-full border border-[var(--phos-color)] p-4 hover:bg-[var(--phos-color)]/10 text-left group transition-all">
               <div className="font-mono font-bold group-hover:fx-holo">Regional Intel snippet</div>
               <div className="flex justify-between items-center mt-2 text-xs opacity-70 font-mono">
                 <span>Random global matching data.</span>
                 <span className="text-yellow-400">50 PTS</span>
               </div>
            </button>
 
            <button onClick={buyClearance} disabled={clearance > 1} className="w-full border border-[var(--phos-color)] p-4 hover:bg-[var(--phos-color)]/10 text-left group transition-all disabled:opacity-30 disabled:hover:bg-transparent">
               <div className="font-mono font-bold group-hover:fx-holo">Security Clearance Level 2</div>
               <div className="flex justify-between items-center mt-2 text-xs opacity-70 font-mono">
                 <span>Unlock premium Oracle threads.</span>
                 <span className="text-yellow-400">500 PTS</span>
               </div>
            </button>
         </div>
         <div className="flex-1 border border-[var(--phos-color)]/20 p-4 bg-black/40 flex flex-col font-mono text-xs overflow-hidden h-48 sm:h-auto">
            <h3 className="uppercase opacity-70 border-b border-[var(--phos-color)]/20 pb-1 mb-2">Terminal Logs</h3>
            <div className="flex-1 overflow-y-auto space-y-2 opacity-80">
               {logs.map((log, i) => (
                 <div key={i} className={i === 0 ? 'text-[var(--phos-color)]' : 'opacity-50'}>{log}</div>
               ))}
            </div>
         </div>
      </div>
      
      <div className="px-4 mt-6">
        <button onClick={() => { audioService.playKeystroke(); onBack(); }} className="border border-[var(--phos-color)] px-6 py-2 uppercase font-mono text-xs hover:bg-[var(--phos-color)]/20 transition-all opacity-80 hover:opacity-100">
          &lt; Return to Dashboard
        </button>
      </div>
    </motion.div>
  );
}
