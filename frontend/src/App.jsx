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
import { DEMO_IMAGING } from './demoImaging.js';

const API = '/api';

export default function App() {
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [currentFile, setCurrentFile] = useState(null);
  const [imaging, setImaging] = useState(null);
  const [imagingLoading, setImagingLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summariesByFileId, setSummariesByFileId] = useState({});
  const [audioCache, setAudioCache] = useState({});
  const [lastGesture, setLastGesture] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const goPrev = useCallback(() => {
    if (files.length === 0) return;
    const i = currentIndex <= 0 ? files.length - 1 : currentIndex - 1;
    setCurrentIndex(i);
    setCurrentFile(files[i]);
  }, [files, currentIndex]);

  const goNext = useCallback(() => {
    if (files.length === 0) return;
    const i = currentIndex < 0 || currentIndex >= files.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(i);
    setCurrentFile(files[i]);
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

  // Announce patient name when loading a patient
  const getPatientName = useCallback((file) =>
    file ? (file.title?.replace(/^(Peri-Operative Record|Patient Report Sheet) - /, '') || file.patientId) : null
  , []);
  useEffect(() => {
    const name = getPatientName(currentFile);
    if (!name || typeof speechSynthesis === 'undefined' || !speechSynthesis.speak) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(name);
    u.rate = 0.95;
    u.lang = 'en-US';
    const voices = speechSynthesis.getVoices();
    if (voices?.length > 0) u.voice = voices[0];
    speechSynthesis.speak(u);
  }, [currentFile, getPatientName]);

  const initialLoadDone = useRef(false);
  const loadFiles = useCallback(() => {
    setFilesLoading(true);
    fetch(`${API}/files`)
      .then((r) => r.json())
      .then((data) => {
        const list = data?.length > 0 ? data : DEMO_PATIENTS;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:loadFilesResolved',message:'files loaded',data:{count:list?.length,ids:list?.map(f=>String(f._id??f.id??''))},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        setFiles(list);
        if (list.length > 0 && !initialLoadDone.current) {
          initialLoadDone.current = true;
          setCurrentFile(list[0]);
          setCurrentIndex(0);
        }
      })
      .catch(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:loadFilesCatch',message:'files fetch failed, using demo',data:{ids:DEMO_PATIENTS?.map(f=>String(f._id??f.id??''))},timestamp:Date.now(),hypothesisId:'H1_H2'})}).catch(()=>{});
        // #endregion
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

  // One Gemini call per page load: batch summarize all patients, then show cached summaries
  const batchRequestedRef = useRef(false);
  useEffect(() => {
    if (files.length === 0 || filesLoading || batchRequestedRef.current) return;
    batchRequestedRef.current = true;
    setLoading(true);
    const payload = {
      files: files.map((f) => ({
        id: f._id ?? f.id,
        content: f.content || f.text || '',
      })),
    };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:batchStart',message:'batch request sent',data:{fileCount:payload.files?.length,ids:payload.files?.map(f=>String(f.id))},timestamp:Date.now(),hypothesisId:'H1_H2'})}).catch(()=>{});
    // #endregion
    fetch(`${API}/summarize/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (r) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:batchResponse',message:'batch raw response',data:{ok:r.ok,status:r.status},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        const text = await r.text();
        let data;
        try { data = text ? JSON.parse(text) : {}; } catch { data = { error: r.ok ? 'Invalid response' : `Request failed (${r.status})` }; }
        return data;
      })
      .then((data) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:batchData',message:'batch data received',data:{hasSummaries:!!data.summaries,summaryKeys:data.summaries?Object.keys(data.summaries):[],error:data.error,firstSummarySample:data.summaries?JSON.stringify(Object.values(data.summaries)[0])?.slice(0,150):null},timestamp:Date.now(),hypothesisId:'H2_H3'})}).catch(()=>{});
        // #endregion
        if (data.summaries && typeof data.summaries === 'object') {
          setSummariesByFileId(data.summaries);
        } else if (data.error && payload.files?.length) {
          const errSummaries = {};
          payload.files.forEach((f) => {
            errSummaries[String(f.id)] = { error: data.error, keyFindings: [], abnormalVitals: [], coreMetrics: {}, verbalSummary: data.error };
          });
          setSummariesByFileId(errSummaries);
        }
      })
      .catch((e) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:batchCatch',message:'batch fetch failed',data:{err:String(e?.message||e)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        batchRequestedRef.current = false;
      })
      .finally(() => setLoading(false));
  }, [files, filesLoading]);

  // Fallback: per-patient summarize when batch fails or returns no summaries (AI only)
  const handleSummarizeOne = useCallback(async () => {
    if (!currentFile || loading) return;
    const fileId = currentFile._id;
    const content = currentFile.content || currentFile.text;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleSummarizeOne',message:'fallback invoked',data:{fileId:String(fileId),hasContent:!!content?.length},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    setLoading(true);
    try {
      const res = await fetch(`${API}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, content }),
      });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { error: res.ok ? 'Invalid response' : `Request failed (${res.status})` }; }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleSummarizeOneResult',message:'fallback result',data:{fileId:String(fileId),hasSummary:!!data.summary,hasAudio:!!data.audioBase64,ok:!(data.error),error:data.error},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      if (data.summary != null || data.audioBase64 != null) {
        setSummariesByFileId((prev) => ({ ...prev, [String(fileId)]: data }));
        setSummary(data);
      } else if (data.error) {
        const errData = { error: data.error, keyFindings: [], abnormalVitals: [], coreMetrics: {}, verbalSummary: data.error };
        setSummariesByFileId((prev) => ({ ...prev, [String(fileId)]: errData }));
        setSummary(errData);
      }
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleSummarizeOneCatch',message:'fallback failed',data:{err:String(e?.message||e)},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
    } finally {
      setLoading(false);
    }
  }, [currentFile, loading]);

  // Derive summary from cache when current file changes (AI only)
  const fallbackRequestedRef = useRef(new Set());
  useEffect(() => {
    if (!currentFile) {
      setSummary(null);
      return;
    }
    const id = String(currentFile._id ?? currentFile.id ?? '');
    let cached = summariesByFileId[id];
    if (!cached && Object.keys(summariesByFileId).length > 0) {
      const altId = String(currentFile.id ?? currentFile._id ?? '');
      if (altId && altId !== id) cached = summariesByFileId[altId];
    }
    const hasContent = !!(currentFile.content || currentFile.text);
    const willAttemptFallback = !cached && !loading && hasContent && !fallbackRequestedRef.current.has(id) && typeof handleSummarizeOne === 'function';

    setSummary(cached ?? null);
    if (willAttemptFallback) {
      fallbackRequestedRef.current.add(id);
      handleSummarizeOne();
    }
  }, [currentFile, summariesByFileId, loading, handleSummarizeOne]);

  // Fetch imaging when patient file changes
  useEffect(() => {
    const pid = currentFile?.patientId;
    if (!pid) {
      setImaging(null);
      return;
    }
    setImagingLoading(true);
    setImaging(null);
    fetch(`${API}/imaging?patientId=${encodeURIComponent(pid)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setImaging(data);
        else setImaging([]);
      })
      .catch(() => setImaging(null))
      .finally(() => setImagingLoading(false));
  }, [currentFile?.patientId]);

  const gestureClearTimerRef = useRef(null);
  useEffect(() => {
    let ws = null;
    let retryTimer;
    let connectTimer;
    let cancelled = false;
    let failCount = 0;
    const maxRetries = 5;
    const connect = () => {
      if (cancelled || failCount >= maxRetries) return;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = location.host;
      ws = new WebSocket(`${proto}//${host}/ws/gestures`);
      ws.onopen = () => { failCount = 0; };
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
        if (!cancelled) {
          failCount += 1;
          if (failCount < maxRetries) retryTimer = setTimeout(connect, 3000);
        }
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
  };

  const audioRef = useRef(null);
  const blobUrlRef = useRef(null);

  const handlePlayAudio = useCallback(async () => {
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
        : !summary ? 'AI summary loading…'
        : 'Wait for the summary to load, then close your fist.';
    const text = (toRead || msg).replace(/AI unavailable/gi, 'loading');
    const fileId = currentFile?._id;
    let audioBase64 = summary?.audioBase64 ?? (fileId ? audioCache[fileId] : null);
    if (!audioBase64 && text && fileId) {
      try {
        const res = await fetch(`${API}/summarize/audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (data.audioBase64) {
          setAudioCache((prev) => ({ ...prev, [fileId]: data.audioBase64 }));
          audioBase64 = data.audioBase64;
        }
      } catch {}
    }
    if (audioBase64 && text) {
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
  }, [summary, loading, currentFile?._id, audioCache]);

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
          <FileViewer
            file={currentFile}
            scrollContainerRef={contentScrollRef}
            imaging={imaging}
            imagingLoading={imagingLoading}
            demoImaging={currentFile?.patientId ? DEMO_IMAGING[currentFile.patientId] : null}
          />
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
