# Safe-Scroll Setup Guide

## 1. Create `backend/.env`

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your keys:

```
PORT=4000
FRONTEND_URL=http://localhost:5173

GEMINI_API_KEY=your_gemini_key
ELEVENLABS_API_KEY=your_elevenlabs_key
PRESAGE_API_KEY=your_presage_key
MONGODB_URI=mongodb+srv://sparvareshrizi_db_user:MVJpyZxRDUUwSZTk@makeuoft.wjvcxmh.mongodb.net/safescroll?retryWrites=true&w=majority
```

**⚠️ Never commit `.env` to git.**

## 2. Install & Run

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
npm run seed
npm run dev:backend   # Terminal 1
npm run dev:frontend  # Terminal 2
```

Open http://localhost:5173

## 3. Hardware (ESP32 + VL53L0X)

- Wire VL53L0X: VCC→3.3V, GND→GND, SDA→GPIO21, SCL→GPIO22
- Flash: `cd hardware && pio run -t upload`
- Bridge: `cd scripts && npm install && node serial-bridge.js /dev/cu.usbserial-XXXX`

## 4. Presage

Presage has no web SDK. Use an Android companion app or mock:
```bash
curl -X POST http://localhost:4000/api/presage/metrics \
  -H "Content-Type: application/json" \
  -d '{"focus": 0.8, "engagement": 0.9}'
```
