import { WebSocketServer } from 'ws';

let wss;
const gestureClients = new Set();

export function initWs(server) {
  wss = new WebSocketServer({ server, path: '/ws/gestures' });
  wss.on('connection', (ws) => {
    gestureClients.add(ws);
    ws.on('close', () => gestureClients.delete(ws));
  });
}

export function broadcastGesture(gesture) {
  const msg = JSON.stringify(gesture);
  gestureClients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}
