import React, { useState, useEffect } from "react";
import "./App.css";
import { useNavigate, useLocation, useParams, Routes, Route } from "react-router-dom";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Pencil, Check, ChevronRight, Zap, Eye, Code2, Download,
  ArrowLeft, Loader2, Package, Clock, Trash2, FolderOpen,
} from "lucide-react";
import VoiceMic from "./components/VoiceMic";
import DarkGeneratingLoader from "./components/DarkGeneratingLoader";
import AppDNA   from "./components/AppDNA";
import RecentProjects, { DeleteConfirmModal } from "./components/RecentProjects";

import TemplateGallery, { GenerationScreen, TEMPLATES } from "./components/TemplateGallery";
import DeviceFrame from "./components/DeviceFrame";
import LivePreview, { PreviewSkeleton } from "./components/LivePreview";
import InlineAddInput from "./components/InlineAddInput";
import {
  generatePage, regeneratePage,
  buildGeneratePrompt, buildRegeneratePrompt,
} from "./utils/api";
import { downloadProjectAsZip } from "./utils/zipExport";

/* ─────────────────────────── LOCAL STORAGE HELPERS ─────────────────────────── */
const STORAGE_KEY = "codora_projects";

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.warn("Could not save project — storage may be full", e);
  }
}

/* ─────────────────────────── SORTABLE PAGE ─────────────────────────── */
function SortablePage({ page, sections, selectedSections, toggleSection, onAddSection, onRemovePage }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page });

  const activeSecs   = selectedSections[page] || [];
  const allUnchecked = sections[page]?.length > 0 && activeSecs.length === 0;

  const containerStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity:     allUnchecked ? 0.5 : 1,
    borderColor: allUnchecked ? "#ef4444" : undefined,
    background:  allUnchecked ? "#fff5f5" : undefined,
  };

  return (
    <div ref={setNodeRef} style={containerStyle} className="page-block">
      <div className="page-header">
        <span {...attributes} {...listeners} className="drag-handle">⠿</span>
        <span className="page-label">📄 {page}</span>
        {allUnchecked && (
          <span style={{ marginLeft: "auto", fontSize: 10, background: "#fee2e2", color: "#ef4444", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
            ⚠ Will be excluded
          </span>
        )}
        <button
          onClick={() => onRemovePage(page)}
          style={{ marginLeft: allUnchecked ? 6 : "auto", width: 20, height: 20, borderRadius: 5, border: "none", background: "#fee2e2", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}
          title={`Remove ${page}`}
        >×</button>
      </div>
      {sections[page]?.map((sec, i) => (
        <label key={i} className="section-item">
          <input type="checkbox" checked={activeSecs.includes(sec)} onChange={() => toggleSection(page, sec)} />
          {sec}
        </label>
      ))}
      <button className="btn add-sec-btn" onClick={() => onAddSection(page)}>➕ Add Section</button>
    </div>
  );
}

/* ─────────────────────────── STEP BAR ─────────────────────────── */
function StepBar({ step }) {
  const steps = ["Describe", "Structure", "Config", "Generate"];
  return (
    <div className="step-bar">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className={`step-dot ${step > i + 1 ? "done" : step === i + 1 ? "active" : ""}`}>
            <span>{step > i + 1 ? "✓" : i + 1}</span>
            <label>{s}</label>
          </div>
          {i < steps.length - 1 && <div className={`step-line ${step > i + 1 ? "filled" : ""}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─────────────────────────── TEMPLATE ROUTE ─────────────────────────── */
function TemplateRoute() {
  const { templateId } = useParams();
  const navigate       = useNavigate();
  const tpl            = TEMPLATES.find(t => t.id === templateId);

  useEffect(() => {
    if (!tpl) navigate("/", { replace: true });
  }, [tpl, navigate]);

  if (!tpl) return null;

  return <GenerationScreen tpl={tpl} onBack={() => navigate("/")} />;
}

/* ─────────────────────────── MAIN APP ─────────────────────────── */
export default function App() {
  return (
    <Routes>
      <Route path="/template/:templateId" element={<TemplateRoute />} />
      <Route path="*" element={<MainFlow />} />
    </Routes>
  );
}

/* ─────────────────────────── MAIN FLOW (steps 1-4) ─────────────────────────── */
function MainFlow() {
  const [prompt,           setPrompt]           = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const step =
    location.pathname === "/structure" ? 2
    : location.pathname === "/config"  ? 3
    : location.pathname === "/generate" ? 4
    : 1;

  const [analysis,         setAnalysis]         = useState(null);
  const [pages,            setPages]            = useState([]);
  const [sections,         setSections]         = useState({});
  const [selectedSections, setSelectedSections] = useState({});
  const [finalApp,         setFinalApp]         = useState(null);
  const [appName,          setAppName]          = useState("");
  const [editingName,      setEditingName]      = useState(false);
  const [generatedFiles,   setGeneratedFiles]   = useState({});
  const [pageErrors,       setPageErrors]       = useState({});
  const [generatingPages,  setGeneratingPages]  = useState([]);
  const [activeFile,       setActiveFile]       = useState(null);
  const [isGenerating,     setIsGenerating]     = useState(false);
  const [generationDone,   setGenerationDone]   = useState(false);
  const [osMode,           setOsMode]           = useState("windows");
  const [feedback,         setFeedback]         = useState({});
  const [regenLoading,     setRegenLoading]     = useState(null);
  const [showFeedbackBox,  setShowFeedbackBox]  = useState(false);
  const [isZipping,        setIsZipping]        = useState(false);
  const [showAddPage,      setShowAddPage]      = useState(false);
  const [addingSectionFor, setAddingSectionFor] = useState(null);
  const [interimText,      setInterimText]      = useState("");
  const [showDNA,          setShowDNA]          = useState(false);
  const [brandColor,       setBrandColor]       = useState("#4f46e5");
  const [dnaStyle,         setDnaStyle]         = useState("");
  const [projects,         setProjects]         = useState([]);
  const [deleteTargetId,   setDeleteTargetId]   = useState(null);
  const [isAnalyzing,      setIsAnalyzing]      = useState(false);
  const currentProjectIdRef = React.useRef(null);
  const [fieldWarning, setFieldWarning] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ appName: "", prompt: "" });

  const sensors = useSensors(useSensor(PointerSensor));

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(() => { setProjects(loadProjects()); }, []);

  useEffect(() => {
    if (location.pathname === "/") setProjects(loadProjects());
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setProjects(loadProjects());
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const interval = setInterval(() => {
      const fresh = loadProjects();
      setProjects(prev => {
        const changed =
          fresh.length !== prev.length ||
          fresh.some((p, i) => p.id !== prev[i]?.id || p.createdAt !== prev[i]?.createdAt);
        return changed ? fresh : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  useEffect(() => {
    if (!finalApp || Object.keys(generatedFiles).length === 0) return;

    if (!currentProjectIdRef.current) {
      currentProjectIdRef.current = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    const id = currentProjectIdRef.current;

    const projectData = {
      id,
      name:      finalApp.appName || "Unnamed App",
      domain:    finalApp.domain,
      pageCount: finalApp.pages.length,
      createdAt: Date.now(),
      finalApp,
      generatedFiles,
      activeFile,
    };

    setProjects(prev => {
      const others  = prev.filter(p => p.id !== id);
      const updated = [projectData, ...others].slice(0, 8);
      saveProjects(updated);
      return updated;
    });
  }, [generatedFiles, activeFile, finalApp]);

  const handleRestoreProject = (proj) => {
    currentProjectIdRef.current = proj.id;
    setFinalApp(proj.finalApp);
    setGeneratedFiles(proj.generatedFiles);
    setActiveFile(proj.activeFile);
    setAppName(proj.finalApp.appName);
    setBrandColor(proj.finalApp.brandColor || "#4f46e5");
    setDnaStyle(proj.finalApp.dnaStyle || "");
    setAnalysis({ domain: proj.finalApp.domain, intent: proj.finalApp.intent });
    setGenerationDone(true);
    setIsGenerating(false);
    setGeneratingPages([]);
    setPageErrors({});
    navigate("/generate");
  };

  const handleDeleteProject  = (id) => setDeleteTargetId(id);
  const handleCancelDelete   = ()   => setDeleteTargetId(null);
  const handleConfirmDelete  = ()   => {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveProjects(updated);
      return updated;
    });
    if (id === currentProjectIdRef.current) currentProjectIdRef.current = null;
  };

  const handleRenameProject = (id, newName) => {
    if (!newName.trim()) return;
    setProjects(prev => {
      const updated = prev.map(p => {
        if (p.id !== id) return p;
        const oldName = p.finalApp?.appName || p.name || "";
        const updatedFiles = {};
        if (p.generatedFiles) {
          Object.entries(p.generatedFiles).forEach(([page, code]) => {
            updatedFiles[page] = code.replaceAll(oldName, newName.trim());
          });
        }
        return {
          ...p,
          name: newName.trim(),
          finalApp: p.finalApp ? { ...p.finalApp, appName: newName.trim() } : p.finalApp,
          generatedFiles: Object.keys(updatedFiles).length > 0 ? updatedFiles : p.generatedFiles,
        };
      });
      saveProjects(updated);
      return updated;
    });
  };

  const handleNewProject = () => {
    currentProjectIdRef.current = null;
    navigate("/");
    setPrompt("");
    setAppName("");
    setAnalysis(null);
    setPages([]);
    setSections({});
    setSelectedSections({});
    setFinalApp(null);
    setGeneratedFiles({});
    setPageErrors({});
    setActiveFile(null);
    setGenerationDone(false);
    setIsGenerating(false);
    setGeneratingPages([]);
    setBrandColor("#4f46e5");
    setDnaStyle("");
  };

  useEffect(() => {
    window.navigateTo = (pageName) => {
      if (!finalApp) return;
      const match = finalApp.pages.find(
        (p) =>
          p === pageName ||
          p.toLowerCase().replace(/\s+/g, "-") ===
            pageName.toLowerCase().replace(/\s+/g, "-")
      );
      if (match) {
        setActiveFile(match);
        setShowFeedbackBox(false);
      }
    };
    return () => { delete window.navigateTo; };
  }, [finalApp]);

  const handleTranscript = (text) => {
    setInterimText("");
    const nameMatch = text.match(/(?:called|named)\s+([A-Z][a-zA-Z0-9\s]{1,20})/i);
    if (nameMatch) setAppName(nameMatch[1].trim());
    setPrompt(text);
    setTimeout(() => {
      const ta = document.querySelector("textarea.desc-textarea");
      if (ta) autoResize(ta);
    }, 0);
  };

  const handleDNA = (dna) => {
    setAppName(dna.appName || "");
    setPrompt(dna.prompt || "");
    if (dna.primaryColor) setBrandColor(dna.primaryColor);
    if (dna.style)        setDnaStyle(dna.style);

    const dnaPages    = dna.pages || [];
    const dnaSections = dna.sections || {};
    const filled      = {};
    dnaPages.forEach(p => { filled[p] = dnaSections[p] || ["Content"]; });

    setPages(dnaPages);
    setSections(filled);
    setSelectedSections(filled);
    setAnalysis({ domain: dna.domain || "general", intent: "app" });
    setShowDNA(false);
    navigate("/structure");
  };

  const analyzeApp = async (text) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/api/infer-domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName, userPrompt: text }),
      });
      const data = await res.json();
      return {
        domain:       data.domain       || "general",
        intent:       data.intent       || "app",
        styleHints:   data.styleHints   || [],
        primaryColor: data.primaryColor || brandColor,
        pages:        data.pages        || [],
        sections:     data.sections     || {},
      };
    } catch {
      const t = text.toLowerCase();
      let domain = "general";
      if (["doctor","hospital","medical"].some(w => t.includes(w))) domain = "healthcare";
      else if (["food","restaurant","bakery"].some(w => t.includes(w))) domain = "food";
      return { domain, intent: "app", styleHints: [], pages: [], sections: {} };
    }
  };

  const generatePagesList = (domain) => {
    const map = {
      food:       ["Home","Menu","Cart","Checkout","Orders","Profile"],
      wellness:   ["Home","Workouts","Progress","Plans","Profile"],
      services:   ["Home","Services","Booking","History","Profile"],
      education:  ["Home","Courses","Lessons","Progress","Profile"],
      healthcare: ["Home","Doctors","Appointments","Profile"],
    };
    return map[domain] || ["Home"];
  };

  const generateSectionsList = (pages, domain) => {
    const base = {
      food:       { Home: ["Hero","Offers","Featured Products"], Menu: ["Menu List","Categories"], Cart: ["Cart Items","Checkout Summary"], Checkout: ["Address","Payment"], Profile: ["User Info"] },
      wellness:   { Home: ["Hero","Daily Goal"], Workouts: ["Workout List","Timer"], Progress: ["Stats","Charts","Achievements"], Plans: ["Plan List"], Profile: ["User Info"] },
      services:   { Home: ["Hero","Featured Services"], Services: ["Service List"], Booking: ["Calendar","Form"], History: ["Past Bookings"], Profile: ["User Info"] },
      education:  { Home: ["Hero","Recommended Courses"], Courses: ["Course List"], Lessons: ["Video Player"], Progress: ["Completed Courses","Stats"], Profile: ["User Info"] },
      healthcare: { Home: ["Hero","Find Doctors"], Doctors: ["Doctor List"], Appointments: ["Calendar","Booking Form"], Profile: ["User Info"] },
    };
    const result = {};
    pages.forEach(p => { result[p] = base[domain]?.[p] || ["Content"]; });
    return result;
  };

  const handleContinue = async () => {
    const errors = { appName: "", prompt: "" };
    if (!appName.trim()) errors.appName = "App name is required";
    if (!prompt.trim()) errors.prompt = "Description is required";
    if (errors.appName || errors.prompt) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({ appName: "", prompt: "" });
    setIsAnalyzing(true);
    const result = await analyzeApp(prompt);
    setIsAnalyzing(false);

    const genPages = result.pages?.length ? result.pages : generatePagesList(result.domain);
    const genSecs  = result.sections && Object.keys(result.sections).length
      ? result.sections
      : generateSectionsList(genPages, result.domain);

    setAnalysis(result);
    setPages(genPages);
    setSections(genSecs);
    setSelectedSections(genSecs);
    if (result.styleHints?.length) setDnaStyle(result.styleHints.join(", "));
    if (result.primaryColor)       setBrandColor(result.primaryColor);
    navigate("/structure");
  };

  const toggleSection = (page, section) => {
    setSelectedSections(prev => {
      const current = prev[page] || [];
      return { ...prev, [page]: current.includes(section) ? current.filter(s => s !== section) : [...current, section] };
    });
  };

  const handleAddPage = (name) => {
    if (!name || pages.includes(name)) return;
    setPages(prev => [...prev, name]);
    setSections(prev => ({ ...prev, [name]: ["Custom Section"] }));
    setSelectedSections(prev => ({ ...prev, [name]: ["Custom Section"] }));
    setShowAddPage(false);
  };

  const handleRemovePage = (page) => {
    setPages(prev => prev.filter(p => p !== page));
    setSections(prev => { const s = { ...prev }; delete s[page]; return s; });
    setSelectedSections(prev => { const s = { ...prev }; delete s[page]; return s; });
  };

  const handleAddSection  = (page) => setAddingSectionFor(page);

  const confirmAddSection = (page, name) => {
    if (!name) return;
    setSections(prev => ({ ...prev, [page]: [...(prev[page] || []), name] }));
    setSelectedSections(prev => ({ ...prev, [page]: [...(prev[page] || []), name] }));
    setAddingSectionFor(null);
  };

  const buildFinalApp = () => {
    if (!analysis) return;
    const activePages   = pages.filter(p => (selectedSections[p] || []).length > 0);
    const finalSections = {};
    activePages.forEach(p => { finalSections[p] = selectedSections[p]; });
    setFinalApp({
      appName,
      domain:     analysis.domain,
      intent:     analysis.intent,
      pages:      activePages,
      sections:   finalSections,
      theme:      "modern",
      brandColor,
      dnaStyle,
    });
    navigate("/config");
  };

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over?.id)
      setPages(prev => arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id)));
  };

  const downloadJSON = () => {
    if (!finalApp) return;
    const blob = new Blob([JSON.stringify(finalApp, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "app-config.json"; a.click();
  };

  const generateAppStructure = async () => {
    if (!finalApp) return;
    navigate("/generate");
    setIsGenerating(true);
    setGeneratedFiles({});
    setPageErrors({});
    setGeneratingPages([]);
    setActiveFile(null);
    setGenerationDone(false);

    const newFiles  = {};
    const newErrors = {};

    for (const page of finalApp.pages) {
      setGeneratingPages(prev => [...prev, page]);
      try {
        const p = buildGeneratePrompt({
          page,
          appName:  finalApp.appName,
          domain:   finalApp.domain,
          sections: finalApp.sections[page] || [],
          color:    finalApp.brandColor || "#4f46e5",
          allPages: finalApp.pages,
          style:    finalApp.dnaStyle || "",
        });
        const code = await generatePage(p, page);
        newFiles[page] = code;
      } catch (err) {
        newErrors[page] = err.message;
      }
      setGeneratedFiles({ ...newFiles });
      setPageErrors({ ...newErrors });
    }

    setIsGenerating(false);
    setGenerationDone(true);
    setActiveFile(finalApp.pages.find(p => newFiles[p]) || null);
  };

  const retryPage = async (page) => {
    setPageErrors(prev => { const e = { ...prev }; delete e[page]; return e; });
    setGeneratingPages(prev => [...prev, page]);
    try {
      const p = buildGeneratePrompt({
        page,
        appName:  finalApp.appName,
        domain:   finalApp.domain,
        sections: finalApp.sections[page] || [],
        color:    finalApp.brandColor || "#4f46e5",
        allPages: finalApp.pages,
        style:    finalApp.dnaStyle || "",
      });
      const code = await generatePage(p, page);
      setGeneratedFiles(prev => ({ ...prev, [page]: code }));
    } catch (err) {
      setPageErrors(prev => ({ ...prev, [page]: err.message }));
    }
    setGeneratingPages(prev => prev.filter(p => p !== page));
  };

  const handleRegenerate = async (page) => {
    const fb           = (feedback[page] || "").trim();
    const existingCode = generatedFiles[page] || "";
    if (!fb) return;

    setRegenLoading(page);
    setPageErrors(prev => { const e = { ...prev }; delete e[page]; return e; });

    try {
      const p = buildRegeneratePrompt({
        page,
        appName:      finalApp.appName,
        domain:       finalApp.domain,
        sections:     finalApp.sections[page] || [],
        color:        finalApp.brandColor || "#4f46e5",
        existingCode,
        feedback:     fb,
        allPages:     finalApp.pages,
        style:        finalApp.dnaStyle || "",
      });
      const code = await regeneratePage(p, page);
      setGeneratedFiles(prev => ({ ...prev, [page]: code }));
    } catch (err) {
      setPageErrors(prev => ({ ...prev, [page]: err.message }));
    }
    setRegenLoading(null);
  };

  const handleProceed = () => {
    const idx = finalApp.pages.indexOf(activeFile);
    if (idx < finalApp.pages.length - 1) {
      setActiveFile(finalApp.pages[idx + 1]);
      setShowFeedbackBox(false);
    } else {
      alert("🎉 All pages completed!");
    }
  };

  const handleDownloadZip = async () => {
    if (!finalApp || !Object.keys(generatedFiles).length) return;
    setIsZipping(true);
    try { await downloadProjectAsZip(finalApp, generatedFiles); }
    catch (err) { alert("Failed to create ZIP: " + err.message); }
    setIsZipping(false);
  };

  const handlePreviewNavigate = (pageName) => {
    if (!finalApp) return;
    const match = finalApp.pages.find(
      (p) =>
        p === pageName ||
        p.toLowerCase().replace(/\s+/g, "-") ===
          pageName.toLowerCase().replace(/\s+/g, "-")
    );
    if (match) {
      setActiveFile(match);
      setShowFeedbackBox(false);
    }
  };

  const doneCount  = Object.keys(generatedFiles).length;
  const totalCount = finalApp?.pages.length || 0;
  const allDone    = generationDone && doneCount === totalCount && totalCount > 0;
  const deleteTarget = deleteTargetId ? projects.find(p => p.id === deleteTargetId) : null;

  /* ─── RENDER ─── */
  return (
    <div className={`app-root ${step === 3 || step === 4 ? "fullscreen" : ""}`}
      style={window.innerWidth <= 768 && (step === 3 || step === 4) ? { height: 'auto', overflow: 'visible' } : {}}>

      <DeleteConfirmModal
        project={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {(step === 3 || step === 4) && (
        <header className="top-nav">
          <div
            className="nav-brand"
            onClick={handleNewProject}
            style={{ cursor: "pointer" }}
            title="Go to Home"
            onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <span className="nav-logo">💻🛠️</span>
            <span className="nav-title">Codora Constructo</span>
            {finalApp && <span className="nav-app-name">{finalApp.appName}</span>}
          </div>
          <StepBar step={step} />
          <div className="nav-actions">
            {step === 3 && (
              <>
                <button
                  className="nav-btn"
                  onClick={() => {
                    if (finalApp) {
                      setPages(finalApp.pages);
                      setSections(finalApp.sections);
                      setSelectedSections(finalApp.sections);
                    }
                    navigate("/structure");
                  }}
                ><ArrowLeft size={14} /> Back</button>
                <button className="nav-btn outline" onClick={downloadJSON}><Download size={14} /> JSON</button>
                {Object.keys(generatedFiles).length > 0 && (
                  <button
                    className="nav-btn"
                    onClick={() => navigate("/generate")}
                    style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white", border: "none", fontWeight: 600 }}
                  >
                    <Eye size={14} /> View Generated App
                  </button>
                )}
              </>
            )}
            {step === 4 && (
              <>
                <button className="nav-btn" onClick={() => navigate("/config")}><ArrowLeft size={14} /> Config</button>
                {allDone && (
                  <button
                    className="nav-btn"
                    onClick={handleDownloadZip}
                    disabled={isZipping}
                    style={{ background: isZipping ? "#374151" : "linear-gradient(135deg,#22c55e,#16a34a)", color: "white", border: "none", fontWeight: 600, opacity: isZipping ? 0.7 : 1 }}
                  >
                    {isZipping ? <><Loader2 size={14} className="spin" /> Zipping…</> : <><Package size={14} /> Download ZIP</>}
                  </button>
                )}
              </>
            )}
          </div>
        </header>
      )}

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "linear-gradient(135deg,#eef2ff 0%,#f5f3ff 50%,#f0fdf4 100%)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px 24px" }}>
            <div className="glass-card step1-card">
              <div className="step1-brand">
                <span className="brand-icon">💻🛠️</span>
                <h1 className="brand-name">Codora Constructo</h1>
                <p className="brand-sub">Describe your app. We'll architect it.</p>
              </div>
              <StepBar step={step} />

              <div className="field-group">
                <label className="field-label">App Name</label>
                <input
                  className="input"
                  value={appName}
                  onChange={e => { setAppName(e.target.value); setFieldErrors(prev => ({ ...prev, appName: "" })); }}
                  placeholder="e.g. BakeHouse"
                  style={fieldErrors.appName ? { borderColor: "#ef4444", background: "#fff5f5" } : {}}
                />
                {fieldErrors.appName && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: 12, color: "#dc2626" }}>
                    <span>⚠</span> {fieldErrors.appName}
                  </div>
                )}
              </div>

              <div className="field-group">
                <label className="field-label">Describe your app</label>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <textarea
                      className="input desc-textarea"
                      value={interimText || prompt}
                      rows={1}
                      onChange={e => { setPrompt(e.target.value); setInterimText(""); autoResize(e.target); setFieldErrors(prev => ({ ...prev, prompt: "" })); }}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleContinue(); } }}
                      placeholder="e.g. A bakery app with home, products and cart"
                      style={{ opacity: interimText ? 0.6 : 1, resize: "none", overflow: "hidden", lineHeight: "1.5", minHeight: "42px", display: "block", width: "100%", boxSizing: "border-box", ...(fieldErrors.prompt ? { borderColor: "#ef4444", background: "#fff5f5" } : {}) }}
                    />
                    {interimText && (
                      <div style={{ position: "absolute", bottom: -20, left: 0, fontSize: 11, color: "#7c3aed", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                        🎙 {interimText}
                      </div>
                    )}
                  </div>
                  <VoiceMic onTranscript={handleTranscript} onInterim={setInterimText} />
                </div>
                {fieldErrors.prompt && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: 12, color: "#dc2626" }}>
                    <span>⚠</span> {fieldErrors.prompt}
                  </div>
                )}
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: interimText ? 28 : 8, lineHeight: 1.5 }}>
                  💡 Try saying: <em>"A food delivery app called QuickBite with cart and orders"</em>
                </p>
              </div>

              <button
                className="btn primary full-btn"
                onClick={handleContinue}
                disabled={isAnalyzing}
                style={{ marginTop: 12, opacity: isAnalyzing ? 0.8 : 1 }}
              >
                {isAnalyzing ? <><Loader2 size={15} className="spin" /> Analyzing your app…</> : <>Continue <ChevronRight size={16} /></>}
              </button>

              {/* ── FIELD WARNING ── */}
              {fieldWarning && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    animation: "slideUp 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15 }}>⚠️</span>
                    <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 500 }}>
                      {fieldWarning}
                    </span>
                  </div>
                  <button
                    onClick={() => setFieldWarning("")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowDNA(v => !v)}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1.5px dashed #a5b4fc", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#4f46e5", background: showDNA ? "#eef2ff" : "transparent", marginTop: 10, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                🧬 {showDNA ? "Hide App DNA" : "Generate from existing app"}
              </button>

              {showDNA && <AppDNA onDNA={handleDNA} onClose={() => setShowDNA(false)} />}
            </div>

            <RecentProjects
              projects={projects}
              onRestore={handleRestoreProject}
              onDelete={handleDeleteProject}
              onRename={handleRenameProject}
            />
          </div>
          <div style={{ padding: "0 40px 48px" }}>
            <TemplateGallery />
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && analysis && (
        <div className="centered-shell">
          <div className="glass-card step2-card">
            <StepBar step={step} />
            <h2 className="section-heading">🧠 AI Generated Structure</h2>
            <div className="meta-row">
              <div className="meta-pill">Domain: <b>{analysis.domain}</b></div>
              <div className="meta-pill">Intent: <b>{analysis.intent}</b></div>
              {dnaStyle && <div className="meta-pill">Style: <b>{dnaStyle}</b></div>}
              <div className="meta-pill app-name-pill">
                {editingName ? (
                  <>
                    <input className="inline-input" value={appName} onChange={e => setAppName(e.target.value)} onKeyDown={e => e.key === "Enter" && setEditingName(false)} autoFocus />
                    <button className="icon-btn" onClick={() => setEditingName(false)}><Check size={13} /></button>
                  </>
                ) : (
                  <>
                    <b>{appName || "Unnamed App"}</b>
                    <button className="icon-btn" onClick={() => setEditingName(true)}><Pencil size={12} /></button>
                  </>
                )}
              </div>
            </div>

            <div className="pages-scroll">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={pages} strategy={verticalListSortingStrategy}>
                  {pages.map(page => (
                    <SortablePage
                      key={page} page={page} sections={sections}
                      selectedSections={selectedSections} toggleSection={toggleSection}
                      onAddSection={handleAddSection} onRemovePage={handleRemovePage}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {addingSectionFor && (
                <div style={{ padding: "8px 16px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd", marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0284c7", marginBottom: 6 }}>Add section to "{addingSectionFor}"</div>
                  <InlineAddInput placeholder="Section name…" onConfirm={name => confirmAddSection(addingSectionFor, name)} onCancel={() => setAddingSectionFor(null)} color="#0ea5e9" />
                </div>
              )}
            </div>

            <div className="btn-group">
              {showAddPage
                ? <InlineAddInput placeholder="Page name…" onConfirm={handleAddPage} onCancel={() => setShowAddPage(false)} color="#4f46e5" />
                : <button className="btn" onClick={() => setShowAddPage(true)}>➕ Add Page</button>
              }
              <button className="btn primary" onClick={buildFinalApp}>🚀 Generate Config</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && finalApp && (
        <div className="split-layout">
          <div className="split-left">
            <div className="split-section-header"><Code2 size={16} /><span>App Configuration</span></div>
            <div className="config-meta">
              <div className="config-tag">📱 {finalApp.appName}</div>
              <div className="config-tag">{finalApp.domain}</div>
              <div className="config-tag">🎯 {finalApp.intent}</div>
              <div className="config-tag">📄 {finalApp.pages.length} pages</div>
              {finalApp.brandColor && (
                <div className="config-tag" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: finalApp.brandColor, display: "inline-block", border: "1px solid #e5e7eb" }} />
                  {finalApp.brandColor}
                </div>
              )}
              {finalApp.dnaStyle && <div className="config-tag">✨ {finalApp.dnaStyle}</div>}
            </div>
            <pre className="json-block">{JSON.stringify(finalApp, null, 2)}</pre>
            <div className="split-footer">
              <button className="nav-btn outline" onClick={downloadJSON}><Download size={13} /> Download JSON</button>
              <button className="nav-btn accent" onClick={generateAppStructure}><Zap size={14} /> Generate App Structure</button>
            </div>
          </div>
          <div className="split-right">
            <div className="split-section-header"><Eye size={16} /><span>Live Preview</span></div>
            <div className="preview-scroll">
              <h3 className="preview-app-title">{finalApp.appName}</h3>
              {finalApp.pages.map(page => (
                <div key={page} className="preview-page-card">
                  <div className="preview-page-header">📄 {page}</div>
                  <div className="preview-sections-grid">
                    {finalApp.sections[page]?.map((sec, i) => <div key={i} className="preview-sec-chip">{sec}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4 ── */}
      {step === 4 && (
        <div className="split-layout">
          <div className="split-left gen-left">
            <div className="split-section-header">
              <Code2 size={16} /><span>Generated Files</span>
              {isGenerating   && <span className="gen-badge pulse">Generating…</span>}
              {generationDone && <span className="gen-badge done">✓ Complete</span>}
            </div>

            <div className="gen-progress-list">
              {finalApp?.pages.map(page => {
                const isInProgress = generatingPages.includes(page) && !generatedFiles[page] && !pageErrors[page];
                const isDone       = !!generatedFiles[page];
                const hasError     = !!pageErrors[page];
                return (
                  <div
                    key={page}
                    className={`gen-file-row ${activeFile === page ? "active" : ""} ${(isDone || hasError) ? "file-ready" : ""}`}
                    onClick={() => (isDone || hasError) && setActiveFile(page)}
                  >
                    <span className="file-status-icon">
                      {hasError ? "❌" : isDone ? "✅" : isInProgress ? <Loader2 size={13} className="spin" /> : "⏳"}
                    </span>
                    <span className="file-row-name" style={{ color: hasError ? "#ef4444" : undefined }}>
                      {page.replace(/\s+/g, "")}.jsx
                    </span>
                    {isInProgress && <span className="gen-inline-badge">Generating…</span>}
                  </div>
                );
              })}
            </div>

            {allDone && (
              <div style={{ margin: "10px 12px 0", padding: "10px 14px", borderRadius: 10, background: "linear-gradient(135deg,rgba(34,197,94,0.15),rgba(16,185,129,0.1))", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>🎉</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>All {totalCount} pages ready!</div>
                  <div style={{ fontSize: 11, color: "#86efac", marginTop: 2 }}>Download your full project</div>
                </div>
                <button
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "none", background: isZipping ? "#374151" : "linear-gradient(135deg,#22c55e,#16a34a)", color: "white", fontSize: 12, fontWeight: 700, cursor: isZipping ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}
                >
                  {isZipping ? <><Loader2 size={13} className="spin" /> Zipping…</> : <><Package size={13} /> Download ZIP</>}
                </button>
              </div>
            )}

            {activeFile && generatedFiles[activeFile] && (
              <div className="code-area">
                <div className="code-area-header">
                  <span className="code-filename">{activeFile.replace(/\s+/g, "")}.jsx</span>
                  <button className="btn-sm" onClick={() => navigator.clipboard.writeText(generatedFiles[activeFile])}>Copy</button>
                </div>
                <pre className="code-block">{generatedFiles[activeFile]}</pre>
              </div>
            )}

            {activeFile && (
              <div style={{ padding: "10px 12px 12px" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn primary" onClick={handleProceed}>✅ Proceed</button>
                  <button className="btn" onClick={() => setShowFeedbackBox(v => !v)}>✏️ Need Changes</button>
                </div>
                {showFeedbackBox && (
                  <>
                    <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 11, color: "#16a34a", lineHeight: 1.5 }}>
                      💡 Existing structure is preserved — only your requested change will be applied.
                    </div>
                    <textarea
                      placeholder={`e.g. "Add a banner at the top" or "Change button color to red"`}
                      value={feedback[activeFile] || ""}
                      onChange={e => setFeedback(prev => ({ ...prev, [activeFile]: e.target.value }))}
                      style={{ width: "100%", height: 80, padding: 8, borderRadius: 6, marginTop: 8, border: "1px solid #e5e7eb", fontFamily: "'DM Sans',sans-serif", fontSize: 13, resize: "vertical" }}
                    />
                    <button
                      className="btn"
                      style={{ marginTop: 6, opacity: regenLoading === activeFile || !(feedback[activeFile] || "").trim() ? 0.5 : 1 }}
                      disabled={regenLoading === activeFile || !(feedback[activeFile] || "").trim()}
                      onClick={() => handleRegenerate(activeFile)}
                    >
                      {regenLoading === activeFile ? <><Loader2 size={13} className="spin" /> Applying…</> : "🔄 Apply Change"}
                    </button>
                  </>
                )}
              </div>
            )}

            {!activeFile && !isGenerating && (
              <div className="empty-code-hint">← Select a file to view its code</div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="split-right gen-right">
            <div className="split-section-header" style={{ width: "100%" }}>
              <Eye size={16} /><span>Page Preview</span>
              {activeFile && <span className="preview-page-badge">{activeFile}</span>}
              <div style={{ marginLeft: "auto", display: "flex", gap: 3, background: "rgba(0,0,0,0.06)", borderRadius: 7, padding: 3 }}>
                {["windows","mac"].map(os => (
                  <button
                    key={os}
                    onClick={() => setOsMode(os)}
                    style={{ padding: "4px 12px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, fontFamily: "'DM Sans',sans-serif", background: osMode === os ? "white" : "transparent", color: osMode === os ? "#4f46e5" : "#6b7280", boxShadow: osMode === os ? "0 1px 4px rgba(0,0,0,0.12)" : "none", transition: "all 0.15s" }}
                  >
                    {os === "windows" ? "⊞ Windows" : "🔴🟡🟢 Mac"}
                  </button>
                ))}
              </div>
            </div>

            {activeFile ? (
              <div className="page-preview-frame">
                <DeviceFrame osMode={osMode} appName={finalApp?.appName}>
                  {isGenerating && !generatedFiles[activeFile] && !pageErrors[activeFile]
                    ? <PreviewSkeleton color={finalApp?.brandColor} pageName={activeFile} appName={finalApp?.appName} />
                    : (
                      <LivePreview
                        code={generatedFiles[activeFile]}
                        onRetry={() => retryPage(activeFile)}
                        onNavigate={handlePreviewNavigate}
                        domain={finalApp?.domain}
                      />
                    )
                  }
                </DeviceFrame>
              </div>
            ) : (
              /* ── NO PAGE SELECTED: dark Codora-style loader while generating, hint otherwise ── */
              <div className="preview-empty-state">
                {isGenerating ? (
                  <DarkGeneratingLoader
                    appName={finalApp?.appName}
                    pages={finalApp?.pages || []}
                    generatingPages={generatingPages}
                    generatedFiles={generatedFiles}
                  />
                ) : (
                  <div className="preview-hint">
                    <span className="hint-icon">👈</span>
                    <p>Select a generated file to preview</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}