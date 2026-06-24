import JSZip from "jszip";
import { saveAs } from "file-saver";

/* ─────────────────────────────────────────────
   Helper: turn page name → valid component name
───────────────────────────────────────────── */
function toComponentName(page) {
  return page
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/* ─────────────────────────────────────────────
   Helper: turn page name → URL slug
───────────────────────────────────────────── */
function toSlug(page) {
  return "/" + page.toLowerCase().replace(/\s+/g, "-");
}

/* ─────────────────────────────────────────────
   Generate the root App.jsx with React Router
───────────────────────────────────────────── */
function generateAppJsx(finalApp) {
  const { pages, appName } = finalApp;
  const firstSlug = toSlug(pages[0]);

  const imports = pages
    .map((p) => `import ${toComponentName(p)} from "./pages/${toComponentName(p)}";`)
    .join("\n");

  const routes = pages
    .map((p) => `        <Route path="${toSlug(p)}" element={<${toComponentName(p)} />} />`)
    .join("\n");

  return `import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
${imports}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="${firstSlug}" replace />} />
${routes}
        <Route path="*" element={<Navigate to="${firstSlug}" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
`;
}

/* ─────────────────────────────────────────────
   Generate main.jsx
───────────────────────────────────────────── */
function generateMainJsx() {
  return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

/* ─────────────────────────────────────────────
   Generate index.css
───────────────────────────────────────────── */
function generateIndexCss(brandColor = "#4f46e5") {
  return `*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --brand: ${brandColor};
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #ffffff;
  color: #111827;
}

img {
  display: block;
  max-width: 100%;
}

button {
  cursor: pointer;
}
`;
}

/* ─────────────────────────────────────────────
   Generate index.html
───────────────────────────────────────────── */
function generateIndexHtml(appName) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName || "My App"}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
}

/* ─────────────────────────────────────────────
   Generate package.json
───────────────────────────────────────────── */
function generatePackageJson(appName) {
  const name = (appName || "my-app").toLowerCase().replace(/\s+/g, "-");
  return JSON.stringify(
    {
      name,
      private: true,
      version: "0.1.0",
      type: "module",
      scripts: {
        dev:     "vite",
        build:   "vite build",
        preview: "vite preview",
      },
      dependencies: {
        react:             "^18.2.0",
        "react-dom":       "^18.2.0",
        "react-router-dom":"^6.22.0",
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.2.1",
        vite:                   "^5.1.4",
      },
    },
    null,
    2
  );
}

/* ─────────────────────────────────────────────
   Generate vite.config.js
───────────────────────────────────────────── */
function generateViteConfig() {
  return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`;
}

/* ─────────────────────────────────────────────
   Generate .gitignore
───────────────────────────────────────────── */
function generateGitignore() {
  return `node_modules
dist
.env
.DS_Store
`;
}

/* ─────────────────────────────────────────────
   Patch page code for the real exported app:
   - Adds React + useNavigate imports
   - Strips the bare "export default X" at bottom
   - Wraps component in a router-aware shell
   - Wires window.navigateTo → useNavigate
   - Strips any stray markdown/backtick artifacts
───────────────────────────────────────────── */
function patchPageCode(code, page, allPages) {
  const componentName = toComponentName(page);

  // ── 1. Clean up any leftover markdown fences ──
  let clean = code
    .replace(/```[a-z]*/gi, "")
    .replace(/```/g, "")
    .trim();

  // ── 2. Remove any existing React/router imports (we'll add our own) ──
  clean = clean
    .replace(/^import\s+React.*?;?\s*$/gm, "")
    .replace(/^import\s+\{[^}]*\}\s+from\s+["']react["'];?\s*$/gm, "")
    .replace(/^import\s+\{[^}]*\}\s+from\s+["']react-router-dom["'];?\s*$/gm, "")
    .trim();

  // ── 3. Remove the final `export default X;` line — we'll re-export via wrapper ──
  clean = clean.replace(/export\s+default\s+\w+\s*;?\s*$/m, "").trim();

  // ── 4. Rename the component function to _Inner to avoid name clash with wrapper ──
  // Handles: function ComponentName(), const ComponentName =, class ComponentName
  clean = clean
    .replace(
      new RegExp(`(?<![\\w])function\\s+${componentName}\\s*\\(`, "g"),
      `function _Inner(`
    )
    .replace(
      new RegExp(`(?<![\\w])const\\s+${componentName}\\s*=`, "g"),
      `const _Inner =`
    )
    .replace(
      new RegExp(`(?<![\\w])class\\s+${componentName}\\s*`, "g"),
      `class _Inner `
    );

  // ── 5. Build nav map ──
  const navMap = allPages
    .map((p) => `  "${p}": "${toSlug(p)}"`)
    .join(",\n");

  // ── 6. Build the final patched file ──
  return `import React from "react";
import { useNavigate } from "react-router-dom";

/* ── nav map: page name → route path ── */
const _NAV_MAP = {
${navMap}
};

/* ── original component (renamed to _Inner) ── */
${clean}

/* ── router-aware wrapper ── */
export default function ${componentName}() {
  const navigate = useNavigate();

  React.useEffect(() => {
    window.navigateTo = (pageName) => {
      const path = _NAV_MAP[pageName];
      if (path) navigate(path);
      else console.warn("navigateTo: unknown page", pageName);
    };
    return () => { delete window.navigateTo; };
  }, [navigate]);

  return <_Inner />;
}
`;
}

/* ─────────────────────────────────────────────
   Generate README.md
───────────────────────────────────────────── */
function generateReadme(appName, pages, brandColor) {
  return `# ${appName || "My App"}

Generated by **Codora Constructo** 🛠️

## Pages
${pages.map((p) => `- **${p}** → \`/src/pages/${toComponentName(p)}.jsx\` (route: \`${toSlug(p)}\`)`).join("\n")}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for Production

\`\`\`bash
npm run build
npm run preview
\`\`\`

## Tech Stack
- React 18
- React Router v6
- Vite 5
${brandColor ? `- Brand color: \`${brandColor}\`` : ""}

---
*Built with [Codora Constructo](https://codora.app)*
`;
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export async function downloadProjectAsZip(finalApp, generatedFiles) {
  const zip        = new JSZip();
  const { appName, pages, brandColor } = finalApp;
  const folderName = (appName || "my-app").toLowerCase().replace(/\s+/g, "-");
  const root       = zip.folder(folderName);

  // ── Root files ──
  root.file("index.html",     generateIndexHtml(appName));
  root.file("package.json",   generatePackageJson(appName));
  root.file("vite.config.js", generateViteConfig());
  root.file("README.md",      generateReadme(appName, pages, brandColor));
  root.file(".gitignore",     generateGitignore());

  // ── src/ ──
  const src = root.folder("src");
  src.file("main.jsx",  generateMainJsx());
  src.file("App.jsx",   generateAppJsx(finalApp));
  src.file("index.css", generateIndexCss(brandColor));

  // ── src/pages/ ──
  const pagesFolder = src.folder("pages");
  for (const page of pages) {
    const rawCode = generatedFiles[page]
      || `export default function ${toComponentName(page)}() { return <div style={{padding:40}}><h1>${page}</h1><p>Page coming soon.</p></div>; }`;

    const patched = patchPageCode(rawCode, page, pages);
    pagesFolder.file(`${toComponentName(page)}.jsx`, patched);
  }

  // ── Generate & download ──
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${folderName}.zip`);
}