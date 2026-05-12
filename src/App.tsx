import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { socketService } from './socket';
import { audioService } from './audio';
import { Terminal, ShieldAlert, Cpu, Heart, Coins, Eye, User, Navigation, Monitor } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AppState = 'START' | 'BOOT' | 'PROFILE' | 'MOOD' | 'INTENT' | 'MATCHING' | 'CHAT_BOOT' | 'CHAT';
type Theme = 'green' | 'amber';

export default function App() {
  const [appState, setAppState] = useState<AppState>('START');
  const [profile, setProfile] = useState<{ age: string, gender: string, city: string }>({ age: '', gender: '', city: ''});
  const [mood, setMood] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('green');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    socketService.connect();

    socketService.on('match_found', (data: any) => {
      setRoomId(data.roomId);
      setTopic(data.topic);
      audioService.playMatchFound();
      setAppState('CHAT_BOOT');
    });

    socketService.on('points_updated', (data: any) => {
      setPoints(data.points);
    });

    socketService.on('system_message', (data: any) => {
      // Could push this directly into chat messages via a global state or simple event
    });

    return () => {
      socketService.off('match_found', () => {});
      socketService.off('points_updated', () => {});
    };
  }, []);

  const handleJoinPool = (selectedIntent: string) => {
    audioService.playKeystroke();
    setIntent(selectedIntent);
    setAppState('MATCHING');
    socketService.emit('join_pool', { mood, intent: selectedIntent, profile });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'green' ? 'amber' : 'green');
  };

  return (
    <div className="crt-screen h-screen w-screen">
      <BackgroundCode />
      <div className="absolute inset-0 p-4 sm:p-8 flex flex-col pointer-events-auto z-10">
        {/* Header HUD */}
        <header className="flex justify-between items-center border-b border-[var(--phos-color)]/30 pb-2 mb-6">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-[var(--phos-color)]" />
            <span className="phosphor-glow font-bold tracking-widest uppercase">
              Terminal.fa
            </span>
          </div>
          <div className="flex flex-row items-center gap-4">
             {appState === 'CHAT' && (
               <div className="flex items-center gap-4 text-sm">
                 <div className="flex items-center gap-1 text-[var(--phos-color)]">
                   <Coins size={14} />
                   <span className="phosphor-glow">{points} pts</span>
                 </div>
                 <div className="flex items-center gap-1 text-red-500">
                   <ShieldAlert size={14} />
                   <span className="uppercase text-xs tracking-widest opacity-80">Secure</span>
                 </div>
               </div>
             )}
             <button
               onClick={toggleTheme}
               className="p-1 hover:bg-[var(--phos-color)]/10 rounded transition-colors text-[var(--phos-color)] opacity-70 hover:opacity-100"
               title="Toggle Retro Terminal Theme"
             >
               <Monitor size={16} />
             </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {appState === 'START' && (
               <motion.div 
                 key="start"
                 exit={{ opacity: 0 }}
                 className="flex h-full items-center justify-center cursor-pointer"
                 onClick={() => {
                   audioService.init();
                   audioService.playKeystroke();
                   setAppState('BOOT');
                 }}
               >
                 <span className="phosphor-glow animate-pulse text-lg uppercase">&gt; PRESS ANY KEY TO INITIALIZE TERMINAL</span>
               </motion.div>
            )}

            {appState === 'BOOT' && <BootSequence key="boot" onComplete={() => setAppState('PROFILE')} />}
            
            {appState === 'PROFILE' && (
              <ProfileSetupScreen 
                 key="profile"
                 onComplete={(p) => {
                    setProfile(p);
                    setAppState('MOOD');
                 }}
              />
            )}

            {appState === 'MOOD' && (
              <SelectionScreen 
                key="mood"
                title="SYS > HOW_ARE_YOU_FEELING?"
                subtitle="Select current emotional parameter."
                options={['lonely', 'curious', 'bored', 'anxious', 'thoughtful', 'energetic']}
                onSelect={(m) => {
                  audioService.playKeystroke();
                  setMood(m);
                  setAppState('INTENT');
                }}
              />
            )}

            {appState === 'INTENT' && (
              <SelectionScreen 
                key="intent"
                title="SYS > WHAT_ARE_YOU_SEEKING?"
                subtitle="Calibrate matching engine intent."
                options={['deep conversation', 'random fun', 'advice', 'listening', 'debate', 'storytelling']}
                onSelect={handleJoinPool}
              />
            )}

            {appState === 'MATCHING' && <MatchingScreen key="matching" />}
            
            {appState === 'CHAT_BOOT' && <ChatBootSequence key="chatboot" onComplete={() => setAppState('CHAT')} />}

            {appState === 'CHAT' && (
              <ChatScreen 
                key="chat" 
                topic={topic || ""} 
                roomId={roomId!}
                points={points}
                onPointsSpent={(cost, type) => {
                  audioService.playKeystroke();
                  socketService.emit('propose_reveal', { cost, type: type.toLowerCase() });
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------------------------
// VIEW COMPONENTS
// ---------------------------

function BackgroundCode() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10 blur-[1px]">
      <div className="animate-scroll-code flex flex-col font-mono text-[var(--phos-color)] text-[10px] leading-tight whitespace-pre">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i}>
{`0x${(Math.random() * 0xFFFFF).toString(16).padStart(5, '0').toUpperCase()} LOAD REG A, [MEM+${(Math.random() * 0xFF).toString(16).padStart(2, '0').toUpperCase()}]
0x${(Math.random() * 0xFFFFF).toString(16).padStart(5, '0').toUpperCase()} CALL SUB_${(Math.random() * 0xFFF).toString(16).padStart(3, '0').toUpperCase()}
0x${(Math.random() * 0xFFFFF).toString(16).padStart(5, '0').toUpperCase()} CHECK PROTOCOL_HANDSHAKE
0x${(Math.random() * 0xFFFFF).toString(16).padStart(5, '0').toUpperCase()} SYS.ALLOC(0x2000) -> OK
0x${(Math.random() * 0xFFFFF).toString(16).padStart(5, '0').toUpperCase()} JMP IF NOT ZERO 0x${(Math.random() * 0xFFFFF).toString(16).padStart(5, '0').toUpperCase()}`}
          </div>
        ))}
      </div>
    </div>
  );
}

