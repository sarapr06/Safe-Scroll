# Safe-Scroll 🏥💝

**Touchless patient hub** — Navigate and summarize patient files with hand gestures. Built for MakeUofT with Valentine's theme.

**Demo**: https://drive.google.com/file/d/12KXmJ_7dawNNkTCB7LVqSBAhQppWE1dO/view?usp=sharing 

## Quick Start

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env and add your API keys (Gemini, ElevenLabs, Presage, MongoDB)

# 3. Seed sample data (optional)
npm run seed

# 4. Run backend (terminal 1)
npm run dev:backend

# 5. Run frontend (terminal 2)
npm run dev:frontend

# 6. Open http://localhost:5173
```

## Hand Gestures (Camera)

Use your webcam for touchless navigation. While scrolling through patients, gestures are faster than swiping.

| Gesture | Action |
|---------|--------|
| ← → Wave left/right | Navigate between files |
| ☝️ 1 finger | Scroll up |
| ✌️ 2 fingers | Scroll down |
| 🤟 3 fingers | Confirm patient / switch panel (2s cooldown) |
| 👍 Thumb up | Confirm selection |
| 🖐️ Open palm | Stop scrolling |
| ✊ Closed fist | Play audio |
| 👆👍 L-shape (hold 1s) | Record voice question → relax to send to Gemini |

**Voice QA**: Hold the L-shape (index up, thumb out) for 1 second to start recording. Relax your hand to send your question to Gemini. The status shows "Hold to ask Gemini" when ready and "Release to send" when recording.

## Hardware

- **ESP32-Wroom + VL53L0X**: See [hardware/README.md](./hardware/README.md)
- **Serial bridge**: `cd scripts && npm install && node serial-bridge.js /dev/cu.usbserial-XXX`

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system design.

