// controllers/chatController.js
const pool = require('../db');
const axios = require('axios');
const moment = require('moment-timezone');
const { io } = require("../ws");

exports.getSessions = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM chat_sessions WHERE user_stage = 'escalated' ORDER BY started_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching chat sessions');
  }
};

// exports.getUserName = async (req, res) => {
//   try {
//     const result = await pool.query (`SELECT cq.* FROM chat_query cq INNER JOIN chat_sessions cs ON cs.session_id = cq.session_id WHERE cs.user_stage = 'escalated' ORDER BY cq.timestamp DESC`);
//     res.join(result.rows);
//   } catch(error) {
//     console.error(error);
//     res.status(500).send('Error fetching escalated user name');
//   }
// };

// Add this new controller function
exports.getEscalatedSessions = async (req, res) => {
  try {
    const result = await pool.query(`SELECT cq.* FROM chat_query cq INNER JOIN chat_sessions cs ON cq.session_id = cs.session_id WHERE cs.status = 'escalated' ORDER BY cq.timestamp DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching escalated sessions');
  }
};

exports.getBulkOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bod.* FROM bulk_orders_data bod INNER JOIN chat_sessions cs on bod.session_id = cs.session_id WHERE cs.status = 'escalated' ORDER BY bod.created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching bulk orders');
  }
};

exports.getEscalatedChatLogs = async (req, res) => {
  try {
    const result = await pool.query(`SELECT cl.* FROM chat_logs cl INNER JOIN chat_sessions cs ON cl.session_id = cs.session_id WHERE cs.status = 'escalated' ORDER BY cl.timestamp ASC`);
    const formattedRows = result.rows.map(row => ({
      ...row,
      timestamp: moment(row.timestamp).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
    }));

    res.status(200).json(formattedRows);
    // res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching escalated chat logs');
  }
};

exports.getChatLogs = async (req, res) => {
  try {
    const { session_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM chat_logs WHERE session_id = $1 ORDER BY timestamp ASC',
      [session_id]
    );
    const formattedRows = result.rows.map(row => ({
      ...row,
      timestamp: moment(row.timestamp).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
    }));

    res.status(200).json(formattedRows);
    // res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching chat logs');
  }
};

// Helper function to send WhatsApp message
async function sendWhatsAppMessage(phone, message) {
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v23.0/615677088306704/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          'Authorization': `Bearer EAAKWtJsZColsBO4bk46KADZB36MtohKKZBYySf833guq6YePxaNnhmxsnpy69hlkFpon5k6CChx2v1Sud1WN3Be0NyyLsr9IEXa6ZBU149MyjdqZCEwqPZCc8oRM3Ta4B9yhDyZBdNGOJYmkStiapPmZBDpc3MjrTZCwZCPDDIH3Ocz46hBy4F5vbzvoJyi2xTMZBBAeIXHVlod`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('WhatsApp message sent:', res.data);
  } catch (err) {
    console.error('Error sending WhatsApp message:', err.response?.data || err.message);
  }
}

exports.sendMessage = async (req, res) => {
  try {
    const { session_id, user_id, message, direction } = req.body;
    const result = await pool.query(
      `INSERT INTO chat_logs (session_id, user_id, message, direction)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [session_id, user_id, message, direction]
    );
    // Send WhatsApp message only if direction is 'outbound'
    if (direction === 'outbound') {
      const phoneQuery = await pool.query(
        `SELECT user_id FROM chat_sessions WHERE session_id = $1`,
        [session_id]
      );
      const phone = phoneQuery.rows[0]?.user_id;

      if (phone) {
        await sendWhatsAppMessage(phone, message);
      } else {
        console.warn(`Phone number not found for session: ${session_id}`);
      }
    }
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

exports.getSessionsWithUnread = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cs.session_id,
        cs.status,
        cs.started_at,
        cq.customer_name,
        cq.order_id,
        COALESCE(unread.count, 0) AS unread_count
      FROM chat_sessions cs
      LEFT JOIN chat_query cq ON cq.session_id = cs.session_id
      LEFT JOIN (
        SELECT 
          session_id,
          COUNT(*) AS count
        FROM chat_logs l
        WHERE direction = 'incoming'
          AND timestamp > COALESCE((
            SELECT MAX(timestamp)
            FROM chat_logs
            WHERE chat_logs.session_id = l.session_id
              AND direction = 'outbound'
          ), '1970-01-01')
        GROUP BY session_id
      ) AS unread 
       ON cs.session_id = unread.session_id
      WHERE cs.status = 'escalated' and cs.user_stage = 'escalated'
      ORDER BY cs.started_at DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sessions with unread:', err);
    res.status(500).send('Server error');
  }
};

exports.getBulkOrderSessionsWithUnread = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cs.session_id,
        cs.status,
        cs.started_at,
        bod.name,
        bod.phone_no,
        bod.product_name,
        bod.quantity,
        bod.address,
        COALESCE(unread.count, 0) AS unread_count
      FROM chat_sessions cs
      LEFT JOIN bulk_orders_data bod 
        ON bod.session_id = cs.session_id
      LEFT JOIN (
        SELECT 
          session_id,
          COUNT(*) AS count
        FROM chat_logs l
        WHERE direction = 'incoming'
          AND timestamp > COALESCE((
            SELECT MAX(timestamp)
            FROM chat_logs
            WHERE chat_logs.session_id = l.session_id
              AND direction = 'outbound'
          ), '1970-01-01')
        GROUP BY session_id
      ) AS unread 
        ON cs.session_id = unread.session_id
      WHERE cs.status = 'escalated' and user_stage = 'bulk_order'
      ORDER BY cs.started_at DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bulk order sessions with unread:', err);
    res.status(500).send('Server error');
  }
};

exports.getArchivedChats = async (req, res) => {
  try {
    const bulkOrders = await pool.query(
      `SELECT bod.* FROM bulk_orders_data bod INNER JOIN chat_sessions cs on bod.session_id = cs.session_id WHERE cs.status = 'closed' AND cs.user_stage = 'bulk_order' ORDER BY cs.closed_at DESC`);
    
    const escalated = await pool.query(
      `SELECT cq.* FROM chat_query cq INNER JOIN chat_sessions cs on cq.session_id = cs.session_id WHERE cs.status = 'closed' AND cs.user_stage = 'escalated' ORDER BY cs.closed_at DESC`);

    res.json({
      bulkOrders: bulkOrders.rows,
      escalated: escalated.rows,
    });
  } catch (err) {
    console.error("Error fetching archived chats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};