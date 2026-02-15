import { useState, useEffect, useCallback, useRef } from 'react';

const GESTURE_DISPLAY_MS = 2500;
import { FileViewer, SCROLL_AMOUNT } from './components/FileViewer';
import { FileList } from './components/FileList';
import { SummaryPanel } from './components/SummaryPanel';
import { GestureStatus } from './components/GestureStatus';
import { CameraMirror } from './components/CameraMirror';
import { MRISlicePopup } from './components/MRISlicePopup';
import './App.css';
import './components.css';
import { DEMO_PATIENTS } from './demoPatients.js';
import { DEMO_IMAGING } from './demoImaging.js';
import { ENABLE_VOICE_QA } from './featureFlags.js';

const API = '/api';
const VOICE_QA_RECORD_MAX_MS = 60000;  // 60s max safety if release not detected

function speakText(text, onEnd) {
  // #region agent log
  const hasSS = typeof speechSynthesis !== 'undefined';
  const hasSpeak = hasSS && typeof speechSynthesis?.speak === 'function';
  const hasText = !!text && String(text).trim().length > 0;
  const voices = hasSS ? speechSynthesis.getVoices() : [];
  fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:speakText:entry',message:'speakText called',data:{hasSS,hasSpeak,hasText,textLen:String(text||'').length,voicesCount:voices.length,isSecure:typeof location!=='undefined'&&location.protocol==='https:',bailEarly:!hasSS||!hasSpeak||!hasText},timestamp:Date.now(),hypothesisId:'H3_H4_H5'})}).catch(()=>{});
  // #endregion
  if (typeof speechSynthesis === 'undefined' || !speechSynthesis.speak || !text) {
    if (typeof onEnd === 'function') onEnd();
    return;
  }
  speechSynthesis.cancel();
  if (typeof speechSynthesis.resume === 'function') speechSynthesis.resume();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.lang = 'en-US';
  const voicesList = speechSynthesis.getVoices();
  // Chrome's Google voices don't fire onstart/onend; native (localService) voices do. Force local.
  const localVoice =
    voicesList.find((v) => v.localService && v.lang.startsWith('en')) ||
    voicesList.find((v) => v.localService);
  if (localVoice) u.voice = localVoice;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:speakText:voiceSelected',message:'voice choice',data:{hasLocalVoice:!!localVoice,voiceName:localVoice?.name,localService:localVoice?.localService},timestamp:Date.now(),hypothesisId:'H5',runId:'post-fix'})}).catch(()=>{});
  // #endregion
  if (typeof onEnd === 'function') u.onend = onEnd;
  // #region agent log
  u.onstart = () => { fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:speakText:onstart',message:'utterance started',data:{},timestamp:Date.now(),hypothesisId:'H4_H5'})}).catch(()=>{}); };
  // #endregion
  speechSynthesis.speak(u);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:speakText:afterSpeak',message:'speechSynthesis.speak invoked',data:{},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
}

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
  const [isFingerPresent, setIsFingerPresent] = useState(false);
  const [mriSliceIndex, setMriSliceIndex] = useState(0);
  const [voiceQaPhase, setVoiceQaPhase] = useState('idle'); // idle | recording | transcribing | answering | speaking
  const [voiceQaQuestion, setVoiceQaQuestion] = useState('');
  const [voiceQaLiveTranscript, setVoiceQaLiveTranscript] = useState(''); // live during recording
  const [voiceQaAnswer, setVoiceQaAnswer] = useState('');

  const currentIndexRef = useRef(currentIndex);
  const filesRef = useRef(files);
  const voicesReadyRef = useRef(false);
  currentIndexRef.current = currentIndex;
  filesRef.current = files;

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const loadVoices = () => { speechSynthesis.getVoices(); voicesReadyRef.current = true; };
    if (speechSynthesis.getVoices().length > 0) voicesReadyRef.current = true;
    else speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const goPrev = useCallback(() => {
    const fl = filesRef.current;
    const idx = currentIndexRef.current;
    if (fl.length === 0) return;
    const i = idx <= 0 ? fl.length - 1 : idx - 1;
    setCurrentIndex(i);
    setCurrentFile(fl[i]);
  }, []);

  const goNext = useCallback(() => {
    const fl = filesRef.current;
    const idx = currentIndexRef.current;
    if (fl.length === 0) return;
    const i = idx < 0 || idx >= fl.length - 1 ? 0 : idx + 1;
    setCurrentIndex(i);
    setCurrentFile(fl[i]);
  }, []);

  const contentScrollRef = useRef(null);
  const summaryScrollRef = useRef(null);
  const filesScrollIntervalRef = useRef(null);
  const FILE_NAV_INTERVAL_MS = 1000; // 1s per patient when holding 1/2 finger in files mode
  const [scrollTarget, setScrollTarget] = useState('patient'); // 'patient' | 'summary' | 'files'

  const stopFilesScroll = useCallback(() => {
    // #region agent log
    if (filesScrollIntervalRef.current) {
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App:stopFilesScroll',message:'clearing interval',timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    }
    // #endregion
    if (filesScrollIntervalRef.current) {
      clearInterval(filesScrollIntervalRef.current);
      filesScrollIntervalRef.current = null;
    }
  }, []);

  const handleScrollHoldStart = useCallback((dir) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App:handleScrollHoldStart',message:'called',data:{dir,scrollTarget,filesLen:files.length},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (scrollTarget !== 'files') return;
    stopFilesScroll();
    if (dir === 'up') {
      goPrev();
      filesScrollIntervalRef.current = setInterval(goPrev, FILE_NAV_INTERVAL_MS);
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App:intervalStarted',message:'up',timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    } else {
      goNext();
      filesScrollIntervalRef.current = setInterval(goNext, FILE_NAV_INTERVAL_MS);
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App:intervalStarted',message:'down',timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    }
  }, [scrollTarget, goPrev, goNext, stopFilesScroll]);

  const handleScrollHoldStop = useCallback(() => {
    stopFilesScroll();
  }, [stopFilesScroll]);
  const scrollUp = useCallback(() => {
    if (scrollTarget === 'files') return; // handled by handleScrollHoldStart
    const el = scrollTarget === 'patient' ? contentScrollRef.current : summaryScrollRef.current;
    el?.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' });
  }, [scrollTarget]);
  const scrollDown = useCallback(() => {
    if (scrollTarget === 'files') return; // handled by handleScrollHoldStart
    const el = scrollTarget === 'patient' ? contentScrollRef.current : summaryScrollRef.current;
    el?.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' });
  }, [scrollTarget]);
  const handleSwitchScrollTarget = useCallback(() => {
    stopFilesScroll();
    setScrollTarget((prev) => {
      if (prev === 'patient') return 'summary';
      if (prev === 'summary') return 'files';
      return 'patient';
    });
  }, [stopFilesScroll]);

  const handleThumbsUp = useCallback(() => {
    stopFilesScroll();
    setScrollTarget((prev) => (prev === 'files' ? 'patient' : prev));
  }, [stopFilesScroll]);

  useEffect(() => {
    if (files.length && currentFile) {
      const i = files.findIndex((f) => f._id === currentFile._id);
      setCurrentIndex(i >= 0 ? i : -1);
    }
  }, [files, currentFile]);

  // Announce patient name and ID when loading/switching a patient
  const getPatientName = useCallback((file) =>
    file ? (file.title?.replace(/^(Peri-Operative Record|Patient Report Sheet) - /, '') || file.patientId) : null
  , []);
  const getSpeakableId = useCallback((id) =>
    id ? String(id).replace(/^MR/i, 'M R ') : ''
  , []);
  useEffect(() => {
    if (!currentFile) return;
    const name = getPatientName(currentFile);
    const id = currentFile.patientId ? getSpeakableId(currentFile.patientId) : '';
    const text = id ? `${name}, ID ${id}` : name;
    if (!text.trim()) return;
    speakText(text);
  }, [currentFile, getPatientName, getSpeakableId]);

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
        const keys = data.summaries ? Object.keys(data.summaries) : [];
        const perKey = keys.reduce((a, k) => { const sk=data.summaries[k]; const s=sk?.summary||sk; const vb=s?.verbalSummary??sk?.verbalSummary??''; a[k]={hasError:!!sk?.error,hasVerbal:!!vb,vbLen:vb?.length??0,vbSnippet:String(vb).slice(0,80)}; return a; }, {});
        fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:batchData',message:'batch data received',data:{hasSummaries:!!data.summaries,summaryKeys:keys,error:data.error,perKey},timestamp:Date.now(),hypothesisId:'H1_H2'})}).catch(()=>{});
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
      const stillViewing = String(currentFileRef.current?._id ?? currentFileRef.current?.id ?? '') === String(fileId);
      if (data.summary != null || data.audioBase64 != null) {
        setSummariesByFileId((prev) => ({ ...prev, [String(fileId)]: data }));
        if (stillViewing) setSummary(data);
        // #region agent log
        else fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleSummarizeOneSkipSetSummary',message:'skipped setSummary, user switched',data:{fileId:String(fileId),currentId:String(currentFileRef.current?._id??currentFileRef.current?.id??'')},timestamp:Date.now(),hypothesisId:'race-fix',runId:'post-fix'})}).catch(()=>{});
        // #endregion
      } else if (data.error) {
        const errData = { error: data.error, keyFindings: [], abnormalVitals: [], coreMetrics: {}, verbalSummary: data.error };
        setSummariesByFileId((prev) => ({ ...prev, [String(fileId)]: errData }));
        if (stillViewing) setSummary(errData);
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
    const cachedHasError = !!(cached?.error || (cached?.summary || cached)?.error);
    const willAttemptFallback = (!cached || cachedHasError) && !loading && hasContent && !fallbackRequestedRef.current.has(id) && typeof handleSummarizeOne === 'function';
    // #region agent log
    const s = cached?.summary || cached;
    const kfLen = s?.keyFindings?.length ?? cached?.keyFindings?.length ?? 0;
    const vb = s?.verbalSummary ?? cached?.verbalSummary ?? '';
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:deriveSummary',message:'derive effect',data:{id,currentTitle:currentFile.title,cacheKeys:Object.keys(summariesByFileId),hasCached:!!cached,cachedError:!!cached?.error,loading,willAttemptFallback,kfLen,vbLen:vb?.length??0,vbSnippet:String(vb).slice(0,120),cachedFromSingle:!!cached?.audioBase64},timestamp:Date.now(),hypothesisId:'H6_H7'})}).catch(()=>{});
    // #endregion
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

  // ESP8266 serial: U/D = scroll MRI slices, finger present = show popup (via SSE)
  const espFingerTimeoutRef = useRef(null);
  useEffect(() => {
    let es = null;
    let retryTimer;
    let connectTimer;
    let cancelled = false;
    let failCount = 0;
    const maxRetries = 5;
    const FINGER_TIMEOUT_MS = 3000;
    const connect = () => {
      if (cancelled || failCount >= maxRetries) return;
      const url = `${API}/esp8266/stream`;
      es = new EventSource(url);
      es.onopen = () => { failCount = 0; };
      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.inactive) {
            setIsFingerPresent(false);
            return;
          }
          const dir = msg.direction;
          if (dir === 'U' || dir === 'D') {
            setIsFingerPresent(true);
            setMriSliceIndex((i) => (dir === 'U' ? Math.max(0, i - 1) : i + 1));
          }
          if (espFingerTimeoutRef.current) clearTimeout(espFingerTimeoutRef.current);
          espFingerTimeoutRef.current = setTimeout(() => setIsFingerPresent(false), FINGER_TIMEOUT_MS);
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (!cancelled) {
          failCount += 1;
          if (failCount < maxRetries) retryTimer = setTimeout(connect, 3000);
        }
      };
    };
    connectTimer = setTimeout(connect, 300);
    return () => {
      cancelled = true;
      clearTimeout(connectTimer);
      clearTimeout(retryTimer);
      if (espFingerTimeoutRef.current) clearTimeout(espFingerTimeoutRef.current);
      if (es) es.close();
    };
  }, []);

  const handleSelectFile = (file) => {
    setCurrentFile(file);
    setCurrentIndex(files.findIndex((f) => f._id === file._id));
  };

  const audioRef = useRef(null);
  const blobUrlRef = useRef(null);
  const currentFileRef = useRef(currentFile);
  currentFileRef.current = currentFile;

  const stopAllAudio = useCallback(() => {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }
    setIsPlayingAudio(false);
  }, []);

  const handlePlayAudio = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handlePlayAudio:entry',message:'handlePlayAudio called',data:{loading,hasSummary:!!summary},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    if (isPlayingAudio) return; // avoid double-trigger (fist/click firing twice)
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handlePlayAudio:beforeSpeak',message:'text derived',data:{hasToRead:!!toRead,hasText:!!text,textLen:String(text||'').length,msgSnippet:String(msg||'').slice(0,50)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (!text) return;
    setIsPlayingAudio(true);
    stopAllAudio();
    try {
      const res = await fetch(`${API}/summarize/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 2500) }),
      });
      const data = await res.json().catch(() => ({}));
      const audioBase64 = data?.audioBase64;
      if (audioBase64) {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(audioBlob);
        blobUrlRef.current = url;
        const audio = audioRef.current || new Audio();
        if (!audioRef.current) audioRef.current = audio;
        audio.src = url;
        audio.onended = () => {
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
          setIsPlayingAudio(false);
        };
        await audio.play();
        return;
      }
    } catch {
      /* ElevenLabs failed or audio.play() rejected; clear any partial setup before fallback */
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    }
    speakText(text, () => setIsPlayingAudio(false));
  }, [summary, loading, stopAllAudio, isPlayingAudio]);

  const voiceQaStopResolveRef = useRef(null);

  const handlePinchStart = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handlePinchStart',message:'handlePinchStart entered',data:{voiceQaPhase,ENABLE_VOICE_QA},timestamp:Date.now(),hypothesisId:'H2_H3'})}).catch(()=>{});
    // #endregion
    if (!ENABLE_VOICE_QA) return;
    stopAllAudio();
    if (voiceQaPhase !== 'idle' && voiceQaPhase !== 'speaking') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handlePinchStartEarlyReturn',message:'early return: voiceQaPhase not idle/speaking',data:{voiceQaPhase},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      return;
    }
    setVoiceQaQuestion('');
    setVoiceQaAnswer('');
    setVoiceQaLiveTranscript('');
    setVoiceQaPhase('recording');

    let stream = null;
    let recorder = null;
    let recognition = null;
    const chunks = [];
    voiceQaStopResolveRef.current = null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let liveAccumulated = '';
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (e) => {
        let curr = '';
        for (let i = 0; i < e.results.length; i++) {
          curr += e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            liveAccumulated += curr + ' ';
            curr = '';
          }
        }
        setVoiceQaLiveTranscript((liveAccumulated + curr).trim());
      };
    }

    const waitForRelease = new Promise((resolve) => { voiceQaStopResolveRef.current = resolve; });

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
      const recStopped = new Promise((resolve) => { recorder.onstop = resolve; });
      recorder.start();
      if (recognition) recognition.start();

      await Promise.race([
        waitForRelease,
        new Promise((resolve) => setTimeout(resolve, VOICE_QA_RECORD_MAX_MS)),
      ]);
      if (recorder.state === 'recording') recorder.stop();
      await recStopped;
      if (recognition) try { recognition.stop(); } catch {}
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      setVoiceQaAnswer(`Microphone error: ${e.message || 'Permission denied?'}`);
      setVoiceQaPhase('idle');
      setVoiceQaLiveTranscript('');
      return;
    } finally {
      stream?.getTracks()?.forEach((t) => t.stop());
      voiceQaStopResolveRef.current = null;
    }

    const blob = new Blob(chunks, { type: 'audio/webm' });
    if (blob.size < 100) {
      setVoiceQaPhase('idle');
      return;
    }

    const liveTranscript = liveAccumulated.trim();
    setVoiceQaLiveTranscript('');
    let transcript = liveTranscript;
    if (!liveTranscript) {
      setVoiceQaPhase('transcribing');
      try {
        const trRes = await fetch(`${API}/voice-qa/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'audio/webm' },
          body: blob,
        });
        const trData = await trRes.json().catch(() => ({}));
        transcript = (trData.text || trData.transcript || '').trim();
        if (!trRes.ok) {
          const err = trData.error || trRes.status;
          setVoiceQaAnswer(`Transcription failed: ${err}. Tip: Use Chrome for built-in speech recognition, or check your network.`);
          setVoiceQaPhase('idle');
          return;
        }
      } catch (e) {
        const msg = e.message || 'Unknown error';
        setVoiceQaAnswer(`Transcription failed: ${msg}. Tip: Use Chrome for built-in speech recognition, or try a different network.`);
        setVoiceQaPhase('idle');
        return;
      }
    }

    const finalTranscript = transcript;
    setVoiceQaQuestion(finalTranscript || '(no speech detected)');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:voiceQa-postTranscribe',message:'after transcribe',data:{transcriptLen:transcript?.length,liveLen:liveTranscript?.length,finalLen:finalTranscript?.length,finalEmpty:!finalTranscript?.trim(),willProceed:!!finalTranscript?.trim()},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    if (!finalTranscript) {
      setVoiceQaAnswer('No speech was detected. Please try again.');
      setVoiceQaPhase('idle');
      return;
    }

    setVoiceQaPhase('answering');
    const patientContent = currentFileRef.current?.content || currentFileRef.current?.text || '';
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:voiceQa-beforeAnswer',message:'about to fetch answer',data:{questionLen:finalTranscript?.length,patientContentLen:patientContent?.length},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    try {
      const ansRes = await fetch(`${API}/voice-qa/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: finalTranscript, patientContent }),
      });
      const ansData = await ansRes.json().catch(() => ({}));
      const answer = ansData.answer || ansData.error || (ansRes.ok ? 'No answer.' : `Server error (${ansRes.status})`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:voiceQa-afterAnswer',message:'answer fetch done',data:{ok:ansRes.ok,status:ansRes.status,hasAnswer:!!answer,answerLen:answer?.length,hasAudio:!!ansData?.audioBase64,keys:Object.keys(ansData||{})},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      setVoiceQaAnswer(answer);

      setVoiceQaPhase('speaking');
      const audioBase64 = ansData.audioBase64;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:voiceQa-speaking',message:'entering speak path',data:{hasAudio:!!audioBase64,answerLen:answer?.length},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      const speakAnswer = (fromFallback = false) => {
        // #region agent log
        if (fromFallback) fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:voiceQa-speakFallback',message:'audio.play failed, using speechSynthesis',data:{},timestamp:Date.now(),hypothesisId:'H5',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        if (answer) {
          speakText(answer, () => setVoiceQaPhase('idle'));
        } else {
          setVoiceQaPhase('idle');
        }
      };
      if (audioBase64) {
        try {
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          const binary = atob(audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(audioBlob);
          blobUrlRef.current = url;
          const audio = audioRef.current || new Audio();
          if (!audioRef.current) audioRef.current = audio;
          audio.src = url;
          audio.onended = () => {
            if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
            setVoiceQaPhase('idle');
          };
          audio.play().catch(() => speakAnswer(true));
        } catch {
          speakAnswer(false);
        }
      } else {
        speakAnswer(false);
      }
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3d69c74c-0a08-469c-8865-cd53c1d488d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:voiceQa-answerCatch',message:'answer fetch threw',data:{err:String(e?.message||e),stack:(e?.stack||'').slice(0,200)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      setVoiceQaAnswer(`Error: ${e.message || 'Failed to get answer'}`);
      setVoiceQaPhase('idle');
    }
  }, [stopAllAudio, voiceQaPhase]);

  const handlePinchStop = useCallback(() => {
    if (voiceQaPhase === 'recording' && voiceQaStopResolveRef.current) {
      voiceQaStopResolveRef.current();
    }
  }, [voiceQaPhase]);

  const handleUserGesture = useCallback(() => {
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.getVoices();
    // Use speakText (local voice + cancel/resume) so user gesture primes the engine correctly
    if (speechSynthesis.speak) speakText('Audio ready.');
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
        <div className="hearts" aria-hidden>
          <img src="/pixel-heart.gif" alt="" />
          <img src="/pixel-heart.gif" alt="" />
          <img src="/pixel-heart.gif" alt="" />
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <CameraMirror
            onWaveLeft={goPrev}
            onWaveRight={goNext}
            onScrollUp={scrollUp}
            onScrollDown={scrollDown}
            onScrollHoldStart={handleScrollHoldStart}
            onScrollHoldStop={handleScrollHoldStop}
            onSwitchScrollTarget={handleSwitchScrollTarget}
            onThumbsUp={handleThumbsUp}
            onPlayAudio={handlePlayAudio}
            onUserGesture={handleUserGesture}
            onPinchStart={ENABLE_VOICE_QA ? handlePinchStart : undefined}
            onPinchStop={ENABLE_VOICE_QA ? handlePinchStop : undefined}
            scrollTarget={scrollTarget}
          />
          <div className={`file-list-wrapper ${scrollTarget === 'files' ? 'file-list-wrapper--scroll-target' : ''}`}>
            <FileList
              files={files}
              current={currentFile}
              onSelect={handleSelectFile}
              loading={filesLoading}
              onRefresh={loadFiles}
            />
          </div>
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
        {scrollTarget === 'patient' && '📄 Patient data'}
        {scrollTarget === 'summary' && '🤖 AI Summary'}
        {scrollTarget === 'files' && '📋 Patient files'}
        <span className="scroll-target-hint">
          {scrollTarget === 'files'
            ? '1 finger=prev, 2 fingers=next, 👍 confirm'
            : '3 fingers = switch (2s cooldown)'}
        </span>
      </div>
      <GestureStatus gesture={lastGesture} />
      <MRISlicePopup visible={isFingerPresent} sliceIndex={mriSliceIndex} currentFile={currentFile} />
      {ENABLE_VOICE_QA && voiceQaPhase !== 'idle' && (
        <div className="voice-qa-panel" role="status" aria-live="polite">
          <div className="voice-qa-phase">
            {voiceQaPhase === 'recording' && '🎤 Recording…'}
            {voiceQaPhase === 'transcribing' && '⏳ Transcribing…'}
            {voiceQaPhase === 'answering' && (
              <>
                <span>🤖 Asking Gemini…</span>
                <span className="voice-qa-phase-sub">Buffering response based on patient data…</span>
              </>
            )}
            {voiceQaPhase === 'speaking' && '🔊 Speaking answer…'}
          </div>
          {(voiceQaPhase === 'recording' && (voiceQaLiveTranscript || true)) || voiceQaQuestion ? (
            <div className="voice-qa-question">
              {voiceQaPhase === 'recording' ? 'Listening: ' : 'You asked: '}
              {voiceQaPhase === 'recording' ? (voiceQaLiveTranscript || '…') : voiceQaQuestion}
            </div>
          ) : null}
          {voiceQaAnswer && (
            <div className="voice-qa-answer-wrap">
              <div className="voice-qa-answer">{voiceQaAnswer}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
