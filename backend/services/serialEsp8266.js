/**
 * Reads ESP8266 serial output (U/D lines at 115200 baud).
 * Broadcasts each U/D via WebSocket for finger-based MRI scrolling.
 * "Finger present" = data actively changing; "finger removed" = no data for FINGER_TIMEOUT_MS.
 */

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const PORT_PATH = process.env.ESP8266_SERIAL_PORT || '/dev/cu.usbserial-0001';
const BAUD = parseInt(process.env.ESP8266_BAUD || '115200', 10);
const FINGER_TIMEOUT_MS = parseInt(process.env.ESP8266_FINGER_TIMEOUT_MS || '5000', 10);

let port = null;
let broadcastFn = null;
let lastDataTime = 0;
let inactiveCheckInterval = null;

export function initSerialEsp8266(broadcast) {
  broadcastFn = broadcast;
  if (!broadcastFn) return;

  try {
    port = new SerialPort({
      path: PORT_PATH,
      baudRate: BAUD,
      autoOpen: false,
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n', includeDelimiter: false }));

    parser.on('data', (line) => {
      const trimmed = String(line).trim().toUpperCase();
      if (trimmed !== 'U' && trimmed !== 'D') return;
      lastDataTime = Date.now();
      broadcastFn({ direction: trimmed, timestamp: lastDataTime });
    });

    port.on('error', (err) => {
      console.error('[ESP8266 serial]', err.message);
    });

    port.open((err) => {
      if (err) {
        console.warn('[ESP8266 serial] Could not open:', err.message, '- MRI finger scroll disabled');
        return;
      }
      console.log(`[ESP8266 serial] Listening on ${PORT_PATH} at ${BAUD} baud`);
      lastDataTime = 0;
      startInactiveCheck();
    });
  } catch (e) {
    console.warn('[ESP8266 serial] Init failed:', e.message);
  }
}

function startInactiveCheck() {
  if (inactiveCheckInterval) return;
  inactiveCheckInterval = setInterval(() => {
    if (!broadcastFn || lastDataTime === 0) return;
    const elapsed = Date.now() - lastDataTime;
    if (elapsed >= FINGER_TIMEOUT_MS) {
      broadcastFn({ inactive: true, timestamp: Date.now() });
      lastDataTime = 0; // prevent repeated inactive
    }
  }, 100);
}

export function wasReceivingDataRecently() {
  if (lastDataTime === 0) return false;
  return Date.now() - lastDataTime < FINGER_TIMEOUT_MS;
}
