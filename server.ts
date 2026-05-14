import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  // --- IN-MEMORY RAM STORAGE (NON-PERSISTENT) ---
  // When the server restarts, everything is purged.
  let oracleStore = new Map<string, any>(); // Key: threadId
  let oracleAnswers = new Map<string, any[]>(); // Key: threadId, Val: answers[]

  // Local Matchmaking State
  let queue: any[] = [];
  let activeChats = new Map<string, any>();
  let socketToUser = new Map<string, any>(); // Map socket.id to user data in memory
  let nodeToUser = new Map<string, any>();   // Map nodeId to user data (persists until purge)
  
  // GLOBAL PURGE TIMER (Every 4 Hours)
  const PURGE_INTERVAL_MS = 4 * 60 * 60 * 1000;
  let nextPurgeTime = Date.now() + PURGE_INTERVAL_MS;
  let globalPurgePot = 0;

  const performGlobalPurge = () => {
    console.log('[RAM_PURGE] !! AUTO_PURGE_SEQUENCE_INITIALIZED !!');
    oracleStore = new Map();
    oracleAnswers = new Map();
    queue = [];
    activeChats = new Map();
    socketToUser = new Map();
    nodeToUser = new Map();
    nextPurgeTime = Date.now() + PURGE_INTERVAL_MS;
    globalPurgePot = 0;
    io.emit('global_purge_executed');
    io.emit('oracle_updated');
  };

  setInterval(() => {
    const timeRemaining = Math.max(0, nextPurgeTime - Date.now());
    io.emit('purge_sync', { timeRemaining, potTotal: globalPurgePot });
    if (timeRemaining <= 0) {
      performGlobalPurge();
    }

    // Random Global Glitch Event (0.5% chance per second)
    if (Math.random() < 0.005) {
       const glitches = ['SIGNAL_SPIKE', 'MEM_LEAK_DETECTED', 'NODE_COLLISION', 'CORRUPT_FRAME'];
       const event = glitches[Math.floor(Math.random() * glitches.length)];
       io.emit('global_glitch', { type: event, duration: 2000 + Math.random() * 3000 });
       console.log(`[EVENT] Global glitch triggered: ${event}`);
    }
  }, 1000);
  
  const globalMoods = {
    lonely: 10, curious: 15, bored: 5, anxious: 20, thoughtful: 30, energetic: 2, happy: 8
  };

  const DEEP_PROMPTS = [
    "What is something you've never told anyone?",
    "If you could erase one memory, what would it be?",
    "What did you want to be when you were a child?",
    "What's your biggest irrational fear?",
    "When was the last time you felt truly understood?",
    "What's a belief you hold that most people disagree with?",
    "If today was your last day, what would you regret not doing?"
  ];

  const ACTIVITIES = [
    "Let's play 2 Truths and 1 Lie. I'll go first.",
    "Scenario: You find a briefcase with $1M but you can never see your best friend again. Do you take it?",
    "Describe your current mood using only a movie title.",
    "What is your most controversial food opinion?"
  ];

  // Helper matching logic
  const findMatch = (userId: string) => {
    const matchIndex = queue.findIndex(u => u.socketId !== userId);
    if (matchIndex > -1) {
      const partner = queue[matchIndex];
      queue.splice(matchIndex, 1);
      return partner;
    }
    return null;
  };

  const syncUserState = (socketId: string) => {
    const user = socketToUser.get(socketId);
    if (user) {
        io.to(socketId).emit('user_state_sync', {
            points: user.points,
            reputation: user.reputation
        });
        io.to(socketId).emit('points_updated', { points: user.points });
    }
  };

  const terminateChat = (roomId: string) => {
    const room = activeChats.get(roomId);
    if (!room) return;

    const durationSec = Math.floor((Date.now() - room.createdAt) / 1000);
    let rank = "Top 50%";
    if (durationSec > 600) rank = "Top 1%";
    else if (durationSec > 300) rank = "Top 5%";
    else if (durationSec > 120) rank = "Top 15%";
    else if (durationSec > 60) rank = "Top 30%";

    const stats = {
      duration: durationSec,
      rank: rank,
      messageCount: room.messageCount || 0
    };

    room.users.forEach((id: string) => {
      io.to(id).emit('chat_terminated', stats);
      const u = socketToUser.get(id);
      if (u) u.currentRoom = null;
    });

    activeChats.delete(roomId);
  };

  const registerUser = (socketId: string, data: any) => {
    const nodeId = data.nodeId || `NODE_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    
    let user = nodeToUser.get(nodeId);
    if (!user) {
        user = {
            nodeId,
            points: 1000,
            reputation: { positive: 0, negative: 0 },
            profile: data.profile || {},
            mood: data.mood || null,
            intent: data.intent || null,
            currentRoom: null,
            lastPartnerId: null,
            lastAdClaimedAt: 0
        };
        nodeToUser.set(nodeId, user);
    } else {
        // Update profile if provided
        if (data.profile) user.profile = { ...user.profile, ...data.profile };
    }

    // Link current socket
    user.socketId = socketId;
    socketToUser.set(socketId, user);
    return user;
  };

  io.on('connection', (socket) => {
    console.log('[RAM_STORAGE] Terminal connect:', socket.id);
    const sId = socket.id;

    io.emit('atmosphere_updated', { moods: globalMoods, online: io.engine.clientsCount });

    socket.on('register_node', (data) => {
      registerUser(sId, data);
      syncUserState(sId);
    });

    socket.on('disconnect', () => {
      queue = queue.filter(u => u.socketId !== sId);
      const user = socketToUser.get(sId);
      if (user?.currentRoom) terminateChat(user.currentRoom);
      socketToUser.delete(sId);
      io.emit('atmosphere_updated', { moods: globalMoods, online: io.engine.clientsCount });
    });

    socket.on('leave_pool', () => {
      queue = queue.filter(u => u.socketId !== sId);
      const user = socketToUser.get(sId);
      if (user?.currentRoom) terminateChat(user.currentRoom);
    });

    socket.on('spend_points', (data) => {
       const user = socketToUser.get(sId);
       if (user && user.points >= data.amount) {
           user.points -= data.amount;
           syncUserState(sId);
       }
    });

    socket.on('rate_partner', (data) => {
       const user = socketToUser.get(sId);
       if (!user || !user.lastPartnerId) return;
       const partner = socketToUser.get(user.lastPartnerId);
       
       if (partner) {
          const positiveTags = ['thoughtful', 'respectful', 'funny', 'comforting', 'intelligent'];
          let newPos = 0; let newNeg = 0;
          (data.tags as string[]).forEach(tag => {
              if (positiveTags.includes(tag)) newPos++;
              else newNeg++;
          });
          partner.reputation.positive += newPos;
          partner.reputation.negative += newNeg;
          if (newPos > 0) partner.points += Math.floor(Math.random() * 20) + 10;
          syncUserState(partner.socketId);
       }
    });

    socket.on('request_atmosphere', () => {
       socket.emit('atmosphere_data', { moods: globalMoods, online: io.engine.clientsCount }); 
    });

    socket.on('request_oracle', () => {
       const threads = Array.from(oracleStore.values())
         .sort((a,b) => {
            if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1;
            return b.timestamp - a.timestamp;
         })
         .slice(0, 40);
       socket.emit('oracle_data', threads);
    });

    socket.on('request_thread_details', (data) => {
       const answers = oracleAnswers.get(data.threadId) || [];
       socket.emit('thread_details', { threadId: data.threadId, answers });
    });

    socket.on('post_oracle_thread', (data) => {
       const user = socketToUser.get(sId);
       if (!user) return;
       const bountyAmount = data.bounty || 0;
       
       if (bountyAmount > 0) {
          if (user.points < bountyAmount) {
             socket.emit('system_message', { text: "!! INSUFFICIENT FUNDS FOR BOUNTY_STAKING !!" });
             return;
          }
          user.points -= bountyAmount;
          syncUserState(sId);
       }

       const threadId = 't_' + Date.now() + Math.random().toString(36).substring(7);
       const newThread = {
          id: threadId,
          authorId: user.nodeId,
          question: data.question,
          timestamp: Date.now(),
          bounty: bountyAmount,
          isResolved: false,
          answerCount: 0
       };
       oracleStore.set(threadId, newThread);
       oracleAnswers.set(threadId, []);
       io.emit('oracle_updated');
    });

    socket.on('post_oracle_answer', (data) => {
       const user = socketToUser.get(sId);
       if (!user) return;
       const thread = oracleStore.get(data.threadId);
       if (!thread) return;

       const answers = oracleAnswers.get(data.threadId) || [];
       answers.push({
          id: 'a_' + Date.now(),
          authorId: user.nodeId,
          text: data.text,
          timestamp: Date.now(),
          vouchCount: 0
       });
       thread.answerCount = answers.length;
       io.emit('oracle_updated');
    });

    socket.on('vouch_answer', (data) => {
       const answers = oracleAnswers.get(data.threadId) || [];
       const answer = answers.find(a => a.id === data.answerId);
       if (answer) {
          answer.vouchCount++;
          for (const u of socketToUser.values()) {
            if (u.nodeId === answer.authorId) {
              u.reputation.positive++;
              syncUserState(u.socketId);
            }
          }
          io.emit('oracle_updated');
       }
    });

    socket.on('resolve_thread', (data) => {
       const thread = oracleStore.get(data.threadId);
       const user = socketToUser.get(sId);
       if (!thread || !user || thread.authorId !== user.nodeId) return;

       if (thread.bounty > 0) {
          const answers = oracleAnswers.get(data.threadId) || [];
          const topAnswer = [...answers].sort((a,b) => b.vouchCount - a.vouchCount)[0];
          if (topAnswer) {
             for (const u of socketToUser.values()) {
               if (u.nodeId === topAnswer.authorId) {
                  u.points += thread.bounty;
                  syncUserState(u.socketId);
               }
             }
          }
       }
       thread.isResolved = true;
       io.emit('oracle_updated');
    });

    socket.on('join_pool', (data) => {
      const userData = registerUser(sId, data);
      userData.mood = data.mood;
      userData.intent = data.intent;

      syncUserState(sId);

      if (data.mood && globalMoods[data.mood as keyof typeof globalMoods] !== undefined) {
         globalMoods[data.mood as keyof typeof globalMoods]++;
         io.emit('atmosphere_updated', { moods: globalMoods, online: io.engine.clientsCount });
      }
      
      const partner = findMatch(sId);
      if (partner) {
        const roomId = `room_${sId}_${partner.socketId}`;
        socket.join(roomId);
        io.sockets.sockets.get(partner.socketId)?.join(roomId);
        
        activeChats.set(roomId, { 
           users: [sId, partner.socketId],
           topic: data.intent === partner.intent ? data.intent : 'Life choices',
           createdAt: Date.now(),
           expiresAt: Date.now() + 5 * 60 * 1000, // 5 minute chat timer
           lastActivityAt: Date.now(),
           pendingReveals: {},
           promptInjected: false,
           milestones: { '1': false, '5': false },
           messageCount: 0
        });
        
        userData.currentRoom = roomId;
        userData.lastPartnerId = partner.socketId;
        const partnerState = socketToUser.get(partner.socketId);
        if (partnerState) {
          partnerState.currentRoom = roomId;
          partnerState.lastPartnerId = sId;
        }

        io.to(roomId).emit('match_found', { roomId, topic: activeChats.get(roomId).topic });
      } else {
        queue.push({ socketId: sId, ...data });
      }
    });

    socket.on('send_message', (data) => {
      const user = socketToUser.get(sId);
      if (user && user.currentRoom) {
        if (data.text.startsWith('/void ')) {
           const voidMsg = data.text.replace('/void ', '');
           io.emit('void_broadcast', { text: voidMsg, timestamp: Date.now() });
           socket.emit('system_message', { text: ">>> Message cast into the void. It is now part of the global noise. <<<" });
           return;
        }

        socket.to(user.currentRoom).emit('receive_message', {
          id: Date.now().toString(),
          sender: sId,
          text: data.text,
          timestamp: Date.now()
        });
        
        const room = activeChats.get(user.currentRoom);
        if (room) {
          room.lastActivityAt = Date.now();
          room.messageCount++;
        }
        user.points += 5;
        socket.emit('points_updated', { points: user.points, reason: '+5 msg' });
      }
    });

    socket.on('send_reaction', (data) => {
      const user = socketToUser.get(sId);
      if (user && user.currentRoom) {
        socket.to(user.currentRoom).emit('receive_reaction', {
          messageId: data.messageId,
          emoji: data.emoji,
          sender: sId
        });
      }
    });

    socket.on('extend_chat_timer', (data) => {
       const user = socketToUser.get(sId);
       if (!user || !user.currentRoom) return;
       const room = activeChats.get(user.currentRoom);
       if (!room) return;

       const cost = 200; // Extend cost
       if (user.points >= cost) {
          user.points -= cost;
          room.expiresAt += 2 * 60 * 1000; // Add 2 minutes
          syncUserState(sId);
          io.to(user.currentRoom).emit('system_message', { text: `[PROTOCOL_OVERRIDE] > Memory decay delayed by user contribution (+2m)` });
          io.to(user.currentRoom).emit('timer_extended', { expiresAt: room.expiresAt });
       }
    });

    socket.on('contribute_purge_pot', (data) => {
       const user = socketToUser.get(sId);
       if (!user) return;
       const amount = parseInt(data.amount);
       if (isNaN(amount) || amount <= 0 || user.points < amount) return;

       user.points -= amount;
       globalPurgePot += amount;
       
       const delayMs = (amount / 100) * 10 * 60 * 1000; // Increased to 10 mins per 100 credits for visibility
       nextPurgeTime += delayMs;

       syncUserState(sId);
       
       // Force immediate broadcast of new time
       const timeRemaining = Math.max(0, nextPurgeTime - Date.now());
       io.emit('purge_sync', { timeRemaining, potTotal: globalPurgePot });
       
       // Global Broadcast to everyone
       io.emit('system_message', { 
         text: `[SIGNAL_BOOST] Node ${user.nodeId.substring(0,6)} contributed ${amount} credits. The Purge has been delayed.` 
       });
       io.emit('purge_contributed', { nodeId: user.nodeId, amount, newPurgeTime: nextPurgeTime });
    });

    socket.on('claim_ad_reward', () => {
       const user = socketToUser.get(sId);
       if (!user) {
         console.warn(`[REWARD_FAIL] No user found for socket ${sId}`);
         socket.emit('system_message', { text: "!!! NODE_IDENTITY_VOUCHER_MISSING. PLEASE_RE-REGISTER_NODE. !!!" });
         return;
       }
       
       const now = Date.now();
       const COOLDOWN = 1.5 * 60 * 1000; // Reduced to 1.5 min for better UX
       
       if (user.lastAdClaimedAt && now - user.lastAdClaimedAt < COOLDOWN) {
         const remaining = Math.ceil((COOLDOWN - (now - user.lastAdClaimedAt)) / 1000);
         socket.emit('system_message', { text: `!!! MINING_LIMIT_REACHED. COOL_DOWN_REMAINING: ${remaining}s !!!` });
         return;
       }

       user.points += 250;
       user.lastAdClaimedAt = now;
       
       console.log(`[REWARD_SUCCESS] Node ${user.nodeId} claimed 250. Total: ${user.points}`);
       
       syncUserState(sId);
       socket.emit('system_message', { text: ">>> Signal mined successfully. +250 credits allocated. <<<" });
    });
  });

  app.get("/api/health", (req, res) => res.json({ status: "RAM_READY" }));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of activeChats.entries()) {
      // 1. Inactivity prompt
      if (now - room.lastActivityAt > 45000 && !room.promptInjected) {
         const randomPrompt = DEEP_PROMPTS[Math.floor(Math.random() * DEEP_PROMPTS.length)];
         io.to(roomId).emit('system_message', { text: `[SILENCE_DETECTED] > Injecting momentum: "${randomPrompt}"` });
         room.lastActivityAt = now; room.promptInjected = true;
      }

      // 2. Timer sync
      io.to(roomId).emit('chat_timer_sync', { expiresAt: room.expiresAt });

      // 3. Expiration check
      if (now >= room.expiresAt) {
         io.to(roomId).emit('system_message', { text: "!! MEMORY_DECAY_COMPLETE. TERMINATING CONNECTION. !!" });
         terminateChat(roomId);
      }
    }
  }, 5000);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Ephemeral Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
