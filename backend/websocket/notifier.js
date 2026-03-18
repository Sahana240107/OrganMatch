const { WebSocketServer } = require('ws');

let wss;

function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('close', () => console.log('WebSocket client disconnected'));
    ws.on('error', (err) => console.error('WebSocket error:', err.message));
  });

  console.log('WebSocket server initialised');
}

function broadcast(event, data) {
  if (!wss) return;
  const msg = JSON.stringify({ event, data, ts: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

module.exports = { initWebSocket, broadcast };