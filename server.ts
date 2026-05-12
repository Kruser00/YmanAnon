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
    // In a real app we'd score based on mood/intent/reputation
    // Here we'll do random match from queue
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
      users.set(uID, { id: uID, mood: data.mood, intent: data.intent, points: Math.floor(Math.random() * 100) + 1000, currentRoom: null, profile: {} });
      
      const partner = findMatch(uID, data);
      if (partner) {
        const roomId = `room_${uID}_${partner.id}`;
        
        socket.join(roomId);
        io.sockets.sockets.get(partner.id)?.join(roomId);
        
        activeChats.set(roomId, { 
           users: [uID, partner.id],
           topic: data.intent === partner.intent ? data.intent : 'Life choices',
           createdAt: Date.now()
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
        // Broadcast to the room, excluding sender
        socket.to(user.currentRoom).emit('receive_message', {
          id: Date.now().toString(),
          sender: uID,
          text: data.text,
          timestamp: Date.now()
        });
        
        // Reward points (simple version)
        user.points += 5;
        socket.emit('points_updated', { points: user.points, reason: '+5 msg' });
      }
    });

    // Handle reveals (spending points)
    socket.on('reveal_request', (data) => {
      const user = users.get(uID);
      if (user && user.currentRoom) {
         if (user.points >= data.cost) {
            user.points -= data.cost;
            user.profile[data.type] = data.value;
            socket.emit('points_updated', { points: user.points, reason: `-${data.cost} reveal` });
            
            // For now, unilaterally reveal to the room (simpler than mutual for demo)
            io.to(user.currentRoom).emit('system_message', {
               text: `Partner unlocked their ${data.type}: ${data.value}`
            });
         } else {
            socket.emit('system_message', { text: `Insufficient points to unlock ${data.type}.` });
         }
      }
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
