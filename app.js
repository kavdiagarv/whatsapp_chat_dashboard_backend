const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const cors = require('cors');

const chatRoutes = require('./routes/chatRoutes');
const setupWebSocket = require('./ws');
const listenToNotifications = require('./listener');

dotenv.config();
const app = express();

app.use(cors({
    origin: "https://ecofyndsupport.platinum-infotech.com",}));
app.use(express.json());

// Routes
app.use('/api/chat', chatRoutes);

const server = http.createServer(app);
const io = setupWebSocket(server);
listenToNotifications(io);

server.listen(process.env.PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
