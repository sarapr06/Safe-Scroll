# Safe-Scroll 🏥💝

**Touchless patient hub** — Navigate and summarize patient files with hand gestures. Built for MakeUofT with Valentine's theme.
**Demo**: https://drive.google.com/file/d/1_aSUWBk7ZmAHjh0D114siD2IcsHjcXz4/view?usp=sharing 

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

## Hardware

- **ESP32-Wroom + VL53L0X**: See [hardware/README.md](./hardware/README.md)
- **Serial bridge**: `cd scripts && npm install && node serial-bridge.js /dev/cu.usbserial-XXX`

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system design.

## Prizes We're Going For 🏆

- Best Use of Gemini API
- Best Use of Presage
- Best Use of ElevenLabs
- Best Use of MongoDB Atlas
- Valentine's Theme Prize 💕