function BootSequence({ onComplete }: { key?: string, onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      className="flex flex-col items-center justify-center h-full text-center space-y-4"
    >
      <Cpu size={48} className="text-[var(--phos-color)] mb-4 animate-pulse opacity-80" />
      <span className="phosphor-glow text-xl tracking-widest">INITIALIZING TERMINAL.FA</span>
      <span className="phosphor-dim text-sm uppercase">Bypass protocol active...</span>
      <span className="phosphor-dim text-sm uppercase">Loading anonymity layer...</span>
      <div className="w-48 h-1 bg-[var(--phos-dim)] mt-4 relative overflow-hidden">
        <motion.div 
          className="absolute top-0 left-0 h-full bg-[var(--phos-color)]"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

function ProfileSetupScreen({ onComplete }: { key?: string, onComplete: (p: any) => void }) {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (age && gender && city) {
       audioService.playKeystroke();
       onComplete({ age, gender, city });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full max-w-lg mx-auto py-12 justify-center"
    >
      <div className="mb-8 text-center">
        <h2 className="text-2xl phosphor-glow mb-2 uppercase">Establish Identity Matrix</h2>
        <p className="phosphor-dim text-sm">Data encrypted. Only revealed upon mutual agreement.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 flex flex-col">
        <div className="flex flex-col gap-1">
           <label className="phosphor-dim uppercase text-xs">&gt; Enter Age Range</label>
           <input required type="text" placeholder="e.g. 20-25" value={age} onChange={(e) => { audioService.playKeystroke(); setAge(e.target.value) }} className="bg-transparent border border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
           <label className="phosphor-dim uppercase text-xs">&gt; Enter Gender</label>
           <input required type="text" placeholder="e.g. Female" value={gender} onChange={(e) => { audioService.playKeystroke(); setGender(e.target.value) }} className="bg-transparent border border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
           <label className="phosphor-dim uppercase text-xs">&gt; Enter City (or Region)</label>
           <input required type="text" placeholder="e.g. Tehran" value={city} onChange={(e) => { audioService.playKeystroke(); setCity(e.target.value) }} className="bg-transparent border border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] transition-colors" />
        </div>
        
        <button type="submit" disabled={!age || !gender || !city} className="mt-4 border border-[var(--phos-color)] p-3 uppercase tracking-widest hover:bg-[var(--phos-color)]/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
          Initialize Profile
        </button>
      </form>
    </motion.div>
  );
}

function SelectionScreen({ title, subtitle, options, onSelect }: { key?: string, title: string; subtitle: string; options: string[]; onSelect: (val: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full max-w-2xl mx-auto py-12"
    >
      <div className="mb-12">
        <h2 className="text-2xl phosphor-glow mb-2">{title}</h2>
        <p className="phosphor-dim">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt, i) => (
          <motion.button
            key={opt}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelect(opt)}
            className="text-left border border-[var(--phos-color)]/30 p-4 hover:bg-[var(--phos-color)]/10 hover:border-[var(--phos-color)] transition-colors focus:outline-none focus:bg-[var(--phos-color)]/10 group relative overflow-hidden"
          >
            <span className="phosphor-dim mr-4 opacity-50 text-xs">0{i+1}</span>
            <span className="phosphor-glow uppercase">{opt}</span>
            <div className="absolute inset-0 bg-[var(--phos-color)] opacity-0 group-hover:opacity-5 transition-opacity" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function MatchingScreen() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full text-center space-y-6"
    >
      <div className="relative">
        <Heart size={48} className="text-[var(--phos-color)] animate-pulse relative z-10" />
        <div className="absolute inset-0 bg-[var(--phos-color)] blur-xl opacity-20 animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="phosphor-glow text-lg uppercase">Searching matching pool</span>
        <span className="phosphor-dim text-sm">Aligning intent frequencies...</span>
      </div>
    </motion.div>
  );
}

function ChatBootSequence({ onComplete }: { key?: string, onComplete: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    audioService.playBootUp();
    
    let isMounted = true;
    let i = 0;
    
    // Simulate rapid retro terminal output
    const interval = setInterval(() => {
      if (!isMounted) return;
      const memLoc = `0x${(Math.random() * 0xFFFFF).toString(16).padStart(5, '0').toUpperCase()}`;
      const size = Math.floor(Math.random() * 90) + 10;
      
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

function ChatScreen({ topic, roomId, points, onPointsSpent }: { key?: string, topic: string, roomId: string, points: number, onPointsSpent: (c: number, t: string) => void }) {
  const [messages, setMessages] = useState<Array<{ id: string, text: string, isSelf: boolean, system?: boolean }>>([]);
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
      setMessages(prev => [...prev, { id: data.id, text: data.text, isSelf: false }]);
    };
    
    const handleSystem = (data: any) => {
      audioService.playAlert();
      setMessages(prev => [...prev, { id: Date.now().toString(), text: data.text, isSelf: false, system: true }]);
    };

    const handlePartnerDisconnect = () => {
      setMessages(prev => [...prev, { id: 'sys-dis', text: 'PARTNER HAS DISCONNECTED.', isSelf: false, system: true }]);
    };

    socketService.on('receive_message', handleReceive);
    socketService.on('system_message', handleSystem);
    socketService.on('partner_disconnected', handlePartnerDisconnect);

    return () => {
      socketService.off('receive_message', handleReceive);
      socketService.off('system_message', handleSystem);
      socketService.off('partner_disconnected', handlePartnerDisconnect);
    };
  }, [topic]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="flex flex-col h-full bg-[var(--bg-color)] border border-[var(--phos-color)]/20 max-w-4xl mx-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]">
      
      {/* Identity Store / Actions Sidebar - hidden on mobile behind a menu conceptually, for now top bar */}
      <div className="border-b border-[var(--phos-color)]/20 p-2 flex gap-4 overflow-x-auto whitespace-nowrap text-xs">
        <span className="phosphor-dim uppercase py-1">Exchange Points:</span>
        <button 
          onClick={() => onPointsSpent(300, 'Age')}
          className="border border-[var(--phos-color)]/30 px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex items-center gap-1 group"
          title="Cost: 300 pts"
        >
           <Eye size={12} className="group-hover:animate-pulse" />
           <span>Propose Reveal Age (300)</span>
        </button>
        <button 
          onClick={() => onPointsSpent(500, 'City')}
          className="border border-[var(--phos-color)]/30 px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex items-center gap-1 group"
          title="Cost: 500 pts"
        >
           <Navigation size={12} className="group-hover:animate-pulse" />
           <span>Propose Reveal City (500)</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 backdrop-blur-[1px]">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
               "max-w-[80%] break-words p-3",
               m.system ? "mx-auto text-center border-y border-[var(--phos-color)]/30 text-xs text-[var(--phos-color)] uppercase max-w-full my-4 phosphor-dim" :
               m.isSelf ? "ml-auto border border-[var(--phos-color)]/50 bg-[var(--phos-color)]/5 text-[var(--phos-color)]" : 
               "mr-auto border border-white/10 text-white/90"
            )}
            dir="auto"
          >
            {m.system && <span className="mr-2">***</span>}
            <span className={cn(
              "font-sans", 
              m.system ? "font-mono" : "text-sm sm:text-base leading-relaxed"
            )}>
              {m.text}
            </span>
            {m.system && <span className="ml-2">***</span>}
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Base */}
      <form onSubmit={sendMessage} className="border-t border-[var(--phos-color)]/30 p-2 flex bg-black/40">
        <div className="flex items-center phosphor-dim px-3">
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
          placeholder="Enter message..."
          autoFocus /* eslint-disable-line jsx-a11y/no-autofocus */
          autoComplete="off"
          dir="auto"
        />
        <button type="submit" disabled={!input.trim()} className="px-4 text-[var(--phos-color)] phosphor-dim hover:text-white hover:phosphor-glow disabled:opacity-30 uppercase text-xs">
          Transmit
        </button>
      </form>
    </div>
  );
}

