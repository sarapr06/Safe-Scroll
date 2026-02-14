import { useState, useEffect, useCallback, useRef } from 'react';

const GESTURE_DISPLAY_MS = 2500;
import { FileViewer, SCROLL_AMOUNT } from './components/FileViewer';
import { FileList } from './components/FileList';
import { SummaryPanel } from './components/SummaryPanel';
import { GestureStatus } from './components/GestureStatus';
import { CameraMirror } from './components/CameraMirror';
import './App.css';
import './components.css';
import { DEMO_PATIENTS } from './demoPatients.js';

const API = '/api';

export default function App() {
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [currentFile, setCurrentFile] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastGesture, setLastGesture] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const goPrev = useCallback(() => {
    if (files.length === 0) return;
    const i = currentIndex <= 0 ? files.length - 1 : currentIndex - 1;
    setCurrentIndex(i);
    setCurrentFile(files[i]);
    setSummary(null);
  }, [files, currentIndex]);

  const goNext = useCallback(() => {
    if (files.length === 0) return;
    const i = currentIndex < 0 || currentIndex >= files.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(i);
    setCurrentFile(files[i]);
    setSummary(null);
  }, [files, currentIndex]);

  const contentScrollRef = useRef(null);
  const summaryScrollRef = useRef(null);
  const [scrollTarget, setScrollTarget] = useState('patient'); // 'patient' | 'summary'
  const scrollUp = useCallback(() => {
    const el = scrollTarget === 'patient' ? contentScrollRef.current : summaryScrollRef.current;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:scrollUp',message:'scrollUp invoked',data:{scrollTarget,elNull:!el,scrollHeight:el?.scrollHeight,clientHeight:el?.clientHeight,canScroll:el?el.scrollHeight>el.clientHeight:null},timestamp:Date.now(),hypothesisId:'H1_H4'})}).catch(()=>{});
    // #endregion
    el?.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' });
  }, [scrollTarget]);
  const scrollDown = useCallback(() => {
    const el = scrollTarget === 'patient' ? contentScrollRef.current : summaryScrollRef.current;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:scrollDown',message:'scrollDown invoked',data:{scrollTarget,elNull:!el,scrollHeight:el?.scrollHeight,clientHeight:el?.clientHeight,canScroll:el?el.scrollHeight>el.clientHeight:null},timestamp:Date.now(),hypothesisId:'H2_H4'})}).catch(()=>{});
    // #endregion
    el?.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' });
  }, [scrollTarget]);
  const handleSwitchScrollTarget = useCallback(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleSwitchScrollTarget',message:'switch invoked',data:{},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    setScrollTarget((prev) => (prev === 'patient' ? 'summary' : 'patient'));
  }, []);

  useEffect(() => {
    if (files.length && currentFile) {
      const i = files.findIndex((f) => f._id === currentFile._id);
      setCurrentIndex(i >= 0 ? i : -1);
    }
  }, [files, currentFile]);

  const initialLoadDone = useRef(false);
  const loadFiles = useCallback(() => {
    setFilesLoading(true);
    fetch(`${API}/files`)
      .then((r) => r.json())
      .then((data) => {
        const list = data?.length > 0 ? data : DEMO_PATIENTS;
        setFiles(list);
        if (list.length > 0 && !initialLoadDone.current) {
          initialLoadDone.current = true;
          setCurrentFile(list[0]);
          setCurrentIndex(0);
        }
      })
      .catch(() => {
        setFiles(DEMO_PATIENTS);
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          setCurrentFile(DEMO_PATIENTS[0]);
          setCurrentIndex(0);
        }
      })
      .finally(() => setFilesLoading(false));
  }, []);

  useEffect(() => {
    loadFiles();
  }, []);

  const gestureClearTimerRef = useRef(null);
  useEffect(() => {
    let ws = null;
    let retryTimer;
    let connectTimer;
    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.DEV ? `${location.hostname}:4000` : location.host;
      ws = new WebSocket(`${proto}//${host}/ws/gestures`);
      ws.onmessage = (e) => {
        try {
          const gesture = JSON.parse(e.data);
          setLastGesture(gesture);
          if (gestureClearTimerRef.current) clearTimeout(gestureClearTimerRef.current);
          gestureClearTimerRef.current = setTimeout(() => {
            setLastGesture(null);
            gestureClearTimerRef.current = null;
          }, GESTURE_DISPLAY_MS);
        } catch {}
      };
      ws.onclose = () => {
        ws = null;
        if (!cancelled) retryTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => {};
    };
    connectTimer = setTimeout(connect, 200);
    return () => {
      cancelled = true;
      clearTimeout(connectTimer);
      clearTimeout(retryTimer);
      if (gestureClearTimerRef.current) clearTimeout(gestureClearTimerRef.current);
      if (ws?.readyState === 1) ws.close();
    };
  }, []);

  const handleSelectFile = (file) => {
    setCurrentFile(file);
    setCurrentIndex(files.findIndex((f) => f._id === file._id));
    setSummary(null);
  };

  const currentFileRef = useRef(currentFile);
  currentFileRef.current = currentFile;

  const handleSummarize = useCallback(async () => {
    if (!currentFile) return;
    const fileId = currentFile._id;
    const content = currentFile.content || currentFile.text;
    setLoading(true);
    try {
      const res = await fetch(`${API}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, content }),
      });
      const data = await res.json();
      if (currentFileRef.current?._id === fileId) setSummary(data);
    } catch (e) {
      if (currentFileRef.current?._id === fileId) setSummary({ error: e.message });
    } finally {
      setLoading(false);
    }
  }, [currentFile]);

  // Auto-summarize when patient file is viewed
  const lastSummarizedId = useRef(null);
  useEffect(() => {
    if (!currentFile || filesLoading || loading) return;
    if (lastSummarizedId.current === currentFile._id) return;
    lastSummarizedId.current = currentFile._id;
    const t = setTimeout(handleSummarize, 300);
    return () => clearTimeout(t);
  }, [currentFile?._id, filesLoading, loading, handleSummarize]);

  const audioRef = useRef(null);
  const blobUrlRef = useRef(null);
  const handlePlayAudio = useCallback(() => {
    const s = summary?.summary || summary;
    const toRead =
      s?.verbalSummary ||
      summary?.verbalSummary ||
      (s?.keyFindings?.length ? s.keyFindings.join('. ') : null) ||
      (summary?.keyFindings?.length ? summary.keyFindings.join('. ') : null) ||
      summary?.error ||
      s?.error ||
      null;
    const msg =
      loading ? 'Summary is loading. Please wait.'
        : !summary ? 'No summary available. Select a file and wait for it to load.'
        : 'Wait for the summary to load, then close your fist.';
    const text = toRead || msg;
    const audioBase64 = summary?.audioBase64;
    if (audioBase64 && s) {
      try {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const audio = audioRef.current || new Audio();
        if (!audioRef.current) audioRef.current = audio;
        audio.src = url;
        audio.onended = () => {
          if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
          setIsPlayingAudio(false);
        };
        setIsPlayingAudio(true);
        audio.play().catch(() => {
          if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
          setIsPlayingAudio(false);
          if (text && speechSynthesis?.speak) {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 0.95;
            u.lang = 'en-US';
            const voices = speechSynthesis.getVoices();
            if (voices?.length > 0) u.voice = voices[0];
            u.onend = () => setIsPlayingAudio(false);
            speechSynthesis.speak(u);
          }
        });
      } catch (e) {
        if (text && speechSynthesis?.speak) {
          speechSynthesis.cancel();
          setIsPlayingAudio(true);
          const u = new SpeechSynthesisUtterance(text);
          u.rate = 0.95;
          u.lang = 'en-US';
          const voices = speechSynthesis.getVoices();
          if (voices?.length > 0) u.voice = voices[0];
          u.onend = () => setIsPlayingAudio(false);
          speechSynthesis.speak(u);
        }
      }
      return;
    }
    if (text && typeof speechSynthesis !== 'undefined' && speechSynthesis.speak) {
      speechSynthesis.cancel();
      setIsPlayingAudio(true);
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.lang = 'en-US';
      const voices = speechSynthesis.getVoices();
      if (voices?.length > 0) u.voice = voices[0];
      u.onend = () => setIsPlayingAudio(false);
      speechSynthesis.speak(u);
    }
  }, [summary, loading]);

  const handleUserGesture = useCallback(() => {
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.getVoices();
    if (speechSynthesis.speak) {
      const u = new SpeechSynthesisUtterance('Audio ready.');
      u.rate = 1.2;
      u.volume = 0.5;
      speechSynthesis.speak(u);
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      ctx.resume().then(() => {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }).catch(() => {});
    }
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Safe-Scroll</h1>
        <span className="tagline">Touchless Patient Hub</span>
        <div className="hearts" aria-hidden>♥ ♥ ♥</div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <FileList
            files={files}
            current={currentFile}
            onSelect={handleSelectFile}
            loading={filesLoading}
            onRefresh={loadFiles}
          />
          <CameraMirror
            onWaveLeft={goPrev}
            onWaveRight={goNext}
            onScrollUp={scrollUp}
            onScrollDown={scrollDown}
            onSwitchScrollTarget={handleSwitchScrollTarget}
            onPlayAudio={handlePlayAudio}
            onUserGesture={handleUserGesture}
          />
        </aside>

        <section className={`content ${scrollTarget === 'patient' ? 'content--scroll-target' : ''}`}>
          <FileViewer file={currentFile} scrollContainerRef={contentScrollRef} />
        </section>

        <aside className={`summary-sidebar ${scrollTarget === 'summary' ? 'summary-sidebar--scroll-target' : ''}`}>
          <div ref={summaryScrollRef} className="summary-scroll-container">
            <SummaryPanel
            summary={summary}
            loading={loading}
            patientName={currentFile ? (currentFile.title?.replace(/^(Peri-Operative Record|Patient Report Sheet) - /, '') || currentFile.patientId) : null}
            isPlayingAudio={isPlayingAudio}
            onPlayAudioClick={handlePlayAudio}
          />
          </div>
        </aside>
      </main>

      <div className="scroll-target-indicator">
        {scrollTarget === 'patient' ? '📄 Patient data' : '🤖 AI Summary'}
        <span className="scroll-target-hint">3 fingers = switch (2s cooldown)</span>
      </div>
      <GestureStatus gesture={lastGesture} />
    </div>
  );
}
