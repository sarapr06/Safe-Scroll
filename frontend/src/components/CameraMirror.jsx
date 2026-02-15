import { useState, useRef, useEffect, useCallback } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

const API = '/api';
const WAVE_THRESHOLD = 0.035;
const COOLDOWN_MS = 400;
const FIST_COOLDOWN_MS = 5000;
const SCROLL_HOLD_INTERVAL_MS = 180;  // ms between scroll ticks while holding gesture
const SCROLL_GRACE_MS = 400;          // tolerate gesture flicker before stopping scroll
const SCROLL_DIR_SWITCH_MS = 500;     // require opposite gesture held this long before switching direction
const SMOOTH = 0.25;
const FIST_GESTURE_MIN_SCORE = 0.2;
const GESTURE_MIN_SCORE = 0.3;  // Pointing_Up, Victory, Open_Palm, ILoveYou (matches classifier)

const THREE_FINGER_COOLDOWN_MS = 2000;  // 2s cooldown before gesture can trigger again
// L-shape: index pointing up + thumb to the side (Voice QA)
const L_INDEX_MIN_LEN = 0.06;     // index finger must be extended
const L_THUMB_MIN_LEN = 0.04;     // thumb must be extended outward
const L_PERPENDICULAR_MAX = 0.55; // |cos(angle)| < this (vectors ~90° apart)
const L_OTHER_FINGERS_MAX_LEN = 0.095;     // fallback: absolute max for curled (tip-MCP dist)
const L_OTHER_VS_INDEX_RATIO = 0.55;       // middle/ring/pinky must be < indexLen * this (relative check)
const L_HOLD_MS = 1000;           // must hold L-shape for 1s before activating

const THUMB_UP_COOLDOWN_MS = 800;

