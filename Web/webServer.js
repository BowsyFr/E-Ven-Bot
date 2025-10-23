const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

let io;

function startWebServer(client) {
  const app = express();
  const server = http.createServer(app);
  io = new Server(server);

  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
  });


  app.use(express.static(__dirname + '/public'));


  server.listen(PORT, () => {
    console.log(`🌐 Serveur web en ligne sur http://localhost:${PORT}`);
  });

  io.on('connection', async (socket) => {
    console.log('👀 Un visiteur a ouvert la page');
    const count = await getMemberCount(client);
    socket.emit('updateCount', count);
  });
}

module.exports = { startWebServer };