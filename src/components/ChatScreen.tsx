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
  const [messages, setMessages] = useState<Array<{ id: string, text: string, image?: string, isSelf: boolean, system?: boolean, boost?: string, reactions?: Record<string, number>, status?: 'sent' | 'delivered' | 'read' }>>([]);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [timerExpiresAt, setTimerExpiresAt] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  
  // Voice & Video state
  const [voiceUnlocked, setVoiceUnlocked] = useState(false);
  const [videoUnlocked, setVideoUnlocked] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [partnerVoiceUnlocked, setPartnerVoiceUnlocked] = useState(false);
  const [partnerVideoUnlocked, setPartnerVideoUnlocked] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  
  const iceCandidateQueue = useRef<any[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typeSoundIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const emojis = ['🔥', '👍', '❤️', '😂', '😮', '💀'];

  useEffect(() => {
     if (partnerTyping) {
        if (typeSoundIntervalRef.current) clearInterval(typeSoundIntervalRef.current);
        typeSoundIntervalRef.current = setInterval(() => {
           audioService.playTypingTic();
        }, 150); // Simulate random typings with interval
     } else {
        if (typeSoundIntervalRef.current) clearInterval(typeSoundIntervalRef.current);
     }
     
     return () => {
         if (typeSoundIntervalRef.current) clearInterval(typeSoundIntervalRef.current);
     }
  }, [partnerTyping]);

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
      audioService.playMessageReceived();
      setMessages(prev => [...prev, { id: data.id, text: data.text, isSelf: false, boost: data.boost, reactions: {} }]);
      socketService.emit('mark_read', { id: data.id });
    };

    const handleMessageDelivered = (data: any) => {
       setMessages(prev => prev.map(m => m.id === data.id ? { ...m, status: 'delivered' } : m));
    };

    const handleMessageRead = (data: any) => {
       setMessages(prev => prev.map(m => m.id === data.id ? { ...m, status: 'read' } : m));
    };

    const handleSystem = (data: any) => {
      audioService.playAlert();
      setMessages(prev => [...prev, { id: Date.now().toString(), text: data.text, isSelf: false, system: true }]);
    };

    const handlePartnerDisconnect = () => {
      setMessages(prev => [...prev, { id: 'sys-dis', text: 'PARTNER HAS DISCONNECTED. / هم‌صحبت شما از محیط گفتگو خارج شد.', isSelf: false, system: true }]);
    };

    const handlePartnerTyping = (data: { isTyping: boolean }) => {
      setPartnerTyping(data.isTyping);
      if (data.isTyping) {
        // play subtle background typing sound? We can just use playKeystroke at lower volume or something. 
        // We'll leave it visual for now to avoid annoyance, maybe just a very muted glitch.
      }
    };

    const handleWebRTCOffer = async (data: any) => {
      setIncomingCall(data);
    };

    const handleWebRTCAnswer = async (data: any) => {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      setCallActive(true);
    };

    const handleWebRTCIceCandidate = async (data: any) => {
      if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) {
         iceCandidateQueue.current.push(data.candidate);
         return;
      }
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    };

    const handleFeatureUnlocked = (data: any) => {
      if (data.feature === 'voice') setPartnerVoiceUnlocked(true);
      if (data.feature === 'video') setPartnerVideoUnlocked(true);
      setMessages(prev => [...prev, { id: Date.now().toString(), text: `PARTNER UNLOCKED ${data.feature.toUpperCase()}. / هم‌صحبت شما ویژگی ${data.feature} را فعال کرد.`, isSelf: false, system: true }]);
    };

    const handleMessageUpdate = (data: any) => {
       setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, boost: data.boost, ...data.updates } : m));
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
    socketService.on('message_delivered', handleMessageDelivered);
    socketService.on('message_read', handleMessageRead);
    socketService.on('system_message', handleSystem);
    socketService.on('partner_disconnected', handlePartnerDisconnect);
    socketService.on('partner_typing', handlePartnerTyping);
    socketService.on('message_updated', handleMessageUpdate);
    socketService.on('receive_reaction', handleReceiveReaction);
    socketService.on('webrtc_offer', handleWebRTCOffer);
    socketService.on('webrtc_answer', handleWebRTCAnswer);
    socketService.on('webrtc_ice_candidate', handleWebRTCIceCandidate);
    socketService.on('partner_unlocked_feature', handleFeatureUnlocked);

    return () => {
      socketService.off('receive_message', handleReceive);
      socketService.off('message_delivered', handleMessageDelivered);
      socketService.off('message_read', handleMessageRead);
      socketService.off('system_message', handleSystem);
      socketService.off('partner_disconnected', handlePartnerDisconnect);
      socketService.off('partner_typing', handlePartnerTyping);
      socketService.off('message_updated', handleMessageUpdate);
      socketService.off('receive_reaction', handleReceiveReaction);
      socketService.off('webrtc_offer', handleWebRTCOffer);
      socketService.off('webrtc_answer', handleWebRTCAnswer);
      socketService.off('webrtc_ice_candidate', handleWebRTCIceCandidate);
      socketService.off('partner_unlocked_feature', handleFeatureUnlocked);
    };
  }, [topic, roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBoost = (messageId: string, type: string) => {
    audioService.playAlert();
    socketService.emit('boost_message', { roomId, messageId, type, nodeId });
  };

  const initWebRTC = async (withVideo: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      localStreamRef.current = stream;
      if (localVideoRef.current && withVideo) {
         localVideoRef.current.srcObject = stream;
      }
      
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = peerConnection;

      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
           remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('webrtc_ice_candidate', { candidate: event.candidate });
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketService.emit('webrtc_offer', { offer, withVideo });
      setCallActive(true);
      if (withVideo) setIsVideoActive(true);
      else setIsVoiceActive(true);

    } catch (err) {
       console.error("WebRTC Error:", err);
       setMessages(prev => [...prev, { id: Date.now().toString(), text: "SYS_ERR: Could not access media devices.", isSelf: false, system: true }]);
    }
  };

  const acceptCall = async () => {
     if (!incomingCall) return;
     const withVideo = incomingCall.withVideo;
     try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
        localStreamRef.current = stream;
        if (localVideoRef.current && withVideo) {
           localVideoRef.current.srcObject = stream;
        }

        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peerConnectionRef.current = peerConnection;

        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        peerConnection.ontrack = (event) => {
          if (remoteVideoRef.current) {
             remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socketService.emit('webrtc_ice_candidate', { candidate: event.candidate });
          }
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socketService.emit('webrtc_answer', { answer });

        iceCandidateQueue.current.forEach(async (candidate) => {
           await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        });
        iceCandidateQueue.current = [];

        setCallActive(true);
        setIncomingCall(null);
        if (withVideo) setIsVideoActive(true);
        else setIsVoiceActive(true);
     } catch (err) {
        console.error("WebRTC Error:", err);
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "SYS_ERR: Could not access media devices.", isSelf: false, system: true }]);
     }
  };

  const unlockVoice = () => {
    if (points < 500) return;
    onPointsSpent(500, 'Unlock Voice Channel');
    setVoiceUnlocked(true);
    socketService.emit('unlock_feature', { feature: 'voice' });
  };

  const unlockVideo = () => {
    if (points < 1000) return;
    onPointsSpent(1000, 'Unlock Video Channel');
    setVideoUnlocked(true);
    socketService.emit('unlock_feature', { feature: 'video' });
  };

  const startVoiceCall = () => {
    initWebRTC(false);
  };

  const startVideoCall = () => {
    initWebRTC(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     if (points < 50) {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "SYS_ERR: INSUFFICIENT_FUNDS for Image Transfer (50pts required)", isSelf: false, system: true }]);
        return;
     }
     
     const reader = new FileReader();
     reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onPointsSpent(50, 'Send Encrypted Image');
        const newMsgId = Date.now().toString();
        const newMsg = { id: newMsgId, text: '', image: base64, isSelf: true, status: 'sent' as const };
        audioService.playMessageSent();
        setMessages(prev => [...prev, newMsg]);
        socketService.emit('send_message', { roomId, id: newMsgId, text: '', image: base64 });
     };
     reader.readAsDataURL(file);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length > input.length) {
       audioService.playKeystroke();
    }
    setInput(e.target.value);
    
    socketService.emit('typing', { isTyping: e.target.value.length > 0 });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.emit('typing', { isTyping: false });
    }, 1500);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    socketService.emit('typing', { isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (input.startsWith('/') && !input.startsWith('/accept ') && !input.startsWith('/decline ')) {
       const cmd = input.split(' ')[0];
       
       if (cmd === '/ping') {
          const msg = { id: `sys-loc-${Date.now()}`, text: `PONG: ${Math.floor(Math.random() * 50) + 10}ms`, isSelf: false, system: true };
          setMessages(prev => [...prev, msg]);
       } else if (cmd === '/clear') {
          setMessages([]);
       } else if (cmd === '/whoami') {
          const sysId = localStorage.getItem('terminal_node_id') || 'UNKNOWN';
          const msg = { id: `sys-loc-${Date.now()}`, text: `NODE_ID: ${sysId}`, isSelf: false, system: true };
          setMessages(prev => [...prev, msg]);
       } else if (cmd === '/roll') {
          const roll = Math.floor(Math.random() * 100) + 1;
          socketService.emit('send_message', { roomId, text: `[SYSTEM] Rolled: ${roll}` });
       } else if (cmd === '/help') {
          const msg = { id: `sys-loc-${Date.now()}`, text: `COMMANDS: /ping, /clear, /whoami, /roll, /help`, isSelf: false, system: true };
          setMessages(prev => [...prev, msg]);
       } else {
          const msg = { id: `sys-loc-${Date.now()}`, text: `SYS_ERR: Unknown command '${cmd}'`, isSelf: false, system: true };
          setMessages(prev => [...prev, msg]);
       }
       setInput('');
       return;
    }

    if (input.startsWith('/accept ')) {
       const type = input.split(' ')[1];
       if (type) {
         socketService.emit('accept_reveal', { type });
         setInput('');
         return;
       }
    }

    const newMsgId = Date.now().toString();
    const newMsg = { id: newMsgId, text: input, isSelf: true, status: 'sent' as const };
    audioService.playMessageSent();
    setMessages(prev => [...prev, newMsg]);
    socketService.emit('send_message', { roomId, id: newMsgId, text: input });
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
          onClick={unlockVoice}
          disabled={voiceUnlocked || points < 500}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex flex-col items-center group whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
          title="Cost: 500 pts"
        >
           <div className="flex items-center gap-1">
             <span>Voice (500)</span>
           </div>
           <span className="font-sans text-[8px] opacity-70">صدا</span>
        </button>
        <button 
          onClick={unlockVideo}
          disabled={videoUnlocked || points < 1000}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex flex-col items-center group whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
          title="Cost: 1000 pts"
        >
           <div className="flex items-center gap-1">
             <span>Video (1000)</span>
           </div>
           <span className="font-sans text-[8px] opacity-70">تصویر</span>
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
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 relative z-10 backdrop-blur-[1px] scrollbar-hide pb-10">
        {messages.map((m, i) => {
          const reversedIndex = messages.length - 1 - i;
          // Fading terminal effect: older messages fade out
          const msgOpacity = Math.max(0.2, 1 - Math.max(0, reversedIndex - 4) * 0.15);
          
          return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
               "max-w-[85%] sm:max-w-[80%] break-words p-2 sm:p-3 relative group will-change-[opacity]",
               m.system ? "mx-auto text-center border-y border-[var(--phos-color)]/30 text-[10px] sm:text-xs text-[var(--phos-color)] uppercase max-w-full my-3 sm:my-4 phosphor-dim" :
               m.isSelf ? "ml-auto border border-[var(--phos-color)]/50 bg-[var(--phos-color)]/5 text-[var(--phos-color)]" : 
               "mr-auto border border-white/10 text-white/90",
               m.boost === 'highlight' ? "shadow-[0_0_15px_var(--phos-color)] border-[var(--phos-color)] phosphor-glow" : "",
               m.boost === 'glitch' ? "fx-jitter" : "",
               m.boost === 'redact' ? "bg-black text-black hover:text-[var(--phos-color)] transition-colors cursor-pointer" : ""
            )}
            style={{ opacity: msgOpacity }}
            dir="auto"
          >
            {m.system && <span className="mr-2">***</span>}
            {m.image && (
               <div className="mb-3 relative inline-block">
                 <img src={m.image} alt="Encrypted transmission" className="max-w-full max-h-48 object-contain border border-[var(--phos-color)]/30 opacity-80 mix-blend-screen grayscale contrast-150" />
                 <div className="absolute top-0 left-0 right-0 bg-black/60 text-[8px] sm:text-[10px] text-red-500 p-1 text-center font-mono animate-pulse uppercase tracking-widest border-b border-red-500/50">
                   Self-Destruct Imminent [30s]
                 </div>
                 <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 origin-left" style={{ animation: 'shrinkX 30s linear forwards' }} />
               </div>
            )}
            <span className={cn(
              "font-sans", 
              m.system ? "font-mono" : "text-[13px] sm:text-base leading-relaxed",
              m.boost === 'redact' ? "select-none" : ""
            )}>
              {m.text}
            </span>
            {m.system && <span className="ml-2">***</span>}

            {/* Status Indicator */}
            {m.isSelf && !m.system && (
               <div className="absolute -bottom-4 right-1 text-[8px] font-mono opacity-50 uppercase tracking-tighter">
                 {m.status === 'sent' && 'SENT'}
                 {m.status === 'delivered' && 'DLVRD'}
                 {m.status === 'read' && <span className="text-[var(--phos-color)] font-bold">READ</span>}
               </div>
            )}

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
          );
        })}

        {partnerTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }}
            className="text-[9px] sm:text-xs font-mono text-[var(--phos-color)]/50 uppercase ml-4 animate-pulse flex items-center gap-2"
          >
             <span>INCOMING_TRANSMISSION</span>
             <div className="flex gap-1">
               <span className="w-1 h-1 bg-[var(--phos-color)]/50 animate-bounce" style={{ animationDelay: '0ms' }} />
               <span className="w-1 h-1 bg-[var(--phos-color)]/50 animate-bounce" style={{ animationDelay: '150ms' }} />
               <span className="w-1 h-1 bg-[var(--phos-color)]/50 animate-bounce" style={{ animationDelay: '300ms' }} />
             </div>
          </motion.div>
        )}
        
        {/* WebRTC Overlays */}
        {(isVoiceActive || callActive) && (
          <div className="border border-[var(--phos-color)] bg-black/80 my-4 p-2 relative flex flex-wrap gap-4 justify-center items-center">
             <div className="absolute top-1 left-2 text-[8px] uppercase tracking-widest text-[var(--phos-color)]/50">SECURE_AV_CHANNEL</div>
             {isVideoActive ? (
                <>
                  <video ref={localVideoRef} autoPlay muted playsInline className="h-24 w-auto border border-[var(--phos-color)]/50 grayscale contrast-125 object-cover" />
                  <video ref={remoteVideoRef} autoPlay playsInline className="h-32 w-auto border border-[var(--phos-color)] grayscale contrast-125 object-cover" />
                </>
             ) : (
                <div className="h-16 flex items-center justify-center font-mono text-sm uppercase px-8">
                   [ Voice Stream Active ]
                   <audio ref={remoteVideoRef as any} autoPlay />
                </div>
             )}
          </div>
        )}

        {/* Start Call UI if unlocked */}
        {!callActive && voiceUnlocked && partnerVoiceUnlocked && (
           <div className="flex justify-center p-2 mb-2">
              <button 
                onClick={startVoiceCall}
                className="border border-[var(--phos-color)] bg-[var(--phos-color)]/10 text-[var(--phos-color)] px-4 py-1 text-[10px] uppercase tracking-widest hover:bg-[var(--phos-color)]/30 font-mono"
              >
                 START_VOICE_LINK
              </button>
           </div>
        )}
        
        {!callActive && videoUnlocked && partnerVideoUnlocked && (
           <div className="flex justify-center p-2 mb-2">
              <button 
                onClick={startVideoCall}
                className="border border-[var(--phos-color)] bg-[var(--phos-color)]/10 text-[var(--phos-color)] px-4 py-1 text-[10px] uppercase tracking-widest hover:bg-[var(--phos-color)]/30 font-mono"
              >
                 START_VIDEO_LINK
              </button>
           </div>
        )}

        {incomingCall && !callActive && (
           <div className="border border-[var(--phos-color)] bg-black/90 p-4 m-4 flex flex-col items-center justify-center gap-4 text-[var(--phos-color)] shadow-[0_0_15px_var(--phos-color)] relative z-50">
              <div className="font-mono text-sm uppercase tracking-widest animate-pulse">
                 Incoming {incomingCall.withVideo ? 'Video' : 'Voice'} Transmission...
              </div>
              <div className="flex gap-4">
                 <button 
                   onClick={acceptCall}
                   className="border border-[var(--phos-color)] px-4 py-2 hover:bg-[var(--phos-color)]/20 font-mono text-xs uppercase transition-colors"
                 >
                   Accept
                 </button>
                 <button 
                   onClick={() => setIncomingCall(null)}
                   className="border border-red-500/50 text-red-500/80 px-4 py-2 hover:bg-red-500/20 font-mono text-xs uppercase transition-colors"
                 >
                   Reject
                 </button>
              </div>
           </div>
        )}

        <div ref={bottomRef} />
      </div>

      {input.startsWith('/') && (
         <div className="px-4 py-2 text-[10px] sm:text-xs text-[var(--phos-color)]/70 font-mono italic flex items-center justify-between border-t border-[var(--phos-color)]/20 bg-black/40">
            <span>COMMAND RECOGNIZED</span>
            <span className="opacity-50 text-[8px] sm:text-[9px]">Try: /help, /ping, /roll, /whoami, /clear</span>
         </div>
      )}

      {/* Input Base */}
      <form onSubmit={sendMessage} className="border-t border-[var(--phos-color)]/30 p-1 sm:p-2 flex bg-black/60 relative z-20 items-center">
        <label className="cursor-pointer pl-2 pr-1 opacity-80 hover:opacity-100 transition-opacity flex items-center justify-center group relative overflow-visible flex-shrink-0">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageSelect}
            className="hidden" 
            ref={fileInputRef}
          />
          <div className="flex items-center justify-center border border-[var(--phos-color)] text-[var(--phos-color)] bg-[var(--phos-color)]/10 group-hover:bg-[var(--phos-color)] px-2 py-1 gap-1 transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-black">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
             </svg>
             <span className="font-mono text-[10px] group-hover:text-black uppercase tracking-wider font-bold">50 PTS</span>
          </div>
          <div className="absolute bottom-10 left-0 hidden group-hover:block whitespace-nowrap bg-black text-[9px] text-[var(--phos-color)] border border-[var(--phos-color)] p-1 z-50">
             Send self-destructing image
          </div>
        </label>
        
        <div className="flex items-center phosphor-dim px-2 sm:px-3">
          <span className="animate-pulse">{'>'}</span>
        </div>
        <input 
          type="text" 
          value={input}
          onChange={handleInputChange}
          className="flex-1 bg-transparent border-none outline-none text-[var(--phos-color)] phosphor-glow font-sans text-sm sm:text-base py-2 px-1 focus:ring-0 min-w-0"
          placeholder="Message... (type / for cmds)"
          autoFocus /* eslint-disable-line jsx-a11y/no-autofocus */
          autoComplete="off"
          dir="auto"
        />
        <button 
          type="button" 
          className="text-[9px] border border-[var(--phos-color)]/30 px-1.5 py-0.5 rounded hover:bg-[var(--phos-color)]/10 mr-2 self-center font-mono"
          title="Terminal Commands: /help, /ping, /roll, /whoami, /clear"
          onClick={() => setInput('/help')}
        >
          /CMD
        </button>
        <button type="submit" disabled={!input.trim()} className="px-2 sm:px-4 text-[var(--phos-color)] flex flex-col items-center phosphor-dim hover:text-white hover:phosphor-glow disabled:opacity-30 uppercase text-[10px] sm:text-xs font-bold pt-1">
          <span>Send</span>
          <span className="font-sans text-[9px] lowercase opacity-70">ارسال</span>
        </button>
      </form>
    </div>
  );
}
