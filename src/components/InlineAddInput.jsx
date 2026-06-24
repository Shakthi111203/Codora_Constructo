import React, { useState, useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

export default function InlineAddInput({ placeholder, onConfirm, onCancel, color }) {
  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const confirm = () => {
    if (val.trim()) { onConfirm(val.trim()); setVal(""); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") confirm();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        style={{
          flex: 1, fontSize: 12, padding: "6px 10px", borderRadius: 6,
          border: `1.5px solid ${color}55`, background: "white",
          color: "#111827", outline: "none", fontFamily: "'DM Sans', sans-serif",
        }}
      />
      <button
        onClick={confirm}
        disabled={!val.trim()}
        style={{
          width: 26, height: 26, borderRadius: 6, border: "none",
          background: val.trim() ? color : "#e5e7eb",
          color: "white", cursor: val.trim() ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <Check size={12} />
      </button>
      <button
        onClick={onCancel}
        style={{
          width: 26, height: 26, borderRadius: 6, border: "none",
          background: "#f3f4f6", color: "#6b7280", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
}