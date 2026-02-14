# Presage Integration Bridge

Presage SmartSpectra SDK is available for **Android**, **Swift (iOS)**, and **C++**. There is no web/JavaScript SDK yet.

## Options for Safe-Scroll

### Option 1: Android Companion App
Use an Android tablet/phone running a minimal Presage-enabled app that:
- Captures camera feed
- Gets focus, engagement, stress metrics from Presage SDK
- POSTs to `http://<backend>/api/presage/metrics` with `{ focus, engagement, heartRate, stress }`
- The dashboard can then adjust scroll sensitivity or show feedback based on user state

### Option 2: C++ on Desktop
If running on a laptop with webcam, build a small C++ daemon using Presage C++ SDK that POSTs metrics to the backend. The web dashboard subscribes to these via polling or SSE.

### Option 3: Mock for Demo
The backend already accepts `POST /api/presage/metrics`. For demos without Presage hardware, you can POST mock values:

```bash
curl -X POST http://localhost:4000/api/presage/metrics \
  -H "Content-Type: application/json" \
  -d '{"focus": 0.8, "engagement": 0.9}'
```

## API Key

Set `PRESAGE_API_KEY` in backend `.env`. Use it when calling Presage cloud APIs (if applicable) or in the native SDK initialization.

## Presage Docs

- https://docs.physiology.presagetech.com/
- Android: https://docs.physiology.presagetech.com/android/
- Swift: https://docs.physiology.presagetech.com/swift/
