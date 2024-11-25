import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';

let totalConnections = 0;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://omeflop.onrender.com",
    methods: ["GET", "POST"],
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = path.join(__dirname, '..', 'front');
app.use(express.static(path.join(basePath, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(basePath, 'index.html'));
});

app.get('/room1', async (req, res) => {
  const sockets = await io.in('Room1').allSockets();
  if (sockets.size < 2) {
    res.sendFile(path.join(basePath, 'room1.html'));
  } else {
    res.redirect('/?full=true');
  }
});

app.get('/room2', async (req, res) => {
  const sockets = await io.in('Room2').allSockets();
  if (sockets.size < 2) {
    res.sendFile(path.join(basePath, 'room2.html'));
  } else {
    res.redirect('/?full=true');
  }
});

app.get('/roomCounts', async (req, res) => {
  const room1Count = (await io.in('Room1').allSockets()).size;
  const room2Count = (await io.in('Room2').allSockets()).size;
  res.json({ Room1: room1Count, Room2: room2Count, Total: totalConnections });
});

io.on('connection', (socket) => {
  totalConnections++;
  io.emit('updateTotalConnections', totalConnections);

  let roomJoined;

  socket.on('joinRoom', async (room) => {
    const sockets = await io.in(room).allSockets();
    if (sockets.size < 2) {
      socket.join(room);
      roomJoined = room;
      console.log(`User ${socket.id} joined room: ${room}`);
      socket.emit('roomJoined', { room, status: 'joined' });
      socket.to(room).emit('receiveMessage', {
        message: 'Un nouvel utilisateur a rejoint la salle.',
        sender: 'System',
      });
    } else {
      console.log(`La salle ${room} est complète`);
      socket.emit('roomFull', { room, status: 'full' });
    }
  });

  socket.on('sendMessage', (data) => {
    const { room, message } = data;
    socket.to(room).emit('receiveMessage', { message, sender: socket.id });
  });

  socket.on('disconnect', () => {
    totalConnections--;
    io.emit('updateTotalConnections', totalConnections);

    if (roomJoined) {
      io.in(roomJoined).emit('receiveMessage', {
        message: `${socket.id} a quitté la salle.`,
        sender: 'System',
      });
      socket.to(roomJoined).emit('userDisconnected', socket.id);
    }
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Server listening on :3000');
});
