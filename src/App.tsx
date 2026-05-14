import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { socketService } from './socket';
import { audioService } from './audio';
import { Terminal, Cpu, Heart, Coins, Volume2, VolumeX, Monitor } from 'lucide-react';
import { 
  BackgroundCode, 
  BootSequence, 
  ProfileSetupScreen, 
  DashboardScreen, 
  OracleScreen, 
  SelectionScreen, 
  MatchingScreen, 
  ChatBootSequence, 
  ChatScreen, 
  ConversationStatsScreen, 
  RatingScreen,
  AdTerminal
} from './components';

type AppState = 'START' | 'BOOT' | 'PROFILE' | 'DASHBOARD' | 'MOOD' | 'INTENT' | 'MATCHING' | 'CHAT_BOOT' | 'CHAT' | 'ORACLE' | 'RATING' | 'CHAT_STATS' | 'AD_TERMINAL';
type Theme = 'green' | 'amber';

export default function App() {
  const [appState, setAppState] = useState<AppState>('START');
  const [profile, setProfile] = useState<{ age: string, gender: string, city: string, music: string, hobby: string, mbti: string }>({ age: '', gender: '', city: '', music: '', hobby: '', mbti: ''});
  const [mood, setMood] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [reputation, setReputation] = useState<{ positive: number, negative: number }>({ positive: 0, negative: 0 });
  const [roomId, setRoomId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [chatStats, setChatStats] = useState<{ duration: number, rank: string, messageCount: number } | null>(null);
  const [voidMessages, setVoidMessages] = useState<Array<{ text: string, timestamp: number }>>([]);
  const [atmosphere, setAtmosphere] = useState<{ moods: Record<string, number>, online: number }>({ moods: {}, online: 0 });
  const [theme, setTheme] = useState<Theme>('green');
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [purgeSecondsRemaining, setPurgeSecondsRemaining] = useState<number | null>(null);
  const [purgePotTotal, setPurgePotTotal] = useState<number>(0);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    let savedId = localStorage.getItem('terminal_node_id');
    if (!savedId) {
      savedId = `NODE_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      localStorage.setItem('terminal_node_id', savedId);
    }
    setNodeId(savedId);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    socketService.connect();

    socketService.on('match_found', (data: any) => {
      setRoomId(data.roomId);
      setTopic(data.topic);
      if (!isMuted) audioService.playMatchFound();
      setAppState('CHAT_BOOT');
    });

    socketService.on('chat_terminated', (data: any) => {
      setChatStats(data);
      setAppState('CHAT_STATS');
    });

    socketService.on('void_broadcast', (data: any) => {
      setVoidMessages(prev => [data, ...prev].slice(0, 3));
    });

    socketService.on('atmosphere_updated', (data: any) => {
      setAtmosphere(data);
    });

    socketService.on('points_updated', (data: any) => {
      setPoints(data.points);
    });

    socketService.on('user_state_sync', (data: any) => {
      if (data.points !== undefined) setPoints(data.points);
      if (data.reputation !== undefined) setReputation(data.reputation);
    });

    socketService.on('purge_sync', (data: any) => {
      setPurgeSecondsRemaining(Math.floor(data.timeRemaining / 1000));
      if (data.potTotal !== undefined) setPurgePotTotal(data.potTotal);
    });

    socketService.on('global_purge_executed', () => {
      // Clear local non-persistent UI states if needed
      setVoidMessages([]);
      // Points will be updated via user_state_sync from server
      setReputation({ positive: 0, negative: 0 });
      setAppState(current => (current === 'CHAT' || current === 'MATCHING' ? 'DASHBOARD' : current));
    });
    
    socketService.on('global_glitch', (data: any) => {
      setIsGlitching(true);
      if (!isMuted) {
        audioService.playGlitch();
        setTimeout(() => audioService.playGlitch(), data.duration / 2);
      }
      setTimeout(() => setIsGlitching(false), data.duration);
    });

    return () => {
      socketService.off('match_found');
      socketService.off('chat_terminated');
      socketService.off('void_broadcast');
      socketService.off('atmosphere_updated');
      socketService.off('points_updated');
      socketService.off('user_state_sync');
      socketService.off('purge_sync');
      socketService.off('global_purge_executed');
      socketService.off('global_glitch');
    };
  }, []); // Only register once

  useEffect(() => {
    if (appState === 'DASHBOARD' && nodeId) {
      socketService.emit('register_node', { nodeId, profile });
    }
  }, [appState, nodeId, profile]);

  const handleJoinPool = (selectedIntent: string) => {
    if (!isMuted) audioService.playKeystroke();
    setIntent(selectedIntent);
    setAppState('MATCHING');
    socketService.emit('join_pool', { mood, intent: selectedIntent, profile, nodeId });
  };

  const onBootComplete = useCallback(() => {
    setAppState('PROFILE');
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'green' ? 'amber' : 'green');
  };

  const toggleAudioMute = () => {
    audioService.init();
    const muted = audioService.toggleMute();
    setIsMuted(muted);
    if (!muted) {
       audioService.startBGM(); 
    }
  };

  const formatPurgeTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isPurgeClose = purgeSecondsRemaining !== null && purgeSecondsRemaining < 60;

  return (
    <div className={`crt-screen h-screen w-screen overflow-hidden bg-black selection:bg-[var(--phos-color)] selection:text-black ${isPurgeClose || isGlitching ? 'fx-jitter' : ''} ${isGlitching ? 'fx-aberration' : ''}`}>
      <div className="crt-scanline-bar" />
      <div className="crt-overlay" />
      <div className="crt-bottom-fade" />
      <div className="crt-curve h-full w-full relative flex flex-col">
        <BackgroundCode mood={mood} />
        
        <div className="flex-1 p-4 sm:p-8 flex flex-col pointer-events-auto z-10 overflow-hidden">
          <header className="flex justify-between items-center border-b border-[var(--phos-color)]/30 pb-2 mb-4 sm:mb-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Terminal size={18} className="text-[var(--phos-color)] cursor-pointer" onClick={() => { if(appState !== 'START' && appState !== 'BOOT') setAppState('DASHBOARD'); }} />
                <span className="phosphor-glow font-bold tracking-widest uppercase cursor-pointer text-sm sm:text-base" onClick={() => { if(appState !== 'START' && appState !== 'BOOT') setAppState('DASHBOARD'); }}>
                  TERMINAL.FA
                </span>
                {purgeSecondsRemaining !== null && appState !== 'BOOT' && appState !== 'START' && (
                  <div className="ml-2 sm:ml-4 flex items-center gap-1.5 border-l border-[var(--phos-color)]/20 pl-2 sm:pl-4">
                    <span className="text-[7px] sm:text-[9px] uppercase tracking-tighter opacity-50 font-mono hidden xs:inline pr-1">DATA_PURGE_IN:</span>
                    <span className="text-[9px] font-sans opacity-50 hidden md:inline">پاکسازی داده‌ها در:</span>
                    <span className="text-[10px] sm:text-sm font-mono text-red-500 phosphor-glow tracking-widest">
                      {formatPurgeTime(purgeSecondsRemaining)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-[7px] sm:text-[9px] font-mono opacity-60">
                <span className="flex items-center gap-1"><Cpu size={10} /> {nodeId}</span>
                <span className="hidden sm:inline border-l border-[var(--phos-color)]/30 pl-3 uppercase">Sec_Mesh_Active</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-6">
              {appState !== 'BOOT' && appState !== 'START' && (
                <>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 sm:gap-1.5 text-yellow-400">
                      <Coins size={12} className="animate-pulse sm:w-3.5 sm:h-3.5" />
                      <span className="text-xs sm:text-base font-bold font-mono">{points}</span>
                    </div>
                    <div className="text-[7px] uppercase tracking-tighter opacity-50 font-mono">SIGNAL_FUEL</div>
                  </div>
                  
                  <div className="hidden xs:flex flex-col items-end border-l border-[var(--phos-color)]/20 pl-3 sm:pl-4">
                    <div className="flex items-center gap-1.5 text-red-500">
                      <Heart size={14} />
                      <span className="text-sm sm:text-base font-bold font-mono">+{reputation.positive}</span>
                    </div>
                    <div className="text-[7px] uppercase tracking-tighter opacity-50 font-mono">MESH_REPUTATION</div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-1 sm:gap-2 border-l border-[var(--phos-color)]/20 pl-3 sm:pl-4">
                <button onClick={toggleAudioMute} className="p-1 hover:bg-[var(--phos-color)]/10 rounded transition-colors text-[var(--phos-color)] opacity-70 hover:opacity-100">
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button onClick={toggleTheme} className="p-1 hover:bg-[var(--phos-color)]/10 rounded transition-colors text-[var(--phos-color)] opacity-70 hover:opacity-100">
                  <Monitor size={16} />
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {appState === 'START' && (
                 <motion.div key="start" exit={{ opacity: 0 }} className="flex h-full items-center justify-center cursor-pointer text-center px-4" onClick={() => { audioService.init(); if (!isMuted) audioService.playKeystroke(); if (!isMuted) audioService.startBGM(); setAppState('BOOT'); }}>
                   <span className="phosphor-glow animate-pulse text-xs sm:text-lg uppercase tracking-widest">&gt; INITIALIZE TERMINAL</span>
                 </motion.div>
              )}

              {appState === 'BOOT' && (
                <motion.div key="boot" exit={{ opacity: 0 }} className="h-full">
                  <BootSequence onComplete={onBootComplete} />
                </motion.div>
              )}
              
              {appState === 'PROFILE' && (
                <motion.div key="profile" exit={{ opacity: 0 }} className="h-full">
                  <ProfileSetupScreen onComplete={(p) => { setProfile(p); setAppState('DASHBOARD'); }} />
                </motion.div>
              )}

              {appState === 'DASHBOARD' && (
                <motion.div key="dashboard" exit={{ opacity: 0 }} className="h-full">
                  <DashboardScreen 
                    onFindConnection={() => setAppState('MOOD')} 
                    onOpenOracle={() => setAppState('ORACLE')} 
                    onOpenAdTerminal={() => setAppState('AD_TERMINAL')}
                    reputation={reputation} 
                    voidMessages={voidMessages} 
                    atmosphere={atmosphere} 
                    purgePotTotal={purgePotTotal}
                  />
                </motion.div>
              )}

              {appState === 'ORACLE' && (
                <motion.div key="oracle" exit={{ opacity: 0 }} className="h-full">
                  <OracleScreen onBack={() => setAppState('DASHBOARD')} nodeId={nodeId || ""} points={points} />
                </motion.div>
              )}

              {appState === 'MOOD' && (
                <motion.div key="mood" exit={{ opacity: 0 }} className="h-full">
                  <SelectionScreen 
                    title="SYS > HOW_ARE_YOU_FEELING?" 
                    farsiTitle="در حال حاضر چه احساسی دارید؟"
                    subtitle="Select current emotional parameter." 
                    farsiSubtitle="یک پارامتر احساسی را انتخاب کنید."
                    options={[
                      { id: 'lonely', en: 'lonely', fa: 'تنها' },
                      { id: 'happy', en: 'happy', fa: 'خوشحال' },
                      { id: 'curious', en: 'curious', fa: 'کنجکاو' },
                      { id: 'bored', en: 'bored', fa: 'بی‌حوصله' },
                      { id: 'anxious', en: 'anxious', fa: 'مضطرب' },
                      { id: 'thoughtful', en: 'thoughtful', fa: 'متفکر' },
                      { id: 'energetic', en: 'energetic', fa: 'پرانرژی' }
                    ]} 
                    onSelect={(m) => { audioService.playKeystroke(); setMood(m); setAppState('INTENT'); }} 
                  />
                </motion.div>
              )}

              {appState === 'INTENT' && (
                <motion.div key="intent" exit={{ opacity: 0 }} className="h-full">
                  <SelectionScreen 
                    title="SYS > WHAT_ARE_YOU_SEEKING?" 
                    farsiTitle="به دنبال چه هستید؟"
                    subtitle="Calibrate matching engine intent." 
                    farsiSubtitle="زمان‌بندی و قصد خود را کالیبره کنید."
                    options={[
                      { id: 'deep conversation', en: 'deep conversation', fa: 'گفتگوی عمیق' },
                      { id: 'random fun', en: 'random fun', fa: 'سرگرمی' },
                      { id: 'advice', en: 'advice', fa: 'مشورت' },
                      { id: 'listening', en: 'listening', fa: 'شنونده' },
                      { id: 'debate', en: 'debate', fa: 'بحث' },
                      { id: 'storytelling', en: 'storytelling', fa: 'داستان‌گویی' }
                    ]} 
                    onSelect={handleJoinPool} 
                  />
                </motion.div>
              )}

              {appState === 'MATCHING' && (
                <motion.div key="matching" exit={{ opacity: 0 }} className="h-full">
                  <MatchingScreen onCancel={() => { socketService.emit('leave_pool', {}); setAppState('DASHBOARD'); }} />
                </motion.div>
              )}
              
              {appState === 'CHAT_BOOT' && (
                <motion.div key="chatboot" exit={{ opacity: 0 }} className="h-full">
                  <ChatBootSequence onComplete={() => setAppState('CHAT')} />
                </motion.div>
              )}

              {appState === 'CHAT' && (
                <motion.div key="chat" exit={{ opacity: 0 }} className="h-full">
                  <ChatScreen topic={topic || ""} roomId={roomId!} points={points} nodeId={nodeId || ""} onPointsSpent={(cost, type) => { audioService.playKeystroke(); socketService.emit('propose_reveal', { cost, type: type.toLowerCase() }); }} />
                </motion.div>
              )}

              {appState === 'CHAT_STATS' && (
                <motion.div key="stats" exit={{ opacity: 0 }} className="h-full">
                  <ConversationStatsScreen stats={chatStats} onNext={() => setAppState('RATING')} />
                </motion.div>
              )}

              {appState === 'RATING' && (
                <motion.div key="rating" exit={{ opacity: 0 }} className="h-full">
                  <RatingScreen onComplete={() => setAppState('DASHBOARD')} />
                </motion.div>
              )}

              {appState === 'AD_TERMINAL' && (
                <motion.div key="ad" exit={{ opacity: 0 }} className="h-full">
                  <AdTerminal onComplete={() => setAppState('DASHBOARD')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
