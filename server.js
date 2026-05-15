import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

let sharedState = {};

io.engine.on('connection_error', (err) => {
  console.log('ENGINE CONNECTION ERROR:', {
    code: err.code,
    message: err.message,
    context: err.context,
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('state-sync', sharedState);

  socket.on('update-state', (newState) => {
    sharedState = {
      ...sharedState,
      ...newState,
    };

    io.emit('state-sync', sharedState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(3001, '0.0.0.0', () => {
  console.log('WebSocket server running on port 3001');
});
