#!/usr/bin/env node
/**
 * Bridge: Read JSON gesture events from ESP32 Serial and POST to backend.
 *
 * Usage:
 *   1. Connect ESP32 via USB
 *   2. Find port: ls /dev/cu.usb* or /dev/ttyUSB*
 *   3. node scripts/serial-bridge.js /dev/cu.usbserial-XXXX
 *
 * Requires: npm install serialport
 */

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const portPath = process.argv[2] || process.env.SERIAL_PORT;
if (!portPath) {
  console.error('Usage: node serial-bridge.js /dev/cu.usbserial-XXXX');
  process.exit(1);
}

const API_URL = process.env.API_URL || 'http://localhost:4000';

const port = new SerialPort({ path: portPath, baudRate: 115200 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

parser.on('data', async (line) => {
  line = line.trim();
  if (!line.startsWith('{') || !line.endsWith('}')) return;
  try {
    const obj = JSON.parse(line);
    if (obj.type) {
      const res = await fetch(`${API_URL}/api/gestures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: obj.type, value: obj.value }),
      });
      console.log(obj.type, res.ok ? 'OK' : res.status);
    }
  } catch {}
});

port.on('error', (err) => {
  console.error('Serial error:', err.message);
  process.exit(1);
});

console.log('Bridge running. Port:', portPath);
