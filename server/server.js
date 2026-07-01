require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { createRoomStore } = require('./rooms');

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || '*';

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

const store = createRoomStore();

// Palette assigned to users in join order, so everyone in a room gets a
// distinct, stable color for their cursor/strokes/avatar.
const AVATAR_COLORS = [
  '#3B82F6', '#F97316', '#22C55E', '#A855F7',
  '#EC4899', '#EAB308', '#EF4444', '#06B6D4',
];

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'syncboard-server', rooms: store.roomCount() });
});

app.get('/health', (req, res) => res.send('ok'));

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('join-room', ({ roomId, name }) => {
    if (!roomId || typeof roomId !== 'string') return;
    currentRoom = roomId;
    socket.join(roomId);

    const room = store.getOrCreateRoom(roomId);
    const colorIndex = room.users.size % AVATAR_COLORS.length;
    const safeName = (name || 'Guest').toString().slice(0, 24);
    const user = {
      id: socket.id,
      name: safeName,
      color: AVATAR_COLORS[colorIndex],
      avatar: safeName.trim().charAt(0).toUpperCase() || 'G',
    };
    room.users.set(socket.id, user);

    // Send the new joiner everything they need to render the current board.
    socket.emit('board-state', {
      strokes: store.getAllStrokes(roomId),
      users: Array.from(room.users.values()),
      messages: room.messages.slice(-50),
      you: user,
    });

    socket.to(roomId).emit('user-joined', user);
    io.to(roomId).emit('users-update', Array.from(room.users.values()));
  });

  socket.on('draw-start', (stroke) => {
    if (!currentRoom || !stroke || !stroke.id) return;
    store.startStroke(currentRoom, socket.id, stroke);
    socket.to(currentRoom).emit('draw-start', { ...stroke, userId: socket.id });
  });

  socket.on('draw-point', ({ id, point }) => {
    if (!currentRoom || !id || !point) return;
    store.addPoint(currentRoom, id, point);
    socket.to(currentRoom).emit('draw-point', { id, point });
  });

  socket.on('draw-end', ({ id }) => {
    if (!currentRoom || !id) return;
    socket.to(currentRoom).emit('draw-end', { id });
  });

  socket.on('cursor-move', (pos) => {
    if (!currentRoom || !pos) return;
    const room = store.getOrCreateRoom(currentRoom);
    const user = room.users.get(socket.id);
    if (!user) return;
    socket.to(currentRoom).emit('cursor-update', {
      userId: socket.id,
      x: pos.x,
      y: pos.y,
      name: user.name,
      color: user.color,
    });
  });

  socket.on('chat-message', (text) => {
    if (!currentRoom || !text || !text.trim()) return;
    const room = store.getOrCreateRoom(currentRoom);
    const user = room.users.get(socket.id);
    if (!user) return;
    const message = {
      id: `${socket.id}-${Date.now()}`,
      userId: socket.id,
      name: user.name,
      color: user.color,
      avatar: user.avatar,
      text: text.toString().slice(0, 500),
      time: new Date().toISOString(),
    };
    room.messages.push(message);
    if (room.messages.length > 200) room.messages.shift();
    io.to(currentRoom).emit('chat-message', message);
  });

  socket.on('typing', () => {
    if (!currentRoom) return;
    const room = store.getOrCreateRoom(currentRoom);
    const user = room.users.get(socket.id);
    if (!user) return;
    socket.to(currentRoom).emit('typing', { userId: socket.id, name: user.name });
  });

  socket.on('stop-typing', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('stop-typing', { userId: socket.id });
  });

  socket.on('undo', () => {
    if (!currentRoom) return;
    const removedId = store.undoLastStroke(currentRoom, socket.id);
    if (removedId) io.to(currentRoom).emit('stroke-removed', { id: removedId });
  });

  socket.on('clear-board', () => {
    if (!currentRoom) return;
    store.clearRoom(currentRoom);
    io.to(currentRoom).emit('board-cleared');
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = store.getOrCreateRoom(currentRoom);
    room.users.delete(socket.id);
    socket.to(currentRoom).emit('stop-typing', { userId: socket.id });
    socket.to(currentRoom).emit('user-left', socket.id);
    io.to(currentRoom).emit('users-update', Array.from(room.users.values()));
    if (room.users.size === 0) store.maybeCleanupRoom(currentRoom);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`SyncBoard server running on port ${PORT}`);
});
