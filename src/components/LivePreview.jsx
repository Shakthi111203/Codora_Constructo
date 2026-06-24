import React, { useState, useEffect, useRef } from "react";
import * as Babel from "@babel/standalone";

/* ── Shimmer skeleton shown while generating ── */
export function PreviewSkeleton({ color = "#4f46e5", pageName = "", appName = "" }) {
  return (
    <div style={{
      height: "100%", minHeight: 400,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#f8f9ff", gap: 20, padding: 32,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @keyframes sk-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes sk-spin-rev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes sk-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(0.88); }
        }
        @keyframes sk-bar {
          0%   { width: 0%;   margin-left: 0%; }
          45%  { width: 70%;  margin-left: 0%; }
          55%  { width: 70%;  margin-left: 0%; }
          100% { width: 0%;   margin-left: 100%; }
        }
        @keyframes sk-dot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes sk-shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position:  500px 0; }
        }
        .sk-shimmer {
          background: linear-gradient(90deg, #ecedf8 25%, #ddddf0 50%, #ecedf8 75%);
          background-size: 500px 100%;
          animation: sk-shimmer 1.5s infinite;
          border-radius: 6px;
        }
      `}</style>

      {/* Dual ring spinner */}
      <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "2px solid #e8e8f8",
          borderTopColor: color,
          animation: "sk-spin 1s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: 10, borderRadius: "50%",
          border: "1.5px solid #f0f0fa",
          borderRightColor: "#7c3aed",
          animation: "sk-spin-rev 1.4s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: 22, borderRadius: "50%",
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14,
          animation: "sk-pulse 2s ease-in-out infinite",
        }}>⚡</div>
      </div>

      {/* Labels */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
          {appName ? `Building ${appName}…` : "Generating page…"}
        </div>
        {pageName && (
          <div style={{
            fontSize: 11, color: "#9ca3af", marginTop: 4,
            fontFamily: "'Fira Code', monospace",
          }}>
            {`buildPage("${pageName}")`}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        width: 200, height: 2,
        background: `${color}18`,
        borderRadius: 99, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 99,
          background: `linear-gradient(90deg, ${color}, #7c3aed)`,
          animation: "sk-bar 2.5s ease-in-out infinite",
        }} />
      </div>

      {/* Shimmer content preview */}
      <div style={{
        width: "100%", maxWidth: 320,
        display: "flex", flexDirection: "column", gap: 8,
        opacity: 0.6,
      }}>
        <div className="sk-shimmer" style={{ height: 28 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <div className="sk-shimmer" style={{ height: 14, flex: 2 }} />
          <div className="sk-shimmer" style={{ height: 14, flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {[1,2,3].map(i => (
            <div key={i} className="sk-shimmer" style={{ height: 52, flex: 1 }} />
          ))}
        </div>
        <div className="sk-shimmer" style={{ height: 14, width: "55%" }} />
      </div>

      {/* Dots */}
      <div style={{ display: "flex", gap: 5 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 4, height: 4, borderRadius: "50%",
            background: color,
            animation: `sk-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── Error state shown when generation or render fails ── */
export function PreviewError({ message, onRetry }) {
  return (
    <div style={{
      padding: 40,
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 15 }}>
        Generation failed
      </div>
      <div style={{
        fontSize: 12,
        color: "#9ca3af",
        maxWidth: 280,
        lineHeight: 1.6,
        fontFamily: "monospace",
        background: "#fef2f2",
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #fecaca",
        wordBreak: "break-word",
      }}>
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 8,
            padding: "9px 24px",
            borderRadius: 8,
            border: "none",
            background: "#4f46e5",
            color: "white",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   extractComponentName — robustly finds the exported
   component name from AI-generated code, handling all
   common patterns the AI might produce.
───────────────────────────────────────────────────── */
function extractComponentName(code) {
  // Pattern 1: export default function Foo() — most common
  const namedFn = code.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  if (namedFn) return namedFn[1];

  // Pattern 2: export default Foo; or export default Foo (end of line)
  const namedRef = code.match(/export\s+default\s+([A-Za-z0-9_]+)\s*;?\s*(\n|$)/m);
  if (namedRef) return namedRef[1];

  // Pattern 3: const Foo = () => ...
  const constArrow = code.match(/const\s+([A-Za-z0-9_]+)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/);
  if (constArrow) return constArrow[1];

  // Pattern 4: last function defined — fallback
  const allFunctions = [...code.matchAll(/function\s+([A-Za-z0-9_]+)\s*\(/g)];
  if (allFunctions.length > 0) return allFunctions[allFunctions.length - 1][1];

  return null;
}

/* ─────────────────────────────────────────────────────
   stripExports — removes export keywords so the code
   can run inside new Function() without module errors
───────────────────────────────────────────────────── */
function stripExports(code) {
  return code
    // export default function Foo() → function Foo()
    .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/, "function $1")
    // export default Foo; → (removed)
    .replace(/export\s+default\s+[A-Za-z0-9_]+\s*;?\s*(\n|$)/gm, "\n")
    // export { Foo } → (removed)
    .replace(/export\s*\{[^}]*\}\s*;?/g, "")
    // export const / export function → const / function
    .replace(/export\s+(const|let|var|function|class)\s+/g, "$1 ");
}

/* ── Main live preview — compiles + renders generated JSX ── */
export default function LivePreview({ code, onRetry, onNavigate }) {
  const [Comp, setComp] = useState(null);
  const [err,  setErr]  = useState(null);
  const navigateRef = useRef(onNavigate);

  // Keep ref up to date so window.navigateTo closure always calls latest handler
  useEffect(() => {
    navigateRef.current = onNavigate;
  }, [onNavigate]);

  // Register window.navigateTo so generated components can trigger page switches
  useEffect(() => {
    window.navigateTo = (pageName) => {
      if (navigateRef.current) navigateRef.current(pageName);
    };
    return () => { delete window.navigateTo; };
  }, []);

  useEffect(() => {
    if (!code) return;

    // Reset state on new code
    setComp(null);
    setErr(null);

    // Check if it's a raw error comment from generation
    if (code.trim().startsWith("// Error:")) {
      setErr(code.replace("// Error:", "").trim());
      return;
    }

    // Small debounce: prevents "flash of error" if code prop updates
    // mid-stream before the full string is ready
    const timer = setTimeout(() => {
      try {
        // 1. Strip markdown fences if present
        const withoutFences = code
          .replace(/```[a-z]*/gi, "")
          .replace(/```/g, "")
          .trim();

        // 2. Find the component name BEFORE stripping exports
        const componentName = extractComponentName(withoutFences);
        if (!componentName) {
          throw new Error(
            "Could not find a default export in the generated code. " +
            "The AI may not have exported a component."
          );
        }

        // 3. Strip export keywords so new Function() doesn't choke
        const stripped = stripExports(withoutFences);

        // 4. Compile JSX → JS via Babel
        const compiled = Babel.transform(stripped, {
          presets: ["react"],
          filename: `${componentName}.jsx`,
        }).code;

        // 5. Run inside a sandboxed function, with an explicit existence check
        const fn = new Function(
          "React",
          `
          "use strict";
          ${compiled}

          if (typeof ${componentName} === "undefined") {
            throw new Error(
              "Component '${componentName}' was not found after compilation. " +
              "The function name and export name may not match."
            );
          }

          return ${componentName};
          `
        );

        const Component = fn(React);

        if (typeof Component !== "function") {
          throw new Error(
            `'${componentName}' is not a valid React component (got ${typeof Component}).`
          );
        }

        setComp(() => Component);
        setErr(null);
      } catch (e) {
        setErr(e.message || String(e));
      }
    }, 50); // 50ms debounce — invisible to the user

    return () => clearTimeout(timer);
  }, [code]);

  if (err)   return <PreviewError message={err} onRetry={onRetry} />;
  if (!Comp) return <PreviewSkeleton />;

  return (
    <div style={{ background: "white", minHeight: "100%" }}>
      <ErrorBoundary onRetry={onRetry}>
        <Comp />
      </ErrorBoundary>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ErrorBoundary — catches runtime errors INSIDE <Comp />
   so a broken generated page doesn't crash the whole
   preview pane — shows a clean error card instead
───────────────────────────────────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.warn("[LivePreview] Runtime error in generated component:", error, info);
  }

  componentDidUpdate(prevProps) {
    // Reset when the component being rendered changes (new code passed in)
    if (prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <PreviewError
          message={this.state.error?.message || "A runtime error occurred in the generated component."}
          onRetry={this.props.onRetry}
        />
      );
    }
    return this.props.children;
  }
}