


import { useState, useRef, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   STABLE PAY BRAND TOKENS
   Matched to stablepay.global landing page design
───────────────────────────────────────────── */
const T = {
  /* backgrounds — aligned with landing #0a0a0f base */
  bg0: "#0a0a0f",        // page bg
  bg1: "#0f0f18",        // card bg
  bg2: "#141420",        // input bg
  bg3: "#1a1a28",        // hover / subtle panel
  bg4: "#202030",        // active / elevated card
  /* borders */
  bdr:  "#1e1e30",
  bdrA: "#2d2d45",
  bdrFocus: "#6667AB",
  /* brand purple — #6667AB from stablepay.global */
  blue:  "#6667AB",
  blueL: "#8889C0",
  blueD: "#5A5B9F",
  blueGlow: "rgba(102,103,171,0.18)",
  blueGlowS: "rgba(102,103,171,0.08)",
  /* text */
  txt:  "#EEEEF2",
  txt2: "#9999B0",
  txt3: "#5A5A72",
  /* semantic */
  green:  "#00C896",
  greenG: "rgba(0,200,150,0.12)",
  red:    "#F04438",
  redG:   "rgba(240,68,56,0.12)",
  amber:  "#F79009",
  amberG: "rgba(247,144,9,0.12)",
  /* gradient — brand purple */
  grad: "linear-gradient(135deg,#6667AB 0%,#5A5B9F 100%)",
  gradS: "linear-gradient(135deg,rgba(102,103,171,0.15) 0%,rgba(90,91,159,0.06) 100%)",
};

/* ─────────────────────────────────────────────
   GLOBAL STYLES injected once
───────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:${T.bg0};}
  ::-webkit-scrollbar-thumb{background:${T.bdrA};border-radius:4px;}
  input:-webkit-autofill{-webkit-box-shadow:0 0 0 100px ${T.bg2} inset!important;-webkit-text-fill-color:${T.txt}!important;}
  ::selection{background:${T.blueGlow};color:${T.txt};}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(102,103,171,.3)}50%{box-shadow:0 0 20px rgba(102,103,171,.6)}}
  @keyframes float{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(40px,-40px) scale(1.08)}50%{transform:translate(-30px,30px) scale(0.92)}75%{transform:translate(-40px,-30px) scale(1.04)}}
  .sp-fade{animation:fadeUp .5s cubic-bezier(0.22,1,0.36,1) both;}
  .sp-input:focus{outline:none!important;border-color:${T.bdrFocus}!important;box-shadow:0 0 0 3px rgba(102,103,171,0.15)!important;}
  .sp-input::placeholder{color:${T.txt3};}
  .sp-btn-primary{transition:all .3s ease!important;}
  .sp-btn-primary:hover{background:linear-gradient(135deg,#7778B8 0%,#6667AB 100%)!important;transform:translateY(-2px);box-shadow:0 10px 40px rgba(102,103,171,0.4)!important;}
  .sp-btn-primary:active{transform:translateY(0);}
  .sp-step-item:hover .sp-step-label{color:${T.blueL}!important;}
  .sp-glass{background:linear-gradient(180deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.02) 100%);border:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(10px);}
  .sp-grid-bg{background-image:linear-gradient(rgba(102,103,171,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(102,103,171,0.03) 1px,transparent 1px);background-size:60px 60px;}
  .sp-noise{position:fixed;top:0;left:0;width:100%;height:100%;opacity:0.015;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
  @media(max-width:768px){
    .sp-sidebar{display:none!important;}
    .sp-mobile-nav{display:flex!important;}
    .sp-main{padding:16px!important;}
    .sp-topbar{padding:10px 16px!important;}
    .sp-bottombar{padding:12px 16px!important;}
    .sp-form-body{padding:20px 16px!important;max-width:100%!important;}
    .sp-grid{grid-template-columns:1fr!important;}
  }
  @media(min-width:769px){
    .sp-mobile-nav{display:none!important;}
  }
`;

/* ─────────────────────────────────────────────
   BASE COMPONENTS
───────────────────────────────────────────── */
function Label({ children, required, hint }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: T.txt2 }}>
        {children}
        {required && <span style={{ color: T.blue, marginLeft: 3 }}>*</span>}
      </span>
      {hint && <p style={{ fontSize: 11.5, color: T.txt3, marginTop: 3, lineHeight: 1.5, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>{hint}</p>}
    </div>
  );
}

function Field({ label, required, hint, error, children, half }) {
  return (
    <div style={{ gridColumn: half ? "span 1" : "span 2", marginBottom: 2 }}>
      {label && <Label required={required} hint={hint}>{label}</Label>}
      {children}
      {error && <p style={{ fontSize: 11, color: T.red, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}><span>⚠</span>{error}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", monospace }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="sp-input"
      style={{
        width: "100%", background: T.bg2, border: `1.5px solid ${T.bdr}`,
        borderRadius: 8, padding: "10px 14px", color: T.txt,
        fontSize: monospace ? 12.5 : 13.5, fontFamily: monospace ? "'IBM Plex Mono', monospace" : "'Inter', system-ui, sans-serif",
        transition: "border-color .18s, box-shadow .18s",
      }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3, monospace }) {
  return (
    <textarea
      value={value || ""}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="sp-input"
      style={{
        width: "100%", background: T.bg2, border: `1.5px solid ${T.bdr}`,
        borderRadius: 8, padding: "10px 14px", color: T.txt,
        fontSize: monospace ? 12.5 : 13.5, fontFamily: monospace ? "'IBM Plex Mono', monospace" : "'Inter', system-ui, sans-serif",
        resize: "vertical", lineHeight: 1.6, transition: "border-color .18s, box-shadow .18s",
      }}
    />
  );
}

function Select({ value, onChange, options, placeholder }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value || ""}
        onChange={e => onChange?.(e.target.value)}
        className="sp-input"
        style={{
          width: "100%", background: T.bg2, border: `1.5px solid ${f ? T.bdrFocus : T.bdr}`,
          borderRadius: 8, padding: "10px 38px 10px 14px", color: value ? T.txt : T.txt3,
          fontSize: 13.5, fontFamily: "'Inter', system-ui, sans-serif", cursor: "pointer",
          appearance: "none", transition: "border-color .18s",
        }}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
      >
        <option value="">{placeholder || "Select..."}</option>
        {options.map(o => <option key={o.v || o} value={o.v || o} style={{ background: T.bg2, color: T.txt }}>{o.l || o}</option>)}
      </select>
      <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 5L7 9L11 5" stroke={T.txt3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function RadioGroup({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(o => {
        const v = o.v || o, l = o.l || o, sel = value === v;
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 16px",
            border: `1.5px solid ${sel ? T.bdrFocus : T.bdr}`,
            borderRadius: 8, cursor: "pointer", background: sel ? T.blueGlowS : "transparent",
            color: sel ? T.blueL : T.txt2, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
            transition: "all .16s", fontWeight: sel ? 600 : 400,
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: "50%",
              border: `2px solid ${sel ? T.blue : T.txt3}`,
              background: sel ? T.blue : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {sel && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />}
            </div>
            {l}
          </button>
        );
      })}
    </div>
  );
}