export function CameraMirror({ onWaveLeft, onWaveRight, onScrollUp, onScrollDown, onScrollHoldStart, onScrollHoldStop, onSwitchScrollTarget, onThumbsUp, onPlayAudio, onUserGesture, onPinchStart, onPinchStop, scrollTarget }) {
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
  const lastThumbsUpTimeRef = useRef(0);
  const wasLShapeRef = useRef(false);
  const lShapeFirstSeenRef = useRef(null);
  const lShapeHoldTriggeredRef = useRef(false);
  const scrollIntervalRef = useRef(null);
  const scrollDirectionRef = useRef(null);
  const lastScrollGestureSeenRef = useRef(0);
  const lastOppositeGestureSeenRef = useRef(null);  // when we first saw the opposite direction
  const rafRef = useRef(null);
  const lastLShapeFailLogRef = useRef(0);

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror.jsx:fist',message:'fist detected, calling onPlayAudio',data:{hasOnPlayAudio:!!onPlayAudio},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      onPlayAudio?.();
      fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'fist', value: 'hand_fist' }) }).catch(() => {});
      return;
    }

    // L-shape (index up + thumb to side): Voice QA - skip when browsing files (user wants scroll, not record)
    if (scrollTarget !== 'files' && (onPinchStart || onPinchStop) && landmarks.length >= 21) {
      const indexMcp = landmarks[5];
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      const ax = indexTip.x - indexMcp.x;
      const ay = indexTip.y - indexMcp.y;
      const bx = thumbTip.x - indexMcp.x;
      const by = thumbTip.y - indexMcp.y;
      const lenA = Math.sqrt(ax * ax + ay * ay) || 1e-6;
      const lenB = Math.sqrt(bx * bx + by * by) || 1e-6;
      const cosAngle = (ax * bx + ay * by) / (lenA * lenB);
      const indexUp = lenA >= L_INDEX_MIN_LEN && ay < 0;
      const thumbOut = lenB >= L_THUMB_MIN_LEN;
      // middle(9→12), ring(13→16), pinky(17→20) must be curled (tip close to MCP)
      const tipDist = (mcp, tip) => Math.hypot(tip.x - mcp.x, tip.y - mcp.y);
      const middleDist = tipDist(landmarks[9], landmarks[12]);
      const ringDist = tipDist(landmarks[13], landmarks[16]);
      const pinkyDist = tipDist(landmarks[17], landmarks[20]);
      const curledThreshold = Math.max(L_OTHER_FINGERS_MAX_LEN, lenA * L_OTHER_VS_INDEX_RATIO);
      const middleCurled = middleDist <= curledThreshold;
      const ringCurled = ringDist <= curledThreshold;
      const pinkyCurled = pinkyDist <= curledThreshold;
      const othersCurled = middleCurled && ringCurled && pinkyCurled;
      const isLShape = indexUp && thumbOut && othersCurled && Math.abs(cosAngle) <= L_PERPENDICULAR_MAX;
      const wasLShape = wasLShapeRef.current;
      // #region agent log
      const heldMs = lShapeFirstSeenRef.current != null ? now - lShapeFirstSeenRef.current : 0;
      if (isLShape && heldMs % 250 < 50) fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror.jsx:Lshape',message:'L-shape hold',data:{isLShape,indexUp,thumbOut,othersCurled,cosAngleAbs:Math.abs(cosAngle),lenA,lenB,heldMs,lShapeHoldTriggered:lShapeHoldTriggeredRef.current,onPinchExists:!!onPinchStart},timestamp:Date.now(),hypothesisId:'H1_H4_H5'})}).catch(()=>{});
      if (!isLShape && indexUp && thumbOut && (now - lastLShapeFailLogRef.current) > 800) { lastLShapeFailLogRef.current = now; fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror.jsx:LshapeFail',message:'index+thumb out but not full L-shape',data:{othersCurled,cosAngleAbs:Math.abs(cosAngle),lenA,lenB,middleDist,ringDist,pinkyDist,maxOther:Math.max(middleDist,ringDist,pinkyDist)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{}); }
      // #endregion

      if (!isLShape) {
        lShapeFirstSeenRef.current = null;
        lShapeHoldTriggeredRef.current = false;
        wasLShapeRef.current = false;
        if (wasLShape) {
          clearScrollInterval();
          onPinchStop?.();
          fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'lshape_stop', value: 'voice_qa' }) }).catch(() => {});
        }
        // not in L-shape, fall through to scroll
      } else {
        if (lShapeFirstSeenRef.current == null) lShapeFirstSeenRef.current = now;
        const heldMs = now - lShapeFirstSeenRef.current;
        if (heldMs >= L_HOLD_MS && !lShapeHoldTriggeredRef.current) {
          lShapeHoldTriggeredRef.current = true;
          wasLShapeRef.current = true;
          clearScrollInterval();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror.jsx:onPinchStartCall',message:'calling onPinchStart',data:{heldMs},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
          onPinchStart?.();
          fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'lshape_start', value: 'voice_qa' }) }).catch(() => {});
        } else if (lShapeHoldTriggeredRef.current) {
          wasLShapeRef.current = true;
        }
        return;  // in L-shape, skip scroll gestures
      }
    }

    // Content scroll: 1 finger = scroll up, 2 fingers = scroll down, open palm = stop (check first)
    const pointingUp = gestures?.find((g) => g.categoryName === 'Pointing_Up' && g.score >= GESTURE_MIN_SCORE);
    const victory = gestures?.find((g) => g.categoryName === 'Victory' && g.score >= GESTURE_MIN_SCORE);
    const openPalm = gestures?.find((g) => g.categoryName === 'Open_Palm' && g.score >= GESTURE_MIN_SCORE);

    if (openPalm) {
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror:openPalm',message:'calling onScrollHoldStop',timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      clearScrollInterval();
      onScrollHoldStop?.();
      scrollDirectionRef.current = null;
    } else if (pointingUp && scrollDirectionRef.current !== 'up') {
      const inDown = scrollDirectionRef.current === 'down';
      if (inDown && scrollTarget === 'files') {
        const opp = lastOppositeGestureSeenRef.current;
        if (opp == null) { lastOppositeGestureSeenRef.current = now; return; }  // first opposite frame
        if (now - opp < SCROLL_DIR_SWITCH_MS) return;  // debounce
        lastOppositeGestureSeenRef.current = null;
      }
      clearScrollInterval();
      scrollDirectionRef.current = 'up';
      lastScrollGestureSeenRef.current = now;
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror:intervalStart',message:'scroll-up interval',data:{},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #region agent log
      if (scrollTarget === 'files') {
        fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror:onScrollHoldStart',message:'invoking up',data:{scrollTarget},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        onScrollHoldStart?.('up');
      } else {
        onScrollUp?.();
        scrollIntervalRef.current = setInterval(() => onScrollUp?.(), SCROLL_HOLD_INTERVAL_MS);
      }
      fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'point_up', value: 'scroll_up' }) }).catch(() => {});
      return;
    } else if (victory && scrollDirectionRef.current !== 'down') {
      const inUp = scrollDirectionRef.current === 'up';
      if (inUp && scrollTarget === 'files') {
        const opp = lastOppositeGestureSeenRef.current;
        if (opp == null) { lastOppositeGestureSeenRef.current = now; return; }  // first opposite frame
        if (now - opp < SCROLL_DIR_SWITCH_MS) return;  // debounce
        lastOppositeGestureSeenRef.current = null;
      }
      clearScrollInterval();
      scrollDirectionRef.current = 'down';
      lastScrollGestureSeenRef.current = now;
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror:intervalStart',message:'scroll-down interval',data:{},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #region agent log
      if (scrollTarget === 'files') {
        fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror:onScrollHoldStart',message:'invoking down',data:{scrollTarget},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        onScrollHoldStart?.('down');
      } else {
        onScrollDown?.();
        scrollIntervalRef.current = setInterval(() => onScrollDown?.(), SCROLL_HOLD_INTERVAL_MS);
      }
      fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'victory', value: 'scroll_down' }) }).catch(() => {});
      return;
    } else if (!pointingUp && !victory) {
      lastOppositeGestureSeenRef.current = null;  // reset opposite-gesture debounce
      const graceMs = scrollTarget === 'files' ? 800 : SCROLL_GRACE_MS;  // longer grace when browsing files
      const hadScroll = scrollIntervalRef.current || (scrollTarget === 'files' && scrollDirectionRef.current);
      const graceExceeded = hadScroll && (now - lastScrollGestureSeenRef.current) > graceMs;
      if (graceExceeded) {
        fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror:graceExceeded',message:'calling onScrollHoldStop',data:{scrollDir:scrollDirectionRef.current},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        clearScrollInterval();
        onScrollHoldStop?.();
        scrollDirectionRef.current = null;
      }
    }
    if (pointingUp || victory) {
      lastScrollGestureSeenRef.current = now;
      if (scrollTarget === 'files') {
        const sameDir = (pointingUp && scrollDirectionRef.current === 'up') || (victory && scrollDirectionRef.current === 'down');
        if (sameDir) lastOppositeGestureSeenRef.current = null;
      }
      return;
    }

    // 3 fingers (ILoveYou) = switch scroll target; 2s cooldown between triggers
    const iLoveYou = gestures?.find((g) => g.categoryName === 'ILoveYou' && g.score >= GESTURE_MIN_SCORE);
    if (iLoveYou && now - lastThreeFingerTimeRef.current > THREE_FINGER_COOLDOWN_MS) {
      lastThreeFingerTimeRef.current = now;
      clearScrollInterval();
      onScrollHoldStop?.();
      scrollDirectionRef.current = null;
      onSwitchScrollTarget?.();
      fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'three_fingers', value: 'switch_scroll_target' }) }).catch(() => {});
      return;
    }
    if (iLoveYou) return;  // still showing 3 fingers but cooldown active—skip wave

    // Thumb_Up = confirm selection when browsing patient files (App checks scrollTarget === 'files')
    const thumbUp = gestures?.find((g) => g.categoryName === 'Thumb_Up' && g.score >= GESTURE_MIN_SCORE);
    if (thumbUp && scrollTarget === 'files' && (scrollIntervalRef.current || scrollDirectionRef.current)) {
      lastScrollGestureSeenRef.current = now;  // treat as "hand there" during scroll—avoid clear from misclassification
      return;
    }
    if (thumbUp && onThumbsUp && now - lastThumbsUpTimeRef.current > THUMB_UP_COOLDOWN_MS) {
      lastThumbsUpTimeRef.current = now;
      clearScrollInterval();
      onScrollHoldStop?.();
      scrollDirectionRef.current = null;
      onThumbsUp();
      fetch(`${API}/gestures`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'thumb_up', value: 'confirm_selection' }) }).catch(() => {});
      return;
    }
    if (thumbUp) return;

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
  }, [onWaveLeft, onWaveRight, onScrollUp, onScrollDown, onScrollHoldStart, onScrollHoldStop, onSwitchScrollTarget, onThumbsUp, onPlayAudio, onUserGesture, onPinchStart, onPinchStop, clearScrollInterval, scrollTarget]);

  useEffect(() => {
    let failCount = 0;
    const maxFails = 3;
    const poll = () => {
      if (failCount >= maxFails) return;
      fetch(`${API}/presage/metrics`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
        .then((data) => {
          failCount = 0;
          setPresageMetrics(data);
        })
        .catch(() => {
          failCount += 1;
        });
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
        if (wasLShapeRef.current && gestureRecognizer) {
          wasLShapeRef.current = false;
          lShapeFirstSeenRef.current = null;
          lShapeHoldTriggeredRef.current = false;
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraMirror.jsx:handLost',message:'hand lost, reset L-shape',data:{},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          const stop = typeof onPinchStop === 'function' ? onPinchStop : null;
          if (stop) stop();
        }
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
  }, [processGestures, onPinchStop]);

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
        <p className="camera-instructions-note">Uses camera{(onPinchStart || onPinchStop) ? ' and mic' : ''}. Speakers for audio.</p>
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
          <span>🤟</span> <span className="camera-instructions-label">3 fingers = confirm patient (2s cooldown)</span>
        </div>
        <p className="camera-instructions-note camera-instructions-tip">While scrolling patients, gestures are faster than swiping. If you want to pause patient scrolling, use this symbol to confirm.</p>
        <div className="camera-instructions-row">
          <span>🖐️</span> <span className="camera-instructions-label">open palm = stop</span>
        </div>
        <div className="camera-instructions-row">
          <span>✊</span> <span className="camera-instructions-label">closed fist = play audio</span>
        </div>
        {(onPinchStart || onPinchStop) && (
          <div className="camera-instructions-row">
            <span>👆👍</span> <span className="camera-instructions-label">hold L-shape 1s = record, relax = send</span>
          </div>
        )}
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
