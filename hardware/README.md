# Safe-Scroll Hardware (ESP32-Wroom + VL53L0X)

## Wiring

| VL53L0X | ESP32-Wroom |
|---------|-------------|
| VCC     | 3.3V       |
| GND     | GND        |
| SDA     | GPIO 21    |
| SCL     | GPIO 22    |

## Build & Flash

```bash
cd hardware
pio run
pio run -t upload
```

## Serial Bridge

The firmware outputs JSON gesture events over Serial (115200 baud). To forward to the backend:

1. **Option A**: Run a small bridge script on your laptop that reads Serial and POSTs to `http://localhost:4000/api/gestures`
2. **Option B**: Add WiFi to the firmware and POST directly (requires SSID/password in code or config)

## Gesture Mapping (Single VL53L0X)

With one ToF sensor we infer:
- **press**: Hand very close (< 80mm)
- **swipe_up / swipe_down**: Distance change rate
- **circle**: Quick approach + retreat (summarize)

For full left/right swipe detection, add a second VL53L0X or use APDS-9960 gesture sensor.
