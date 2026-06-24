// TemplateGallery.jsx — src/components/TemplateGallery.jsx

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Package, ArrowLeft, RotateCcw, CheckCircle2, Eye, Code2, Pencil, Check, Plus, X, FilePlus } from "lucide-react";
import DarkGeneratingLoader from "./DarkGeneratingLoader";
import DeviceFrame from "./DeviceFrame";
import LivePreview, { PreviewSkeleton } from "./LivePreview";
import InlineAddInput from "./InlineAddInput";
import { generatePage, regeneratePage, buildGeneratePrompt, buildRegeneratePrompt } from "../utils/api";
import { downloadProjectAsZip } from "../utils/zipExport";

/* ── Shared localStorage helpers (same key/shape as App.jsx) ── */
const STORAGE_KEY = "codora_projects";

function saveProjects(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.warn("Could not save project — storage may be full", e);
  }
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* ── Pending page placeholder shown in center when a not-yet-generated page is selected ── */
function PendingPagePlaceholder({ pageName, tplColor }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "#0d0d14",
      backgroundImage: "linear-gradient(rgba(79,70,229,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(79,70,229,0.07) 1px,transparent 1px)",
      backgroundSize: "36px 36px",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 16, fontFamily: "'DM Sans',sans-serif",
    }}>
      <style>{`
        @keyframes ppp-pulse { 0%,100%{opacity:0.4;transform:scale(0.95)} 50%{opacity:1;transform:scale(1)} }
        @keyframes ppp-spin  { to { transform: rotate(360deg); } }
      `}</style>
      {/* Dashed circle */}
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        border: `2px dashed ${tplColor || "#4f46e5"}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "ppp-pulse 2s ease-in-out infinite",
      }}>
        <span style={{ fontSize: 28 }}>⏳</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#c7c7f4" }}>
          {pageName} not generated yet
        </div>
        <div style={{ fontSize: 12, color: "#5b5b8a", marginTop: 6, maxWidth: 280, lineHeight: 1.6 }}>
          Generation stopped before reaching this page.
          Use <span style={{ color: tplColor || "#a78bfa", fontWeight: 600 }}>↺ Re-generate all pages</span> to continue.
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TEMPLATE DATA  (exported so App.jsx can look up by id)
══════════════════════════════════════════════════════ */
export const TEMPLATES = [
  {
    id: "food", emoji: "🍔", label: "Food & Dining", desc: "Menus, orders & delivery",
    appName: "BiteWave", domain: "food", intent: "marketplace app",
    pages: ["Home", "Menu", "Cart", "Checkout", "Orders", "Profile"],
    sections: {
      Home: ["Hero", "Offers", "Featured Items"], Menu: ["Menu List", "Categories"],
      Cart: ["Cart Items", "Summary"], Checkout: ["Address", "Payment"],
      Orders: ["Order History", "Track Order"], Profile: ["User Info", "Settings"],
    },
    color: "#f97316", bg: "#fff7ed", darkColor: "#ea6c0a", tag: "Food",
  },
  {
    id: "health", emoji: "🏥", label: "Healthcare", desc: "Doctors, bookings & records",
    appName: "MediBook", domain: "healthcare", intent: "booking app",
    pages: ["Home", "Doctors", "Appointments", "Records", "Profile"],
    sections: {
      Home: ["Hero", "Find Doctors", "Specialties"],
      Doctors: ["Doctor List", "Filter", "Doctor Profile"],
      Appointments: ["Calendar", "Booking Form", "Upcoming"],
      Records: ["Medical History", "Prescriptions"], Profile: ["User Info", "Insurance"],
    },
    color: "#10b981", bg: "#f0fdf4", darkColor: "#059669", tag: "Health",
  },
  {
    id: "education", emoji: "🎓", label: "Education", desc: "Courses, lessons & progress",
    appName: "LearnFlow", domain: "education", intent: "learning app",
    pages: ["Home", "Courses", "Lessons", "Progress", "Profile"],
    sections: {
      Home: ["Hero", "Recommended Courses", "Continue Learning"],
      Courses: ["Course List", "Categories", "Search"],
      Lessons: ["Video Player", "Notes", "Quiz"],
      Progress: ["Completed Courses", "Stats", "Certificates"],
      Profile: ["User Info", "My Courses"],
    },
    color: "#0ea5e9", bg: "#f0f9ff", darkColor: "#0284c7", tag: "EdTech",
  },
  {
    id: "ecommerce", emoji: "🛍️", label: "E-Commerce", desc: "Products, cart & checkout",
    appName: "ShopWave", domain: "shopping", intent: "marketplace app",
    pages: ["Home", "Products", "Cart", "Checkout", "Orders", "Profile"],
    sections: {
      Home: ["Hero Banner", "Flash Sale", "Featured Products", "Categories"],
      Products: ["Product Grid", "Filters", "Search Bar"],
      Cart: ["Cart Items", "Price Summary"],
      Checkout: ["Delivery Address", "Payment Method", "Order Summary"],
      Orders: ["Active Orders", "Order History"], Profile: ["Account Info", "Wishlist", "Settings"],
    },
    color: "#f59e0b", bg: "#fffbeb", darkColor: "#d97706", tag: "Shopping",
  },
  {
    id: "fitness", emoji: "💪", label: "Fitness", desc: "Workouts, plans & tracking",
    appName: "FitCore", domain: "wellness", intent: "tracking app",
    pages: ["Home", "Workouts", "Progress", "Plans", "Profile"],
    sections: {
      Home: ["Hero", "Daily Goal", "Quick Stats"], Workouts: ["Workout List", "Timer", "Categories"],
      Progress: ["Stats", "Charts", "Achievements"], Plans: ["Plan List", "Plan Detail"],
      Profile: ["User Info", "Settings"],
    },
    color: "#8b5cf6", bg: "#f5f3ff", darkColor: "#7c3aed", tag: "Fitness",
  },
  {
    id: "travel", emoji: "✈️", label: "Travel", desc: "Trips, bookings & itineraries",
    appName: "WanderGo", domain: "travel", intent: "booking app",
    pages: ["Home", "Explore", "Booking", "Trips", "Profile"],
    sections: {
      Home: ["Hero", "Trending Destinations", "Deals"],
      Explore: ["Destination List", "Map View", "Filters"],
      Booking: ["Date Picker", "Passengers", "Payment"],
      Trips: ["Upcoming Trips", "Past Trips", "Itinerary"],
      Profile: ["User Info", "Saved Places"],
    },
    color: "#06b6d4", bg: "#ecfeff", darkColor: "#0891b2", tag: "Travel",
  },
  {
    id: "finance", emoji: "💳", label: "Finance", desc: "Wallet, transactions & budgets",
    appName: "VaultPay", domain: "finance", intent: "tracking app",
    pages: ["Home", "Transactions", "Budget", "Investments", "Profile"],
    sections: {
      Home: ["Balance Card", "Quick Actions", "Recent Transactions"],
      Transactions: ["Transaction List", "Filters", "Categories"],
      Budget: ["Budget Overview", "Spending Chart", "Goals"],
      Investments: ["Portfolio", "Stocks", "Performance"],
      Profile: ["Account Info", "Security", "Settings"],
    },
    color: "#6366f1", bg: "#eef2ff", darkColor: "#4f46e5", tag: "Finance",
  },
  {
    id: "realestate", emoji: "🏠", label: "Real Estate", desc: "Listings, tours & mortgages",
    appName: "NestFind", domain: "real estate", intent: "marketplace app",
    pages: ["Home", "Listings", "Property", "Saved", "Profile"],
    sections: {
      Home: ["Hero Search", "Featured Listings", "Nearby Homes"],
      Listings: ["Property Grid", "Map View", "Filters"],
      Property: ["Photo Gallery", "Details", "Contact Agent", "Virtual Tour"],
      Saved: ["Saved Homes", "Comparisons"],
      Profile: ["User Info", "My Listings", "Inquiries"],
    },
    color: "#ec4899", bg: "#fdf2f8", darkColor: "#db2777", tag: "Real Estate",
  },
  {
    id: "logistics", emoji: "🚚", label: "Logistics", desc: "Shipments, tracking & delivery",
    appName: "SwiftDrop", domain: "logistics", intent: "tracking app",
    pages: ["Home", "Track", "History", "Support", "Profile"],
    sections: {
      Home: ["Hero", "Active Deliveries", "Quick Reorder"],
      Track: ["Live Map", "Driver Info", "ETA Badge"],
      History: ["Past Deliveries", "Invoice Download"],
      Support: ["FAQ", "Chat Support", "Report Issue"],
      Profile: ["User Info", "Addresses", "Payment Methods"],
    },
    color: "#ef4444", bg: "#fef2f2", darkColor: "#dc2626", tag: "Delivery",
  },
  {
    id: "social", emoji: "💬", label: "Social", desc: "Feed, chat, activity & community",
    appName: "Vibe", domain: "social", intent: "communication app",
    pages: ["Home", "Explore", "Messages", "Notifications", "Profile"],
    sections: {
      Home: ["Stories", "Post Feed", "Suggested People"],
      Explore: ["Trending", "Topics", "Search"],
      Messages: ["Chat List", "Chat Window", "Media Shared"],
      Notifications: ["Activity Feed", "Mentions"],
      Profile: ["User Info", "Posts Grid", "Followers"],
    },
    color: "#a855f7", bg: "#faf5ff", darkColor: "#9333ea", tag: "Social",
  },
];

/* ══════════════════════════════════════════════════════
   GENERATION + PREVIEW SCREEN  (exported for App.jsx routing)
══════════════════════════════════════════════════════ */
export function GenerationScreen({ tpl, onBack }) {
  const [pages, setPages] = useState(() => [...tpl.pages]);
  const [allSections, setAllSections] = useState(() => {
    const s = {};
    tpl.pages.forEach(p => { s[p] = [...(tpl.sections[p] || [])]; });
    return s;
  });
  const [activeSections, setActiveSections] = useState(() => {
    const s = {};
    tpl.pages.forEach(p => { s[p] = [...(tpl.sections[p] || [])]; });
    return s;
  });

  const [generatedFiles,  setGeneratedFiles]  = useState({});
  const [pageErrors,      setPageErrors]      = useState({});
  const [generatingPages, setGeneratingPages] = useState([]);
  const [isGenerating,    setIsGenerating]    = useState(false);
  const [generationDone,  setGenerationDone]  = useState(false);
  const [activePage,      setActivePage]      = useState(null);
  const [activeView,      setActiveView]      = useState("preview");
  const [osMode,          setOsMode]          = useState("windows");
  const [feedback,        setFeedback]        = useState({});
  const [regenerating,    setRegenerating]    = useState(null);
  const [isZipping,       setIsZipping]       = useState(false);
  const [approvedPages,   setApprovedPages]   = useState(new Set());

  const [appName,     setAppName]     = useState(tpl.appName);
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef(null);
  useEffect(() => { if (editingName) nameInputRef.current?.focus(); }, [editingName]);

  const [showAddPage,      setShowAddPage]      = useState(false);
  const [addingSectionFor, setAddingSectionFor] = useState(null);

  const currentProjectIdRef = useRef(`proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  const activePages = pages.filter(p => (activeSections[p] || []).length > 0);
  const totalPages  = activePages.length;
  const doneCount   = Object.keys(generatedFiles).length;
  const allDone     = generationDone && doneCount === totalPages;

  /* ── Register window.navigateTo so generated page navbars work ── */
  useEffect(() => {
    window.navigateTo = (pageName) => {
      const match = activePages.find(
        p =>
          p === pageName ||
          p.toLowerCase().replace(/\s+/g, "-") ===
            pageName.toLowerCase().replace(/\s+/g, "-")
      );
      if (match) setActivePage(match);
    };
    return () => { delete window.navigateTo; };
  }, [activePages]);

  /* ── onNavigate handler passed to LivePreview ── */
  const handlePreviewNavigate = (pageName) => {
    const match = activePages.find(
      p =>
        p === pageName ||
        p.toLowerCase().replace(/\s+/g, "-") ===
          pageName.toLowerCase().replace(/\s+/g, "-")
    );
    if (match) setActivePage(match);
  };

  /* ── Auto-save to localStorage so it shows in Recent Projects ── */
  useEffect(() => {
    if (Object.keys(generatedFiles).length === 0) return;

    const id = currentProjectIdRef.current;
    const projectData = {
      id,
      name:      appName || tpl.appName,
      domain:    tpl.domain,
      pageCount: activePages.length,
      createdAt: Date.now(),
      finalApp: {
        appName,
        domain:     tpl.domain,
        intent:     tpl.intent,
        pages:      activePages,
        sections:   activeSections,
        theme:      "modern",
        brandColor: tpl.color,
        dnaStyle:   "",
      },
      generatedFiles,
      activeFile: activePage,
    };

    const existing = loadProjects();
    const others   = existing.filter(p => p.id !== id);
    const updated  = [projectData, ...others].slice(0, 8);
    saveProjects(updated);
  }, [generatedFiles, activePage]);

  /* ── Page management ── */
  const handleAddPage = (name) => {
    if (!name || pages.includes(name)) return;
    setPages(prev => [...prev, name]);
    setAllSections(prev => ({ ...prev, [name]: [] }));
    setActiveSections(prev => ({ ...prev, [name]: [] }));
    setShowAddPage(false);
  };

  const handleRemovePage = (page) => {
    setPages(prev => prev.filter(p => p !== page));
    setAllSections(prev => { const s = { ...prev }; delete s[page]; return s; });
    setActiveSections(prev => { const s = { ...prev }; delete s[page]; return s; });
    if (activePage === page) setActivePage(null);
  };

  const handleAddSection = (page, secName) => {
    if (!secName) return;
    setAllSections(prev => ({ ...prev, [page]: [...(prev[page] || []), secName] }));
    setActiveSections(prev => ({ ...prev, [page]: [...(prev[page] || []), secName] }));
    setAddingSectionFor(null);
  };

  const handleRemoveSection = (page, sec) => {
    setAllSections(prev => ({ ...prev, [page]: (prev[page] || []).filter(s => s !== sec) }));
    setActiveSections(prev => ({ ...prev, [page]: (prev[page] || []).filter(s => s !== sec) }));
  };

  const toggleSection = (page, sec) => {
    setActiveSections(prev => {
      const curr = prev[page] || [];
      return { ...prev, [page]: curr.includes(sec) ? curr.filter(s => s !== sec) : [...curr, sec] };
    });
  };

  /* ── Generation ── */
  useEffect(() => { generateAll(); }, []);

  const generateAll = async () => {
    const pagesToGen = pages.filter(p => (activeSections[p] || []).length > 0);
    if (!pagesToGen.length) return;
    setIsGenerating(true);
    setGeneratedFiles({});
    setPageErrors({});
    setGeneratingPages([]);
    setGenerationDone(false);
    setActivePage(null);
    setApprovedPages(new Set());

    const newFiles  = {};
    const newErrors = {};

    for (const page of pagesToGen) {
      setGeneratingPages(prev => [...prev, page]);
      try {
        const prompt = buildGeneratePrompt({
          page,
          appName,
          domain:   tpl.domain,
          sections: activeSections[page] || [],
          color:    tpl.color,
          allPages: pagesToGen,
        });
        const code = await generatePage(prompt, page);
        newFiles[page] = code;
      } catch (err) {
        newErrors[page] = err.message;
      }
      setGeneratedFiles({ ...newFiles });
      setPageErrors({ ...newErrors });
    }

    setIsGenerating(false);
    setGenerationDone(true);
    setActivePage(pagesToGen.find(p => newFiles[p]) || null);
  };

  /* ── Regenerate with feedback ── */
  const handleRegenerate = async (page) => {
    const fb = (feedback[page] || "").trim();
    if (!fb) return;
    const existingCode = generatedFiles[page] || "";

    setRegenerating(page);
    setPageErrors(prev => { const e = { ...prev }; delete e[page]; return e; });

    try {
      const prompt = buildRegeneratePrompt({
        page,
        appName,
        domain:       tpl.domain,
        sections:     activeSections[page] || [],
        color:        tpl.color,
        existingCode,
        feedback:     fb,
        allPages:     activePages,
      });
      const code = await regeneratePage(prompt, page);
      setGeneratedFiles(prev => ({ ...prev, [page]: code }));
      setApprovedPages(prev => { const s = new Set(prev); s.delete(page); return s; });
    } catch (err) {
      setPageErrors(prev => ({ ...prev, [page]: err.message }));
    }
    setRegenerating(null);
  };

  /* ── Retry a failed page from scratch ── */
  const retryPage = async (page) => {
    setPageErrors(prev => { const e = { ...prev }; delete e[page]; return e; });
    setGeneratingPages(prev => [...prev, page]);
    try {
      const prompt = buildGeneratePrompt({
        page,
        appName,
        domain:   tpl.domain,
        sections: activeSections[page] || [],
        color:    tpl.color,
        allPages: activePages,
      });
      const code = await generatePage(prompt, page);
      setGeneratedFiles(prev => ({ ...prev, [page]: code }));
    } catch (err) {
      setPageErrors(prev => ({ ...prev, [page]: err.message }));
    }
    setGeneratingPages(prev => prev.filter(p => p !== page));
  };

  const approvePage = (page) => {
    setApprovedPages(prev => new Set([...prev, page]));
    const i    = activePages.indexOf(page);
    const next = activePages.slice(i + 1).find(p => generatedFiles[p]);
    if (next) setActivePage(next);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadProjectAsZip(
        { appName, domain: tpl.domain, pages: activePages, sections: activeSections, brandColor: tpl.color },
        generatedFiles
      );
    } catch (e) { alert("ZIP failed: " + e.message); }
    setIsZipping(false);
  };

  const activeIndex = activePages.indexOf(activePage);

  /* ── Helper: what state is the active page in? ── */
  const activePageIsPending = activePage &&
    !generatedFiles[activePage] &&
    !pageErrors[activePage] &&
    !generatingPages.includes(activePage);

  const activePageIsGenerating = activePage &&
    generatingPages.includes(activePage) &&
    !generatedFiles[activePage] &&
    !pageErrors[activePage];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#f0f1fa", display: "flex", flexDirection: "column", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .sidebar-scrollbar::-webkit-scrollbar{width:3px}
        .sidebar-scrollbar::-webkit-scrollbar-thumb{background:#313244;border-radius:4px}
        .remove-btn{opacity:0;transition:opacity 0.15s}
        .page-row:hover .remove-btn,.sec-row:hover .remove-btn{opacity:1}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ height: 56, background: "white", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151", fontFamily: "'DM Sans',sans-serif" }}>
          <ArrowLeft size={14} /> Templates
        </button>
        <span style={{ fontSize: 20 }}>{tpl.emoji}</span>

        {/* Editable app name */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {editingName ? (
            <>
              <input
                ref={nameInputRef}
                value={appName}
                onChange={e => setAppName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") setEditingName(false); if (e.key === "Escape") { setAppName(tpl.appName); setEditingName(false); } }}
                style={{ fontWeight: 700, fontSize: 17, color: tpl.color, fontFamily: "'Sora',sans-serif", border: "none", borderBottom: `2px solid ${tpl.color}`, outline: "none", background: "transparent", width: Math.max(80, appName.length * 11) + "px", padding: "0 2px" }}
              />
              <button onClick={() => setEditingName(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, border: `1px solid ${tpl.color}`, background: `${tpl.color}15`, cursor: "pointer", color: tpl.color }}>
                <Check size={13} />
              </button>
            </>
          ) : (
            <>
              <span style={{ fontWeight: 700, fontSize: 17, color: tpl.color, fontFamily: "'Sora',sans-serif" }}>{appName}</span>
              <button
                onClick={() => setEditingName(true)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", color: "#9ca3af" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = tpl.color; e.currentTarget.style.color = tpl.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#9ca3af"; }}
              >
                <Pencil size={12} />
              </button>
            </>
          )}
        </div>

        <span style={{ fontSize: 11, color: "#9ca3af", background: "#f3f4f6", padding: "2px 10px", borderRadius: 20 }}>{tpl.domain}</span>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 5, marginLeft: 8, alignItems: "center" }}>
          {activePages.map(p => (
            <div
              key={p}
              title={p}
              onClick={() => setActivePage(p)}
              style={{ width: 8, height: 8, borderRadius: "50%", transition: "all 0.3s", cursor: "pointer", background: pageErrors[p] ? "#ef4444" : generatedFiles[p] ? approvedPages.has(p) ? "#22c55e" : tpl.color : generatingPages.includes(p) ? `${tpl.color}55` : "#e5e7eb" }}
            />
          ))}
          <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 4 }}>
            {isGenerating ? `${doneCount}/${totalPages} generating…` : allDone ? `${totalPages} pages ready` : ""}
          </span>
        </div>

        {allDone && (
          <button onClick={handleDownloadZip} disabled={isZipping} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: isZipping ? "#9ca3af" : "linear-gradient(135deg,#22c55e,#16a34a)", color: "white", fontSize: 13, fontWeight: 700, cursor: isZipping ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            {isZipping ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Zipping…</> : <><Package size={14} /> Download ZIP</>}
          </button>
        )}
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{ width: 240, background: "#1e1e2e", borderRight: "1px solid #313244", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "1px solid #313244", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Pages & Sections</span>
            <span style={{ fontSize: 9, color: "#3d3d55", background: "#28283a", padding: "1px 6px", borderRadius: 8 }}>{pages.length} pages</span>
          </div>

          <div className="sidebar-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
            {pages.map(page => {
              const isDone       = !!generatedFiles[page];
              const hasError     = !!pageErrors[page];
              const isInProgress = generatingPages.includes(page) && !isDone && !hasError;
              const isPending    = !isDone && !hasError && !isInProgress && generationDone;
              const isActive     = activePage === page;
              const isApproved   = approvedPages.has(page);
              const pageSections = allSections[page] || [];
              const selectedSecs = activeSections[page] || [];
              const isExcluded   = pageSections.length > 0 && selectedSecs.length === 0;

              return (
                <div key={page} style={{ marginBottom: 6 }}>
                  <div
                    className="page-row"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", borderRadius: 8, background: isActive ? `${tpl.color}22` : "transparent", border: isActive ? `1px solid ${tpl.color}44` : "1px solid transparent", opacity: isExcluded ? 0.4 : 1, transition: "all 0.15s" }}
                  >
                    <span style={{ fontSize: 11, width: 16, flexShrink: 0, textAlign: "center" }}>
                      {isExcluded ? "🚫" : isApproved ? "✅" : hasError ? "❌" : isDone ? "🟢" : isInProgress
                        ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite", color: tpl.color }} />
                        : isPending ? "⏸" : "⏳"}
                    </span>
                    <span
                      onClick={() => !isExcluded && setActivePage(page)}
                      style={{
                        fontSize: 11,
                        fontFamily: "'Fira Code',monospace",
                        color: isActive ? "#e2e8f0"
                          : hasError  ? "#ef4444"
                          : isDone    ? "#a1a1aa"
                          : isPending ? "#6b6b9a"
                          : "#52525b",
                        flex: 1,
                        cursor: isExcluded ? "default" : "pointer",
                        userSelect: "none",
                      }}
                    >
                      {page.replace(/\s+/g, "")}.jsx
                    </span>
                    {isPending && (
                      <span style={{ fontSize: 9, color: "#6b6b9a", background: "#28283a", padding: "1px 5px", borderRadius: 6, flexShrink: 0 }}>
                        skipped
                      </span>
                    )}
                    <button className="remove-btn" onClick={() => handleRemovePage(page)} style={{ width: 16, height: 16, borderRadius: 4, border: "none", background: "#ef444422", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <X size={9} />
                    </button>
                  </div>

                  <div style={{ paddingLeft: 12, paddingBottom: 2 }}>
                    {pageSections.map((sec, i) => {
                      const checked = selectedSecs.includes(sec);
                      return (
                        <div key={i} className="sec-row" style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 6px", borderRadius: 5 }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleSection(page, sec)} style={{ accentColor: tpl.color, cursor: "pointer", width: 10, height: 10, flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: checked ? "#c4c4d4" : "#52525b", textDecoration: checked ? "none" : "line-through", flex: 1 }}>{sec}</span>
                          <button className="remove-btn" onClick={() => handleRemoveSection(page, sec)} style={{ width: 14, height: 14, borderRadius: 3, border: "none", background: "#ef444422", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <X size={8} />
                          </button>
                        </div>
                      );
                    })}

                    {addingSectionFor === page ? (
                      <InlineAddInput placeholder="Section name…" onConfirm={name => handleAddSection(page, name)} onCancel={() => setAddingSectionFor(null)} color={tpl.color} />
                    ) : (
                      <button onClick={() => setAddingSectionFor(page)} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, padding: "3px 6px", borderRadius: 5, border: `1px dashed ${tpl.color}33`, background: "transparent", color: tpl.color, fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", width: "100%", opacity: 0.7 }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                      >
                        <Plus size={9} /> Add section
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 8, padding: "0 4px" }}>
              {showAddPage ? (
                <InlineAddInput placeholder="Page name…" onConfirm={handleAddPage} onCancel={() => setShowAddPage(false)} color={tpl.color} />
              ) : (
                <button onClick={() => setShowAddPage(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "7px 0", borderRadius: 8, border: `1.5px dashed ${tpl.color}44`, background: "transparent", color: tpl.color, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  <FilePlus size={11} /> Add Page
                </button>
              )}
            </div>
          </div>

          {allDone && (
            <div style={{ padding: "10px 14px", borderTop: "1px solid #313244", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 700, marginBottom: 5 }}>{approvedPages.size}/{totalPages} approved</div>
              <div style={{ height: 4, background: "#313244", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#22c55e,#16a34a)", width: `${(approvedPages.size / totalPages) * 100}%`, transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}

          {generationDone && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid #313244", flexShrink: 0 }}>
              <button onClick={generateAll} style={{ width: "100%", padding: "7px 0", borderRadius: 7, border: "none", background: `${tpl.color}22`, color: tpl.color, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                ↺ Re-generate all pages
              </button>
            </div>
          )}
        </div>

        {/* ── CENTER: Preview ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ height: 48, background: "white", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", padding: "0 20px", gap: 10, flexShrink: 0 }}>
            <Eye size={15} color="#6b7280" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Live Preview</span>
            {activePage && (
              <span style={{ fontSize: 11, background: `${tpl.color}18`, color: tpl.color, padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>
                {activePage}
                {activePageIsPending && <span style={{ marginLeft: 6, opacity: 0.6 }}>· pending</span>}
                {activePageIsGenerating && <span style={{ marginLeft: 6, opacity: 0.6 }}>· generating…</span>}
              </span>
            )}

            <div style={{ display: "flex", gap: 3, background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
              {["preview", "code"].map(v => (
                <button key={v} onClick={() => setActiveView(v)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, fontFamily: "'DM Sans',sans-serif", background: activeView === v ? "white" : "transparent", color: activeView === v ? tpl.color : "#6b7280", boxShadow: activeView === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
                  {v === "preview" ? "👁 Preview" : "{ } Code"}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 3, background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
              {[["windows", "⊞ Windows"], ["mac", "🔴🟡🟢 Mac"]].map(([os, label]) => (
                <button key={os} onClick={() => setOsMode(os)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, fontFamily: "'DM Sans',sans-serif", background: osMode === os ? "white" : "transparent", color: osMode === os ? "#4f46e5" : "#6b7280", boxShadow: osMode === os ? "0 1px 4px rgba(0,0,0,0.12)" : "none", transition: "all 0.15s" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {activePage ? (
              /* ─── Page is selected ─── */
              activePageIsPending ? (
                /* Case 1: generation stopped before this page was reached */
                <div style={{ position: "relative", height: "100%", minHeight: 400 }}>
                  <PendingPagePlaceholder pageName={activePage} tplColor={tpl.color} />
                </div>
              ) : activeView === "preview" ? (
                /* Case 2: preview mode — show skeleton while generating, LivePreview when done */
                <DeviceFrame appName={appName} osMode={osMode}>
                  {activePageIsGenerating
                    ? <PreviewSkeleton color={tpl.color} pageName={activePage} />
                    : (
                      <LivePreview
                        code={generatedFiles[activePage]}
                        onRetry={() => retryPage(activePage)}
                        onNavigate={handlePreviewNavigate}
                      />
                    )
                  }
                </DeviceFrame>
              ) : (
                /* Case 3: code view */
                <div style={{ background: "#1e1e2e", borderRadius: 12, border: "1px solid #313244", overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", background: "#181825", borderBottom: "1px solid #313244", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 12, color: "#cba6f7" }}>{activePage.replace(/\s+/g, "")}.jsx</span>
                    <button onClick={() => navigator.clipboard.writeText(generatedFiles[activePage] || "")} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid #313244", background: "transparent", color: "#9ca3af", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Copy</button>
                  </div>
                  <pre style={{ margin: 0, padding: 20, fontSize: 11, lineHeight: 1.7, color: "#cdd6f4", fontFamily: "'Fira Code','Courier New',monospace", overflowX: "auto", whiteSpace: "pre" }}>
                    {activePageIsPending
                      ? `// ${activePage}.jsx was not generated.\n// Generation stopped before reaching this page.\n// Click "↺ Re-generate all pages" to continue.`
                      : generatedFiles[activePage] || pageErrors[activePage] || ""}
                  </pre>
                </div>
              )
            ) : isGenerating ? (
              /* ─── No page selected + still generating: show the full dark loader ─── */
              <div style={{ position: "relative", height: "100%", minHeight: 400 }}>
                <DarkGeneratingLoader
                  appName={appName}
                  pages={activePages}
                  generatingPages={generatingPages}
                  generatedFiles={generatedFiles}
                />
              </div>
            ) : (
              /* ─── No page selected + idle ─── */
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: 14 }}>← Select a page to preview</div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Feedback Panel ── */}
        {activePage && (generatedFiles[activePage] || pageErrors[activePage]) && (
          <div style={{ width: 280, background: "white", borderLeft: "1px solid #e5e7eb", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
            <div style={{ padding: "13px 16px", borderBottom: "1px solid #e5e7eb", fontSize: 13, fontWeight: 600, color: "#374151", background: "#fafafa", flexShrink: 0 }}>
              ✏️ Request Changes
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 7 }}>{activePage} · Active sections</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {(activeSections[activePage] || []).map((s, i) => (
                    <span key={i} style={{ fontSize: 10, background: `${tpl.color}14`, color: tpl.color, border: `1px solid ${tpl.color}33`, padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>{s}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 11, color: "#16a34a", lineHeight: 1.5 }}>
                💡 Existing structure is preserved. Only your requested change will be applied.
              </div>

              <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 6 }}>Describe what to change</label>
              <textarea
                placeholder={`e.g. "Add a banner at the top with a discount offer" or "Change the hero button color to red"`}
                value={feedback[activePage] || ""}
                onChange={e => setFeedback(prev => ({ ...prev, [activePage]: e.target.value }))}
                style={{ width: "100%", height: 120, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 12, fontFamily: "'DM Sans',sans-serif", color: "#374151", resize: "vertical", lineHeight: 1.6, outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = tpl.color}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
              <button
                onClick={() => handleRegenerate(activePage)}
                disabled={!!regenerating || !(feedback[activePage] || "").trim()}
                style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", marginTop: 10, background: (regenerating || !(feedback[activePage] || "").trim()) ? "#f3f4f6" : `linear-gradient(135deg,${tpl.color},${tpl.color}cc)`, color: (regenerating || !(feedback[activePage] || "").trim()) ? "#9ca3af" : "white", fontSize: 13, fontWeight: 700, cursor: (regenerating || !(feedback[activePage] || "").trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'DM Sans',sans-serif" }}
              >
                {regenerating === activePage ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Applying change…</> : <><RotateCcw size={13} /> Apply Change</>}
              </button>

              <div style={{ height: 1, background: "#f3f4f6", margin: "12px 0" }} />

              <button
                onClick={() => approvePage(activePage)}
                disabled={approvedPages.has(activePage) || !!pageErrors[activePage]}
                style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: approvedPages.has(activePage) ? "1.5px solid #bbf7d0" : "none", background: approvedPages.has(activePage) ? "#f0fdf4" : "linear-gradient(135deg,#22c55e,#16a34a)", color: approvedPages.has(activePage) ? "#16a34a" : "white", fontSize: 13, fontWeight: 700, cursor: approvedPages.has(activePage) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'DM Sans',sans-serif" }}
              >
                <CheckCircle2 size={13} />{approvedPages.has(activePage) ? "Approved ✓" : "Looks Good — Approve"}
              </button>
            </div>

            <div style={{ padding: "10px 14px", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { if (activeIndex > 0) setActivePage(activePages[activeIndex - 1]); }} disabled={activeIndex <= 0} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "white", color: "#374151", fontSize: 12, fontWeight: 500, cursor: activeIndex <= 0 ? "not-allowed" : "pointer", opacity: activeIndex <= 0 ? 0.4 : 1, fontFamily: "'DM Sans',sans-serif" }}>← Prev</button>
                <button onClick={() => { if (activeIndex < activePages.length - 1) setActivePage(activePages[activeIndex + 1]); }} disabled={activeIndex >= activePages.length - 1} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: activeIndex >= activePages.length - 1 ? "#e5e7eb" : tpl.color, color: activeIndex >= activePages.length - 1 ? "#9ca3af" : "white", fontSize: 12, fontWeight: 700, cursor: activeIndex >= activePages.length - 1 ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>Next →</button>
              </div>
              {allDone && approvedPages.size === totalPages && (
                <button onClick={handleDownloadZip} disabled={isZipping} style={{ width: "100%", marginTop: 8, padding: "9px 0", borderRadius: 8, border: "none", background: isZipping ? "#9ca3af" : "linear-gradient(135deg,#22c55e,#16a34a)", color: "white", fontSize: 13, fontWeight: 700, cursor: isZipping ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'DM Sans',sans-serif" }}>
                  {isZipping ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Zipping…</> : <><Package size={13} /> Download ZIP</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TEMPLATE GALLERY — card rail  (default export)
══════════════════════════════════════════════════════ */
export default function TemplateGallery() {
  const navigate = useNavigate();
  const [hovered,  setHovered]  = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef   = useRef(null);
  const animRef     = useRef(null);
  const posRef      = useRef(0);
  const pauseTimer  = useRef(null);   // auto-resume after manual scroll
  const touchStartX = useRef(0);      // touch drag tracking

  /* ── Auto-scroll loop ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const speed = 0.6;
    const step = () => {
      if (!isPaused) {
        posRef.current += speed;
        if (posRef.current >= el.scrollWidth / 2) posRef.current = 0;
        el.scrollLeft = posRef.current;
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPaused]);

  /* ── Prevent native scroll on wheel so we can handle it ourselves ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prevent = (e) => e.preventDefault();
    el.addEventListener("wheel", prevent, { passive: false });
    return () => el.removeEventListener("wheel", prevent);
  }, []);

  /* ── Manual scroll handler: advance posRef, pause, then auto-resume after 2s ── */
  const handleUserScroll = (delta) => {
    const el = scrollRef.current;
    if (!el) return;
    posRef.current = Math.max(0, posRef.current + delta);
    // Wrap around if the user scrolled past the halfway point
    if (posRef.current >= el.scrollWidth / 2) posRef.current = 0;
    el.scrollLeft = posRef.current;
    setIsPaused(true);
    clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => setIsPaused(false), 2000);
  };

  const items = [...TEMPLATES, ...TEMPLATES];

  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 18, borderRadius: 4, background: "linear-gradient(to bottom,#6366f1,#8b5cf6)" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", letterSpacing: "-0.2px" }}>Quick-start templates</span>
          <span style={{ fontSize: 11, color: "#9ca3af", background: "#f3f4f6", padding: "2px 8px", borderRadius: 12, fontWeight: 500 }}>{TEMPLATES.length} categories</span>
        </div>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>Hover to explore →</span>
      </div>

      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid #ebebf0", background: "linear-gradient(135deg,#fafafe 0%,#f4f4fc 100%)", boxShadow: "0 2px 16px rgba(99,102,241,0.06)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 48, background: "linear-gradient(to right,rgba(250,250,254,1),transparent)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 48, background: "linear-gradient(to left,rgba(244,244,252,1),transparent)", zIndex: 2, pointerEvents: "none" }} />

        <div
          ref={scrollRef}
          style={{ display: "flex", overflowX: "hidden", padding: "16px 20px", scrollbarWidth: "none", cursor: "grab" }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => {
            setIsPaused(false);
            clearTimeout(pauseTimer.current);
          }}
          onWheel={(e) => {
            // delta: prefer horizontal (trackpad), fall back to vertical (mouse wheel)
            handleUserScroll(e.deltaX !== 0 ? e.deltaX : e.deltaY);
          }}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchMove={(e) => {
            const dx = touchStartX.current - e.touches[0].clientX;
            touchStartX.current = e.touches[0].clientX;
            handleUserScroll(dx);
          }}
        >
          {items.map((tpl, idx) => {
            const key   = `${tpl.id}-${idx}`;
            const isHov = hovered === key;
            return (
              <button
                key={key}
                onClick={() => navigate(`/template/${tpl.id}`)}
                onMouseEnter={() => { setHovered(key); setIsPaused(true); }}
                onMouseLeave={() => { setHovered(null); setIsPaused(false); }}
                style={{ flexShrink: 0, width: 160, marginRight: 10, padding: 0, borderRadius: 14, border: "none", background: "transparent", cursor: "pointer", outline: "none", transition: "transform 0.2s ease", transform: isHov ? "translateY(-4px) scale(1.02)" : "none" }}
              >
                <div style={{ borderRadius: 14, overflow: "hidden", border: isHov ? `1.5px solid ${tpl.color}55` : "1.5px solid #eaeaf0", background: isHov ? tpl.bg : "white", boxShadow: isHov ? `0 12px 32px ${tpl.color}20,0 2px 8px rgba(0,0,0,0.06)` : "0 1px 4px rgba(0,0,0,0.05)", transition: "all 0.2s ease", height: 220, display: "flex", flexDirection: "column" }}>
                  <div style={{ height: 64, background: isHov ? `linear-gradient(135deg,${tpl.color}22,${tpl.color}10)` : "linear-gradient(135deg,#f4f4f8,#ededf5)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: -10, right: -10, width: 50, height: 50, borderRadius: "50%", background: isHov ? `${tpl.color}15` : "rgba(0,0,0,0.04)" }} />
                    <div style={{ position: "absolute", bottom: -8, left: -8, width: 30, height: 30, borderRadius: "50%", background: isHov ? `${tpl.color}10` : "rgba(0,0,0,0.02)" }} />
                    <span style={{ fontSize: 28, position: "relative", zIndex: 1, filter: isHov ? "none" : "grayscale(20%)", lineHeight: 1 }}>{tpl.emoji}</span>
                  </div>
                  <div style={{ padding: "12px 14px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", fontSize: 9, fontWeight: 700, color: isHov ? tpl.color : "#9ca3af", background: isHov ? `${tpl.color}12` : "#f3f4f6", padding: "2px 7px", borderRadius: 20, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px", transition: "all 0.2s", alignSelf: "flex-start" }}>
                      {tpl.tag}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isHov ? tpl.darkColor : "#1f2937", marginBottom: 4, lineHeight: 1.2, fontFamily: "'Sora',sans-serif", transition: "color 0.2s" }}>{tpl.label}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>{tpl.desc}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 8 }}>
                      <span style={{ fontSize: 10, color: isHov ? tpl.color : "#6b7280", fontWeight: 600 }}>{tpl.pages.length} pages</span>
                      <div style={{ width: 22, height: 22, borderRadius: 8, background: isHov ? tpl.color : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5h6M6 3l2 2-2 2" stroke={isHov ? "white" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <style>{`div::-webkit-scrollbar{display:none;}`}</style>
    </div>
  );
}