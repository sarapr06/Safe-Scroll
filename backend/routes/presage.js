import { Router } from 'express';

// Presage SDK is Android/Swift/C++ only. This endpoint receives metrics
// from a companion app or future web bridge and can adjust scroll behavior.
const presageMetrics = { focus: 1, engagement: 1 };

export const presageRouter = Router();

presageRouter.post('/metrics', (req, res) => {
  const { focus, engagement, heartRate, stress } = req.body || {};
  if (typeof focus === 'number') presageMetrics.focus = Math.max(0, Math.min(1, focus));
  if (typeof engagement === 'number') presageMetrics.engagement = Math.max(0, Math.min(1, engagement));
  res.json({ ok: true });
});

presageRouter.get('/metrics', (req, res) => {
  res.json(presageMetrics);
});
