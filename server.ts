import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { readFileSync } from "fs";
const firebaseConfig = JSON.parse(readFileSync(path.join(__dirname, "src", "firebase-applet-config.json"), "utf-8"));

// Initialize Firebase Admin
const adminApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  // Local Matchmaking State (Ephemeral)
  let queue: any[] = [];
  const activeChats = new Map<string, any>();
  const users = new Map<string, any>();
  
  // Atmosphere Mock (Can stay in memory for high-frequency updates, or move to FS)
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
  const findMatch = (userId: string, prefs: any) => {
    const matchIndex = queue.findIndex(u => u.id !== userId);
    if (matchIndex > -1) {
      const partner = queue[matchIndex];
      queue.splice(matchIndex, 1);
      return partner;
    }
    return null;
  };

  const syncUserState = (userId: string) => {
    const user = users.get(userId);
    if (user) {
        io.to(userId).emit('user_state_sync', {
            points: user.points,
            clearance: user.clearance,
            reputation: user.reputation
        });
        io.to(userId).emit('points_updated', { points: user.points });
    }
  };

  io.on('connection', (socket) => {
    console.log('[DEBUG] User connected', socket.id);
    const uID = socket.id;

    // Proactively send atmosphere data on connection
    io.emit('atmosphere_updated', { moods: globalMoods, online: io.engine.clientsCount });
    socket.emit('atmosphere_data', { moods: globalMoods, online: io.engine.clientsCount });

    const terminateChat = (roomId: string, leaverId: string) => {
      const room = activeChats.get(roomId);
      if (!room) return;

      const durationSec = Math.floor((Date.now() - room.createdAt) / 1000);
      
      // Simulated ranking logic
      let rank = "Top 50%";
      if (durationSec > 600) rank = "Top 1%"; // 10 mins
      else if (durationSec > 300) rank = "Top 5%"; // 5 mins
      else if (durationSec > 120) rank = "Top 15%"; // 2 mins
      else if (durationSec > 60) rank = "Top 30%"; // 1 min

      const stats = {
        duration: durationSec,
        rank: rank,
        messageCount: room.messageCount || 0
      };

      room.users.forEach((id: string) => {
        io.to(id).emit('chat_terminated', stats);
        const u = users.get(id);
        if (u) u.currentRoom = null;
      });

      activeChats.delete(roomId);
    };

    socket.on('disconnect', () => {
      console.log('[DEBUG] User disconnected', uID);
      queue = queue.filter(u => u.id !== uID);
      const user = users.get(uID);
      
      if (user?.currentRoom) {
        terminateChat(user.currentRoom, uID);
      }
      users.delete(uID);
      io.emit('atmosphere_updated', { moods: globalMoods, online: io.engine.clientsCount });
    });

    socket.on('leave_pool', () => {
      console.log('[DEBUG] User left pool', uID);
      queue = queue.filter(u => u.id !== uID);
      const user = users.get(uID);
      
      if (user?.currentRoom) {
        terminateChat(user.currentRoom, uID);
      }
    });

    socket.on('spend_points', (data) => {
       const user = users.get(uID);
       if (user && user.points >= data.amount) {
           user.points -= data.amount;
           syncUserState(uID);
       }
    });

    socket.on('buy_clearance', () => {
       const user = users.get(uID);
       if (user && user.points >= 500 && user.clearance === 1) {
           user.points -= 500;
           user.clearance = 2;
           syncUserState(uID);
           console.log(`[BROKER] User ${uID} upgraded to clearance 2`);
       }
    });

    socket.on('rate_partner', (data) => {
       const user = users.get(uID);
       if (!user || !user.lastPartnerId) return;
       const partner = users.get(user.lastPartnerId);
       
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
          
          syncUserState(partner.id);
          console.log(`[REPUTATION] User ${user.lastPartnerId} got rep update: +${newPos} -${newNeg}`);
       }
    });

    socket.on('request_atmosphere', () => {
       socket.emit('atmosphere_data', { moods: globalMoods, online: users.size }); 
    });

    socket.on('request_oracle', async () => {
       try {
         const snapshot = await db.collection('oracle_threads')
           .orderBy('isResolved', 'asc')
           .orderBy('bounty', 'desc') 
           .orderBy('timestamp', 'desc')
           .limit(40).get();
         const threads = snapshot.docs.map(doc => ({
           id: doc.id,
           ...doc.data()
         }));
         socket.emit('oracle_data', threads);
       } catch (error) {
         console.error('[ORACLE] Error fetching threads:', error);
       }
    });

    socket.on('request_thread_details', async (data) => {
       try {
         const threadRef = db.collection('oracle_threads').doc(data.threadId);
         const answersSnap = await threadRef.collection('answers')
           .orderBy('vouchCount', 'desc')
           .orderBy('timestamp', 'asc')
           .get();
         
         const answers = answersSnap.docs.map(doc => ({
           id: doc.id,
           ...doc.data()
         }));
         
         socket.emit('thread_details', { threadId: data.threadId, answers });
       } catch (error) {
         console.error('[ORACLE] Error fetching thread details:', error);
       }
    });

    socket.on('post_oracle_thread', async (data) => {
       try {
         const actualUID = data.nodeId || uID;
         const bountyAmount = data.bounty || 0;
         
         if (bountyAmount > 0) {
            const userRef = db.collection('users').doc(actualUID);
            const userSnap = await userRef.get();
            if (!userSnap.exists || (userSnap.data()?.points || 0) < bountyAmount) {
               socket.emit('system_message', { text: "!! INSUFFICIENT FUNDS FOR BOUNTY_STAKING !!" });
               return;
            }
            await userRef.update({ points: admin.firestore.FieldValue.increment(-bountyAmount) });
         }

         const newThread = {
            authorId: actualUID,
            question: data.question,
            timestamp: Date.now(),
            bounty: bountyAmount,
            isResolved: false,
            answerCount: 0
         };
         await db.collection('oracle_threads').add(newThread);
         io.emit('oracle_updated');
       } catch (error) {
         console.error('[ORACLE] Error posting thread:', error);
       }
    });

    socket.on('post_oracle_answer', async (data) => {
       try {
         const actualUID = data.nodeId || uID;
         const threadRef = db.collection('oracle_threads').doc(data.threadId);
         
         const newAnswer = {
            authorId: actualUID,
            text: data.text,
            timestamp: Date.now(),
            vouchCount: 0
         };

         await db.runTransaction(async (t) => {
           const threadSnap = await t.get(threadRef);
           if (!threadSnap.exists) return;
           
           const answerRef = threadRef.collection('answers').doc();
           t.set(answerRef, newAnswer);
           t.update(threadRef, { answerCount: admin.firestore.FieldValue.increment(1) });
         });
         
         io.emit('oracle_updated');
       } catch (error) {
         console.error('[ORACLE] Error posting answer:', error);
       }
    });

    socket.on('vouch_answer', async (data) => {
       try {
         const threadRef = db.collection('oracle_threads').doc(data.threadId);
         const answerRef = threadRef.collection('answers').doc(data.answerId);
         
         await db.runTransaction(async (t) => {
           const answerSnap = await t.get(answerRef);
           if (!answerSnap.exists) return;
           
           const answer = answerSnap.data();
           t.update(answerRef, { vouchCount: admin.firestore.FieldValue.increment(1) });
           
           if (answer?.authorId) {
             const authorRef = db.collection('users').doc(answer.authorId);
             t.update(authorRef, { 'reputation.positive': admin.firestore.FieldValue.increment(1) });
           }
         });
         io.emit('oracle_updated');
       } catch (error) {
         console.error('[ORACLE] Error vouching:', error);
       }
    });

    socket.on('resolve_thread', async (data) => {
       try {
         const threadRef = db.collection('oracle_threads').doc(data.threadId);
         const threadSnap = await threadRef.get();
         if (!threadSnap.exists || threadSnap.data()?.authorId !== data.nodeId) return;

         const threadData = threadSnap.data();
         const bounty = threadData?.bounty || 0;
         
         if (bounty > 0) {
            // Find top answer
            const topAnswerSnap = await threadRef.collection('answers')
               .orderBy('vouchCount', 'desc')
               .limit(1)
               .get();
            
            if (!topAnswerSnap.empty) {
               const winner = topAnswerSnap.docs[0].data();
               const winnerRef = db.collection('users').doc(winner.authorId);
               await winnerRef.update({ points: admin.firestore.FieldValue.increment(bounty) });
            }
         }

         await threadRef.update({ isResolved: true });
         io.emit('oracle_updated');
       } catch (error) {
         console.error('[ORACLE] Error resolving:', error);
       }
    });

    socket.on('join_pool', async (data) => {
      const actualUID = data.nodeId || uID;
      
      // Sync or Create user in Firestore
      const userRef = db.collection('users').doc(actualUID);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        await userRef.set({
          id: actualUID,
          points: 1000,
          clearance: 1,
          reputation: { positive: 0, negative: 0 },
          profile: data.profile || {}
        });
      }

      // Update global moods tally
      if (data.mood && globalMoods[data.mood as keyof typeof globalMoods] !== undefined) {
         globalMoods[data.mood as keyof typeof globalMoods]++;
         io.emit('atmosphere_updated', { moods: globalMoods, online: io.engine.clientsCount });
      }

      const userData = userSnap.exists ? userSnap.data() : { id: actualUID, points: 1000, clearance: 1, reputation: { positive: 0, negative: 0 } };

      users.set(uID, { 
         ...userData,
         mood: data.mood, 
         intent: data.intent, 
         profile: data.profile, 
         currentRoom: null,
         nodeId: actualUID
      });
      syncUserState(uID);
      
      const partner = findMatch(uID, data);
      if (partner) {
        const roomId = `room_${uID}_${partner.id}`;
        
        socket.join(roomId);
        io.sockets.sockets.get(partner.id)?.join(roomId);
        
        activeChats.set(roomId, { 
           users: [uID, partner.id],
           topic: data.intent === partner.intent ? data.intent : 'Life choices',
           createdAt: Date.now(),
           lastActivityAt: Date.now(),
           pendingReveals: {},
           promptInjected: false,
           milestones: { '1': false, '5': false }
        });
        
        const userState = users.get(uID);
        const partnerState = users.get(partner.id);
        if (userState) { userState.currentRoom = roomId; userState.lastPartnerId = partner.id; }
        if (partnerState) { partnerState.currentRoom = roomId; partnerState.lastPartnerId = uID; }

        io.to(roomId).emit('match_found', { 
          roomId, 
          topic: activeChats.get(roomId).topic 
        });
        
        console.log(`[DEBUG] Match formed: ${roomId}`);
      } else {
        queue.push({ id: uID, ...data });
        console.log(`[DEBUG] User added to queue: ${uID}`);
      }
    });

    socket.on('boost_message', async (data) => {
      try {
        const costMap: Record<string, number> = { 'highlight': 50, 'glitch': 150, 'redact': 200 };
        const cost = costMap[data.type] || 0;
        const actualUID = data.nodeId || uID;

        const userRef = db.collection('users').doc(actualUID);
        const userSnap = await userRef.get();
        if (!userSnap.exists || (userSnap.data()?.points || 0) < cost) {
           socket.emit('system_message', { text: "!! INSUFFICIENT POINTS FOR SIGNAL_BOOST !!" });
           return;
        }

        await userRef.update({ points: admin.firestore.FieldValue.increment(-cost) });
        
        // Broadcast the boost to the room
        const user = users.get(uID);
        if (user && user.currentRoom) {
           io.to(user.currentRoom).emit('message_updated', { 
             messageId: data.messageId, 
             boost: data.type 
           });
           
           // Sync user points back to socket state
           user.points = (userSnap.data()?.points || cost) - cost;
           syncUserState(uID);
        }
      } catch (e) {
        console.error('[BOOST] error:', e);
      }
    });

    socket.on('send_message', (data) => {
      const user = users.get(uID);
      if (user && user.currentRoom) {
        if (data.text.startsWith('/void ')) {
           const voidMsg = data.text.replace('/void ', '');
           io.emit('void_broadcast', { text: voidMsg, timestamp: Date.now() });
           socket.emit('system_message', { text: ">>> Message cast into the void. It is now part of the global noise. <<<" });
           return;
        }

        socket.to(user.currentRoom).emit('receive_message', {
          id: Date.now().toString(),
          sender: uID,
          text: data.text,
          timestamp: Date.now()
        });
        
        const room = activeChats.get(user.currentRoom);
        if (room) {
          room.lastActivityAt = Date.now();
          room.promptInjected = false;
          room.messageCount = (room.messageCount || 0) + 1;
        }

        // Reward points
        user.points += 5;
        socket.emit('points_updated', { points: user.points, reason: '+5 msg' });
      }
    });

    socket.on('trigger_activity', () => {
      const user = users.get(uID);
      if (!user || !user.currentRoom) return;
      const room = activeChats.get(user.currentRoom);
      if (room) {
        const randomActivity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
        io.to(user.currentRoom).emit('system_message', {
           text: `[MINI-GAME] SYSTEM_INJECT: ${randomActivity}`
        });
        room.lastActivityAt = Date.now();
      }
    });

    // Handle mutual reveals
    socket.on('propose_reveal', (data) => {
      const user = users.get(uID);
      if (!user || !user.currentRoom) return;

      const room = activeChats.get(user.currentRoom);
      if (!room) return;

      if (user.points < data.cost) {
         socket.emit('system_message', { text: `Insufficient points to propose ${data.type} reveal.` });
         return;
      }

      // Mark as pending
      room.pendingReveals[data.type] = {
         proposedBy: uID,
         cost: data.cost
      };

      // Notify the room
      io.to(user.currentRoom).emit('system_message', {
         text: `>>> MUTUAL REVEAL PROPOSED: ${data.type.toUpperCase()} (${data.cost} pts). Type /accept ${data.type} to unlock. <<<`,
         revealProposal: data.type
      });
    });

    socket.on('accept_reveal', (data) => {
       const user = users.get(uID);
       if (!user || !user.currentRoom) return;

       const room = activeChats.get(user.currentRoom);
       if (!room) return;

       const pending = room.pendingReveals[data.type];
       if (!pending || pending.proposedBy === uID) return; // Cant accept own request

       if (user.points < pending.cost) {
          socket.emit('system_message', { text: `Insufficient points to accept ${data.type} reveal.` });
          return;
       }

       const proposerID = pending.proposedBy;
       const proposer = users.get(proposerID);

       // Deduct points
       user.points -= pending.cost;
       proposer.points -= pending.cost;

       io.to(uID).emit('points_updated', { points: user.points });
       io.to(proposerID).emit('points_updated', { points: proposer.points });

       // Broadcast the actual profile data!
       io.to(uID).emit('system_message', { text: `[REVEALED] Partner's ${data.type}: ${proposer.profile[data.type] || 'Unknown'}`});
       io.to(proposerID).emit('system_message', { text: `[REVEALED] Partner's ${data.type}: ${user.profile[data.type] || 'Unknown'}`});
       
       delete room.pendingReveals[data.type];
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite middleware for development");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static dist for production");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of activeChats.entries()) {
      // Momentum: 30 seconds of silence for demonstration
      if (now - room.lastActivityAt > 30000 && !room.promptInjected) {
         const randomPrompt = DEEP_PROMPTS[Math.floor(Math.random() * DEEP_PROMPTS.length)];
         io.to(roomId).emit('system_message', {
            text: `[SILENCE_DETECTED] > Injecting momentum prompt: "${randomPrompt}"`
         });
         room.lastActivityAt = now; 
         room.promptInjected = true;
      }

      // Milestone: 1 minute (60s)
      if (now - room.createdAt > 60000 && !room.milestones['1']) {
          io.to(roomId).emit('system_message', {
             text: `[MILESTONE_UNLOCKED] > You've survived 1 minute together. Longer than 40% of connections.`
          });
          room.milestones['1'] = true;
      }
      // Milestone: 5 minute (300s)
      if (now - room.createdAt > 300000 && !room.milestones['5']) {
          io.to(roomId).emit('system_message', {
             text: `[MILESTONE_UNLOCKED] > 5 minutes. You've talked longer than 82% of conversations. Connection deepening.`
          });
          room.milestones['5'] = true;
      }
    }
  }, 5000);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
