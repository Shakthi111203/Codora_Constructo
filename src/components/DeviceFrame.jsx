import React from "react";

export default function DeviceFrame({ appName, osMode, children }) {
  if (osMode === "windows") {
    return (
      <div style={{
        borderRadius: 8, overflow: "hidden", border: "1px solid #0078d4",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)", background: "white",
        display: "flex", flexDirection: "column", minHeight: 480,
      }}>
        {/* Title bar */}
        <div style={{ height: 32, background: "#202020", display: "flex", alignItems: "center", flexShrink: 0, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", flex: 1 }}>
            <div style={{ width: 14, height: 14, background: "#0078d4", borderRadius: 3 }} />
            <span style={{ fontSize: 12, color: "white", fontFamily: "'Segoe UI', sans-serif", userSelect: "none" }}>{appName}</span>
          </div>
          <div style={{ display: "flex", height: "100%" }}>
            {["─", "□", "✕"].map((b, i) => (
              <div key={i} style={{ width: 46, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: i === 2 ? 11 : 13, color: "#ccc", fontFamily: "'Segoe UI', sans-serif" }}>{b}</div>
            ))}
          </div>
        </div>
        {/* Address bar */}
        <div style={{ height: 36, background: "#f3f3f3", borderBottom: "1px solid #d0d0d0", display: "flex", alignItems: "center", padding: "0 10px", gap: 4, flexShrink: 0 }}>
          {["←", "→", "↻"].map((ic, i) => (
            <div key={i} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#555" }}>{ic}</div>
          ))}
          <div style={{ flex: 1, height: 26, background: "white", borderRadius: 4, border: "1px solid #0078d4", display: "flex", alignItems: "center", padding: "0 10px", fontSize: 11, color: "#333", fontFamily: "monospace" }}>
            localhost:3000/{appName?.toLowerCase().replace(/\s+/g, "-")}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </div>
    );
  }

  // Mac frame
  return (
    <div style={{
      borderRadius: 12, overflow: "hidden", border: "1px solid #c0c0c0",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)", background: "white",
      display: "flex", flexDirection: "column", minHeight: 480,
    }}>
      {/* Title bar */}
      <div style={{
        height: 38, background: "linear-gradient(to bottom,#ebebeb,#d8d8d8)",
        borderBottom: "1px solid #b8b8b8", display: "flex", alignItems: "center",
        padding: "0 14px", gap: 8, flexShrink: 0, position: "relative",
      }}>
        <div style={{ display: "flex", gap: 7 }}>
          {[["#ff5f57","#e0443e"],["#febc2e","#d4a017"],["#28c840","#1aab29"]].map(([bg, border], i) => (
            <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: bg, border: `0.5px solid ${border}` }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
          {["‹", "›"].map((a, i) => (
            <div key={i} style={{ width: 22, height: 20, borderRadius: 4, background: "#e2e2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#999", border: "0.5px solid #ccc" }}>{a}</div>
          ))}
        </div>
        <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: 12, fontWeight: 500, color: "#4a4a4a", fontFamily: "-apple-system,sans-serif", userSelect: "none" }}>{appName}</span>
      </div>
      {/* Address bar */}
      <div style={{ height: 30, background: "#f5f5f5", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", padding: "0 12px", flexShrink: 0 }}>
        <div style={{ flex: 1, height: 20, background: "white", borderRadius: 5, border: "0.5px solid #c8c8c8", display: "flex", alignItems: "center", padding: "0 10px", fontSize: 10, color: "#888", fontFamily: "monospace" }}>
          localhost:3000/{appName?.toLowerCase().replace(/\s+/g, "-")}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      <div style={{ height: 20, background: "linear-gradient(to bottom,#ebebeb,#dcdcdc)", borderTop: "1px solid #c0c0c0", display: "flex", alignItems: "center", padding: "0 10px", fontSize: 10, color: "#999", flexShrink: 0 }}>Done</div>
    </div>
  );
}