function Checkbox({ label, checked, onChange, accent }) {
  return (
    <label onClick={() => onChange(!checked)} style={{
      display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
      padding: "11px 14px", border: `1.5px solid ${checked ? (accent === "amber" ? T.amber : T.bdrFocus) : T.bdr}`,
      borderRadius: 8, background: checked ? (accent === "amber" ? T.amberG : T.blueGlowS) : "transparent",
      marginBottom: 6, transition: "all .16s", userSelect: "none",
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
        border: `2px solid ${checked ? (accent === "amber" ? T.amber : T.blue) : T.txt3}`,
        background: checked ? (accent === "amber" ? T.amber : T.blue) : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .16s",
      }}>
        {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span style={{ fontSize: 13, color: T.txt, lineHeight: 1.55 }}>{label}</span>
    </label>
  );
}

function FileUpload({ value, onChange, hint }) {
  const ref = useRef();
  const displayName = typeof value === "object" ? value?.name : value;
  return (
    <div
      onClick={() => ref.current.click()}
      style={{
        border: `1.5px dashed ${displayName ? T.blue : T.bdrA}`, borderRadius: 8,
        padding: "16px 20px", cursor: "pointer", textAlign: "center",
        background: displayName ? T.blueGlowS : T.bg2, transition: "all .2s",
        display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <input type="file" ref={ref} style={{ display: "none" }} onChange={e => {
        const file = e.target.files?.[0];
        if (file) onChange?.({ file, name: file.name });
      }} accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff" />
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: displayName ? T.blueGlow : T.bg3,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 10V13H14V10M8 2V10M5 5L8 2L11 5" stroke={displayName ? T.blue : T.txt3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ textAlign: "left", flex: 1 }}>
        <div style={{ fontSize: 13, color: displayName ? T.blueL : T.txt2, fontWeight: 500 }}>
          {displayName || "Upload document"}
        </div>
        {!displayName && <div style={{ fontSize: 11.5, color: T.txt3, marginTop: 2 }}>{hint || "PDF, JPG, PNG — max 10MB"}</div>}
      </div>
      {!displayName && (
        <div style={{
          fontSize: 11, padding: "5px 12px", borderRadius: 6, border: `1px solid ${T.bdrA}`,
          color: T.txt2, background: T.bg3, whiteSpace: "nowrap",
        }}>Browse</div>
      )}
    </div>
  );
}



/* ─────────────────────────────────────────────
   REAL-TIME FACE LIVENESS VERIFICATION
   MediaPipe FaceLandmarker — automatic detection
   Sumsub-style oval guide with progress ring
───────────────────────────────────────────── */
const LIVENESS_CSS = `
@keyframes lv-pulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes lv-pop{0%{transform:scale(0.8);opacity:0}50%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
@keyframes lv-success{0%{stroke-dashoffset:300}100%{stroke-dashoffset:0}}
@keyframes lv-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.lv-challenge-enter{animation:lv-pop .35s ease both;}
.lv-pulse{animation:lv-pulse 1.8s ease-in-out infinite;}
`;

const LIVENESS_CHALLENGES = [
  { id: "center", label: "Look straight at the camera", sub: "Position your face in the oval", detect: (l) => l.faceInOval },
  { id: "left",   label: "Turn your head left",         sub: "Slowly rotate to your left",    detect: (l) => l.yaw > 25 },
  { id: "right",  label: "Turn your head right",        sub: "Slowly rotate to your right",   detect: (l) => l.yaw < -25 },
  { id: "blink",  label: "Blink naturally",             sub: "Close and open your eyes",       detect: (l) => l.blink },
];

function getFaceLandmarks(landmarks) {
  if (!landmarks || !landmarks.length) return null;
  const lm = landmarks[0];
  const nose = lm[1], leftEar = lm[234], rightEar = lm[454];
  const leftEyeTop = lm[159], leftEyeBot = lm[145], rightEyeTop = lm[386], rightEyeBot = lm[374];
  const chin = lm[152], forehead = lm[10];

  const faceW = Math.abs(rightEar.x - leftEar.x);
  const faceH = Math.abs(chin.y - forehead.y);
  const centerX = (leftEar.x + rightEar.x) / 2;
  const centerY = (forehead.y + chin.y) / 2;
  const faceInOval = centerX > 0.3 && centerX < 0.7 && centerY > 0.25 && centerY < 0.75 && faceW > 0.15 && faceH > 0.2;

  const noseRelX = (nose.x - leftEar.x) / faceW;
  const yaw = (0.5 - noseRelX) * 90;

  const leftEAR = Math.abs(leftEyeTop.y - leftEyeBot.y) / faceW;
  const rightEAR = Math.abs(rightEyeTop.y - rightEyeBot.y) / faceW;
  const avgEAR = (leftEAR + rightEAR) / 2;
  const blink = avgEAR < 0.025;

  return { faceInOval, yaw, blink, avgEAR, centerX, centerY, faceW, faceH };
}

function FaceLiveness({ value, onChange }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const cssRef = useRef(false);

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [captures, setCaptures] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [error, setError] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (cssRef.current) return;
    cssRef.current = true;
    const s = document.createElement("style");
    s.textContent = LIVENESS_CSS;
    document.head.appendChild(s);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (landmarkerRef.current) { landmarkerRef.current.close(); landmarkerRef.current = null; }
    setActive(false);
    setLoading(false);
  }, []);

  const drawOverlay = useCallback((ctx, w, h, detected, progress) => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    const cx = w / 2, cy = h * 0.43, rx = w * 0.29, ry = h * 0.39;

    // Dark vignette outside oval
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fill();

    // Oval border — base ring
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 2, ry + 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = detected ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Progress ring around oval
    if (progress > 0 && detected) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 2, ry + 2, 0, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress / 100));
      ctx.strokeStyle = T.green;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.shadowColor = T.green;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (detected) {
      // Glow ring when face detected but not holding
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 2, ry + 2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = T.blue + "88";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = T.blue;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Corner guides
    const gLen = 18, gOff = 6;
    ctx.strokeStyle = detected ? T.green : "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.shadowBlur = 0;
    const corners = [
      [cx - rx - gOff, cy - ry - gOff, 1, 1],
      [cx + rx + gOff, cy - ry - gOff, -1, 1],
      [cx - rx - gOff, cy + ry + gOff, 1, -1],
      [cx + rx + gOff, cy + ry + gOff, -1, -1],
    ];
    corners.forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * gLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * gLen, y);
      ctx.stroke();
    });

    ctx.restore();
  }, []);

  const startLiveness = useCallback(async () => {
    setError("");
    setLoading(true);
    setActive(true);
    setStep(0);
    setCaptures([]);
    setHoldProgress(0);
    setFeedback("");
    setTransitioning(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }
      });
      streamRef.current = stream;
      await new Promise(r => setTimeout(r, 150));
      const video = videoRef.current;
      if (!video) throw new Error("Video element not ready. Please try again.");
      video.srcObject = stream;
      await video.play();

      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, FilesetResolver } = vision;
      const filesetResolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
      let faceLandmarker;
      try {
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", delegate: "GPU" },
          runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
        });
      } catch {
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
          runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
        });
      }
      landmarkerRef.current = faceLandmarker;
      setLoading(false);

      let currentStep = 0, holdStart = 0, completed = [], lastTime = 0, pauseUntil = 0;

      const detect = () => {
        if (!videoRef.current || !landmarkerRef.current || videoRef.current.paused) return;
        const now = performance.now();
        if (now - lastTime < 50) { rafRef.current = requestAnimationFrame(detect); return; }
        lastTime = now;

        // Pause between challenges for transition
        if (now < pauseUntil) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        const result = landmarkerRef.current.detectForVideo(videoRef.current, now);
        const overlay = overlayRef.current;
        const hasFace = result.faceLandmarks && result.faceLandmarks.length > 0;
        setFaceDetected(hasFace);

        if (overlay) {
          const ctx = overlay.getContext("2d");
          overlay.width = videoRef.current.videoWidth;
          overlay.height = videoRef.current.videoHeight;
          const hp = hasFace && result.faceLandmarks.length > 0 ? (() => {
            const m = getFaceLandmarks(result.faceLandmarks);
            if (!m) return 0;
            const ch = LIVENESS_CHALLENGES[currentStep];
            if (!ch.detect(m)) return 0;
            if (!holdStart) return 1;
            return Math.min(100, ((now - holdStart) / (ch.id === "blink" ? 200 : 800)) * 100);
          })() : 0;
          drawOverlay(ctx, overlay.width, overlay.height, hasFace, hp);
        }

        if (hasFace) {
          const metrics = getFaceLandmarks(result.faceLandmarks);
          if (!metrics) { rafRef.current = requestAnimationFrame(detect); return; }

          const challenge = LIVENESS_CHALLENGES[currentStep];
          const pass = challenge.detect(metrics);

          if (pass) {
            if (!holdStart) holdStart = now;
            const held = now - holdStart;
            const required = challenge.id === "blink" ? 200 : 800;
            const prog = Math.min(100, (held / required) * 100);
            setHoldProgress(prog);
            setFeedback(prog > 60 ? "Almost there..." : "Hold steady...");

            if (held >= required) {
              const canvas = canvasRef.current;
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
              completed.push({ challenge: challenge.label, image: canvas.toDataURL("image/jpeg", 0.85), timestamp: new Date().toISOString() });
              setCaptures([...completed]);
              currentStep++;
              holdStart = 0;
              setHoldProgress(0);
              setTransitioning(true);

              if (currentStep >= LIVENESS_CHALLENGES.length) {
                setFeedback("Verification complete");
                setTimeout(() => {
                  stopCamera();
                  onChange({ verified: true, challengeCount: LIVENESS_CHALLENGES.length, completedAt: new Date().toISOString(), captures: completed });
                }, 600);
                return;
              }

              setFeedback("Perfect");
              pauseUntil = now + 800;
              setTimeout(() => {
                setStep(currentStep);
                setTransitioning(false);
                setFeedback("");
              }, 700);
            }
          } else {
            holdStart = 0;
            setHoldProgress(0);
            if (challenge.id === "center" && !metrics.faceInOval) {
              if (metrics.centerX < 0.35) setFeedback("Move right");
              else if (metrics.centerX > 0.65) setFeedback("Move left");
              else if (metrics.centerY < 0.3) setFeedback("Move down");
              else if (metrics.centerY > 0.7) setFeedback("Move up");
              else if (metrics.faceW < 0.15) setFeedback("Move closer");
              else setFeedback("Center your face in the oval");
            } else if (challenge.id === "left") setFeedback("Turn more to your left");
            else if (challenge.id === "right") setFeedback("Turn more to your right");
            else if (challenge.id === "blink") setFeedback("Blink now");
          }
        } else {
          holdStart = 0;
          setHoldProgress(0);
          setFeedback("Position your face in the frame");
        }
        rafRef.current = requestAnimationFrame(detect);
      };
      rafRef.current = requestAnimationFrame(detect);
    } catch (e) {
      stopCamera();
      setError(e.name === "NotAllowedError" ? "Camera access denied. Please allow camera access in your browser settings." : `${e.message || "Unknown error"}. Try refreshing the page.`);
    }
  }, [stopCamera, onChange, drawOverlay]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ── Verified state ── */
  if (value?.verified) {
    return (
      <div style={{ border: `1px solid ${T.green}33`, borderRadius: 14, overflow: "hidden", background: `linear-gradient(180deg, ${T.greenG} 0%, ${T.bg1} 100%)` }}>
        <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.green }}>Identity Verified</div>
            <div style={{ fontSize: 11.5, color: T.txt3, marginTop: 2 }}>{value.challengeCount} challenges · {new Date(value.completedAt).toLocaleString()}</div>
          </div>
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", gap: 8 }}>
          {value.captures.map((c, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `2px solid ${T.green}33`, background: T.bg2 }}>
                <img src={c.image} alt={c.challenge} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ fontSize: 9.5, color: T.txt3, marginTop: 5, lineHeight: 1.3 }}>{c.challenge.replace("Turn your head ", "").replace("Look straight at the camera", "Center")}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 20px", borderTop: `1px solid ${T.bdr}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => onChange(null)} style={{ fontSize: 11.5, color: T.txt3, background: T.bg2, border: `1px solid ${T.bdr}`, borderRadius: 6, padding: "5px 14px", cursor: "pointer" }}>Redo</button>
        </div>
      </div>
    );
  }

  /* ── Idle state ── */
  if (!active && !loading) {
    return (
      <div>
        <div
          onClick={startLiveness}
          style={{
            border: `1px solid ${T.bdr}`, borderRadius: 14, cursor: "pointer", overflow: "hidden",
            background: `linear-gradient(180deg, ${T.bg2} 0%, ${T.bg1} 100%)`, transition: "all .25s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.blue; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.bdr; }}
        >
          {/* Face illustration area */}
          <div style={{ padding: "32px 20px 24px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", border: `2px dashed ${T.bdrA}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="10" r="4.5" stroke={T.txt3} strokeWidth="1.2"/>
                <path d="M5 20c0-3.5 3.5-5.5 7-5.5s7 2 7 5.5" stroke={T.txt3} strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.txt, marginBottom: 4 }}>Face Liveness Check</div>
            <div style={{ fontSize: 12.5, color: T.txt3, maxWidth: 300, margin: "0 auto" }}>
              We'll verify your identity with a quick camera check. Ensure good lighting and face the camera directly.
            </div>
          </div>

          {/* Steps preview */}
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.bdr}`, display: "flex", gap: 0 }}>
            {LIVENESS_CHALLENGES.map((c, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: "0 4px" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.bg3, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 12, fontWeight: 600, color: T.txt2 }}>{i + 1}</div>
                <div style={{ fontSize: 10, color: T.txt3, lineHeight: 1.3 }}>{c.label.replace("Turn your head ", "Turn ").replace("Look straight at the camera", "Face center")}</div>
              </div>
            ))}
          </div>

          {/* Start button area */}
          <div style={{ padding: "14px 20px 18px", borderTop: `1px solid ${T.bdr}`, textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 28px", borderRadius: 10, background: T.grad, color: "#fff", fontSize: 13.5, fontWeight: 600, letterSpacing: ".02em" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#fff" strokeWidth="1.2"/><circle cx="8" cy="8" r="2.5" fill="#fff"/></svg>
              Begin Verification
            </div>
          </div>
        </div>
        {error && <div style={{ fontSize: 12, color: T.red, marginTop: 10, padding: "8px 12px", background: T.redG, borderRadius: 8, border: `1px solid ${T.red}33` }}>{error}</div>}
      </div>
    );
  }

  /* ── Active / camera state ── */
  const challenge = LIVENESS_CHALLENGES[step];

  return (
    <div style={{ border: `1px solid ${T.bdrA}`, borderRadius: 14, overflow: "hidden", background: "#000" }}>
      {/* Camera viewport */}
      <div style={{ position: "relative", aspectRatio: "4/3" }}>
        <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: "scaleX(-1)" }} playsInline muted />
        <canvas ref={overlayRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, backdropFilter: "blur(4px)" }}>
            <div style={{ width: 40, height: 40, border: `3px solid rgba(255,255,255,0.1)`, borderTopColor: T.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 14 }} />
            <div style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>Preparing face detection</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>This may take a few seconds</div>
          </div>
        )}

        {/* Step indicators — top */}
        {!loading && (
          <div style={{ position: "absolute", top: 12, left: 16, right: 16, display: "flex", gap: 4, zIndex: 5 }}>
            {LIVENESS_CHALLENGES.map((c, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.12)" }}>
                <div style={{
                  height: "100%", borderRadius: 2, transition: "width .3s ease",
                  background: i < step ? T.green : (i === step && holdProgress > 0) ? T.green : "transparent",
                  width: i < step ? "100%" : i === step ? `${holdProgress}%` : "0%",
                }} />
              </div>
            ))}
          </div>
        )}

        {/* Transition overlay */}
        {transitioning && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 6 }}>
            <div className="lv-challenge-enter" style={{ background: "rgba(0,0,0,0.5)", borderRadius: 16, padding: "14px 28px", backdropFilter: "blur(6px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Perfect</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instruction bar */}
      {!loading && (
        <div style={{ padding: "14px 18px", background: T.bg1, borderTop: `1px solid ${T.bdr}` }}>
          <div key={step} className="lv-challenge-enter" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.txt, marginBottom: 3 }}>{challenge.label}</div>
            <div style={{ fontSize: 12, color: faceDetected ? T.txt3 : T.red }}>
              {feedback || challenge.sub}
            </div>
          </div>

          {/* Completed captures */}
          {captures.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: "center" }}>
              {captures.map((c, i) => (
                <div key={i} style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: `2px solid ${T.green}55` }}>
                  <img src={c.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", bottom: -1, right: -1, width: 14, height: 14, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancel */}
      <div style={{ padding: "8px 18px 12px", background: T.bg1, textAlign: "center" }}>
        <button onClick={stopCamera} style={{ fontSize: 11.5, color: T.txt3, background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>Cancel</button>
      </div>
    </div>
  );
}

function InfoBox({ type = "info", children }) {
  const cfg = {
    info:  { bg: "linear-gradient(180deg, rgba(102,103,171,0.08) 0%, rgba(102,103,171,0.03) 100%)", bdr: "rgba(102,103,171,0.2)", icon: "ℹ", col: T.blueL },
    warn:  { bg: T.amberG, bdr: T.amber+"44", icon: "⚠", col: T.amber },
    legal: { bg: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)", bdr: "rgba(255,255,255,0.08)", icon: "§", col: T.txt3 },
  }[type];
  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.bdr}`, borderRadius: 12,
      padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start",
      backdropFilter: "blur(10px)",
    }}>
      <span style={{ fontSize: 14, color: cfg.col, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
      <div style={{ fontSize: 12.5, color: T.txt2, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 20px" }}>
      <div style={{ flex: 1, height: 1, background: T.bdr }} />
      {label && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: T.txt3 }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: T.bdr }} />
    </div>
  );
}

function Tag({ children, color = "blue" }) {
  const cfg = { blue: [T.blueGlow, T.blueL], green: [T.greenG, T.green], amber: [T.amberG, T.amber] }[color];
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase",
      padding: "3px 8px", borderRadius: 4, background: cfg[0], color: cfg[1],
    }}>{children}</span>
  );
}

/* ─────────────────────────────────────────────
   STEP SIDEBAR
───────────────────────────────────────────── */
const STEPS = [
  { id: 0, label: "Applicant Details",         icon: "01", tag: "" },
  { id: 1, label: "Company Information",        icon: "02", tag: "" },
  { id: 2, label: "Business Profile",           icon: "03", tag: "" },
  { id: 3, label: "Payment & Volume",           icon: "04", tag: "" },
  { id: 4, label: "Beneficial Owners",          icon: "05", tag: "PMLA" },
  { id: 5, label: "Source of Funds",            icon: "06", tag: "PMLA" },
  { id: 6, label: "Sanctions & PEP",            icon: "07", tag: "FIU" },
  { id: 7, label: "AML / CFT Programme",        icon: "08", tag: "FIU" },
  { id: 8, label: "Document Submission",        icon: "09", tag: "" },
  { id: 9, label: "Declaration & Certification",icon: "10", tag: "" },
];

function Sidebar({ step, setStep }) {
  return (
    <div className="sp-sidebar" style={{
      width: 256, flexShrink: 0,
      background: "linear-gradient(180deg, rgba(15,15,24,0.98) 0%, rgba(10,10,15,0.98) 100%)",
      borderRight: `1px solid rgba(255,255,255,0.06)`,
      padding: "32px 0",
      display: "flex", flexDirection: "column",
      backdropFilter: "blur(20px)",
    }}>
      {/* Logo */}
      <div style={{ padding: "0 24px 28px", borderBottom: `1px solid ${T.bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <img src="/TP-logo.png" alt="Stable Pay" style={{ height: 120, display: "block", marginBottom: 4 }} />
          </div>
        </div>
        <div style={{ marginTop: 14, padding: "8px 10px", background: T.bg0, borderRadius: 7, border: `1px solid ${T.bdr}` }}>
          <div style={{ fontSize: 10.5, color: T.txt3, marginBottom: 5 }}>COMPLETION</div>
          <div style={{ height: 3, background: T.bdrA, borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2, background: T.grad,
              width: `${Math.round(((step + 1) / STEPS.length) * 100)}%`, transition: "width .4s ease",
            }} />
          </div>
          <div style={{ fontSize: 10.5, color: T.blueL, marginTop: 5, textAlign: "right" }}>
            {Math.round(((step + 1) / STEPS.length) * 100)}%
          </div>
        </div>
      </div>

      {/* Steps list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
        {STEPS.map(s => {
          const done = s.id < step, active = s.id === step;
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className="sp-step-item"
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "9px 24px", background: active ? T.blueGlowS : "transparent",
                border: "none", cursor: "pointer",
                borderLeft: `2px solid ${active ? T.blue : "transparent"}`,
                transition: "all .16s",
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: done ? T.blueGlow : active ? T.grad : T.bg3,
                border: `1.5px solid ${done || active ? T.blue : T.bdrA}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {done
                  ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke={T.blueL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <span style={{ fontSize: 9, fontWeight: 700, color: active ? "#fff" : T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>{s.icon}</span>
                }
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div className="sp-step-label" style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, color: active ? T.txt : done ? T.txt2 : T.txt3, fontFamily: "'Inter', system-ui, sans-serif", transition: "color .16s" }}>
                  {s.label}
                </div>
              </div>
              {s.tag && (
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: ".05em",
                  padding: "2px 5px", borderRadius: 3,
                  background: s.tag === "FIU" ? T.amberG : T.blueGlowS,
                  color: s.tag === "FIU" ? T.amber : T.blueL,
                }}>
                  {s.tag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar footer */}
      <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: T.txt3 }}>compliance@stablepay.global</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────── */
function SectionHead({ label, title, description, compliance }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: T.blue, letterSpacing: ".1em", textTransform: "uppercase" }}>{label}</span>
        {compliance && compliance.map(c => <Tag key={c} color={c === "FIU-IND" || c === "PMLA" ? "amber" : "blue"}>{c}</Tag>)}
      </div>
      <h2 style={{ fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 700, color: T.txt, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "-.02em", marginBottom: 8 }}>{title}</h2>
      {description && <p style={{ fontSize: 13.5, color: T.txt2, lineHeight: 1.65, maxWidth: 540 }}>{description}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   AI COMPLIANCE ASSISTANT
───────────────────────────────────────────── */
function AIAssistant({ currentStep }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{
    r: "a",
    t: "I'm Stable Pay's KYB compliance assistant. I can help clarify PMLA/FIU-IND requirements, explain any field, or guide document requirements. What do you need?",
  }]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const stepLabels = STEPS.map(s => s.label);

  const send = async (directText) => {
    const raw = directText || inp;
    if (!raw.trim() || loading) return;
    const txt = raw.trim();
    setInp("");
    setMsgs(m => [...m, { r: "u", t: txt }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a compliance expert assistant embedded in Stable Pay's KYB OTC onboarding portal. Stable Pay is a US-India cross-border stablecoin remittance company processing USDT/USDC to INR off-ramp transactions.

The applicant is currently on: "${stepLabels[currentStep]}".

Your expertise covers:
- India: PMLA 2002, FIU-IND reporting obligations (STR, CTR, NTR), RBI KYC Master Directions 2016 (updated), PML (Maintenance of Records) Rules
- International: FATF 40 Recommendations, FinCEN requirements, OFAC sanctions
- Crypto-specific: VA-VASP guidelines per FATF, RBI circular on crypto, IFSCA GIFT City VDA framework
- Document requirements: What constitutes acceptable proof for Indian and foreign entities

Be concise, authoritative, and cite specific regulations when relevant. Keep responses under 180 words.`,
          messages: [
            ...msgs.slice(1).map(m => ({ role: m.r === "a" ? "assistant" : "user", content: m.t })),
            { role: "user", content: txt },
          ],
        }),
      });
      const d = await res.json();
      if (!res.ok || d.error) { throw new Error(); }
      setMsgs(m => [...m, { r: "a", t: d.content?.[0]?.text || "Unable to respond. Try again." }]);
    } catch {
      setMsgs(m => [...m, { r: "a", t: "AI assistant is currently unavailable. For help, contact compliance@stablepay.global" }]);
    }
    setLoading(false);
  };

  const QUICK = ["Required docs for India entity?", "What is FIU-IND reporting?", "UBO threshold for PMLA?", "Explain PEP definition India"];

  return (
    <>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          position: "fixed", bottom: 20, right: 16, zIndex: 1200,
          width: 52, height: 52, borderRadius: "50%",
          background: open ? T.bg3 : T.grad,
          border: `1.5px solid ${open ? T.bdrA : "transparent"}`,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: open ? "none" : "0 8px 24px rgba(102,103,171,.4)",
          transition: "all .2s", animation: open ? "none" : "glow 3s ease-in-out infinite",
        }}
      >
        {open
          ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3L13 13M13 3L3 13" stroke={T.txt2} strokeWidth="2" strokeLinecap="round"/></svg>
          : <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C5.58 2 2 5.36 2 9.5C2 11.56 2.88 13.42 4.3 14.75L3.5 18L7.24 16.36C8.1 16.6 9.04 16.72 10 16.72C14.42 16.72 18 13.36 18 9.22C18 5.08 14.42 2 10 2Z" fill="white"/>
              <path d="M6.5 9.5H13.5M6.5 12H11" stroke={T.blue} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
        }
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: 84, right: 12, zIndex: 1100,
          width: "min(368px, calc(100vw - 24px))", height: "min(520px, calc(100vh - 140px))",
          background: "linear-gradient(180deg, rgba(20,20,30,0.95) 0%, rgba(10,10,15,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
          display: "flex", flexDirection: "column",
          boxShadow: "0 0 0 1px rgba(102,103,171,0.1), 0 24px 64px rgba(0,0,0,.7), 0 0 80px -20px rgba(102,103,171,0.2)",
          backdropFilter: "blur(20px)",
          animation: "fadeUp .22s ease both",
        }}>
          {/* header */}
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.bdr}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.grad, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L12 4V10L7 13L2 10V4L7 1Z" stroke="rgba(255,255,255,.5)" strokeWidth="1" fill="rgba(255,255,255,.1)"/><circle cx="7" cy="7" r="2" fill="white"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>Compliance Assistant</div>
              <div style={{ fontSize: 10.5, color: T.green, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, display: "inline-block" }} />
                {stepLabels[currentStep]}
              </div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 10, padding: "3px 7px", background: T.amberG, borderRadius: 4, color: T.amber }}>PMLA · FIU</div>
          </div>

          {/* messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.r === "u" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "84%", padding: "9px 13px", fontSize: 12.5, lineHeight: 1.6, color: T.txt,
                  borderRadius: m.r === "u" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  background: m.r === "u" ? T.grad : T.bg3,
                  border: m.r === "u" ? "none" : `1px solid ${T.bdrA}`,
                }}>{m.t}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 4, padding: "4px 12px" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue, opacity: .4, animation: `pulse 1.2s ${i*.2}s infinite` }} />)}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* quick prompts */}
          <div style={{ padding: "6px 10px 4px", display: "flex", gap: 5, flexWrap: "wrap" }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => send(q)} style={{
                fontSize: 10.5, padding: "4px 9px", borderRadius: 20, border: `1px solid ${T.bdrA}`,
                background: "transparent", color: T.txt3, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
              }}>{q}</button>
            ))}
          </div>

          {/* input */}
          <div style={{ padding: "8px 10px", borderTop: `1px solid ${T.bdr}`, display: "flex", gap: 7 }}>
            <input
              value={inp}
              onChange={e => setInp(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask about PMLA, FIU-IND, documents..."
              className="sp-input"
              style={{
                flex: 1, background: T.bg2, border: `1.5px solid ${T.bdr}`, borderRadius: 20,
                padding: "8px 14px", color: T.txt, fontSize: 12.5, fontFamily: "'Inter', system-ui, sans-serif",
              }}
            />
            <button onClick={send} disabled={!inp.trim() || loading} style={{
              width: 34, height: 34, borderRadius: "50%", border: "none",
              background: inp.trim() ? T.grad : T.bg3, cursor: inp.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              transition: "background .16s",
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12V2M7 2L3 6M7 2L11 6" stroke={inp.trim() ? "#fff" : T.txt3} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   DOCUMENT BUILDER — Board Resolution Generator
   DocuSign-style template with signature pad
───────────────────────────────────────────── */
function DocumentBuilder({ data, value, onChange }) {
  const [mode, setMode] = useState(value?.completed ? "completed" : "builder");
  const [signatories, setSignatories] = useState(value?.signatories || [
    { name: "", designation: "", email: "" },
    { name: "", designation: "", email: "" },
    { name: "", designation: "", email: "" },
  ]);
  const [signerName, setSignerName] = useState(value?.signerName || "");
  const [signerTitle, setSignerTitle] = useState(value?.signerTitle || "");
  const [place, setPlace] = useState(value?.place || "");
  const [docDate, setDocDate] = useState(value?.date || new Date().toISOString().split("T")[0]);
  const [signatureImage, setSignatureImage] = useState(value?.signatureImage || null);
  const [showUploadFallback, setShowUploadFallback] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState(value?.companyName || data?.co_name || "");
  const [companyLogo, setCompanyLogo] = useState(value?.companyLogo || null);
  const logoInputRef = useRef(null);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const fileRef = useRef(null);

  const [editCrn, setEditCrn] = useState(value?.crn || data?.co_crn || "");
  const [editAddr, setEditAddr] = useState(value?.regAddr || data?.co_regAddr || "");
  const [editTin, setEditTin] = useState(value?.tin || data?.co_tin || "");
  const [editGst, setEditGst] = useState(value?.gst || data?.co_gst || "");
  const companyName = editCompanyName || data?.co_name || "COMPANY NAME";
  const crn = editCrn;
  const regAddr = editAddr;
  const formattedDate = docDate ? new Date(docDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

  /* ── Signature Canvas ── */
  const initCanvas = useCallback((canvas) => {
    if (!canvas) return;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    if (signatureImage) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = signatureImage;
    }
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (canvasRef.current) {
      setSignatureImage(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setSignatureImage(null);
  };

  /* ── Save / Complete ── */
  const saveDocument = () => {
    const doc = {
      type: "generated",
      signatories: signatories.filter(s => s.name.trim()),
      signatureImage,
      signerName,
      signerTitle,
      place,
      date: docDate,
      companyLogo,
      companyName: editCompanyName || companyName,
      crn: editCrn,
      regAddr: editAddr,
      tin: editTin,
      gst: editGst,
      completed: true,
    };
    onChange?.(doc);
    setMode("completed");
  };

  /* ── Generate HTML for PDF ── */
  const generateDocHTML = () => {
    const sigRows = signatories.filter(s => s.name.trim()).map(s =>
      `<tr><td style="padding:8px 12px;border:1px solid #ccc;">${s.name}</td><td style="padding:8px 12px;border:1px solid #ccc;">${s.designation}</td><td style="padding:8px 12px;border:1px solid #ccc;">${s.email}</td></tr>`
    ).join("");
    return `<!DOCTYPE html><html><head><title>Board Resolution - ${companyName}</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Inter',sans-serif;color:#1a1a1a;padding:48px 56px;line-height:1.7;font-size:13px;max-width:800px;margin:0 auto}
      h1{font-size:15px;letter-spacing:3px;margin:24px 0 8px;text-align:center}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
      .co-name{font-size:18px;font-weight:700;letter-spacing:1px}
      .co-detail{font-size:11px;color:#555;margin-top:2px;line-height:1.5}
      .logo-placeholder{width:80px;height:80px;border:1.5px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:10px;text-align:center}
      hr{border:none;border-top:1.5px solid #ccc;margin:16px 0}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      th{background:#f5f5f5;padding:8px 12px;border:1px solid #ccc;font-size:11px;text-transform:uppercase;letter-spacing:1px;text-align:left}
      .sig-area{margin-top:32px}
      .sig-img{height:60px;margin:8px 0}
      .sig-line{border-bottom:1px solid #1a1a1a;display:inline-block;min-width:200px;margin-bottom:4px}
      .field-row{margin:4px 0;font-size:13px}
      .field-label{color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
      @media print{body{padding:32px 40px}@page{margin:20mm}}
    </style></head><body>
      <div class="header">
        <div>
          <div class="co-name">${companyName}</div>
          ${crn ? `<div class="co-detail">CRN: ${crn}</div>` : ""}
          ${editTin ? `<div class="co-detail">TIN/PAN: ${editTin}</div>` : ""}
          ${editGst ? `<div class="co-detail">GSTIN: ${editGst}</div>` : ""}
          ${regAddr ? `<div class="co-detail">${regAddr}</div>` : ""}
        </div>
        ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="width:80px;height:80px;object-fit:contain;border-radius:8px"/>` : `<div class="logo-placeholder">Company<br/>Logo</div>`}
      </div>
      <hr/>
      <h1>BOARD RESOLUTION</h1>
      <p style="text-align:center;color:#555;font-size:12px;margin-bottom:20px">Date: ${formattedDate}</p>
      <p style="margin-bottom:12px"><strong>RESOLUTION OF THE BOARD OF DIRECTORS OF ${companyName.toUpperCase()}</strong></p>
      <p style="margin-bottom:12px">(passed by circulation / at a meeting held on ${formattedDate})</p>
      <p style="margin-bottom:16px">RESOLVED THAT the following persons are hereby authorised to act as authorised signatories for the purpose of onboarding with Stable Pay (a product of Fincrypt LLP) for OTC stablecoin-to-INR transactions:</p>
      <table><thead><tr><th>Name</th><th>Designation</th><th>Email</th></tr></thead><tbody>${sigRows}</tbody></table>
      <p style="margin:16px 0">FURTHER RESOLVED THAT the above-named persons are authorised, jointly or severally, to execute any documents, agreements, or undertakings required for the completion of the KYB onboarding process.</p>
      <div class="sig-area">
        <p style="margin-bottom:16px">For and on behalf of <strong>${companyName.toUpperCase()}</strong></p>
        <p class="field-label">Authorised Signatory:</p>
        ${signatureImage ? `<img class="sig-img" src="${signatureImage}" alt="Signature"/>` : `<div class="sig-line"></div>`}
        <div class="field-row">Name: <strong>${signerName}</strong></div>
        <div class="field-row">Designation: <strong>${signerTitle}</strong></div>
        <div class="field-row">Date: ${formattedDate}</div>
        <div class="field-row">Place: ${place}</div>
      </div>
    </body></html>`;
  };

  const downloadPDF = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(generateDocHTML());
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  /* ── Document input field style (inline, underlined) ── */
  const docInput = (val, onBlur, placeholder, style = {}) => (
    <input
      defaultValue={val}
      placeholder={placeholder}
      onBlur={e => onBlur(e.target.value)}
      style={{
        border: "none", borderBottom: "1px dashed #bbb", background: "transparent",
        color: "#1a1a1a", fontSize: 13, fontFamily: "'Inter', sans-serif",
        padding: "2px 4px", outline: "none", width: "100%", ...style,
      }}
    />
  );

  /* ── Completed Mode ── */
  if (mode === "completed" && value?.completed) {
    return (
      <div style={{ border: `1.5px solid ${T.bdr}`, borderRadius: 12, overflow: "hidden", background: T.bg1 }}>
        {/* Thumbnail preview */}
        <div style={{
          background: "#FAFAFA", padding: "24px 28px", borderBottom: `1px solid ${T.bdr}`,
          position: "relative", minHeight: 120,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", letterSpacing: 1, marginBottom: 4 }}>{companyName}</div>
          {crn && <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>CRN: {crn}</div>}
          <div style={{ borderTop: "1px solid #ddd", margin: "8px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", letterSpacing: 2, textTransform: "uppercase", textAlign: "center" }}>Board Resolution</div>
          <div style={{ fontSize: 10, color: "#666", textAlign: "center", marginTop: 2 }}>{formattedDate}</div>
          {signatureImage && <img src={signatureImage} alt="Signature" style={{ height: 30, marginTop: 8, opacity: 0.7 }} />}
          {/* Completed badge */}
          <div style={{
            position: "absolute", top: 12, right: 12, background: T.greenG, border: `1px solid ${T.green}`,
            borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 600, color: T.green, letterSpacing: 0.5,
          }}>Completed</div>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 8, padding: "12px 16px" }}>
          <button onClick={() => setMode("builder")} style={{
            flex: 1, padding: "8px 16px", border: `1px solid ${T.bdrA}`, borderRadius: 8,
            background: T.bg2, color: T.txt2, fontSize: 12, fontWeight: 500, cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}>Edit</button>
          <button onClick={downloadPDF} style={{
            flex: 1, padding: "8px 16px", border: "none", borderRadius: 8,
            background: T.grad, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}>Download PDF</button>
        </div>
      </div>
    );
  }

  /* ── Builder Mode ── */
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${T.bdr}`, background: T.bg1 }}>
      {/* Mode tabs */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", borderBottom: `1px solid ${T.bdr}`, background: T.bg0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 1H10L13 4V14C13 14.55 12.55 15 12 15H4C3.45 15 3 14.55 3 14V2C3 1.45 3.45 1 4 1Z" stroke={T.blue} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 1V4H13" stroke={T.blue} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 8H10M6 11H10M6 5H7" stroke={T.blue} strokeWidth="1" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.txt, letterSpacing: 0.3 }}>Board Resolution Builder</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!showUploadFallback && (
            <button onClick={() => setShowUploadFallback(true)} style={{
              padding: "5px 12px", border: `1px solid ${T.bdrA}`, borderRadius: 6,
              background: "transparent", color: T.txt3, fontSize: 11, cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}>Upload my own instead</button>
          )}
        </div>
      </div>

      {showUploadFallback ? (
        <div style={{ padding: 16 }}>
          <FileUpload value={typeof value === "object" && value?.type !== "generated" ? value : null} onChange={val => { onChange?.(val); }} hint="PDF only — company letterhead, signed" />
          <button onClick={() => setShowUploadFallback(false)} style={{
            marginTop: 8, padding: "5px 12px", border: `1px solid ${T.bdrA}`, borderRadius: 6,
            background: "transparent", color: T.txt3, fontSize: 11, cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}>Use template builder instead</button>
        </div>
      ) : (
        <>
          {/* Document Paper */}
          <div style={{
            margin: 16, borderRadius: 8, background: "#FAFAFA", border: "1px solid #e0e0e0",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
            padding: "36px 40px", fontFamily: "'Inter', sans-serif", color: "#1a1a1a", lineHeight: 1.7,
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <input defaultValue={companyName} onBlur={e => setEditCompanyName(e.target.value)} style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", letterSpacing: 1, border: "none", borderBottom: "1px dashed #bbb", background: "transparent", outline: "none", width: "100%", fontFamily: "'Inter', sans-serif" }} placeholder="Company Name" />
                <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#999" }}>CRN:</span>
                  <input defaultValue={crn} onBlur={e => setEditCrn(e.target.value)} placeholder="Registration number"
                    style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 4px", outline: "none", flex: 1 }} />
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 2, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#999" }}>TIN:</span>
                  <input defaultValue={editTin} onBlur={e => setEditTin(e.target.value)} placeholder="Tax ID / PAN"
                    style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 4px", outline: "none", width: 140 }} />
                  <span style={{ fontSize: 10, color: "#999", marginLeft: 8 }}>GST:</span>
                  <input defaultValue={editGst} onBlur={e => setEditGst(e.target.value)} placeholder="GST number"
                    style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 4px", outline: "none", width: 160 }} />
                </div>
                <input defaultValue={regAddr} onBlur={e => setEditAddr(e.target.value)} placeholder="Registered address"
                  style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'Inter', sans-serif", padding: "1px 4px", outline: "none", width: "100%", marginTop: 4 }} />
              </div>
              <div onClick={() => logoInputRef.current?.click()} style={{
                width: 72, height: 72, border: "1.5px dashed #ccc", borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                color: "#aaa", fontSize: 9, textAlign: "center", lineHeight: 1.3, cursor: "pointer", overflow: "hidden",
              }}>
                {companyLogo ? <img src={companyLogo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <>Click to<br/>add logo</>}
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) { const reader = new FileReader(); reader.onload = ev => setCompanyLogo(ev.target.result); reader.readAsDataURL(file); }
                }} />
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1.5px solid #ccc", margin: "16px 0" }} />

            {/* Title */}
            <div style={{
              fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase",
              textAlign: "center", margin: "20px 0 8px", color: "#1a1a1a",
            }}>Board Resolution</div>

            {/* Date */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: "#555" }}>Date: </span>
              <input
                type="date"
                defaultValue={docDate}
                onBlur={e => setDocDate(e.target.value)}
                style={{
                  border: "none", borderBottom: "1px dashed #bbb", background: "transparent",
                  color: "#1a1a1a", fontSize: 12, fontFamily: "'Inter', sans-serif",
                  padding: "2px 4px", outline: "none",
                }}
              />
            </div>

            {/* Resolution text */}
            <p style={{ fontSize: 13, marginBottom: 10 }}>
              <strong>RESOLUTION OF THE BOARD OF DIRECTORS OF {companyName.toUpperCase()}</strong>
            </p>
            <p style={{ fontSize: 12.5, color: "#444", marginBottom: 14 }}>
              (passed by circulation / at a meeting held on {formattedDate})
            </p>
            <p style={{ fontSize: 12.5, marginBottom: 16, lineHeight: 1.7 }}>
              RESOLVED THAT the following persons are hereby authorised to act as authorised signatories for the purpose of onboarding with Stable Pay (a product of Fincrypt LLP) for OTC stablecoin-to-INR transactions:
            </p>

            {/* Signatories Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0 16px", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f0f0f0" }}>
                  <th style={{ padding: "8px 10px", border: "1px solid #ccc", textAlign: "left", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, color: "#555" }}>Name</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #ccc", textAlign: "left", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, color: "#555" }}>Designation</th>
                  <th style={{ padding: "8px 10px", border: "1px solid #ccc", textAlign: "left", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, color: "#555" }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {signatories.map((s, i) => (
                  <tr key={i}>
                    <td style={{ padding: "4px 6px", border: "1px solid #ccc" }}>
                      {docInput(s.name, v => { const u = [...signatories]; u[i] = { ...u[i], name: v }; setSignatories(u); }, "Full name")}
                    </td>
                    <td style={{ padding: "4px 6px", border: "1px solid #ccc" }}>
                      {docInput(s.designation, v => { const u = [...signatories]; u[i] = { ...u[i], designation: v }; setSignatories(u); }, "Title / role")}
                    </td>
                    <td style={{ padding: "4px 6px", border: "1px solid #ccc" }}>
                      {docInput(s.email, v => { const u = [...signatories]; u[i] = { ...u[i], email: v }; setSignatories(u); }, "email@company.com")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add / Remove signatory */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setSignatories([...signatories, { name: "", designation: "", email: "" }])} style={{
                border: "1px dashed #bbb", borderRadius: 6, background: "transparent",
                padding: "4px 12px", fontSize: 11, color: "#777", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}>+ Add row</button>
              {signatories.length > 1 && (
                <button onClick={() => setSignatories(signatories.slice(0, -1))} style={{
                  border: "1px dashed #bbb", borderRadius: 6, background: "transparent",
                  padding: "4px 12px", fontSize: 11, color: "#999", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}>Remove last</button>
              )}
            </div>

            {/* Further resolved */}
            <p style={{ fontSize: 12.5, marginBottom: 24, lineHeight: 1.7 }}>
              FURTHER RESOLVED THAT the above-named persons are authorised, jointly or severally, to execute any documents, agreements, or undertakings required for the completion of the KYB onboarding process.
            </p>

            {/* Signature Block */}
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 13, marginBottom: 16 }}>For and on behalf of <strong>{companyName.toUpperCase()}</strong></p>

              {/* Signature Pad */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, color: "#555", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Authorised Signatory:</div>
                <div style={{ position: "relative", border: "1px dashed #bbb", borderRadius: 6, background: "#fff" }}>
                  <canvas
                    ref={initCanvas}
                    style={{ width: "100%", height: 80, cursor: "crosshair", display: "block", touchAction: "none" }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  <button onClick={clearSignature} style={{
                    position: "absolute", top: 4, right: 4, border: "1px solid #ddd", borderRadius: 4,
                    background: "#fff", padding: "2px 8px", fontSize: 10, color: "#999", cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}>Clear</button>
                  {!signatureImage && (
                    <div style={{
                      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                      fontSize: 11, color: "#ccc", pointerEvents: "none", whiteSpace: "nowrap",
                    }}>Draw your signature here</div>
                  )}
                </div>
              </div>

              {/* Signer details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginTop: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#555" }}>Name: </span>
                  {docInput(signerName, v => setSignerName(v), "Signatory full name")}
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#555" }}>Designation: </span>
                  {docInput(signerTitle, v => setSignerTitle(v), "Director / CEO / etc.")}
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#555" }}>Date: </span>
                  <span style={{ fontSize: 12.5, color: "#1a1a1a" }}>{formattedDate}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#555" }}>Place: </span>
                  {docInput(place, v => setPlace(v), "City, Country")}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: "flex", gap: 8, padding: "12px 16px", borderTop: `1px solid ${T.bdr}`,
            justifyContent: "flex-end",
          }}>
            <button onClick={downloadPDF} style={{
              padding: "8px 20px", border: `1px solid ${T.bdrA}`, borderRadius: 8,
              background: T.bg2, color: T.txt2, fontSize: 12, fontWeight: 500, cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}>Preview / Download PDF</button>
            <button onClick={saveDocument} style={{
              padding: "8px 24px", border: "none", borderRadius: 8,
              background: T.grad, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}>Save Document</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CORPORATE STRUCTURE CHART — Org-chart style builder
───────────────────────────────────────────── */
function CorporateStructureChart({ data, value, onChange }) {
  const [mode, setMode] = useState(value?.completed ? "completed" : "builder");
  const [entities, setEntities] = useState(value?.entities || [
    { id: 1, name: data?.co_name || "", type: "company", pct: "100", parent: null, level: 0 },
    { id: 2, name: "", type: "shareholder", pct: "", parent: 1, level: 1 },
    { id: 3, name: "", type: "shareholder", pct: "", parent: 1, level: 1 },
  ]);
  const [showUpload, setShowUpload] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState(value?.companyName || data?.co_name || "");
  const [companyLogo, setCompanyLogo] = useState(value?.companyLogo || null);
  const [chartDate, setChartDate] = useState(value?.date || new Date().toISOString().split("T")[0]);
  const logoRef = useRef(null);
  const nextId = useRef(4);
  const [editCrn, setEditCrn] = useState(value?.crn || data?.co_crn || "");
  const [editAddr, setEditAddr] = useState(value?.regAddr || data?.co_regAddr || "");
  const [editTin, setEditTin] = useState(value?.tin || data?.co_tin || "");
  const [editGst, setEditGst] = useState(value?.gst || data?.co_gst || "");
  const companyName = editCompanyName || data?.co_name || "COMPANY NAME";
  const crn = editCrn;
  const regAddr = editAddr;
  const formattedDate = chartDate ? new Date(chartDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

  const addEntity = (parentId) => {
    const parent = entities.find(e => e.id === parentId);
    setEntities([...entities, { id: nextId.current++, name: "", type: "shareholder", pct: "", parent: parentId, level: (parent?.level || 0) + 1 }]);
  };

  const updateEntity = (id, field, val) => {
    setEntities(entities.map(e => e.id === id ? { ...e, [field]: val } : e));
  };

  const removeEntity = (id) => {
    // Remove entity and all children
    const toRemove = new Set();
    const findChildren = (pid) => { entities.forEach(e => { if (e.parent === pid) { toRemove.add(e.id); findChildren(e.id); } }); };
    toRemove.add(id);
    findChildren(id);
    setEntities(entities.filter(e => !toRemove.has(e.id)));
  };

  const saveChart = () => {
    onChange?.({ type: "structure_chart", entities, companyName, companyLogo, crn: editCrn, regAddr: editAddr, tin: editTin, gst: editGst, date: chartDate, completed: true });
    setMode("completed");
  };

  const getChildren = (parentId) => entities.filter(e => e.parent === parentId);

  const renderNode = (entity) => {
    const children = getChildren(entity.id);
    const isRoot = entity.parent === null;
    return (
      <div key={entity.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Node */}
        <div style={{
          border: isRoot ? "2px solid #6667AB" : "1.5px solid #ccc", borderRadius: 10,
          padding: "10px 14px", minWidth: 160, background: isRoot ? "#f0f0ff" : "#fff",
          position: "relative", textAlign: "center",
        }}>
          <input defaultValue={entity.name} onBlur={e => updateEntity(entity.id, "name", e.target.value)}
            placeholder={isRoot ? "Entity name" : "Shareholder name"}
            style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#1a1a1a", fontSize: 12, fontFamily: "'Inter', sans-serif", padding: "2px 0", outline: "none", width: "100%", textAlign: "center", fontWeight: isRoot ? 600 : 400 }}
          />
          {!isRoot && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 6 }}>
              <input defaultValue={entity.pct} onBlur={e => updateEntity(entity.id, "pct", e.target.value)}
                placeholder="%" style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#1a1a1a", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "2px 0", outline: "none", width: 40, textAlign: "center" }}
              />
              <span style={{ fontSize: 10, color: "#999" }}>%</span>
              <select defaultValue={entity.type} onChange={e => updateEntity(entity.id, "type", e.target.value)}
                style={{ border: "1px solid #ddd", borderRadius: 4, background: "#f9f9f9", color: "#555", fontSize: 10, padding: "2px 4px", outline: "none", marginLeft: 6 }}>
                <option value="shareholder">Individual</option>
                <option value="entity">Entity</option>
                <option value="trust">Trust</option>
              </select>
            </div>
          )}
          {!isRoot && (
            <button onClick={() => removeEntity(entity.id)} style={{ position: "absolute", top: -6, right: -6, width: 16, height: 16, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", color: "#999", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>x</button>
          )}
        </div>

        {/* Connector + children */}
        {(children.length > 0 || entity.type === "entity" || isRoot) && (
          <>
            <div style={{ width: 1, height: 20, background: "#ccc" }} />
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", position: "relative" }}>
              {children.length > 1 && <div style={{ position: "absolute", top: 0, left: "calc(50% - " + ((children.length - 1) * 88) + "px)", right: "calc(50% - " + ((children.length - 1) * 88) + "px)", height: 1, background: "#ccc" }} />}
              {children.map(child => (
                <div key={child.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 1, height: 12, background: "#ccc" }} />
                  {renderNode(child)}
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 1, height: 12, background: "#ccc" }} />
                <button onClick={() => addEntity(entity.id)} style={{
                  width: 32, height: 32, borderRadius: "50%", border: "1.5px dashed #bbb",
                  background: "transparent", color: "#999", fontSize: 16, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>+</button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const generateChartHTML = () => {
    const renderHTMLNode = (entity, depth = 0) => {
      const children = getChildren(entity.id);
      const isRoot = entity.parent === null;
      return `<div style="text-align:center;margin:${depth > 0 ? '0' : '20px'} auto;">
        <div style="display:inline-block;border:${isRoot ? '2px solid #6667AB' : '1.5px solid #ccc'};border-radius:8px;padding:10px 20px;background:${isRoot ? '#f0f0ff' : '#fff'};min-width:140px;">
          <div style="font-weight:${isRoot ? '700' : '500'};font-size:13px;">${entity.name || (isRoot ? 'Company' : 'Shareholder')}</div>
          ${!isRoot ? `<div style="font-size:11px;color:#666;margin-top:4px;">${entity.pct || '\u2014'}% \u00b7 ${entity.type === 'entity' ? 'Entity' : entity.type === 'trust' ? 'Trust' : 'Individual'}</div>` : `<div style="font-size:10px;color:#666;margin-top:2px;">Operating Entity</div>`}
        </div>
        ${children.length > 0 ? `<div style="width:1px;height:20px;background:#ccc;margin:0 auto;"></div><div style="display:flex;justify-content:center;gap:20px;">${children.map(c => renderHTMLNode(c, depth + 1)).join('')}</div>` : ''}
      </div>`;
    };
    const root = entities.find(e => e.parent === null);
    return `<!DOCTYPE html><html><head><title>Corporate Structure - ${companyName}</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;padding:48px 56px;color:#1a1a1a;max-width:900px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}.co-name{font-size:18px;font-weight:700;letter-spacing:1px}.co-detail{font-size:11px;color:#555;margin-top:2px;line-height:1.5}hr{border:none;border-top:1.5px solid #ccc;margin:16px 0}h1{text-align:center;font-size:15px;letter-spacing:3px;margin:20px 0 4px;text-transform:uppercase}p.sub{text-align:center;font-size:11px;color:#666;margin-bottom:24px}@media print{@page{margin:15mm;size:landscape}}</style></head><body><div class="header"><div><div class="co-name">${companyName}</div>${crn ? `<div class="co-detail">CRN: ${crn}</div>` : ""}${editTin ? `<div class="co-detail">TIN/PAN: ${editTin}</div>` : ""}${editGst ? `<div class="co-detail">GSTIN: ${editGst}</div>` : ""}${regAddr ? `<div class="co-detail">${regAddr}</div>` : ""}</div>${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="width:80px;height:80px;object-fit:contain;border-radius:8px"/>` : `<div style="width:80px;height:80px;border:1.5px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:10px;text-align:center">Company<br/>Logo</div>`}</div><hr/><h1>Corporate Ownership Structure</h1><p class="sub">Date: ${formattedDate}</p>${root ? renderHTMLNode(root) : ''}</body></html>`;
  };

  const downloadPDF = () => {
    const w = window.open("", "_blank");
    w.document.write(generateChartHTML());
    w.document.close();
    w.onload = () => w.print();
  };

  if (mode === "completed" && value?.completed) {
    return (
      <div style={{ border: `1.5px solid ${T.bdr}`, borderRadius: 12, overflow: "hidden", background: T.bg1 }}>
        <div style={{ background: "#FAFAFA", padding: "20px 24px", borderBottom: `1px solid ${T.bdr}`, position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", letterSpacing: 2, textTransform: "uppercase", textAlign: "center" }}>Corporate Structure Chart</div>
          <div style={{ fontSize: 10, color: "#666", textAlign: "center", marginTop: 4 }}>{value.entities?.length || 0} entities</div>
          <div style={{ position: "absolute", top: 12, right: 12, background: T.greenG, border: `1px solid ${T.green}`, borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 600, color: T.green }}>Completed</div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "12px 16px" }}>
          <button onClick={() => setMode("builder")} style={{ flex: 1, padding: "8px", border: `1px solid ${T.bdrA}`, borderRadius: 8, background: T.bg2, color: T.txt2, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Edit</button>
          <button onClick={downloadPDF} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, background: T.grad, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Download PDF</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${T.bdr}`, background: T.bg1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${T.bdr}`, background: T.bg0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2V6M4 6H12M4 6V10M12 6V10M2 10H6M10 10H14" stroke={T.blue} strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.txt }}>Structure Chart Builder</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!showUpload && <button onClick={() => setShowUpload(true)} style={{ padding: "5px 12px", border: `1px solid ${T.bdrA}`, borderRadius: 6, background: "transparent", color: T.txt3, fontSize: 11, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Upload my own</button>}
        </div>
      </div>

      {showUpload ? (
        <div style={{ padding: 16 }}>
          <FileUpload value={typeof value === "object" && value?.type !== "structure_chart" ? value : null} onChange={onChange} />
          <button onClick={() => setShowUpload(false)} style={{ marginTop: 8, padding: "5px 12px", border: `1px solid ${T.bdrA}`, borderRadius: 6, background: "transparent", color: T.txt3, fontSize: 11, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Use builder instead</button>
        </div>
      ) : (
        <>
          <div style={{ margin: 16, borderRadius: 8, background: "#FAFAFA", border: "1px solid #e0e0e0", boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)", padding: "36px 40px", fontFamily: "'Inter', sans-serif", color: "#1a1a1a" }}>
            {/* Letterhead */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <input defaultValue={companyName} onBlur={e => setEditCompanyName(e.target.value)} style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", letterSpacing: 1, border: "none", borderBottom: "1px dashed #bbb", background: "transparent", outline: "none", width: "100%", fontFamily: "'Inter', sans-serif" }} placeholder="Company Name" />
                <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#999" }}>CRN:</span>
                  <input defaultValue={crn} onBlur={e => setEditCrn(e.target.value)} placeholder="Registration number"
                    style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 4px", outline: "none", flex: 1 }} />
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 2, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#999" }}>TIN:</span>
                  <input defaultValue={editTin} onBlur={e => setEditTin(e.target.value)} placeholder="Tax ID / PAN"
                    style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 4px", outline: "none", width: 140 }} />
                  <span style={{ fontSize: 10, color: "#999", marginLeft: 8 }}>GST:</span>
                  <input defaultValue={editGst} onBlur={e => setEditGst(e.target.value)} placeholder="GST number"
                    style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 4px", outline: "none", width: 160 }} />
                </div>
                <input defaultValue={regAddr} onBlur={e => setEditAddr(e.target.value)} placeholder="Registered address"
                  style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'Inter', sans-serif", padding: "1px 4px", outline: "none", width: "100%", marginTop: 4 }} />
              </div>
              <div onClick={() => logoRef.current?.click()} style={{ width: 72, height: 72, border: "1.5px dashed #ccc", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#aaa", fontSize: 9, textAlign: "center", lineHeight: 1.3, cursor: "pointer", overflow: "hidden" }}>
                {companyLogo ? <img src={companyLogo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <>Click to<br/>add logo</>}
                <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = ev => setCompanyLogo(ev.target.result); reader.readAsDataURL(file); } }} />
              </div>
            </div>
            <div style={{ borderTop: "1.5px solid #ccc", margin: "16px 0" }} />
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", margin: "20px 0 8px" }}>Corporate Ownership Structure</div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: "#555" }}>Date: </span>
              <input type="date" defaultValue={chartDate} onBlur={e => setChartDate(e.target.value)} style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#1a1a1a", fontSize: 12, fontFamily: "'Inter', sans-serif", padding: "2px 4px", outline: "none" }} />
            </div>
            {/* Chart */}
            <div style={{ overflowX: "auto", padding: "8px 0" }}>
              {renderNode(entities.find(e => e.parent === null) || entities[0])}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: `1px solid ${T.bdr}`, justifyContent: "flex-end" }}>
            <button onClick={downloadPDF} style={{ padding: "8px 20px", border: `1px solid ${T.bdrA}`, borderRadius: 8, background: T.bg2, color: T.txt2, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Preview / Download</button>
            <button onClick={saveChart} style={{ padding: "8px 24px", border: "none", borderRadius: 8, background: T.grad, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Save Chart</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SHAREHOLDER REGISTER — Register of Members builder
───────────────────────────────────────────── */
function ShareholderRegister({ data, value, onChange }) {
  const [mode, setMode] = useState(value?.completed ? "completed" : "builder");
  const [shareholders, setShareholders] = useState(value?.shareholders || [
    { name: "", shares: "", pct: "", classType: "Ordinary", dateAcq: "", address: "" },
    { name: "", shares: "", pct: "", classType: "Ordinary", dateAcq: "", address: "" },
  ]);
  const [registerDate, setRegisterDate] = useState(value?.registerDate || new Date().toISOString().split("T")[0]);
  const [showUpload, setShowUpload] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState(value?.companyName || data?.co_name || "");
  const [companyLogo, setCompanyLogo] = useState(value?.companyLogo || null);
  const logoRef = useRef(null);

  const [editCrn, setEditCrn] = useState(value?.crn || data?.co_crn || "");
  const [editAddr, setEditAddr] = useState(value?.regAddr || data?.co_regAddr || "");
  const [editTin, setEditTin] = useState(value?.tin || data?.co_tin || "");
  const [editGst, setEditGst] = useState(value?.gst || data?.co_gst || "");
  const companyName = editCompanyName || data?.co_name || "COMPANY NAME";
  const crn = editCrn;
  const regAddr = editAddr;

  const addRow = () => setShareholders([...shareholders, { name: "", shares: "", pct: "", classType: "Ordinary", dateAcq: "", address: "" }]);
  const removeRow = () => { if (shareholders.length > 1) setShareholders(shareholders.slice(0, -1)); };
  const updateRow = (i, field, val) => setShareholders(shareholders.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const saveRegister = () => {
    onChange?.({ type: "shareholder_register", shareholders: shareholders.filter(s => s.name.trim()), registerDate, companyName, companyLogo, crn: editCrn, regAddr: editAddr, tin: editTin, gst: editGst, completed: true });
    setMode("completed");
  };

  const generateHTML = () => {
    const rows = shareholders.filter(s => s.name.trim()).map(s =>
      `<tr><td style="padding:8px 10px;border:1px solid #ccc;font-size:12px;">${s.name}</td><td style="padding:8px 10px;border:1px solid #ccc;font-size:12px;text-align:center;">${s.shares}</td><td style="padding:8px 10px;border:1px solid #ccc;font-size:12px;text-align:center;">${s.pct}%</td><td style="padding:8px 10px;border:1px solid #ccc;font-size:12px;text-align:center;">${s.classType}</td><td style="padding:8px 10px;border:1px solid #ccc;font-size:12px;">${s.dateAcq}</td><td style="padding:8px 10px;border:1px solid #ccc;font-size:11px;">${s.address}</td></tr>`
    ).join("");
    const formattedDate = registerDate ? new Date(registerDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
    return `<!DOCTYPE html><html><head><title>Shareholder Register - ${companyName}</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;padding:48px 56px;color:#1a1a1a;line-height:1.6;font-size:13px;max-width:900px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}.co-name{font-size:18px;font-weight:700;letter-spacing:1px}.co-detail{font-size:11px;color:#555;margin-top:2px;line-height:1.5}hr{border:none;border-top:1.5px solid #ccc;margin:16px 0}h1{font-size:15px;letter-spacing:3px;text-transform:uppercase;text-align:center;margin:20px 0 4px}p.sub{text-align:center;font-size:11px;color:#666;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#f5f5f5;padding:8px 10px;border:1px solid #ccc;font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:left}@media print{@page{margin:15mm;size:landscape}}</style></head><body><div class="header"><div><div class="co-name">${companyName}</div>${crn ? `<div class="co-detail">CRN: ${crn}</div>` : ""}${editTin ? `<div class="co-detail">TIN/PAN: ${editTin}</div>` : ""}${editGst ? `<div class="co-detail">GSTIN: ${editGst}</div>` : ""}${regAddr ? `<div class="co-detail">${regAddr}</div>` : ""}</div>${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="width:80px;height:80px;object-fit:contain;border-radius:8px"/>` : `<div style="width:80px;height:80px;border:1.5px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:10px;text-align:center">Company<br/>Logo</div>`}</div><hr/><h1>Register of Members</h1><p class="sub">As at ${formattedDate}</p><table><thead><tr><th>Name of Shareholder</th><th style="text-align:center">No. of Shares</th><th style="text-align:center">% Holding</th><th style="text-align:center">Class</th><th>Date Acquired</th><th>Address</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:24px;font-size:11px;color:#555;">I certify that the above is a true and complete extract from the Register of Members of ${companyName} as at the date stated above.</p><div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:12px"><div><div style="border-bottom:1px solid #1a1a1a;width:200px;margin-bottom:4px;height:40px"></div><div>Company Secretary / Director</div></div><div><div>Date: ${formattedDate}</div></div></div></body></html>`;
  };

  const downloadPDF = () => {
    const w = window.open("", "_blank");
    w.document.write(generateHTML());
    w.document.close();
    w.onload = () => w.print();
  };

  const dinput = (val, onBlur, ph, style = {}) => (
    <input defaultValue={val} onBlur={e => onBlur(e.target.value)} placeholder={ph}
      style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#1a1a1a", fontSize: 12, fontFamily: "'Inter', sans-serif", padding: "2px 4px", outline: "none", width: "100%", ...style }} />
  );

  if (mode === "completed" && value?.completed) {
    return (
      <div style={{ border: `1.5px solid ${T.bdr}`, borderRadius: 12, overflow: "hidden", background: T.bg1 }}>
        <div style={{ background: "#FAFAFA", padding: "20px 24px", borderBottom: `1px solid ${T.bdr}`, position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", letterSpacing: 2, textTransform: "uppercase", textAlign: "center" }}>Register of Members</div>
          <div style={{ fontSize: 10, color: "#666", textAlign: "center", marginTop: 4 }}>{value.shareholders?.length || 0} shareholders · {companyName}</div>
          <div style={{ position: "absolute", top: 12, right: 12, background: T.greenG, border: `1px solid ${T.green}`, borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 600, color: T.green }}>Completed</div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "12px 16px" }}>
          <button onClick={() => setMode("builder")} style={{ flex: 1, padding: "8px", border: `1px solid ${T.bdrA}`, borderRadius: 8, background: T.bg2, color: T.txt2, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Edit</button>
          <button onClick={downloadPDF} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, background: T.grad, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Download PDF</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${T.bdr}`, background: T.bg1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${T.bdr}`, background: T.bg0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3H14M2 7H14M2 11H14M2 15H10" stroke={T.blue} strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.txt }}>Shareholder Register Builder</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!showUpload && <button onClick={() => setShowUpload(true)} style={{ padding: "5px 12px", border: `1px solid ${T.bdrA}`, borderRadius: 6, background: "transparent", color: T.txt3, fontSize: 11, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Upload my own</button>}
        </div>
      </div>

      {showUpload ? (
        <div style={{ padding: 16 }}>
          <FileUpload value={typeof value === "object" && value?.type !== "shareholder_register" ? value : null} onChange={onChange} />
          <button onClick={() => setShowUpload(false)} style={{ marginTop: 8, padding: "5px 12px", border: `1px solid ${T.bdrA}`, borderRadius: 6, background: "transparent", color: T.txt3, fontSize: 11, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Use builder instead</button>
        </div>
      ) : (
        <>
          <div style={{ margin: 16, borderRadius: 8, background: "#FAFAFA", border: "1px solid #e0e0e0", boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)", padding: "36px 40px", fontFamily: "'Inter', sans-serif", color: "#1a1a1a", lineHeight: 1.7 }}>
            {/* Letterhead */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <input defaultValue={companyName} onBlur={e => setEditCompanyName(e.target.value)} style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", letterSpacing: 1, border: "none", borderBottom: "1px dashed #bbb", background: "transparent", outline: "none", width: "100%", fontFamily: "'Inter', sans-serif" }} placeholder="Company Name" />
                <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#999" }}>CRN:</span>
                  <input defaultValue={crn} onBlur={e => setEditCrn(e.target.value)} placeholder="Registration number"
                    style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 4px", outline: "none", flex: 1 }} />
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 2, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#999" }}>TIN:</span>
                  <input defaultValue={editTin} onBlur={e => setEditTin(e.target.value)} placeholder="Tax ID / PAN"
                    style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 4px", outline: "none", width: 140 }} />
                  <span style={{ fontSize: 10, color: "#999", marginLeft: 8 }}>GST:</span>
                  <input defaultValue={editGst} onBlur={e => setEditGst(e.target.value)} placeholder="GST number"
                    style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "1px 4px", outline: "none", width: 160 }} />
                </div>
                <input defaultValue={regAddr} onBlur={e => setEditAddr(e.target.value)} placeholder="Registered address"
                  style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#444", fontSize: 11, fontFamily: "'Inter', sans-serif", padding: "1px 4px", outline: "none", width: "100%", marginTop: 4 }} />
              </div>
              <div onClick={() => logoRef.current?.click()} style={{ width: 72, height: 72, border: "1.5px dashed #ccc", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#aaa", fontSize: 9, textAlign: "center", lineHeight: 1.3, cursor: "pointer", overflow: "hidden" }}>
                {companyLogo ? <img src={companyLogo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <>Click to<br/>add logo</>}
                <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = ev => setCompanyLogo(ev.target.result); reader.readAsDataURL(file); } }} />
              </div>
            </div>
            <div style={{ borderTop: "1.5px solid #ccc", margin: "16px 0" }} />
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", margin: "20px 0 8px" }}>Register of Members</div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "#555" }}>As at: </span>
              <input type="date" defaultValue={registerDate} onBlur={e => setRegisterDate(e.target.value)}
                style={{ border: "none", borderBottom: "1px dashed #bbb", background: "transparent", color: "#1a1a1a", fontSize: 12, fontFamily: "'Inter', sans-serif", padding: "2px 4px", outline: "none" }} />
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "#f0f0f0" }}>
                    {["Name", "Shares", "%", "Class", "Date Acquired", "Address"].map(h => (
                      <th key={h} style={{ padding: "7px 8px", border: "1px solid #ccc", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, color: "#555", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shareholders.map((s, i) => (
                    <tr key={i}>
                      <td style={{ padding: "3px 4px", border: "1px solid #ccc" }}>{dinput(s.name, v => updateRow(i, "name", v), "Full name")}</td>
                      <td style={{ padding: "3px 4px", border: "1px solid #ccc", width: 80 }}>{dinput(s.shares, v => updateRow(i, "shares", v), "10,000", { fontFamily: "'IBM Plex Mono', monospace", textAlign: "center" })}</td>
                      <td style={{ padding: "3px 4px", border: "1px solid #ccc", width: 60 }}>{dinput(s.pct, v => updateRow(i, "pct", v), "%", { fontFamily: "'IBM Plex Mono', monospace", textAlign: "center" })}</td>
                      <td style={{ padding: "3px 4px", border: "1px solid #ccc", width: 90 }}>
                        <select defaultValue={s.classType} onChange={e => updateRow(i, "classType", e.target.value)}
                          style={{ border: "none", background: "transparent", color: "#1a1a1a", fontSize: 11, outline: "none", width: "100%" }}>
                          <option>Ordinary</option><option>Preference</option><option>Class A</option><option>Class B</option>
                        </select>
                      </td>
                      <td style={{ padding: "3px 4px", border: "1px solid #ccc", width: 110 }}>
                        <input type="date" defaultValue={s.dateAcq} onBlur={e => updateRow(i, "dateAcq", e.target.value)}
                          style={{ border: "none", background: "transparent", color: "#1a1a1a", fontSize: 11, fontFamily: "'Inter', sans-serif", outline: "none", width: "100%" }} />
                      </td>
                      <td style={{ padding: "3px 4px", border: "1px solid #ccc" }}>{dinput(s.address, v => updateRow(i, "address", v), "Residential address")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={addRow} style={{ border: "1px dashed #bbb", borderRadius: 6, background: "transparent", padding: "4px 12px", fontSize: 11, color: "#777", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>+ Add shareholder</button>
              {shareholders.length > 1 && <button onClick={removeRow} style={{ border: "1px dashed #bbb", borderRadius: 6, background: "transparent", padding: "4px 12px", fontSize: 11, color: "#999", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Remove last</button>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: `1px solid ${T.bdr}`, justifyContent: "flex-end" }}>
            <button onClick={downloadPDF} style={{ padding: "8px 20px", border: `1px solid ${T.bdrA}`, borderRadius: 8, background: T.bg2, color: T.txt2, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Preview / Download</button>
            <button onClick={saveRegister} style={{ padding: "8px 24px", border: "none", borderRadius: 8, background: T.grad, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Save Register</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FORM STEPS
───────────────────────────────────────────── */
const COUNTRIES = ["India","United States","United Kingdom","Singapore","United Arab Emirates","Hong Kong SAR","Mauritius","Cayman Islands","British Virgin Islands","Germany","Netherlands","Switzerland","Canada","Australia","Japan","Other"];
const LEGAL_FORMS = ["Private Limited Company (Pvt. Ltd.)","Public Limited Company (Ltd.)","Limited Liability Company (LLC)","Limited Liability Partnership (LLP)","Sole Proprietorship","Partnership Firm","Foreign Company Branch","Society / Trust","Other"];
const TOKENS = ["USDT (TRC-20)","USDT (ERC-20)","USDC (ERC-20)","USDC (Solana)","BUSD","Multiple Stablecoins","BTC","ETH"];

function G({ children, cols = 2 }) {
  return (
    <div className="sp-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "20px 20px" }}>
      {children}
    </div>
  );
}

function renderStep(step, data, set, boCount, setBoCount) {
  const v = k => data[k];

  /* helpers for UBO blocks */
  const UBOBlock = (idx, required) => (
    <div key={idx} style={{ border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 20, background: T.bg0, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: required ? T.grad : T.bg3, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: required ? "#fff" : T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>{String(idx+1).padStart(2,"0")}</span>
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: T.txt2 }}>
          Beneficial Owner {idx + 1} {!required && <span style={{ color: T.txt3, fontWeight: 400 }}>(if applicable)</span>}
        </span>
        {required && <Tag>Required</Tag>}
      </div>
      <G>
        <Field label="Full Legal Name (as per passport/national ID)" required={required} half><Input value={v(`bo${idx}_name`)} onChange={val => set(`bo${idx}_name`, val)} placeholder="Full name" /></Field>
        <Field label="Date of Birth" required={required} half><Input type="date" value={v(`bo${idx}_dob`)} onChange={val => set(`bo${idx}_dob`, val)} /></Field>
        <Field label="Nationality" required={required} half><Select value={v(`bo${idx}_nat`)} onChange={val => set(`bo${idx}_nat`, val)} options={COUNTRIES} /></Field>
        <Field label="Country of Residence" required={required} half><Select value={v(`bo${idx}_res`)} onChange={val => set(`bo${idx}_res`, val)} options={COUNTRIES} /></Field>
        <Field label="Ownership / Control %" required={required} hint="Direct + indirect combined" half><Input value={v(`bo${idx}_pct`)} onChange={val => set(`bo${idx}_pct`, val)} placeholder="Direct + indirect %" /></Field>
        <Field label="Nature of Control" required={required} half>
          <Select value={v(`bo${idx}_ctrl`)} onChange={val => set(`bo${idx}_ctrl`, val)} options={["Direct Shareholder","Indirect Shareholder","Significant Influence","Director Control","Trustee / Settlor","Other"]} />
        </Field>
        <Field label="PAN / Passport / ID Number" required={required} half><Input value={v(`bo${idx}_id`)} onChange={val => set(`bo${idx}_id`, val)} placeholder="ID number" monospace /></Field>
        <Field label="Tax Identification Number (PAN / SSN / TIN)" half><Input value={v(`bo${idx}_tin`)} onChange={val => set(`bo${idx}_tin`, val)} placeholder="Tax ID" monospace /></Field>
      </G>
      <Field label="Residential Address (full)" required={required} style={{ marginTop: 4 }}>
        <Textarea value={v(`bo${idx}_addr`)} onChange={val => set(`bo${idx}_addr`, val)} placeholder="Full residential address including PIN / ZIP code and country" rows={2} />
      </Field>
      <Field label="Contact Email" required={required}><Input type="email" value={v(`bo${idx}_email`)} onChange={val => set(`bo${idx}_email`, val)} placeholder="beneficial.owner@company.com" /></Field>
      <Divider label="Identity Verification" />
      <G>
        <Field label="Photo ID — Front (Passport / Aadhaar / Driving Licence)" required={required} half>
          <FileUpload value={v(`bo${idx}_idFront`)} onChange={val => set(`bo${idx}_idFront`, val)} hint="Clear colour scan — JPG or PNG" />
        </Field>
        <Field label="Photo ID — Back" required={required} half>
          <FileUpload value={v(`bo${idx}_idBack`)} onChange={val => set(`bo${idx}_idBack`, val)} hint="Back side of the same ID document" />
        </Field>
      </G>
      <Field label="Proof of Residential Address" required={required} hint="Utility bill, Aadhaar, bank statement — must be ≤3 months old">
        <FileUpload value={v(`bo${idx}_proofAddr`)} onChange={val => set(`bo${idx}_proofAddr`, val)} hint="PDF, JPG, or PNG — ≤3 months old" />
      </Field>
      <Field label="Face Liveness Verification" required={required} hint="Complete a short camera-based challenge to verify your identity in real time">
        <FaceLiveness value={v(`bo${idx}_selfie`)} onChange={val => set(`bo${idx}_selfie`, val)} />
      </Field>
    </div>
  );

  switch (step) {
    /* ── 0 APPLICANT ── */
    case 0: return (
      <>
        <SectionHead
          label="Step 01 / 10"
          title="Applicant & Contact Details"
          description="The person completing this form must be an authorised representative. All communication regarding this application will be directed to the contact email provided."
        />
        <InfoBox type="info">Documents submitted through this portal are handled in accordance with the Information Technology Act, 2000 and applicable data protection standards. All files are encrypted in transit.</InfoBox>
        <G>
          <Field label="Contact Email Address" required><Input type="email" value={v("email")} onChange={val => set("email", val)} placeholder="compliance@company.com" /></Field>
          <Field label="Full Name of Applicant" required><Input value={v("appName")} onChange={val => set("appName", val)} placeholder="As per government-issued ID" /></Field>
          <Field label="Designation / Job Title" required><Input value={v("appTitle")} onChange={val => set("appTitle", val)} placeholder="Your designation" /></Field>
          <Field label="Mobile Number (with country code)" required><Input value={v("appPhone")} onChange={val => set("appPhone", val)} placeholder="+91 98XXX XXXXX" /></Field>
          <Field label="Role in the Organisation" required>
            <Select value={v("appRole")} onChange={val => set("appRole", val)} options={["Director","Managing Director / CEO","Chief Compliance Officer / MLRO","Chief Financial Officer","Authorised Signatory","Other"]} />
          </Field>
          <Field label="Are you an Authorised Signatory?" required>
            <RadioGroup value={v("isAuthSig")} onChange={val => set("isAuthSig", val)} options={["Yes","No — I will attach authorisation"]} />
          </Field>
        </G>
        <Divider label="Internal Use" />
        <Field label="Stable Pay Point of Contact" hint="Name of your Stable Pay relationship manager or referral, if known">
          <Input value={v("spPOC")} onChange={val => set("spPOC", val)} placeholder="Name of your Stable Pay contact" />
        </Field>
        <Field label="How did you hear about Stable Pay?">
          <Select value={v("referralSource")} onChange={val => set("referralSource", val)} options={["Direct Outreach","Referral","LinkedIn / Social Media","Industry Event","Other"]} />
        </Field>
      </>
    );

    /* ── 1 COMPANY ── */
    case 1: return (
      <>
        <SectionHead label="Step 02 / 10" title="Company Information" description="Provide details exactly as they appear on your Certificate of Incorporation and other official documents." compliance={["PMLA"]} />
        <G>
          <Field label="Legal Entity Name" required><Input value={v("co_name")} onChange={val => set("co_name", val)} placeholder="Full registered legal name" /></Field>
          <Field label="Trade / DBA Name" hint="If operating under a different commercial name"><Input value={v("co_trade")} onChange={val => set("co_trade", val)} placeholder="Operating / brand name" /></Field>
          <Field label="Country of Incorporation" required>
            <Select value={v("co_country")} onChange={val => set("co_country", val)} options={COUNTRIES} />
          </Field>
          <Field label="Legal Form" required>
            <Select value={v("co_form")} onChange={val => set("co_form", val)} options={LEGAL_FORMS} />
          </Field>
          <Field label="Company Registration Number (CIN / CRN)" required><Input value={v("co_crn")} onChange={val => set("co_crn", val)} placeholder="Company registration number" monospace /></Field>
          <Field label="Date of Incorporation" required><Input type="date" value={v("co_doi")} onChange={val => set("co_doi", val)} /></Field>
          <Field label="Registered Office Address" required>
            <Textarea value={v("co_regAddr")} onChange={val => set("co_regAddr", val)} placeholder="Full registered address as per incorporation documents, with PIN/ZIP and country" rows={2} />
          </Field>
          <Field label="Principal Place of Business / Operational Address" hint="Only if different from registered office">
            <Textarea value={v("co_opAddr")} onChange={val => set("co_opAddr", val)} placeholder="Operational address" rows={2} />
          </Field>
          <Field label="Business Website" required><Input value={v("co_web")} onChange={val => set("co_web", val)} placeholder="https://www.company.com" /></Field>
          <Field label="Company Email / Compliance Email"><Input type="email" value={v("co_email")} onChange={val => set("co_email", val)} placeholder="legal@company.com" /></Field>
          <Field label="Tax Identification Number" required hint="PAN for Indian entities; EIN, TIN, or VAT number for foreign entities">
            <Input value={v("co_tin")} onChange={val => set("co_tin", val)} placeholder="PAN / EIN / TIN / VAT number" monospace />
          </Field>
          <Field label="GST Registration Number" hint="Applicable for India-registered entities">
            <Input value={v("co_gst")} onChange={val => set("co_gst", val)} placeholder="27AAACT1234A1Z1" monospace />
          </Field>
          <Field label="LEI (Legal Entity Identifier)" hint="Required for entities participating in financial market transactions; 20-character ISO 17442">
            <Input value={v("co_lei")} onChange={val => set("co_lei", val)} placeholder="549300XXXXXXXXXXXX00" monospace />
          </Field>
          <Field label="DPIIT / Startup India Registration" hint="If applicable">
            <Input value={v("co_startup")} onChange={val => set("co_startup", val)} placeholder="DIIIT reference, if any" />
          </Field>
        </G>
      </>
    );

    /* ── 2 BUSINESS PROFILE ── */
    case 2: return (
      <>
        <SectionHead label="Step 03 / 10" title="Business Profile" description="Describe your business model, the nature of your transactions with Stable Pay, and the jurisdictions you serve." compliance={["FIU-IND","FATF"]} />
        <Field label="Description of Business Activities" required hint="Explain your core business model, revenue sources, and specifically how you intend to use Stable Pay's OTC service">
          <Textarea value={v("biz_desc")} onChange={val => set("biz_desc", val)} placeholder="Describe your core business model, revenue sources, and how you intend to use Stable Pay's OTC service." rows={5} />
        </Field>
        <G>
          <Field label="Services / Products Offered" required>
            <Textarea value={v("biz_services")} onChange={val => set("biz_services", val)} placeholder="List all products and services your entity offers to customers." rows={3} />
          </Field>
          <Field label="Customer Base" required>
            <Select value={v("biz_custType")} onChange={val => set("biz_custType", val)} options={["B2B Only","B2C Only","B2B and B2C","Institutional / Wholesale Only","Government / PSU"]} />
          </Field>
        </G>
        <Field label="Are you conducting regulated / licensed activities?" required>
          <RadioGroup value={v("biz_regulated")} onChange={val => set("biz_regulated", val)} options={["Yes — currently licensed","Pending licence / registration","No — currently unregulated"]} />
        </Field>
        {v("biz_regulated") !== "No — currently unregulated" && (
          <Field label="Applicable Licences & Regulatory Authorities" required hint="Include licence number, issuing authority, jurisdiction, and expiry date">
            <Textarea value={v("biz_licences")} onChange={val => set("biz_licences", val)} placeholder="Licence number — Issuing authority — Jurisdiction — Expiry date" rows={3} />
          </Field>
        )}
        <G>
          <Field label="Target Jurisdictions" required hint="Countries where you offer services or have customers">
            <Textarea value={v("biz_targetJuris")} onChange={val => set("biz_targetJuris", val)} placeholder="India, United States, Singapore, UAE..." rows={2} />
          </Field>
          <Field label="Excluded Jurisdictions" hint="FATF high-risk, OFAC sanctioned, or self-imposed exclusions">
            <Textarea value={v("biz_exclJuris")} onChange={val => set("biz_exclJuris", val)} placeholder="Iran, North Korea, Cuba, Syria, Russia, Belarus, Myanmar, all FATF grey-list jurisdictions..." rows={2} />
          </Field>
        </G>
        <Divider label="KYC / Due Diligence Programme" />
        <InfoBox type="warn">FIU-IND Requirement: OTC counterparties of Stable Pay are considered Reporting Entities' correspondents under PMLA. You must demonstrate that your own CDD/KYC programme is consistent with or superior to PMLA standards.</InfoBox>
        <Field label="Your KYC / CDD Programme for End Customers" required hint="Describe your identity verification, risk scoring, and onboarding process">
          <Textarea value={v("biz_cdd")} onChange={val => set("biz_cdd", val)} placeholder="Describe your identity verification process, risk scoring methodology, and how you conduct enhanced due diligence for high-risk customers." rows={4} />
        </Field>
        <Field label="Technology / RegTech vendors used for KYC" hint="Identity verification, sanctions screening, or blockchain analytics providers">
          <Input value={v("biz_kycVendors")} onChange={val => set("biz_kycVendors", val)} placeholder="Identity verification, sanctions screening, and analytics vendors" />
        </Field>
      </>
    );

    /* ── 3 PAYMENT & VOLUME ── */
    case 3: return (
      <>
        <SectionHead label="Step 04 / 10" title="Payment & Volume Details" description="Provide expected transaction volume and details of the full funds flow. This information is used for risk tiering and CTR threshold monitoring." compliance={["FIU-IND","PMLA"]} />
        <InfoBox type="warn">
          <strong>FIU-IND CTR Obligation:</strong> Under Rule 3 of PML (Maintenance of Records) Rules 2005, Cash Transaction Reports are required for transactions ≥ ₹10 lakhs. Suspicious Transaction Reports (STRs) must be filed irrespective of amount. Ensure your volume estimates are accurate.
        </InfoBox>
        <G>
          <Field label="Expected Monthly Transaction Volume (USD)" required hint="Provide realistic estimate in USD">
            <Input value={v("vol_monthly")} onChange={val => set("vol_monthly", val)} placeholder="e.g. USD 500,000" />
          </Field>
          <Field label="Expected Monthly Volume (INR equivalent)" required>
            <Input value={v("vol_monthlyINR")} onChange={val => set("vol_monthlyINR", val)} placeholder="e.g. INR 4.15 Crore" />
          </Field>
          <Field label="Average Individual Transaction (USD)" required>
            <Input value={v("vol_avgTx")} onChange={val => set("vol_avgTx", val)} placeholder="e.g. USD 25,000" />
          </Field>
          <Field label="Expected Monthly Transaction Count" required>
            <Select value={v("vol_txCount")} onChange={val => set("vol_txCount", val)} options={["1–5","6–20","21–50","51–100","101–250","250+"]} />
          </Field>
          <Field label="Minimum Single Transaction Size (USD)">
            <Input value={v("vol_minTx")} onChange={val => set("vol_minTx", val)} placeholder="e.g. USD 1,000" />
          </Field>
          <Field label="Maximum Single Transaction Size (USD)">
            <Input value={v("vol_maxTx")} onChange={val => set("vol_maxTx", val)} placeholder="e.g. USD 200,000" />
          </Field>
        </G>
        <Divider label="Crypto & Blockchain Details" />
        <G>
          <Field label="Primary Stablecoin / Token Used" required>
            <Select value={v("vol_token")} onChange={val => set("vol_token", val)} options={TOKENS} />
          </Field>
          <Field label="Blockchain Network(s)" required hint="Specify the chain and token standard for each network used">
            <Input value={v("vol_chains")} onChange={val => set("vol_chains", val)} placeholder="Specify chain and token standard" />
          </Field>
        </G>
        <Field label="Crypto Wallet Address(es)" required hint="Paste the exact address and specify chain. You may include a blockchain explorer hyperlink. If no wallet, enter N/A.">
          <Textarea value={v("vol_wallets")} onChange={val => set("vol_wallets", val)} monospace placeholder={"Chain / Network: Wallet address\nChain / Network: Wallet address\nEnter N/A if a wallet address is not applicable."} rows={3} />
        </Field>
        <Divider label="Current Providers" />
        <G>
          <Field label="Current Payment Providers / Banks" required hint="List all banks, PSPs, and payment rails">
            <Textarea value={v("vol_providers")} onChange={val => set("vol_providers", val)} placeholder="List all banks, payment service providers, and payment rails your entity currently uses." rows={2} />
          </Field>
          <Field label="Current Crypto Custody / Exchange Providers" hint="Exchanges, OTC desks, custodians">
            <Textarea value={v("vol_custodians")} onChange={val => set("vol_custodians", val)} placeholder="List all exchanges, OTC desks, and custodian providers your entity currently uses." rows={2} />
          </Field>
        </G>
        <Field label="End-to-End Fund Flow Description" required hint="Describe the complete path of funds from origination to final settlement">
          <Textarea value={v("vol_fundFlow")} onChange={val => set("vol_fundFlow", val)} placeholder="Describe step by step how funds originate, how they are converted or transferred, and how they reach final settlement. Include all intermediary steps." rows={4} />
        </Field>
      </>
    );

    /* ── 4 BENEFICIAL OWNERS ── */
    case 4: return (
      <>
        <SectionHead label="Step 05 / 10" title="Beneficial Owners & Authorised Signatories" description="Disclose all natural persons who own or control the entity. Under PMLA and FATF Recommendation 24, you must trace ownership to the ultimate natural person." compliance={["PMLA","FIU-IND","FATF R.24"]} />
        <InfoBox type="warn">
          <strong>PMLA Disclosure Threshold:</strong> Indian regulation (Prevention of Money Laundering Act, 2002 read with RBI KYC Master Directions 2016) requires disclosure of all natural persons holding ≥10% beneficial interest in the entity. For entities with complex structures, trace to the ultimate beneficial owner. Failure to disclose accurate BO information is an offence under PMLA.
        </InfoBox>
        {Array.from({ length: boCount }, (_, i) => UBOBlock(i, i === 0))}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={() => setBoCount(c => c + 1)} style={{
            padding: "8px 16px", border: `1px dashed ${T.bdrA}`, borderRadius: 8,
            background: "transparent", color: T.txt2, fontSize: 12, cursor: "pointer",
            fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2V10M2 6H10" stroke={T.blueL} strokeWidth="1.5" strokeLinecap="round"/></svg>
            Add Beneficial Owner
          </button>
          {boCount > 1 && (
            <button onClick={() => setBoCount(c => Math.max(1, c - 1))} style={{
              padding: "8px 16px", border: `1px dashed ${T.bdrA}`, borderRadius: 8,
              background: "transparent", color: T.txt3, fontSize: 12, cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}>Remove last</button>
          )}
        </div>
        <Divider label="Authorised Signatories" />
        <Field label="Authorised Signatory Name(s) & Positions" required hint="Persons legally authorised to execute contracts and agreements on behalf of the entity">
          <Textarea value={v("bo_signatories")} onChange={val => set("bo_signatories", val)} placeholder="Full name — Position — Email address (one per line)" rows={3} />
        </Field>
        <Field label="Board Resolution / Authorisation Letter" hint="Use our template to create your board resolution, or upload your own">
          <DocumentBuilder data={data} value={v("bo_authLetterFile")} onChange={val => set("bo_authLetterFile", val)} />
        </Field>
        <Field label="Corporate Ownership / Structure Chart" required hint="Showing the full ownership chain from the entity to the ultimate natural beneficial owners. Clearly indicate percentage holdings at each level.">
          <CorporateStructureChart data={data} value={v("bo_structureFile")} onChange={val => set("bo_structureFile", val)} />
        </Field>
        <Field label="Shareholder Register / Register of Members" required hint="Must reflect current shareholding as of date of application">
          <ShareholderRegister data={data} value={v("bo_shareRegFile")} onChange={val => set("bo_shareRegFile", val)} />
        </Field>
      </>
    );

    /* ── 5 SOURCE OF FUNDS ── */
    case 5: return (
      <>
        <SectionHead label="Step 06 / 10" title="Source of Funds & Source of Wealth" description="Explain the origin of business operating funds and the wealth of each beneficial owner. Documentary evidence is required." compliance={["PMLA","FIU-IND","FATF R.10"]} />
        <Divider label="Business — Source of Funds" />
        <Field label="How does the company fund its operations?" required hint="Describe the origin of capital used to operate the business and execute transactions through Stable Pay">
          <Textarea value={v("sof_biz")} onChange={val => set("sof_biz", val)} placeholder="Describe the origin of the capital used to operate the business — investor funding, business revenues, retained earnings, loans, etc. Be specific." rows={4} />
        </Field>
        <Field label="Upload Supporting Document — Business Source of Funds" required hint="Accepted: audited financial statements (most recent FY), CA-certified accounts, investor term sheets / funding agreements, bank statements showing capital inflow, revenue contracts">
          <FileUpload value={v("sof_bizFile")} onChange={val => set("sof_bizFile", val)} hint="Audited accounts / bank statements / funding agreements — PDF" />
        </Field>
        <Field label="Upload Business Bank Statement" required hint="3–6 months of recent statements from primary operating account">
          <FileUpload value={v("sof_bankStmt")} onChange={val => set("sof_bankStmt", val)} hint="PDF — last 3 to 6 months" />
        </Field>

        <Divider label="Beneficial Owner(s) — Source of Wealth" />
        <InfoBox type="legal">
          Under PMLA / RBI KYC Master Directions, source of wealth declarations are required for all beneficial owners holding ≥10%. Acceptable evidence includes employment contracts, payslips, company sale agreements, investment statements, inheritance documentation, property sale deeds, dividend income statements, or tax assessment orders.
        </InfoBox>
        {[0, 1].map(idx => (
          <div key={idx} style={{ border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 20, background: T.bg0, marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.amber, marginBottom: 14 }}>
              Beneficial Owner {idx + 1} — Source of Wealth {idx > 0 && <span style={{ color: T.txt3, fontWeight: 400 }}>(if applicable)</span>}
            </div>
            <Field label={`BO ${idx+1} Full Name`} required={idx===0}><Input value={v(`sow${idx}_name`)} onChange={val => set(`sow${idx}_name`, val)} placeholder="Full legal name" /></Field>
            <Field label="Source of Wealth — Narrative" required={idx===0} hint="How did this person accumulate their personal wealth? Be specific.">
              <Textarea value={v(`sow${idx}_desc`)} onChange={val => set(`sow${idx}_desc`, val)} placeholder="Explain how this individual accumulated their personal wealth — employment income, business ownership, investments, inheritance, property, etc. Be specific." rows={3} />
            </Field>
            <Field label="Upload Evidence of Source of Wealth" required={idx===0} hint="Recent payslips, employment letter, company sale agreement, dividend statement, property sale deed, tax returns, bank statements">
              <FileUpload value={v(`sow${idx}_file`)} onChange={val => set(`sow${idx}_file`, val)} />
            </Field>
          </div>
        ))}
      </>
    );

    /* ── 6 SANCTIONS & PEP ── */
    case 6: return (
      <>
        <SectionHead label="Step 07 / 10" title="Sanctions & PEP Declarations" description="Mandatory declarations under PMLA Rule 9 and applicable international sanctions regimes." compliance={["FIU-IND","OFAC","UN","FATF R.12"]} />
        <InfoBox type="warn">
          <strong>Regulatory Basis:</strong> These declarations are required under PMLA Section 12, Rule 9 of PML (Maintenance of Records) Rules 2005, RBI KYC Master Directions Clause 37–42 (PEP), and OFAC / UN / EU sanctions screening obligations. False declarations constitute a criminal offence.
        </InfoBox>
        <Field label="Is any beneficial owner, director, or authorised signatory a Politically Exposed Person (PEP)?" required hint="A PEP is an individual who is or has been entrusted with a prominent public function in India or abroad (heads of state, ministers, senior government officials, senior military officials, senior judiciary, senior executives of SOEs, important political party officials)">
          <RadioGroup value={v("pep_status")} onChange={val => set("pep_status", val)} options={["None are PEPs","Yes — one or more are PEPs","One or more are related to / close associate of a PEP"]} />
        </Field>
        {v("pep_status") && v("pep_status") !== "None are PEPs" && (
          <Field label="PEP Details — Full Disclosure" required hint="For each PEP: full name, position, country, period, and relationship to the entity">
            <Textarea value={v("pep_details")} onChange={val => set("pep_details", val)} placeholder={"Full Name:\nPosition held:\nPeriod of office:\nCountry:\nRelationship to entity:"} rows={5} />
          </Field>
        )}

        <Divider label="Sanctions Declarations" />
        <div>
          {[
            { k: "sanc1", l: "I confirm that the entity, its beneficial owners, directors, and authorised signatories are NOT listed on any UN Security Council Consolidated Sanctions List, OFAC SDN List, EU Consolidated Sanctions List, or HM Treasury Financial Sanctions Register." },
            { k: "sanc2", l: "The entity does not conduct business with or on behalf of any sanctioned person, entity, or country, including FATF high-risk jurisdictions (currently: Democratic People's Republic of Korea, Iran, Myanmar) and OFAC comprehensively sanctioned territories." },
            { k: "sanc3", l: "The entity is not incorporated in, controlled by, or operating from a FATF grey-listed or black-listed jurisdiction." },
            { k: "sanc4", l: "I confirm that the entity's funds do not originate from or transit through any sanctioned jurisdiction, sanctioned financial institution, or sanctioned individual." },
            { k: "sanc5", l: "I acknowledge that Stable Pay is obligated to file Suspicious Transaction Reports (STR) with FIU-IND for transactions involving persons or jurisdictions subject to international sanctions, and I consent to such reporting." },
          ].map(item => (
            <Checkbox key={item.k} label={item.l} checked={!!v(item.k)} onChange={val => set(item.k, val)} />
          ))}
        </div>

        <Divider label="Additional Risk Disclosures" />
        <Field label="Has the entity or any director/BO been subject to regulatory action, investigation, criminal conviction, or enforcement proceedings?" required>
          <RadioGroup value={v("regAction")} onChange={val => set("regAction", val)} options={["No","Yes"]} />
        </Field>
        {v("regAction") === "Yes" && (
          <Field label="Details of Regulatory / Legal Actions" required>
            <Textarea value={v("regActionDetails")} onChange={val => set("regActionDetails", val)} placeholder="Nature of action — Regulatory authority — Date initiated — Current status — Outcome or resolution" rows={4} />
          </Field>
        )}
        <Field label="Is the entity involved in any of the following high-risk business categories?" hint="Tick all that apply">
          <div>
            {["Gambling / Online Gaming","Adult Entertainment","Weapons / Defence / Dual-use goods","Cannabis / CBD (even in legal jurisdictions)","Charities / NGOs / NPOs","Correspondent / Nested Banking","Shell or Nominee Structures","Hawala / Informal Money Transfer","Political Parties / Campaign Financing","None of the above"].map(item => (
              <Checkbox key={item} label={item}
                checked={(v("highRisk")||[]).includes(item)}
                onChange={checked => {
                  const cur = v("highRisk")||[];
                  set("highRisk", checked ? [...cur, item] : cur.filter(x => x !== item));
                }}
                accent={item !== "None of the above" ? "amber" : "blue"}
              />
            ))}
          </div>
        </Field>
      </>
    );

    /* ── 7 AML/CFT PROGRAMME ── */
    case 7: return (
      <>
        <SectionHead label="Step 08 / 10" title="AML / CFT Programme" description="Stable Pay is required under PMLA and FIU-IND guidelines to assess the strength of your compliance framework before establishing an OTC relationship." compliance={["FIU-IND","PMLA S.12","FATF R.18"]} />
        <InfoBox type="warn">
          <strong>FATF Recommendation 18 & PMLA S.12:</strong> Reporting Entities and their counterparties are expected to have adequate AML/CFT programmes. Where deficiencies are identified, Stable Pay reserves the right to decline onboarding or impose enhanced monitoring.
        </InfoBox>
        <G>
          <Field label="Does your entity have a formal, board-approved AML/CFT Policy?" required>
            <RadioGroup value={v("aml_hasPolicy")} onChange={val => set("aml_hasPolicy", val)} options={["Yes","No","In Development"]} />
          </Field>
          <Field label="Have you filed any Suspicious Transaction Reports (STR) with FIU-IND or equivalent authority in the past 12 months?" required hint="You are not required to disclose the contents — only confirm whether filings were made">
            <RadioGroup value={v("aml_strFiled")} onChange={val => set("aml_strFiled", val)} options={["Yes","No","N/A — not a Reporting Entity"]} />
          </Field>
        </G>
        {v("aml_hasPolicy") === "Yes" && (
          <Field label="Upload AML/CFT Policy Document">
            <FileUpload value={v("aml_policyFile")} onChange={val => set("aml_policyFile", val)} hint="Board-approved policy document — PDF" />
          </Field>
        )}
        <Divider label="Designated MLRO / Compliance Officer" />
        <Field label="Does your entity have a designated Money Laundering Reporting Officer (MLRO) or Principal Compliance Officer?" required>
          <RadioGroup value={v("aml_hasMLRO")} onChange={val => set("aml_hasMLRO", val)} options={["Yes","No"]} />
        </Field>
        {v("aml_hasMLRO") === "Yes" && (
          <G>
            <Field label="MLRO Full Name" required><Input value={v("aml_mlroName")} onChange={val => set("aml_mlroName", val)} placeholder="Full name" /></Field>
            <Field label="MLRO Email Address" required><Input type="email" value={v("aml_mlroEmail")} onChange={val => set("aml_mlroEmail", val)} placeholder="mlro@company.com" /></Field>
            <Field label="MLRO Qualification / Experience">
              <Input value={v("aml_mlroQual")} onChange={val => set("aml_mlroQual", val)} placeholder="Certifications held and years of compliance experience" />
            </Field>
            <Field label="Date of MLRO Appointment">
              <Input type="date" value={v("aml_mlroDOA")} onChange={val => set("aml_mlroDOA", val)} />
            </Field>
          </G>
        )}
        <Divider label="Transaction Monitoring & Screening" />
        <Field label="Transaction Monitoring System / Process" required hint="How do you identify and investigate suspicious transactions?">
          <Textarea value={v("aml_txMon")} onChange={val => set("aml_txMon", val)} placeholder="Describe your systems and processes for detecting, investigating, and escalating suspicious transactions. Include thresholds, alert mechanisms, and escalation procedures." rows={4} />
        </Field>
        <G>
          <Field label="Sanctions Screening Programme" required hint="Against which lists, and at what frequency?">
            <Textarea value={v("aml_sanctScreening")} onChange={val => set("aml_sanctScreening", val)} placeholder="List the sanctions lists screened against, the screening vendor or system used, and the frequency of screening — at onboarding and/or ongoing." rows={3} />
          </Field>
          <Field label="Adverse Media / Negative News Screening">
            <Select value={v("aml_adverseMedia")} onChange={val => set("aml_adverseMedia", val)} options={["Automated — real-time","Automated — periodic","Manual — ad hoc","Not currently performed"]} />
          </Field>
        </G>
        <G>
          <Field label="Record Retention Period" required hint="PMLA mandates minimum 5 years from date of transaction">
            <Select value={v("aml_retention")} onChange={val => set("aml_retention", val)} options={["5 years (PMLA minimum)","7 years","10 years","Indefinitely"]} />
          </Field>
          <Field label="Staff AML/CFT Training Frequency" required>
            <Select value={v("aml_training")} onChange={val => set("aml_training", val)} options={["Monthly","Quarterly","Semi-Annually","Annually","Upon Onboarding Only"]} />
          </Field>
        </G>
        <Field label="RegTech / Compliance Tooling" hint="Third-party compliance, KYC, and blockchain analytics vendors currently in use">
          <Input value={v("aml_tools")} onChange={val => set("aml_tools", val)} placeholder="List all compliance, KYC, and blockchain analytics vendors currently in use" />
        </Field>
        <Field label="Independent AML Audit" hint="Has your AML/CFT programme been subject to independent review?">
          <RadioGroup value={v("aml_audit")} onChange={val => set("aml_audit", val)} options={["Yes — within last 12 months","Yes — within last 24 months","No"]} />
        </Field>
      </>
    );

    /* ── 8 DOCUMENTS ── */
    case 8: return (
      <>
        <SectionHead label="Step 09 / 10" title="Document Submission" description="Upload all required documents. Files must be in English or accompanied by a notarised / apostilled English translation. PDF format preferred." compliance={["PMLA","FIU-IND","RBI KYC MD"]} />
        <InfoBox type="warn">
          <strong>Important:</strong> All documents must be valid and current. Business registry extracts must be dated within 3 months. Identity documents must be valid at date of submission. Outdated or altered documents will result in rejection. If any document is in a language other than English, you must provide a certified English translation.
        </InfoBox>

        {[
          { key: "doc_coi",       label: "Certificate of Incorporation (COI)",                req: true,  hint: "As issued by the relevant registrar of companies" },
          { key: "doc_regExtract",label: "Business Registry Extract",                         req: true,  hint: "Must be dated within 3 months — from MCA21, Companies House, ACRA, etc." },
          { key: "doc_articles",  label: "Memorandum & Articles of Association",              req: true,  hint: "Constitutive documents / company statutes" },
          { key: "doc_licence",   label: "Operating Licence(s) — if regulated",               req: false, hint: "Payment licence, NBFC Certificate, MSB registration, etc." },
          { key: "doc_biz_poa",   label: "Proof of Registered Business Address",             req: true,  hint: "Utility bill, lease agreement, or bank statement ≤3 months old" },
          { key: "doc_ubo_id",    label: "Government-Issued ID — All BOs & Signatories",     req: true,  hint: "Passport (preferred), Aadhaar, Voter ID, Driving Licence — clear colour scan" },
          { key: "doc_ubo_poa",   label: "Proof of Residential Address — All BOs",           req: true,  hint: "Utility bill, Aadhaar, bank statement ≤3 months old" },
          { key: "doc_shareReg",  label: "Shareholder Register / Register of Members",       req: true,  hint: "Must reflect current shareholding" },
          { key: "doc_structure", label: "Corporate Ownership / Structure Chart",            req: true,  hint: "Showing all intermediate entities and % holdings to ultimate natural persons" },
          { key: "doc_authLetter",label: "Authorisation Letter / Board Resolution",          req: true,  hint: "On letterhead, listing Directors, Signatories, and their contact details — signed & dated" },
          { key: "doc_financials",label: "Audited Financial Statements (most recent FY)",   req: false, hint: "CA-certified accounts acceptable if audit is not yet complete" },
          { key: "doc_bankStmt",  label: "Business Bank Statement (3–6 months)",            req: true,  hint: "Primary operating account — unaltered PDF from bank" },
          { key: "doc_amlPolicy", label: "AML/CFT Policy Document",                         req: false, hint: "Board-approved, current version" },
          { key: "doc_walletOwn", label: "Crypto Wallet Ownership Confirmation",            req: true,  hint: "Screenshot of wallet UI + signed message from wallet private key, OR blockchain explorer printout, OR custodial statement. If no wallet, upload a blank PDF with 'N/A' stated." },
          { key: "doc_sof",       label: "Source of Funds — Business",                      req: true,  hint: "Funding agreements, VC term sheets, revenue contracts, or latest audited accounts" },
          { key: "doc_sowBO1",    label: "Source of Wealth — Beneficial Owner 1",           req: true,  hint: "Pay slips, employment contract, investment statements, property sale deed, etc." },
          { key: "doc_sowBO2",    label: "Source of Wealth — Beneficial Owner 2",           req: false, hint: "If applicable" },
        ].map(d => (
          <Field key={d.key} label={d.label} required={d.req} hint={d.hint}>
            <FileUpload value={v(d.key)} onChange={val => set(d.key, val)} />
          </Field>
        ))}
      </>
    );

    /* ── 9 DECLARATION ── */
    case 9: return (
      <>
        <SectionHead label="Step 10 / 10" title="Declaration & Certification" description="By submitting this application, you certify the accuracy of all information and consent to Stable Pay's verification and monitoring processes." compliance={["PMLA S.12","FIU-IND"]} />
        <InfoBox type="legal">
          This application constitutes a formal declaration under the Prevention of Money Laundering Act, 2002 (PMLA) and rules made thereunder. Providing false information is an offence punishable under PMLA and the Indian Penal Code / Bharatiya Nyaya Sanhita.
        </InfoBox>

        <div style={{ marginBottom: 24 }}>
          {[
            "I confirm that all information provided in this form is accurate, complete, and not misleading, to the best of my knowledge and belief.",
            "I confirm that all documents submitted are genuine, unaltered, and currently valid. I understand that submission of forged or altered documents is a criminal offence under applicable law.",
            "I acknowledge that Stable Pay is a Reporting Entity / counterparty subject to PMLA obligations and may file Suspicious Transaction Reports (STR), Currency Transaction Reports (CTR), or other regulatory reports with FIU-IND based on transactions processed through the platform.",
            "I consent to Stable Pay conducting ongoing due diligence, including sanctions screening, adverse media checks, and periodic KYB reviews, and I undertake to provide updated information upon request.",
            "I undertake to promptly notify Stable Pay of any material changes to the information provided, including changes in ownership, control, business activities, regulatory status, or sanctions exposure.",
            "I confirm that the entity is not, to my knowledge, involved in facilitating money laundering, terrorist financing, proliferation financing, or any other activity prohibited under PMLA or applicable international law.",
            "I confirm I am duly authorised to submit this application on behalf of the entity named herein, and that the Board of Directors is aware of and has approved this onboarding.",
          ].map((text, i) => (
            <Checkbox key={i} label={text}
              checked={(v("declarations")||[]).includes(i)}
              onChange={checked => {
                const cur = v("declarations")||[];
                set("declarations", checked ? [...cur, i] : cur.filter(x => x !== i));
              }}
            />
          ))}
        </div>

        <Divider label="Authorised Signatory Certification" />
        <G>
          <Field label="Full Name of Authorising Signatory" required><Input value={v("decl_name")} onChange={val => set("decl_name", val)} placeholder="Full legal name" /></Field>
          <Field label="Designation / Title" required><Input value={v("decl_title")} onChange={val => set("decl_title", val)} placeholder="e.g. Director / CEO / CFO" /></Field>
          <Field label="Signatory Email Address" required><Input type="email" value={v("decl_email")} onChange={val => set("decl_email", val)} placeholder="signatory@company.com" /></Field>
          <Field label="Date of Certification" required><Input type="date" value={v("decl_date")} onChange={val => set("decl_date", val)} /></Field>
        </G>
        <Field label="Additional Remarks" hint="Any other information the compliance team should be aware of">
          <Textarea value={v("decl_remarks")} onChange={val => set("decl_remarks", val)} placeholder="Optional — any additional context, ongoing regulatory engagements, or pending filings relevant to this application" rows={3} />
        </Field>
      </>
    );

    default: return null;
  }
}

/* ─────────────────────────────────────────────
   API HELPERS
───────────────────────────────────────────── */
const API = "/api";

function authHeaders() {
  const token = localStorage.getItem("sp_token");
  const h = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function apiCreateApp(formData = {}) {
  const r = await fetch(`${API}/applications`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ formData }) });
  if (!r.ok) throw new Error("Failed to create application");
  return r.json();
}

async function apiSaveDraft(id, formData) {
  const r = await fetch(`${API}/applications/${id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ formData }) });
  if (!r.ok) throw new Error("Failed to save draft");
  return r.json();
}

async function apiSubmitApp(id, submissionMeta) {
  const r = await fetch(`${API}/applications/${id}/submit`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ submissionMeta }) });
  if (!r.ok) throw new Error("Failed to submit application");
  return r.json();
}

async function apiSendOTP(email) {
  const r = await fetch(`${API}/applicant/send-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Failed to send OTP");
  return data;
}

async function apiVerifyOTP(email, otp) {
  const r = await fetch(`${API}/applicant/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp }) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Verification failed");
  return data;
}

async function apiResendOTP(email) {
  const r = await fetch(`${API}/applicant/resend-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Failed to resend OTP");
  return data;
}

async function apiGetMe() {
  const r = await fetch(`${API}/applicant/me`, { headers: authHeaders() });
  if (!r.ok) throw new Error("Not authenticated");
  return r.json();
}

async function apiLoadMyApp(id) {
  const r = await fetch(`${API}/applications/mine/${id}`, { headers: authHeaders() });
  if (!r.ok) throw new Error("App not found");
  return r.json();
}

async function apiUploadDoc(appId, fieldKey, file) {
  const token = localStorage.getItem("sp_token");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("fieldKey", fieldKey);
  const h = {};
  if (token) h["Authorization"] = `Bearer ${token}`;
  const r = await fetch(`${API}/documents/upload/${appId}`, { method: "POST", headers: h, body: fd });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || `Upload failed (${r.status})`);
  }
  return r.json();
}

function collectPendingUploads(data) {
  const pending = [];
  for (const [key, val] of Object.entries(data || {})) {
    if (val && typeof val === "object" && val.file instanceof File && !val.docId) {
      pending.push({ key, file: val.file, name: val.name || val.file.name });
    }
  }
  return pending;
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */
export default function App() {
  // Clear any admin token from localStorage (legacy cleanup)
  useEffect(() => { localStorage.removeItem("sp_admin_token"); }, []);

  const [user, setUser] = useState(null);
  const [userApps, setUserApps] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authStep, setAuthStep] = useState("email"); // "email" | "otp"
  const [authError, setAuthError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  const [appId, setAppId] = useState(null);
  const [refCode, setRefCode] = useState("");
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loadingApp, setLoadingApp] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [boCount, setBoCount] = useState(3);
  const [uploadStatus, setUploadStatus] = useState({ active: false, progress: 0, total: 0, label: "", error: "" });
  const contentRef = useRef();

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem("sp_token");
    if (!token) { setAuthLoading(false); return; }
    apiGetMe()
      .then(({ user: u, applications }) => {
        setUser(u);
        setUserApps(applications || []);
        // Check URL hash for direct app link
        const hash = window.location.hash;
        const match = hash.match(/#app\/([a-f0-9-]+)/i);
        if (match) loadApp(match[1]);
        setAuthLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("sp_token");
        setAuthLoading(false);
      });
  }, []);

  function loadApp(id) {
    setLoadingApp(true);
    apiLoadMyApp(id)
      .then(app => {
        setAppId(app.id);
        setData(typeof app.form_data === "string" ? JSON.parse(app.form_data) : (app.form_data || {}));
        setRefCode(app.ref_code || "");
        if (app.status !== "draft") setSubmitted(true);
        window.location.hash = `app/${app.id}`;
        setLoadingApp(false);
      })
      .catch(() => {
        setLoadingApp(false);
        alert("Application not found or access denied.");
      });
  }

  async function handleSendOTP(e) {
    e.preventDefault();
    setAuthError("");
    setOtpSending(true);
    try {
      await apiSendOTP(authEmail);
      setAuthStep("otp");
      setOtpResendTimer(60);
      const interval = setInterval(() => {
        setOtpResendTimer(t => {
          if (t <= 1) { clearInterval(interval); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (err) {
      setAuthError(err.message);
    }
    setOtpSending(false);
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setAuthError("");
    setOtpSending(true);
    try {
      const result = await apiVerifyOTP(authEmail, otpCode);
      localStorage.setItem("sp_token", result.token);
      setUser(result.user);
      const me = await apiGetMe();
      setUserApps(me.applications || []);
      const hash = window.location.hash;
      const match = hash.match(/#app\/([a-f0-9-]+)/i);
      if (match) loadApp(match[1]);
    } catch (err) {
      setAuthError(err.message);
    }
    setOtpSending(false);
  }

  async function handleResendOTP() {
    setAuthError("");
    try {
      await apiResendOTP(authEmail);
      setOtpResendTimer(60);
      const interval = setInterval(() => {
        setOtpResendTimer(t => {
          if (t <= 1) { clearInterval(interval); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (err) {
      setAuthError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem("sp_token");
    setUser(null);
    setUserApps([]);
    setAppId(null);
    setData({});
    setStep(0);
    setSubmitted(false);
    window.location.hash = "";
  }

  const set = useCallback((k, v) => setData(d => ({ ...d, [k]: v })), []);

  // Auto-save draft every 5 seconds when data changes
  const lastSavedRef = useRef(JSON.stringify({}));
  useEffect(() => {
    if (!appId || submitted) return;
    const timer = setInterval(() => {
      const current = JSON.stringify(data);
      if (current !== lastSavedRef.current && Object.keys(data).length > 0) {
        lastSavedRef.current = current;
        apiSaveDraft(appId, data).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [appId, data, submitted]);

  const goTo = (s) => { setStep(s); contentRef.current?.scrollTo({ top: 0, behavior: "smooth" }); };

  const createNewApplication = useCallback(async () => {
    try {
      setLoadingApp(true);
      const app = await apiCreateApp({});
      setAppId(app.id);
      setRefCode(app.ref_code);
      setUserApps(prev => [{ id: app.id, ref_code: app.ref_code, status: "draft", created_at: new Date().toISOString() }, ...prev]);
      window.location.hash = `app/${app.id}`;
      setLoadingApp(false);
    } catch {
      setLoadingApp(false);
      alert("Failed to create application. Please try again.");
    }
  }, []);

  const copyLink = useCallback(() => {
    const link = `${window.location.origin}${window.location.pathname}#app/${appId}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [appId]);

  // Loading state
  if (authLoading || loadingApp) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${T.bdr}`, borderTopColor: T.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ fontSize: 14, color: T.txt2 }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Not logged in — show email OTP flow
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: 24, position: "relative", overflow: "hidden" }}>
        <style>{GLOBAL_CSS}</style>
        <div className="sp-grid-bg" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div className="sp-noise" />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,103,171,0.2) 0%, transparent 70%)", top: -150, right: -100, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,103,171,0.15) 0%, transparent 70%)", bottom: -100, left: -100, filter: "blur(80px)" }} />

        <div className="sp-fade" style={{ maxWidth: 440, width: "100%", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: 32 }}>
            <img src="/TP-logo.png" alt="Stable Pay" style={{ height: 200, marginBottom: 12 }} />
          </div>

          <div style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", padding: "40px 36px", backdropFilter: "blur(10px)", boxShadow: "0 20px 50px -10px rgba(0,0,0,0.5)" }}>

            {authStep === "email" ? (
              <>
                <h1 style={{ fontSize: 20, fontWeight: 600, color: T.txt, marginBottom: 6 }}>Sign In</h1>
                <p style={{ fontSize: 13, color: T.txt3, marginBottom: 24 }}>
                  Enter your email to receive a verification code
                </p>

                {authError && (
                  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "#f87171", textAlign: "left" }}>
                    {authError}
                  </div>
                )}

                <form onSubmit={handleSendOTP} style={{ textAlign: "left" }}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 11.5, color: T.txt3, marginBottom: 5, letterSpacing: ".04em" }}>EMAIL ADDRESS</label>
                    <input
                      type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required autoFocus
                      placeholder="you@company.com"
                      style={{ width: "100%", padding: "12px 14px", background: T.bg2, border: `1px solid ${T.bdr}`, borderRadius: 8, color: T.txt, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <button type="submit" disabled={otpSending} className="sp-btn-primary" style={{
                    width: "100%", padding: "13px", borderRadius: 10, border: "none",
                    background: otpSending ? T.bg3 : T.grad, color: "#fff", fontSize: 14.5, fontWeight: 600,
                    cursor: otpSending ? "wait" : "pointer", boxShadow: `0 4px 20px ${T.blueGlow}`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    {otpSending ? "Sending..." : "Send Verification Code"}
                    {!otpSending && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M9 4L13 8L9 12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 20, fontWeight: 600, color: T.txt, marginBottom: 6 }}>Enter Code</h1>
                <p style={{ fontSize: 13, color: T.txt3, marginBottom: 6 }}>
                  We sent a 6-digit code to
                </p>
                <p style={{ fontSize: 13.5, color: T.blueL, fontWeight: 500, marginBottom: 24 }}>
                  {authEmail}
                </p>

                {authError && (
                  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "#f87171", textAlign: "left" }}>
                    {authError}
                  </div>
                )}

                <form onSubmit={handleVerifyOTP} style={{ textAlign: "left" }}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 11.5, color: T.txt3, marginBottom: 5, letterSpacing: ".04em" }}>VERIFICATION CODE</label>
                    <input
                      type="text" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required autoFocus maxLength={6} inputMode="numeric" autoComplete="one-time-code"
                      placeholder="000000"
                      style={{ width: "100%", padding: "14px", background: T.bg2, border: `1px solid ${T.bdr}`, borderRadius: 8, color: T.txt, fontSize: 24, fontWeight: 700, letterSpacing: 8, textAlign: "center", outline: "none", boxSizing: "border-box", fontFamily: "'IBM Plex Mono', monospace" }}
                    />
                  </div>

                  <button type="submit" disabled={otpSending || otpCode.length !== 6} className="sp-btn-primary" style={{
                    width: "100%", padding: "13px", borderRadius: 10, border: "none",
                    background: (otpSending || otpCode.length !== 6) ? T.bg3 : T.grad, color: "#fff", fontSize: 14.5, fontWeight: 600,
                    cursor: (otpSending || otpCode.length !== 6) ? "not-allowed" : "pointer",
                    boxShadow: otpCode.length === 6 ? `0 4px 20px ${T.blueGlow}` : "none",
                  }}>
                    {otpSending ? "Verifying..." : "Verify & Sign In"}
                  </button>
                </form>

                <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                  <button
                    onClick={() => { setAuthStep("email"); setOtpCode(""); setAuthError(""); }}
                    style={{ background: "none", border: "none", color: T.txt3, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Change email
                  </button>
                  <span style={{ color: T.bdr }}>|</span>
                  {otpResendTimer > 0 ? (
                    <span style={{ fontSize: 12.5, color: T.txt3 }}>Resend in {otpResendTimer}s</span>
                  ) : (
                    <button onClick={handleResendOTP} style={{ background: "none", border: "none", color: T.blueL, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                      Resend code
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <p style={{ fontSize: 11.5, color: T.txt3, marginTop: 24 }}>
            For any help, contact <a href="mailto:compliance@stablepay.global" style={{ color: T.blueL, textDecoration: "none" }}>compliance@stablepay.global</a>
          </p>
        </div>
      </div>
    );
  }

  // Logged in but no app selected — show dashboard
  if (!appId && !submitted) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: 24, position: "relative", overflow: "hidden" }}>
        <style>{GLOBAL_CSS}</style>
        <div className="sp-grid-bg" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div className="sp-noise" />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,103,171,0.2) 0%, transparent 70%)", top: -150, right: -100, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,103,171,0.15) 0%, transparent 70%)", bottom: -100, left: -100, filter: "blur(80px)" }} />

        <div className="sp-fade" style={{ maxWidth: 520, width: "100%", position: "relative", zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <img src="/TP-logo.png" alt="Stable Pay" style={{ height: 40 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: T.txt3 }}>{user.email}</span>
              <button onClick={logout} style={{ background: T.bg3, border: `1px solid ${T.bdr}`, borderRadius: 6, padding: "5px 12px", color: T.txt3, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
                Sign Out
              </button>
            </div>
          </div>

          {/* Card */}
          <div style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", padding: "36px 32px", backdropFilter: "blur(10px)", boxShadow: "0 20px 50px -10px rgba(0,0,0,0.5)" }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: T.txt, marginBottom: 6 }}>Your Applications</h1>
            <p style={{ fontSize: 13, color: T.txt3, marginBottom: 24 }}>
              Start a new KYB application or continue an existing one.
            </p>

            <button
              onClick={createNewApplication}
              className="sp-btn-primary"
              style={{
                width: "100%", padding: "13px", borderRadius: 10, border: "none",
                background: T.grad, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: `0 4px 20px ${T.blueGlow}`, marginBottom: 20,
              }}
            >
              Start New Application
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            {userApps.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: T.txt3, letterSpacing: ".06em", marginBottom: 10 }}>PREVIOUS APPLICATIONS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {userApps.map(app => (
                    <div
                      key={app.id}
                      onClick={() => { if (app.status === "draft") loadApp(app.id); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px", background: T.bg2, borderRadius: 10,
                        border: `1px solid ${T.bdr}`, cursor: app.status === "draft" ? "pointer" : "default",
                        transition: "border-color .2s",
                      }}
                      onMouseEnter={e => { if (app.status === "draft") e.currentTarget.style.borderColor = T.bdrFocus; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.bdr; }}
                    >
                      <div>
                        <div style={{ fontSize: 13, color: T.txt, fontWeight: 500 }}>
                          {app.company_name || app.ref_code || "Untitled"}
                        </div>
                        <div style={{ fontSize: 11, color: T.txt3, marginTop: 3 }}>
                          {new Date(app.updated_at || app.created_at).toLocaleDateString()} &middot; {app.ref_code}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 10.5, padding: "3px 10px", borderRadius: 20, fontWeight: 500, letterSpacing: ".03em",
                        ...(app.status === "draft"
                          ? { background: "rgba(102,103,171,0.15)", color: T.blueL }
                          : app.status === "pending_review"
                          ? { background: "rgba(234,179,8,0.15)", color: "#eab308" }
                          : app.status === "approved"
                          ? { background: "rgba(34,197,94,0.15)", color: "#22c55e" }
                          : { background: "rgba(239,68,68,0.15)", color: "#ef4444" }),
                      }}>
                        {app.status === "draft" ? "Draft" : app.status === "pending_review" ? "Under Review" : app.status === "approved" ? "Approved" : app.status === "rejected" ? "Rejected" : app.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p style={{ fontSize: 11.5, color: T.txt3, marginTop: 24, textAlign: "center" }}>
            For any help, contact <a href="mailto:compliance@stablepay.global" style={{ color: T.blueL, textDecoration: "none" }}>compliance@stablepay.global</a>
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const ref = refCode || `SP-OTC-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    return (
      <div style={{ minHeight: "100vh", background: T.bg0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: 24, position: "relative", overflow: "hidden" }}>
        <style>{GLOBAL_CSS}</style>
        <div className="sp-grid-bg" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div className="sp-noise" />
        {/* Glow orbs */}
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,103,171,0.2) 0%, transparent 70%)", top: -150, right: -100, filter: "blur(80px)", animation: "float 25s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,103,171,0.15) 0%, transparent 70%)", bottom: -100, left: -100, filter: "blur(80px)", animation: "float 25s ease-in-out infinite", animationDelay: "-8s" }} />
        <div className="sp-fade" style={{ maxWidth: 520, width: "100%", textAlign: "center", padding: "48px 40px", background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", position: "relative", zIndex: 1, boxShadow: "0 20px 50px -10px rgba(0,0,0,0.5), 0 0 100px -20px rgba(102,103,171,0.2)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenG, border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 28 }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.txt, marginBottom: 10, letterSpacing: "-.02em" }}>Application Submitted</h1>
          <p style={{ color: T.txt2, fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            Your KYB application has been received. Our compliance team will review it within <strong style={{ color: T.txt }}>2–5 business days</strong> and contact you if additional information is required.
          </p>
          <div style={{ background: T.bg0, border: `1px solid ${T.bdrA}`, borderRadius: 10, padding: "16px 20px", textAlign: "left", marginBottom: 24 }}>
            {[
              ["Application Reference", ref, true],
              ["Submitted Email", data.email || "—", false],
              ["Entity Name", data.co_name || "—", false],
              ["Review Timeline", "2–5 business days", false],
            ].map(([k, v, mono]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.bdr}` }}>
                <span style={{ fontSize: 11.5, color: T.txt3 }}>{k}</span>
                <span style={{ fontSize: mono ? 12 : 13, fontFamily: mono ? "'IBM Plex Mono', monospace" : "'Inter', system-ui, sans-serif", color: mono ? T.blueL : T.txt, fontWeight: mono ? 600 : 400 }}>{v}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: T.txt3 }}>Please notify your Stable Pay point of contact that your KYB submission is complete.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg0, display: "flex", fontFamily: "'Inter', system-ui, sans-serif", color: T.txt, position: "relative" }}>
      <style>{GLOBAL_CSS}</style>
      <div className="sp-noise" />

      {/* Sidebar */}
      <div style={{ position: "sticky", top: 0, height: "100vh", flexShrink: 0, zIndex: 10 }}>
        <Sidebar step={step} setStep={goTo} />
      </div>

      {/* Main content */}
      <div ref={contentRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Background effects */}
        <div className="sp-grid-bg" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "fixed", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(102,103,171,0.12) 0%, transparent 70%)", top: -200, right: -100, filter: "blur(80px)", animation: "float 25s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "fixed", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(136,137,192,0.08) 0%, transparent 70%)", bottom: "20%", left: 200, filter: "blur(80px)", animation: "float 25s ease-in-out infinite", animationDelay: "-12s", pointerEvents: "none", zIndex: 0 }} />

        {/* Top bar */}
        <div className="sp-topbar" style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(10,10,15,0.85)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: T.bdrA }}>/</span>
            <span style={{ fontSize: 12.5, color: T.txt2, fontWeight: 500 }}>{STEPS[step].label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Copy link */}
            {appId && (
              <button onClick={copyLink} style={{ fontSize: 11, color: linkCopied ? T.green : T.blueL, background: T.bg3, border: `1px solid ${T.bdr}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M11 5V3a2 2 0 00-2-2H3a2 2 0 00-2 2v6a2 2 0 002 2h2" stroke="currentColor" strokeWidth="1.3"/></svg>
                {linkCopied ? "Copied!" : "Copy link"}
              </button>
            )}
            {user && <span style={{ fontSize: 11, color: T.txt3 }}>{user.email}</span>}
            <button onClick={logout} style={{ fontSize: 11, color: T.txt3, background: T.bg3, border: `1px solid ${T.bdr}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile step nav */}
        <div className="sp-mobile-nav" style={{ display: "none", padding: "10px 16px", gap: 6, overflowX: "auto", background: T.bg1, borderBottom: `1px solid ${T.bdr}` }}>
          {STEPS.map(s => (
            <button key={s.id} onClick={() => goTo(s.id)} style={{
              padding: "6px 12px", borderRadius: 20, border: `1px solid ${s.id === step ? T.blue : T.bdr}`,
              background: s.id === step ? T.blueGlowS : "transparent", color: s.id === step ? T.blueL : T.txt3,
              fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}>{s.label}</button>
          ))}
        </div>

        {/* Form body */}
        <div className="sp-form-body" style={{ flex: 1, padding: "40px 40px 40px", maxWidth: 800, width: "100%", position: "relative", zIndex: 1 }}>
          <div className="sp-fade" key={step}>
            {renderStep(step, data, set, boCount, setBoCount)}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="sp-bottombar" style={{
          position: "sticky", bottom: 0, zIndex: 50,
          background: "rgba(10,10,15,0.88)", backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <button
            onClick={() => goTo(Math.max(step - 1, 0))}
            disabled={step === 0}
            style={{
              padding: "10px 24px", borderRadius: 8,
              border: `1.5px solid ${step === 0 ? T.bdr : T.bdrA}`,
              background: "transparent", color: step === 0 ? T.txt3 : T.txt2,
              fontSize: 13.5, fontWeight: 500, cursor: step === 0 ? "not-allowed" : "pointer",
              fontFamily: "'Inter', system-ui, sans-serif", transition: "all .16s", display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Previous
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} onClick={() => goTo(i)} style={{
                width: i === step ? 20 : 6, height: 6, borderRadius: 3,
                background: i < step ? T.blue : i === step ? T.grad : T.bdrA,
                cursor: "pointer", transition: "all .28s", boxShadow: i === step ? `0 0 8px ${T.blue}` : "none",
              }} />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => goTo(step + 1)}
              className="sp-btn-primary"
              style={{
                padding: "10px 28px", borderRadius: 8, border: "none",
                background: T.grad, color: "#fff",
                fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif", transition: "all .2s",
                boxShadow: "0 4px 16px rgba(102,103,171,.3)",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              Save & Continue
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          ) : (
            <button
              disabled={uploadStatus.active}
              onClick={async () => {
                const meta = {
                  submittedAt: new Date().toISOString(),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  userAgent: navigator.userAgent,
                  screenRes: `${screen.width}x${screen.height}`,
                  language: navigator.language,
                  platform: navigator.platform,
                  ip: null,
                  geo: { lat: null, lng: null, accuracy: null, capturedAt: null, error: null },
                };
                try { const r = await fetch("https://api.ipify.org?format=json"); const j = await r.json(); meta.ip = j.ip; } catch {}
                try {
                  const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 0 }));
                  meta.geo = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, capturedAt: new Date().toISOString() };
                } catch (e) { meta.geo = { error: e.message || "Denied" }; }

                let workingData = { ...data, _submissionMeta: meta };
                if (appId) {
                  const pending = collectPendingUploads(workingData);
                  if (pending.length > 0) {
                    setUploadStatus({ active: true, progress: 0, total: pending.length, label: pending[0].name, error: "" });
                    let done = 0;
                    for (const p of pending) {
                      setUploadStatus(s => ({ ...s, progress: done, label: p.name }));
                      try {
                        const uploaded = await apiUploadDoc(appId, p.key, p.file);
                        workingData = { ...workingData, [p.key]: { name: p.name, docId: uploaded.id, uploaded: true, size: uploaded.size_bytes } };
                        done++;
                      } catch (err) {
                        setUploadStatus({ active: false, progress: done, total: pending.length, label: "", error: `Failed to upload "${p.name}": ${err.message}` });
                        return;
                      }
                    }
                    setUploadStatus({ active: false, progress: done, total: pending.length, label: "", error: "" });
                    setData(workingData);
                  }

                  try {
                    await apiSaveDraft(appId, workingData);
                    await apiSubmitApp(appId, meta);
                  } catch (err) {
                    setUploadStatus(s => ({ ...s, error: `Submit failed: ${err.message}` }));
                    return;
                  }
                }
                set("_submissionMeta", meta);
                setSubmitted(true);
              }}
              className="sp-btn-primary"
              style={{
                padding: "10px 28px", borderRadius: 8, border: "none",
                background: uploadStatus.active ? "#6b6b6b" : "linear-gradient(135deg, #00C896, #009B72)",
                color: "#fff", fontSize: 13.5, fontWeight: 600,
                cursor: uploadStatus.active ? "not-allowed" : "pointer",
                fontFamily: "'Inter', system-ui, sans-serif", transition: "all .2s",
                boxShadow: uploadStatus.active ? "none" : "0 4px 16px rgba(0,200,150,.3)",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {uploadStatus.active ? (
                <>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                  Uploading {uploadStatus.progress + 1} / {uploadStatus.total}…
                </>
              ) : (
                <>
                  Submit Application
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7H12M8 3L12 7L8 11" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </>
              )}
            </button>
          )}
        </div>
        {uploadStatus.error && (
          <div style={{ margin: "0 16px 12px", padding: "10px 14px", borderRadius: 8, background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.3)", color: "#ff8888", fontSize: 12 }}>
            {uploadStatus.error}
          </div>
        )}
      </div>

      <AIAssistant currentStep={step} />
    </div>
  );
}
