// src/components/DarkGeneratingLoader.jsx

import React from "react";

/**
 * DarkGeneratingLoader
 *
 * Full-bleed dark overlay shown while pages are being generated.
 *
 * Props:
 *   appName        {string}   – displayed as "Generating <appName>…"
 *   pages          {string[]} – all page names (for the status chips)
 *   generatingPages{string[]} – pages currently / previously being generated
 *   generatedFiles {object}   – map of page → code (used to mark chips ✓)
 */
export default function DarkGeneratingLoader({
  appName,
  pages = [],
  generatingPages = [],
  generatedFiles = {},
}) {
  const currentPage = generatingPages[generatingPages.length - 1] || "";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0d0d14",
        backgroundImage:
          "linear-gradient(rgba(79,70,229,0.07) 1px,transparent 1px)," +
          "linear-gradient(90deg,rgba(79,70,229,0.07) 1px,transparent 1px)",
        backgroundSize: "36px 36px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        fontFamily: "'DM Sans',sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes dgl-spin     { to { transform: rotate(360deg); } }
        @keyframes dgl-spin-rev { to { transform: rotate(-360deg); } }
        @keyframes dgl-pulse    { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(0.85);opacity:0.6} }
        @keyframes dgl-bar      { 0%{width:0%;margin-left:0%} 45%{width:75%;margin-left:0%} 55%{width:75%;margin-left:0%} 100%{width:0%;margin-left:100%} }
        @keyframes dgl-dot      { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes dgl-chip     { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Triple-ring spinner */}
      <div style={{ position: "relative", width: 96, height: 96 }}>
        {[
          { inset: 0,  borderTop:    "1.5px solid #4f46e5", dur: "2s",   rev: false },
          { inset: 10, borderRight:  "1.5px solid #7c3aed",
                       borderBottom: "1.5px solid #7c3aed", dur: "1.5s", rev: true  },
          { inset: 22, borderLeft:   "1.5px solid #a78bfa", dur: "1s",   rev: false },
        ].map((r, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: r.inset,
              borderRadius: "50%",
              border: "1.5px solid transparent",
              borderTop:    r.borderTop,
              borderRight:  r.borderRight,
              borderBottom: r.borderBottom,
              borderLeft:   r.borderLeft,
              animation: `${r.rev ? "dgl-spin-rev" : "dgl-spin"} ${r.dur} linear infinite`,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 32,
            borderRadius: "50%",
            background: "rgba(79,70,229,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            animation: "dgl-pulse 2s ease-in-out infinite",
          }}
        >
          ⚡
        </div>
      </div>

      {/* Labels */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#c7c7f4",
            letterSpacing: "-0.2px",
          }}
        >
          Generating {appName || "your app"}…
        </div>
        {currentPage && (
          <div
            style={{
              fontSize: 12,
              color: "#5b5b8a",
              marginTop: 4,
              fontFamily: "'Fira Code',monospace",
            }}
          >
            {`buildPage("${currentPage}")`}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: 260,
          height: 3,
          background: "rgba(79,70,229,0.15)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 99,
            background: "linear-gradient(90deg,#4f46e5,#7c3aed,#a78bfa)",
            animation: "dgl-bar 3s ease-in-out infinite",
          }}
        />
      </div>

      {/* Page chips */}
      {pages.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 400,
          }}
        >
          {pages.map((p, i) => {
            const isDone   = !!generatedFiles[p];
            const isActive = currentPage === p && !isDone;
            return (
              <span
                key={p}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 99,
                  fontFamily: "'Fira Code',monospace",
                  border: isDone
                    ? "1px solid rgba(34,197,94,0.35)"
                    : isActive
                    ? "1px solid #7c3aed"
                    : "1px solid rgba(79,70,229,0.2)",
                  background: isDone
                    ? "rgba(34,197,94,0.08)"
                    : isActive
                    ? "rgba(124,58,237,0.2)"
                    : "rgba(79,70,229,0.07)",
                  color: isDone
                    ? "#4ade80"
                    : isActive
                    ? "#c4b5fd"
                    : "#555580",
                  boxShadow: isActive ? "0 0 12px rgba(124,58,237,0.4)" : "none",
                  transition: "all 0.3s ease",
                  animation: `dgl-chip 0.3s ease ${i * 0.05}s both`,
                }}
              >
                {isDone ? `✓ ${p}` : p}
              </span>
            );
          })}
        </div>
      )}

      {/* Bouncing dots */}
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#4f46e5",
              animation: `dgl-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}