import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User Connected", socket.id);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", ({ roomId, userName }) => {
    // Correctly handle a user leaving a previous room
    if (currentRoom) {
      const roomUsers = rooms.get(currentRoom);
      if (roomUsers) {
        roomUsers.delete(currentUser);
        if (roomUsers.size > 0) {
          io.to(currentRoom).emit("userJoined", Array.from(roomUsers));
        } else {
          rooms.delete(currentRoom);
        }
      }
      socket.leave(currentRoom);
    }

    currentRoom = roomId;
    currentUser = userName;

    socket.join(currentRoom);
    // Corrected check: use rooms.has()
    if (!rooms.has(currentRoom)) {
      rooms.set(currentRoom, new Set());
    }
    rooms.get(currentRoom).add(currentUser);
    io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
    console.log(`User ${currentUser} joined room: ${currentRoom}`);
  });

  socket.on("codeChange", ({ roomId, code }) => {
    socket.to(roomId).emit("codeUpdate", code);
  });

  socket.on("leaveRoom", () => {
    if (currentRoom && currentUser) {
      const roomUsers = rooms.get(currentRoom);
      if (roomUsers) {
        roomUsers.delete(currentUser);
        if (roomUsers.size === 0) {
          rooms.delete(currentRoom);
        } else {
          io.to(currentRoom).emit("userJoined", Array.from(roomUsers));
        }
      }
      socket.leave(currentRoom);
      currentRoom = null;
      currentUser = null;
    }
  });

  socket.on("typing", ({ roomId, userName }) => {
    socket.to(roomId).emit("userTyping", userName);
  });

  socket.on("languageChange", ({ roomId, language }) => {
    io.to(roomId).emit("languageUpdate", language);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
    if (currentRoom && currentUser) {
      const roomUsers = rooms.get(currentRoom);
      if (roomUsers) {
        roomUsers.delete(currentUser);
        if (roomUsers.size === 0) {
          rooms.delete(currentRoom);
        } else {
          io.to(currentRoom).emit("userJoined", Array.from(roomUsers));
        }
      }
    }
  });
});

const port = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "/frontend/dist")));

app.get("/*splat", (req, res) => { // Changed "/*" to "/*splat"
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

server.listen(port, () => {
  // Corrected: Server, and using a template literal is good practice
  console.log(`Server is running on port ${port}`);
});