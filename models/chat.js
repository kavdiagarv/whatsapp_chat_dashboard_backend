// backend/models/chat.js
// const pool = require('../db');

// async function getEscalatedChats() {
//   const res = await pool.query('SELECT * FROM chat_sessions WHERE escalated = true');
//   return res.rows;
// }

// async function getChatMessages(userId) {
//   const res = await pool.query('SELECT * FROM chat_logs WHERE user_id = $1', [userId]);
//   return res.rows;
// }

// async function saveAgentReply(userId, message) {
//   await pool.query(
//     'INSERT INTO messages (user_id, message, sender) VALUES ($1, $2, $3)',
//     [userId, message, 'agent']
//   );
// }

// module.exports = {
//   getEscalatedChats,
//   getChatMessages,
//   saveAgentReply
// };


// controllers/chatController.js
const pool = require('../db');

exports.getSessions = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chat_sessions ORDER BY started_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching chat sessions');
  }
};

exports.getChatLogs = async (req, res) => {
  try {
    const { session_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM chat_logs WHERE session_id = $1 ORDER BY timestamp ASC',
      [session_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching chat logs');
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { session_id, user_id, message, direction } = req.body;
    const result = await pool.query(
      `INSERT INTO chat_logs (session_id, user_id, message, direction)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [session_id, user_id, message, direction]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending message');
  }
};

exports.assignAgent = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { agent_name } = req.body;
    await pool.query(
      'UPDATE chat_sessions SET assigned_to = $1 WHERE session_id = $2',
      [agent_name, session_id]
    );
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error assigning agent');
  }
};
