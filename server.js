// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const chatRoutes = require('./routes/chatRoutes');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/chats', chatRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});