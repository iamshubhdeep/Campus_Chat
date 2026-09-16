const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server);

// room -> Map<socket.id, username>
const presence = new Map();

function roomUsers(room) {
  const users = presence.get(room);
  return users ? Array.from(users.values()) : [];
}

function broadcastUserList(room) {
  io.to(room).emit('room users', roomUsers(room));
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;

  socket.on('list rooms', () => {
    socket.emit('room list', db.listRooms());
  });

  socket.on('join room', ({ room, username }) => {
    if (!room || !username) return;
    room = String(room).trim().toLowerCase().slice(0, 40);
    username = String(username).trim().slice(0, 24);
    if (!room || !username) return;

    // leave whatever room this socket was in before
    if (currentRoom) {
      socket.leave(currentRoom);
      const prev = presence.get(currentRoom);
      if (prev) {
        prev.delete(socket.id);
        broadcastUserList(currentRoom);
        socket.to(currentRoom).emit('system message', `${currentUser} left the room`);
      }
    }

    currentRoom = room;
    currentUser = username;
    socket.join(room);

    if (!presence.has(room)) presence.set(room, new Map());
    presence.get(room).set(socket.id, username);

    db.ensureRoom(room);
    socket.emit('joined', { room, history: db.getHistory(room) });
    socket.to(room).emit('system message', `${username} joined the room`);
    broadcastUserList(room);
    io.emit('room list', db.listRooms());
  });

  socket.on('chat message', ({ text }) => {
    if (!currentRoom || !currentUser) return;
    text = String(text || '').trim().slice(0, 2000);
    if (!text) return;

    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user: currentUser,
      text,
      ts: Date.now(),
    };
    db.addMessage(currentRoom, msg);
    io.to(currentRoom).emit('chat message', msg);
  });

  socket.on('typing', () => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit('typing', { user: currentUser });
  });

  socket.on('stop typing', () => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit('stop typing', { user: currentUser });
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const users = presence.get(currentRoom);
    if (users) {
      users.delete(socket.id);
      broadcastUserList(currentRoom);
    }
    if (currentUser) {
      socket.to(currentRoom).emit('system message', `${currentUser} left the room`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chat server listening on http://localhost:${PORT}`);
});
