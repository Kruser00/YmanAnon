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

  // State
  let queue: any[] = [];
  const activeChats = new Map<string, any>();
  const users = new Map<string, any>();

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

  io.on('connection', (socket) => {
    console.log('[DEBUG] User connected', socket.id);
    const uID = socket.id;

    socket.on('disconnect', () => {
      console.log('[DEBUG] User disconnected', uID);
      queue = queue.filter(u => u.id !== uID);
      const user = users.get(uID);
      
      if (user?.currentRoom) {
        const room = activeChats.get(user.currentRoom);
        if (room) {
          const otherUserId = room.users.find((id: string) => id !== uID);
          if (otherUserId) {
             io.to(otherUserId).emit('partner_disconnected');
          }
          activeChats.delete(user.currentRoom);
        }
      }
      users.delete(uID);
    });

    socket.on('join_pool', (data) => {
      users.set(uID, { 
         id: uID, 
         mood: data.mood, 
         intent: data.intent, 
         profile: data.profile, // Contains { age, gender, city }
         points: 1000, // Starts with 1000 for testing
         currentRoom: null 
      });
      
      const partner = findMatch(uID, data);
      if (partner) {
        const roomId = `room_${uID}_${partner.id}`;
        
        socket.join(roomId);
        io.sockets.sockets.get(partner.id)?.join(roomId);
        
        activeChats.set(roomId, { 
           users: [uID, partner.id],
           topic: data.intent === partner.intent ? data.intent : 'Life choices',
           createdAt: Date.now(),
           pendingReveals: {}
        });
        
        const userState = users.get(uID);
        const partnerState = users.get(partner.id);
        if (userState) userState.currentRoom = roomId;
        if (partnerState) partnerState.currentRoom = roomId;

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

    socket.on('send_message', (data) => {
      const user = users.get(uID);
      if (user && user.currentRoom) {
        socket.to(user.currentRoom).emit('receive_message', {
          id: Date.now().toString(),
          sender: uID,
          text: data.text,
          timestamp: Date.now()
        });
        
        // Reward points
        user.points += 5;
        socket.emit('points_updated', { points: user.points, reason: '+5 msg' });
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
