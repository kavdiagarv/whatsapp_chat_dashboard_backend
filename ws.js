const { Server } = require('socket.io');

const setupWebSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Or your React app URL
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

module.exports = setupWebSocket;
