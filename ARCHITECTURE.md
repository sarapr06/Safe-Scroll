# Safe-Scroll Architecture

**Touchless patient hub for hospitals** — doctors navigate and summarize patient files using gestures (no screen touching).

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SAFE-SCROLL SYSTEM                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────────┐│
│  │   ESP32-Wroom│────▶│   Backend    │◀────│  Web Dashboard (Valentine UI)     ││
│  │  + VL53L0X   │ USB │   (Node.js)  │     │  - Patient file viewer            ││
│  │  Gestures    │/WiFi│              │     │  - Key findings display           ││
│  └──────────────┘     │  - Gemini    │     │  - ElevenLabs audio playback     ││
│         │             │  - ElevenLabs │     │  - Presage scroll feedback       ││
│         │             │  - MongoDB   │     └──────────────────────────────────┘│
│         │             └──────┬───────┘                      ▲                    │
│         │                    │                             │                    │
│  ┌──────▼──────┐             │                      ┌──────┴──────┐             │
│  │  Presage    │─────────────┼──────────────────────│   Camera    │             │
│  │  (Android/  │  Focus,     │                      │   Feed      │             │
│  │   Companion)│  Engagement │                      │  (WebRTC?)  │             │
│  └─────────────┘             │                      └─────────────┘             │
│                              │                                                    │
│                              ▼                                                    │
│                     ┌─────────────────┐                                           │
│                     │  MongoDB Atlas  │  Patient records, metadata, summaries    │
│                     └─────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Gestures (VL53L0X + ESP32)**: Distance/proximity → swipe up/down/left/right, press, circle
2. **ESP32 → Backend**: Sends gesture events via WebSocket or HTTP
3. **Backend**: Routes gestures, fetches files from MongoDB, calls Gemini for summaries
4. **Gemini**: Extracts key findings, abnormal vitals, core metrics from patient files
5. **ElevenLabs**: Converts summary to calm voice audio
6. **Presage**: Monitors user focus/engagement via camera → adjusts scroll sensitivity or provides feedback
7. **Dashboard**: Displays files, summaries, plays audio

## Gesture Mapping

| Gesture   | Action                    |
|----------|---------------------------|
| Swipe ↑↓ | Scroll through file       |
| Swipe ←→ | Navigate between files    |
| Press    | Select / open file       |
| Circle   | Summarize document (Gemini + ElevenLabs) |

## Tech Stack

| Component  | Technology |
|-----------|------------|
| Backend   | Node.js, Express |
| Frontend  | React, Valentine's theme |
| DB        | MongoDB Atlas |
| AI        | Gemini (summarization, metrics) |
| Voice     | ElevenLabs (calm narration) |
| Sensing   | Presage (focus, engagement) |
| Hardware  | ESP32-Wroom, VL53L0X |

## Directory Structure

```
makeuoft/
├── backend/          # Express API server
├── frontend/         # React dashboard
├── hardware/         # ESP32 firmware for VL53L0X
├── presage-bridge/   # Presage integration (Android companion or API bridge)
└── docs/             # Additional docs
```
