// src/components/LoadingScreen.jsx
import { useEffect, useRef, useState } from "react";

const STEPS = [
  "Dreaming up your app…",
  "Teaching the pixels where to go…",
  "Convincing {page} to look good…",
  "Mixing your brand into the sauce…",
  "Snapping sections into place…",
  "Polishing the last pixels…",
];

const SUBS = [
  "☕ brewing ideas…",
  "🧠 thinking really hard…",
  "🎨 stealing from good design…",
  "✂️ cutting the fluff…",
  "🔩 bolting things together…",
  "🚀 almost there…",
];

export default function LoadingScreen({ appName, pages = [], currentPage, donePages = [] }) {
  const [subIdx, setSubIdx] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setSubIdx(i => (i + 1) % SUBS.length), 900);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    let raf;
    const pts = [];
    const resize = () => {
      cvs.width = cvs.offsetWidth;
      cvs.height = cvs.offsetHeight;
    };
    resize();
    for (let i = 0; i < 40; i++)
      pts.push({ x: Math.random() * cvs.width, y: Math.random() * cvs.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5, a: Math.random() });
    const draw = () => {
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = cvs.width; if (p.x > cvs.width) p.x = 0;
        if (p.y < 0) p.y = cvs.height; if (p.y > cvs.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.a * 0.5})`; ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 90) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - d / 90)})`; ctx.lineWidth = 0.5; ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const mainLabel = currentPage
    ? `Building ${currentPage}…`
    : `Wiring up ${appName || "your app"}…`;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0d0d14", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", overflow: "hidden",
    }}>
      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(79,70,229,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(79,70,229,0.07) 1px,transparent 1px)",
        backgroundSize: "36px 36px",
      }} />
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, #0d0d14 90%)" }} />
      {/* Particles */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24, filter: "drop-shadow(0 0 12px rgba(99,102,241,0.7))" }}>💻🛠️</span>
          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: "#e0e0ff", letterSpacing: "-0.3px" }}>
            Codora Constructo
          </span>
        </div>

        {/* Spinner */}
        <div style={{ position: "relative", width: 96, height: 96 }}>
          {[
            { inset: 0,  border: "1.5px solid #4f46e5", borderTop: "1.5px solid transparent", dur: "2s",   dir: "normal" },
            { inset: 10, border: "1.5px solid transparent", borderRight: "1.5px solid #7c3aed", borderBottom: "1.5px solid #7c3aed", dur: "1.5s", dir: "reverse" },
            { inset: 22, border: "1.5px solid #a78bfa", borderLeft: "1.5px solid transparent", borderBottom: "1.5px solid transparent", dur: "1s", dir: "normal" },
          ].map((r, i) => (
            <div key={i} style={{
              position: "absolute", inset: r.inset, borderRadius: "50%",
              border: r.border, borderTop: r.borderTop, borderRight: r.borderRight,
              borderBottom: r.borderBottom, borderLeft: r.borderLeft,
              animation: `spin ${r.dur} linear infinite ${r.dir === "reverse" ? "reverse" : ""}`,
            }} />
          ))}
          <div style={{
            position: "absolute", inset: 32, borderRadius: "50%",
            background: "rgba(79,70,229,0.18)", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 16,
            animation: "pulse 2s ease-in-out infinite",
          }}>⚡</div>
        </div>

        {/* Status */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#c7c7f4", letterSpacing: "-0.2px" }}>{mainLabel}</div>
          <div style={{ fontSize: 12, color: "#5b5b8a", marginTop: 4, fontFamily: "'Fira Code',monospace" }}>{SUBS[subIdx]}</div>
        </div>

        {/* Progress bar */}
        <div style={{ width: 260, height: 3, background: "rgba(79,70,229,0.15)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: "linear-gradient(90deg,#4f46e5,#7c3aed,#a78bfa)",
            animation: "barSweep 3s ease-in-out infinite",
          }} />
        </div>

        {/* Page chips */}
        {pages.length > 0 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", maxWidth: 360 }}>
            {pages.map(p => {
              const isDone   = donePages.includes(p);
              const isActive = p === currentPage;
              return (
                <span key={p} style={{
                  fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
                  fontFamily: "'Fira Code',monospace",
                  border: isDone ? "1px solid rgba(34,197,94,0.35)" : isActive ? "1px solid #7c3aed" : "1px solid rgba(79,70,229,0.2)",
                  background: isDone ? "rgba(34,197,94,0.08)" : isActive ? "rgba(124,58,237,0.2)" : "rgba(79,70,229,0.07)",
                  color: isDone ? "#4ade80" : isActive ? "#c4b5fd" : "#4040606",
                  boxShadow: isActive ? "0 0 12px rgba(124,58,237,0.4)" : "none",
                  transition: "all 0.3s ease",
                }}>
                  {isDone ? `✓ ${p}` : p}
                </span>
              );
            })}
          </div>
        )}

        {/* Dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%", background: "#4f46e5",
              animation: `dotBlink 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(0.85);opacity:0.6} }
        @keyframes barSweep { 0%{width:0%;margin-left:0%} 45%{width:75%;margin-left:0%} 55%{width:75%;margin-left:0%} 100%{width:0%;margin-left:100%} }
        @keyframes dotBlink { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
      `}</style>
    </div>
  );
}