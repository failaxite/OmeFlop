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

// Définir le chemin de base pour les fichiers statiques et HTML
const basePath = path.join(__dirname, '..', 'front');

// Serveur les fichiers statiques pour le CSS ou JS si nécessaire
app.use(express.static(path.join(basePath, 'public')));

// Page d'accueil pour choisir la salle
app.get('/', (req, res) => {
  res.sendFile(path.join(basePath, 'index.html'));
});

// Page pour la Room 1
app.get('/room1', (req, res) => {
  res.sendFile(path.join(basePath, 'room1.html'));
});

// Page pour la Room 2
app.get('/room2', (req, res) => {
  res.sendFile(path.join(basePath, 'room2.html'));
});

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);
  
    // Rejoindre une salle spécifique
    socket.on('joinRoom', (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });
  
    // Écouter les messages envoyés par les clients dans une salle
    socket.on('sendMessage', (data) => {
      const { room, message } = data;
      // Émettre le message à tous les clients dans la même salle
      io.to(room).emit('receiveMessage', { message: message, sender: socket.id });
    });
  
    socket.on('disconnect', () => {
      console.log(`User ${socket.id} disconnected`);
    });
  });
  

server.listen(3000, () => {
  console.log('Server listening on :3000');
});
