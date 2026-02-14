import { Router } from 'express';
import { broadcastGesture } from '../ws.js';

export const gesturesRouter = Router();

gesturesRouter.post('/', (req, res) => {
  const { type, value } = req.body; // type: swipe_up, swipe_down, swipe_left, swipe_right, press, circle
  if (!type) {
    return res.status(400).json({ error: 'type required' });
  }
  const gesture = { type, value, ts: Date.now() };
  broadcastGesture(gesture);
  res.json({ ok: true, gesture });
});
