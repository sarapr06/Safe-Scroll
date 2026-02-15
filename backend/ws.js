import { WebSocketServer } from 'ws';
import { initSerialEsp8266 } from './services/serialEsp8266.js';

let wss;
const gestureClients = new Set();
const esp8266SSEClients = new Set();

export function initWs(server) {
  wss = new WebSocketServer({ server, path: '/ws/gestures' });
  wss.on('connection', (ws) => {
    gestureClients.add(ws);
    ws.on('close', () => gestureClients.delete(ws));
  });

  const broadcastEsp = (msg) => {
    const data = `data: ${JSON.stringify(msg)}\n\n`;
    esp8266SSEClients.forEach((res) => {
      if (!res.writableEnded) res.write(data);
    });
  };
  initSerialEsp8266(broadcastEsp);
}

export function getEsp8266SSEClients() {
  return esp8266SSEClients;
}

export function broadcastGesture(gesture) {
  const msg = JSON.stringify(gesture);
  gestureClients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}
