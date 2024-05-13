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

const roomCapacity = new Map(); // Map pour stocker le nombre de personnes dans chaque salle

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);
  
    socket.on('joinRoom', (room) => {
        // Vérifie si la salle atteint sa capacité maximale de 2 personnes
        if (roomCapacity.has(room) && roomCapacity.get(room) >= 2) {
            // Si oui, rejeter la connexion
            socket.emit('roomFull');
            return;
        }

        // Si la salle n'est pas pleine, permettre à l'utilisateur de rejoindre
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);

        // Mettre à jour le nombre de personnes dans la salle
        if (roomCapacity.has(room)) {
            roomCapacity.set(room, roomCapacity.get(room) + 1);
        } else {
            roomCapacity.set(room, 1);
        }

        // Mettre à jour l'affichage du nombre de personnes dans chaque salle
        io.emit('updateRoomCount', { room, count: roomCapacity.get(room) });
    });
  
    socket.on('sendMessage', (data) => {
        const { room, message } = data;
        io.to(room).emit('receiveMessage', { message: message, sender: socket.id });
    });
  
    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);

        // Mettre à jour le nombre de personnes dans la salle lorsque quelqu'un se déconnecte
        const rooms = socket.rooms;
        rooms.forEach(room => {
            if (room !== socket.id) {
                roomCapacity.set(room, roomCapacity.get(room) - 1);
                io.emit('updateRoomCount', { room, count: roomCapacity.get(room) });
            }
        });
    });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'front', 'index.html'));
});

// Route pour la salle 1
app.get('/room1', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'front', 'room1.html'));
});

// Route pour la salle 2
app.get('/room2', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'front', 'room2.html'));
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
