/**
 * Safe-Scroll ESP32 + VL53L0X Gesture Interface
 *
 * VL53L0X ToF sensor measures distance. We map:
 * - Rapid approach (close) -> "press"
 * - Sustained near + movement pattern -> scroll/swipe (simplified)
 *
 * Connect VL53L0X: VCC->3.3V, GND->GND, SDA->GPIO21, SCL->GPIO22
 *
 * Outputs JSON over Serial for backend bridge, or use WiFi to POST to /api/gestures
 */

#include <Arduino.h>
#include <Wire.h>
#include <VL53L0X.h>

VL53L0X sensor;

// Gesture detection thresholds
const uint16_t PRESS_THRESHOLD_MM = 80;   // hand very close = press
const uint16_t NEAR_THRESHOLD_MM = 150;   // hand near = potential gesture
const uint16_t FAR_THRESHOLD_MM = 300;    // beyond this = no gesture
const unsigned long PRESS_DEBOUNCE_MS = 400;
const unsigned long GESTURE_COOLDOWN_MS = 300;

uint16_t lastDistance = 999;
unsigned long lastPressTime = 0;
unsigned long lastGestureTime = 0;
bool wasNear = false;

void sendGesture(const char* type) {
  if (millis() - lastGestureTime < GESTURE_COOLDOWN_MS) return;
  lastGestureTime = millis();

  Serial.print("{\"type\":\"");
  Serial.print(type);
  Serial.println("\",\"ts\":0}");
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  if (!sensor.init()) {
    Serial.println("{\"error\":\"VL53L0X not found\"}");
    while (1) delay(10);
  }
  sensor.setMeasurementTimingBudget(20000);
  Serial.println("{\"ready\":\"Safe-Scroll VL53L0X\"}");
}

void loop() {
  uint16_t dist = sensor.readRangeSingleMillimeters();
  if (sensor.timeoutOccurred() || dist > 4000) dist = 999;

  bool isNear = dist < NEAR_THRESHOLD_MM;
  bool isPress = dist < PRESS_THRESHOLD_MM;

  if (isPress && (millis() - lastPressTime > PRESS_DEBOUNCE_MS)) {
    lastPressTime = millis();
    sendGesture("press");
  } else if (wasNear && !isNear && lastDistance < NEAR_THRESHOLD_MM) {
    // Hand left quickly - could map to scroll based on last distance trend
    if (lastDistance < PRESS_THRESHOLD_MM + 30)
      sendGesture("circle");  // alternative: interpret as "summarize" trigger
  } else if (isNear && lastDistance > FAR_THRESHOLD_MM) {
    // Hand just entered - could start tracking for swipe direction
    // Simplified: use distance delta for scroll
    int delta = (int)dist - (int)lastDistance;
    if (delta < -20) sendGesture("swipe_down");
    else if (delta > 20) sendGesture("swipe_up");
  }

  wasNear = isNear;
  lastDistance = dist;

  delay(50);
}
