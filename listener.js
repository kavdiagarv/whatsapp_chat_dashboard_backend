const pool = require('./db');

const listenToNotifications = (io) => {
  const client = pool.connect().then(client => {
    client.on('notification', msg => {
      const payload = JSON.parse(msg.payload);
      io.emit('new_message', payload); // Push to all clients
    });

    client.query('LISTEN chat_updates'); // Custom channel name
  });
};

module.exports = listenToNotifications;
