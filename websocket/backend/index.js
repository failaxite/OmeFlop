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
        res.status(403).send('This room is full. Please try another one.');
    }
});

app.get('/room2', async (req, res) => {
    const sockets = await io.in('Room2').allSockets();
    if (sockets.size < 2) {
        res.sendFile(path.join(__dirname, '..', 'front', 'room2.html'));
    } else {
        res.status(403).send('This room is full. Please try another one.');
    }
});

app.get('/roomCounts', async (req, res) => {
    const room1Count = (await io.in('Room1').allSockets()).size;
    const room2Count = (await io.in('Room2').allSockets()).size;
    res.json({ Room1: room1Count, Room2: room2Count });
});

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    socket.on('joinRoom', async (room) => {
        const sockets = await io.in(room).allSockets();
        if (sockets.size < 2) {
            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room}`);
            io.to(socket.id).emit('roomJoined', { room: room, status: 'joined' });
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
    });
});

server.listen(3000, () => {
  console.log('Server listening on :3000');
});
