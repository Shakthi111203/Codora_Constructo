import React, { useState, useRef, useEffect } from "react";

/*
  AppDNA — modal overlay for URL or screenshot analysis
  Props:
    onDNA(dna)  — called with extracted DNA
    onClose()   — called to close the modal
*/
export default function AppDNA({ onDNA, onClose }) {
  const [mode,      setMode]      = useState("url");
  const [url,       setUrl]       = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const fileRef                   = useRef(null);

  const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const analyze = async () => {
    setError("");
    setLoading(true);
    try {
      let body = {};
      if (mode === "url") {
        if (!url.trim()) throw new Error("Please enter a URL.");
        body = { url: url.trim() };
      } else {
        if (!imageFile) throw new Error("Please upload a screenshot.");
        const imageBase64 = await toBase64(imageFile);
        body = { imageBase64, mimeType: imageFile.type };
      }

      const res  = await fetch(`${BASE}/api/analyze`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onDNA(data.dna);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    /* ── Backdrop ── */
    <div
      onClick={onClose}
      style={{
        position:        "fixed",
        inset:           0,
        background:      "rgba(0,0,0,0.5)",
        backdropFilter:  "blur(4px)",
        zIndex:          1000,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         20,
      }}
    >
      {/* ── Modal ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   "white",
          borderRadius: 20,
          width:        "100%",
          maxWidth:     480,
          boxShadow:    "0 24px 64px rgba(0,0,0,0.2)",
          overflow:     "hidden",
          animation:    "modalIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{
          background:  "linear-gradient(135deg, #4f46e5, #7c3aed)",
          padding:     "20px 24px",
          display:     "flex",
          alignItems:  "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>🧬</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "white" }}>App DNA</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                Analyze any app and clone its structure
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border:     "none",
              cursor:     "pointer",
              width:      32,
              height:     32,
              borderRadius: "50%",
              color:      "white",
              fontSize:   18,
              display:    "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 4, marginBottom: 20, gap: 4 }}>
            {["url", "screenshot"].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex:        1,
                  padding:     "8px 0",
                  borderRadius: 7,
                  border:      "none",
                  cursor:      "pointer",
                  fontSize:    13,
                  fontWeight:  600,
                  fontFamily:  "'DM Sans', sans-serif",
                  background:  mode === m ? "white" : "transparent",
                  color:       mode === m ? "#4f46e5" : "#6b7280",
                  boxShadow:   mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  transition:  "all 0.15s",
                }}
              >
                {m === "url" ? "🔗 Paste URL" : "🖼️ Upload Screenshot"}
              </button>
            ))}
          </div>

          {/* URL input */}
          {mode === "url" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                App or Website URL
              </label>
              <input
                value={url}
                onChange={e => { setUrl(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && analyze()}
                placeholder="https://swiggy.com"
                autoFocus
                style={{
                  width:       "100%",
                  padding:     "10px 14px",
                  borderRadius: 10,
                  border:      "1.5px solid #e5e7eb",
                  fontSize:    14,
                  fontFamily:  "'DM Sans', sans-serif",
                  outline:     "none",
                  boxSizing:   "border-box",
                  transition:  "border 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "#4f46e5"}
                onBlur={e  => e.target.style.borderColor = "#e5e7eb"}
              />
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                Try: swiggy.com, duolingo.com, airbnb.com, netflix.com
              </p>
            </div>
          )}

          {/* Screenshot upload */}
          {mode === "screenshot" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                App Screenshot
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border:       "2px dashed #c4b5fd",
                  borderRadius: 12,
                  padding:      "20px",
                  textAlign:    "center",
                  cursor:       "pointer",
                  background:   preview ? "#faf5ff" : "#fdfcff",
                  transition:   "all 0.2s",
                  minHeight:    160,
                  display:      "flex",
                  flexDirection:"column",
                  alignItems:   "center",
                  justifyContent:"center",
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    style={{ maxHeight: 180, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }}
                  />
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
                    <div style={{ fontSize: 13, color: "#7c3aed", fontWeight: 600 }}>Click to upload screenshot</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>PNG, JPG, WEBP supported</div>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </div>
              {preview && (
                <button
                  onClick={() => { setPreview(null); setImageFile(null); fileRef.current.value = ""; }}
                  style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", marginTop: 6 }}
                >
                  ✕ Remove image
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              fontSize:    12,
              color:       "#ef4444",
              background:  "#fef2f2",
              border:      "1px solid #fecaca",
              borderRadius: 8,
              padding:     "8px 12px",
              marginBottom: 16,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={analyze}
            disabled={loading}
            style={{
              width:        "100%",
              padding:      "12px 0",
              borderRadius: 12,
              border:       "none",
              cursor:       loading ? "not-allowed" : "pointer",
              fontFamily:   "'DM Sans', sans-serif",
              fontSize:     14,
              fontWeight:   700,
              color:        "white",
              background:   loading
                ? "#a5b4fc"
                : "linear-gradient(135deg, #4f46e5, #7c3aed)",
              boxShadow:    loading ? "none" : "0 4px 14px rgba(79,70,229,0.4)",
              transition:   "all 0.2s",
              display:      "flex",
              alignItems:   "center",
              justifyContent:"center",
              gap:          10,
            }}
          >
            {loading ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 18 }}>⟳</span>
                Extracting DNA…
              </>
            ) : (
              <>🧬 Extract & Build</>
            )}
          </button>

          <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 12 }}>
            Extracts pages, colors, style and jumps straight to Step 2
          </p>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}