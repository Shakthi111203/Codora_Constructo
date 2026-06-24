import React, { useState, useEffect, useRef } from "react";

export default function VoiceMic({ onTranscript, onInterim, disabled }) {
  const [status,    setStatus] = useState("idle");
  const [error,     setError]  = useState("");
  const accumulatedRef         = useRef("");
  const recognitionRef         = useRef(null);
  const silenceTimerRef        = useRef(null);  // starts only after speech stops

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const startSilenceTimer = (recognition) => {
    clearSilenceTimer();
    // ✅ Only starts counting AFTER you go quiet
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current._shouldKeepListening = false;
      recognition.stop();
    }, 5000);
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("unsupported");
      return;
    }

    const recognition           = new SpeechRecognition();
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.lang            = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
      setError("");
      // Start silence timer immediately — resets every time speech is detected
      startSilenceTimer(recognition);
    };

    recognition.onresult = (e) => {
      let interim = "";
      let final   = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }

      // ✅ User is speaking — reset the silence timer
      if (interim || final) {
        startSilenceTimer(recognition);
      }

      if (final) {
        accumulatedRef.current = accumulatedRef.current
          ? accumulatedRef.current + " " + final.trim()
          : final.trim();
      }

      const running = interim
        ? (accumulatedRef.current ? accumulatedRef.current + " " + interim : interim)
        : accumulatedRef.current;

      if (running) onTranscript(running);
      if (onInterim) onInterim("");
    };

    recognition.onerror = (e) => {
      clearSilenceTimer();
      if (e.error !== "no-speech") {
        setError(
          e.error === "not-allowed"
            ? "Microphone access denied."
            : `Error: ${e.error}`
        );
      }
      setStatus(accumulatedRef.current ? "done" : "idle");
    };

    recognition.onend = () => {
      clearSilenceTimer();
      if (recognitionRef.current?._shouldKeepListening) {
        try { recognition.start(); } catch { /* ignore */ }
      } else {
        setStatus(accumulatedRef.current ? "done" : "idle");
      }
    };

    recognitionRef.current = recognition;
    recognitionRef.current._shouldKeepListening = false;

    return () => {
      clearSilenceTimer();
      recognitionRef.current._shouldKeepListening = false;
      recognition.abort();
    };
  }, []);

  const toggle = () => {
    if (status === "listening") {
      clearSilenceTimer();
      recognitionRef.current._shouldKeepListening = false;
      recognitionRef.current?.stop();
      setStatus(accumulatedRef.current ? "done" : "idle");
      return;
    }
    setError("");
    recognitionRef.current._shouldKeepListening = false;
    try {
      recognitionRef.current?.start();
    } catch { /* already started */ }
  };

  if (status === "unsupported") {
    return (
      <span style={{ fontSize: 11, color: "#9ca3af" }}>Mic not supported</span>
    );
  }

  const isListening = status === "listening";
  const isDone      = status === "done";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <button
        onClick={toggle}
        disabled={disabled}
        title={isListening ? "Click to stop" : isDone ? "Click to continue recording" : "Click to speak"}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.2s",
          background: isListening
            ? "linear-gradient(135deg, #ef4444, #dc2626)"
            : isDone
            ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
            : "linear-gradient(135deg, #4f46e5, #7c3aed)",
          boxShadow: isListening
            ? "0 0 0 6px rgba(239,68,68,0.25), 0 2px 8px rgba(239,68,68,0.4)"
            : isDone
            ? "0 0 0 4px rgba(124,58,237,0.2), 0 2px 8px rgba(124,58,237,0.35)"
            : "0 2px 8px rgba(79,70,229,0.35)",
          animation: isListening ? "micPulse 1.2s ease-in-out infinite" : "none",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="9" y="2" width="6" height="11" rx="3" fill="white"/>
          <path d="M5 11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11"
            stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="22" x2="16" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {isListening && (
        <span style={{ fontSize: 10, fontWeight: 600, color: "#ef4444", letterSpacing: "0.05em" }}>
          LISTENING…
        </span>
      )}

      {error && (
        <span style={{ fontSize: 10, color: "#ef4444", maxWidth: 120, textAlign: "center", lineHeight: 1.3 }}>
          {error}
        </span>
      )}

      <style>{`
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(239,68,68,0.2), 0 2px 8px rgba(239,68,68,0.3); }
          50%       { box-shadow: 0 0 0 10px rgba(239,68,68,0.08), 0 2px 12px rgba(239,68,68,0.4); }
        }
      `}</style>
    </div>
  );
}