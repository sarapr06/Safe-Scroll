import { useState, useRef, useEffect, useCallback } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

const API = '/api';
const WAVE_THRESHOLD = 0.035;
const COOLDOWN_MS = 400;
const FIST_COOLDOWN_MS = 5000;
const SCROLL_HOLD_INTERVAL_MS = 180;  // ms between scroll ticks while holding gesture
const SMOOTH = 0.25;
const FIST_GESTURE_MIN_SCORE = 0.2;
const GESTURE_MIN_SCORE = 0.3;  // Pointing_Up, Victory, Open_Palm, ILoveYou (matches classifier)

const THREE_FINGER_COOLDOWN_MS = 2000;  // 2s cooldown before gesture can trigger again

export function CameraMirror({ onWaveLeft, onWaveRight, onScrollUp, onScrollDown, onSwitchScrollTarget, onPlayAudio, onUserGesture }) {
  const [presageMetrics, setPresageMetrics] = useState(null);
  const [handDetected, setHandDetected] = useState(false);
  const handDetectedTimeoutRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const gestureRecognizerRef = useRef(null);
  const lastHandXRef = useRef(null);
  const lastHandYRef = useRef(null);
  const smoothedXRef = useRef(null);
  const smoothedYRef = useRef(null);
  const lastHWaveTimeRef = useRef(0);
  const lastVWaveTimeRef = useRef(0);
  const lastFistTimeRef = useRef(0);
  const lastThreeFingerTimeRef = useRef(0);
  const scrollIntervalRef = useRef(null);
  const scrollDirectionRef = useRef(null);
  const rafRef = useRef(null);

  const clearScrollInterval = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
      scrollDirectionRef.current = null;
    }
  }, []);

  const processGestures = useCallback((results) => {
    const landmarks = results?.landmarks?.[0];
    if (!landmarks?.length) return;
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const middleMcp = landmarks[9];
    const handX = (wrist.x + (indexMcp?.x ?? wrist.x) + (middleMcp?.x ?? wrist.x)) / 3;
    const handY = (wrist.y + (indexMcp?.y ?? wrist.y) + (middleMcp?.y ?? wrist.y)) / 3;

    const prevX = smoothedXRef.current;
    const prevY = smoothedYRef.current;
    const smoothedX = prevX === null ? handX : prevX + SMOOTH * (handX - prevX);
    const smoothedY = prevY === null ? handY : prevY + SMOOTH * (handY - prevY);
    smoothedXRef.current = smoothedX;
    smoothedYRef.current = smoothedY;

    const now = Date.now();

    // Fist: MediaPipe GestureRecognizer Closed_Fist. Accept top gesture OR any Closed_Fist above threshold.
    const gestures = results?.gestures?.[0];
    const topGesture = gestures?.[0];
    const closedFist = gestures?.find((g) => g.categoryName === 'Closed_Fist');
    const isFist =
      (topGesture?.categoryName === 'Closed_Fist' && topGesture.score >= FIST_GESTURE_MIN_SCORE) ||
      (closedFist && closedFist.score >= FIST_GESTURE_MIN_SCORE);

    if (isFist && now - lastFistTimeRef.current > FIST_COOLDOWN_MS) {
      lastFistTimeRef.current = now;
      clearScrollInterval();
      lastHandXRef.current = null;
      lastHandYRef.current = null;
      smoothedXRef.current = null;
      smoothedYRef.current = null;
      onPlayAudio?.();
      fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'fist', value: 'hand_fist' }) }).catch(() => {});
      return;
    }

    // Content scroll: 1 finger = scroll up, 2 fingers = scroll down, open palm = stop (check first)
    const pointingUp = gestures?.find((g) => g.categoryName === 'Pointing_Up' && g.score >= GESTURE_MIN_SCORE);
    const victory = gestures?.find((g) => g.categoryName === 'Victory' && g.score >= GESTURE_MIN_SCORE);
    const openPalm = gestures?.find((g) => g.categoryName === 'Open_Palm' && g.score >= GESTURE_MIN_SCORE);

    if (openPalm) {
      clearScrollInterval();
    } else if (pointingUp && scrollDirectionRef.current !== 'up') {
      clearScrollInterval();
      scrollDirectionRef.current = 'up';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror.jsx:pointingUp',message:'1-finger scroll triggered',data:{onScrollUpExists:!!onScrollUp},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      onScrollUp?.();
      scrollIntervalRef.current = setInterval(() => onScrollUp?.(), SCROLL_HOLD_INTERVAL_MS);
      fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'point_up', value: 'scroll_up' }) }).catch(() => {});
      return;
    } else if (victory && scrollDirectionRef.current !== 'down') {
      clearScrollInterval();
      scrollDirectionRef.current = 'down';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror.jsx:victory',message:'2-finger scroll triggered',data:{onScrollDownExists:!!onScrollDown},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      onScrollDown?.();
      scrollIntervalRef.current = setInterval(() => onScrollDown?.(), SCROLL_HOLD_INTERVAL_MS);
      fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'victory', value: 'scroll_down' }) }).catch(() => {});
      return;
    } else if (!pointingUp && !victory) {
      clearScrollInterval();
    }
    if (pointingUp || victory) return;

    // 3 fingers (ILoveYou) = switch scroll target; 2s cooldown between triggers
    const iLoveYou = gestures?.find((g) => g.categoryName === 'ILoveYou' && g.score >= GESTURE_MIN_SCORE);
    if (iLoveYou && now - lastThreeFingerTimeRef.current > THREE_FINGER_COOLDOWN_MS) {
      lastThreeFingerTimeRef.current = now;
      clearScrollInterval();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror.jsx:iLoveYou',message:'3-finger switch triggered',data:{onSwitchExists:!!onSwitchScrollTarget},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      onSwitchScrollTarget?.();
      fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'three_fingers', value: 'switch_scroll_target' }) }).catch(() => {});
      return;
    }
    if (iLoveYou) return;  // still showing 3 fingers but cooldown active—skip wave

    // Wave left/right for file navigation (needs position history)
    if (lastHandXRef.current === null) {
      lastHandXRef.current = smoothedX;
      lastHandYRef.current = smoothedY;
      return;
    }

    const dx = smoothedX - lastHandXRef.current;
    const dy = smoothedY - lastHandYRef.current;
    lastHandXRef.current = smoothedX;
    lastHandYRef.current = smoothedY;

    const isHorizontal = Math.abs(dx) >= Math.abs(dy);
    if (isHorizontal && Math.abs(dx) > WAVE_THRESHOLD && now - lastHWaveTimeRef.current > COOLDOWN_MS) {
      lastHWaveTimeRef.current = now;
      if (dx < 0) {
        onWaveLeft?.();
        fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'swipe_left', value: 'hand_wave' }) }).catch(() => {});
      } else {
        onWaveRight?.();
        fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'swipe_right', value: 'hand_wave' }) }).catch(() => {});
      }
    }
  }, [onWaveLeft, onWaveRight, onScrollUp, onScrollDown, onSwitchScrollTarget, onPlayAudio, onUserGesture, clearScrollInterval]);

  useEffect(() => {
    const poll = () => {
      fetch(`${API}/presage/metrics`)
        .then((r) => r.json())
        .then(setPresageMetrics)
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const gestureRecognizer = gestureRecognizerRef.current;
    if (!video || !canvas || !gestureRecognizer || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    try {
      const results = gestureRecognizer.recognizeForVideo(video, performance.now());
      if (results.landmarks?.length > 0) {
        if (handDetectedTimeoutRef.current) clearTimeout(handDetectedTimeoutRef.current);
        setHandDetected(true);
        handDetectedTimeoutRef.current = setTimeout(() => setHandDetected(false), 500);
        processGestures(results);
      } else {
        if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
          scrollDirectionRef.current = null;
        }
        lastHandXRef.current = null;
        lastHandYRef.current = null;
        smoothedXRef.current = null;
        smoothedYRef.current = null;
      }
    } catch {}
    rafRef.current = requestAnimationFrame(processFrame);
  }, [processGestures]);

  useEffect(() => {
    if (!active) return;
    let stream = null;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'CPU',
          },
          numHands: 1,
          runningMode: 'VIDEO',
          cannedGesturesClassifierOptions: { scoreThreshold: 0.3 },
        });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            processFrame();
          };
        }
        setError(null);
      } catch (e) {
        const msg = e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Allow camera in browser settings and reload.'
          : e.name === 'NotFoundError'
          ? 'No camera found. Connect a webcam.'
          : e.message || 'Camera access failed';
        setError(msg);
      }
    })();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      if (handDetectedTimeoutRef.current) clearTimeout(handDetectedTimeoutRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active, processFrame]);

  return (
    <div className="camera-mirror">
      <div className="camera-instructions">
        <p className="camera-instructions-note">Uses camera (no mic). Speakers for audio.</p>
        <div className="camera-instructions-row">
          <span>← →</span> <span className="camera-instructions-label">files</span>
        </div>
        <div className="camera-instructions-row">
          <span>☝️</span> <span className="camera-instructions-label">1 finger = scroll up</span>
        </div>
        <div className="camera-instructions-row">
          <span>✌️</span> <span className="camera-instructions-label">2 fingers = scroll down</span>
        </div>
        <div className="camera-instructions-row">
          <span>🤟</span> <span className="camera-instructions-label">3 fingers = switch (2s cooldown)</span>
        </div>
        <div className="camera-instructions-row">
          <span>🖐️</span> <span className="camera-instructions-label">open palm = stop</span>
        </div>
        <div className="camera-instructions-row">
          <span>✊</span> <span className="camera-instructions-label">closed fist = play audio</span>
        </div>
      </div>
      <button
        type="button"
        className="btn-camera-toggle"
        onClick={() => {
          onUserGesture?.();
          setActive((a) => !a);
        }}
      >
        {active ? 'Stop camera' : 'Start camera'}
      </button>
      {active && (
        <div className="camera-video-wrap">
          <video ref={videoRef} muted playsInline className="camera-video" />
          <canvas ref={canvasRef} className="camera-canvas" />
          {error && <p className="camera-error">{error}</p>}
          {!error && (
            <div className={`camera-hand-status ${handDetected ? 'camera-hand-status--active' : ''}`}>
              {handDetected ? '✋ Hand detected' : 'Show your hand to the camera'}
            </div>
          )}
        </div>
      )}
      {presageMetrics && (
        <div className="presage-metrics">
          <span className="presage-metric">Focus: {Math.round((presageMetrics.focus ?? 0) * 100)}%</span>
          <span className="presage-metric">Engagement: {Math.round((presageMetrics.engagement ?? 0) * 100)}%</span>
        </div>
      )}
    </div>
  );
}
