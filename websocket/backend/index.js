import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const server = createServer(app);
const io = new Server(server);

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
    res.sendFile(path.join(__dirname, '..', 'front', 'room1.html'));
  } else {
    res.redirect('/?full=true');
  }
});

app.get('/room2', async (req, res) => {
  const sockets = await io.in('Room2').allSockets();
  if (sockets.size < 2) {
    res.sendFile(path.join(__dirname, '..', 'front', 'room2.html'));
  } else {
    res.redirect('/?full=true');
  }
});

app.get('/roomCounts', async (req, res) => {
  const room1Count = (await io.in('Room1').allSockets()).size;
  const room2Count = (await io.in('Room2').allSockets()).size;
  res.json({ Room1: room1Count, Room2: room2Count });
});

async function getFirstUserInRoom(room) {
  const sockets = await io.in(room).allSockets();
  if (sockets.size > 0) {
    const firstSocketId = [...sockets][0]; // Sélectionne le premier utilisateur
    return firstSocketId;
  }
  return null;
}

io.on('connection', (socket) => {
  let roomJoined;

  socket.on('joinRoom', async (room) => {
    const sockets = await io.in(room).allSockets();
    if (sockets.size < 2) {
      socket.join(room);
      roomJoined = room;
      console.log(`User ${socket.id} joined room: ${room}`);
      io.to(socket.id).emit('roomJoined', { room: room, status: 'joined' });
      socket.to(room).emit('receiveMessage', {
        message: `A rejoint la salle.`,
        sender: 'System'
      });

      // Obtenez l'ID du premier utilisateur dans la pièce et connectez-vous automatiquement à lui
      const firstUserId = await getFirstUserInRoom(room);
      if (firstUserId) {
        io.to(socket.id).emit('receiveMessage', {
          message: `Se connecte automatiquement à l'utilisateur existant.`,
          sender: 'System'
        });
        io.to(firstUserId).emit('receiveMessage', {
          message: `Se connecte automatiquement à ce nouvel utilisateur.`,
          sender: 'System'
        });
        io.to(socket.id).emit('user-connected', firstUserId);
        io.to(firstUserId).emit('user-connected', socket.id);
      }
    } else {
      console.log(`Room ${room} is full`);
      io.to(socket.id).emit('roomFull', { room: room, status: 'full' });
    }
  });

  socket.on('sendMessage', (data) => {
    const { room, message } = data;
    io.to(room).emit('receiveMessage', { message: message, sender: socket.id });
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected`);
    if (roomJoined) {
      io.in(roomJoined).emit('receiveMessage', {
        message: `A quitté la salle.`,
        sender: 'System'
      });
      socket.to(roomJoined).emit('user-disconnected', socket.id);
    }
  });
});

server.listen(3000, () => {
  console.log('Server listening on :3000');
});
