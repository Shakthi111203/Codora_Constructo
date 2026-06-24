import { useState } from "react";
import { Pencil, Clock, Trash2, FolderOpen } from "lucide-react";

const DOMAIN_ICONS = {
  food:          "🍔",
  wellness:      "💪",
  healthcare:    "🏥",
  education:     "📚",
  services:      "🛠️",
  shopping:      "🛍️",
  ecommerce:     "🛍️",
  travel:        "✈️",
  finance:       "💳",
  "real estate": "🏠",
  realestate:    "🏠",
  logistics:     "🚚",
  social:        "💬",
  general:       "📱",
};

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export { DOMAIN_ICONS, timeAgo };

/* ─── DELETE CONFIRM MODAL ─── */
export function DeleteConfirmModal({ project, onConfirm, onCancel }) {
  if (!project) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes popIn{from{opacity:0;transform:scale(0.93) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 18,
          border: "1px solid #e5e7eb",
          padding: "28px 28px 24px",
          width: 380, maxWidth: "90vw",
          display: "flex", flexDirection: "column", gap: 18,
          boxShadow: "0 32px 64px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.08)",
          animation: "popIn 0.2s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Trash2 size={24} color="#ef4444" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#111827", fontFamily: "'Sora',sans-serif", letterSpacing: "-0.3px" }}>
            Delete this project?
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.65 }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>
              {DOMAIN_ICONS[project.domain] || "📱"} {project.name || "Unnamed App"}
            </span>{" "}
            will be permanently removed from your recent projects. This action cannot be undone.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 12px", borderRadius: 10, background: "#f9fafb", border: "1px solid #f3f4f6" }}>
          <span style={{ fontSize: 11, color: "#6b7280", textTransform: "capitalize" }}>📂 {project.domain}</span>
          <span style={{ fontSize: 11, color: "#d1d5db" }}>·</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{project.pageCount} pages</span>
          <span style={{ fontSize: 11, color: "#d1d5db" }}>·</span>
          <span style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={10} /> {timeAgo(project.createdAt)}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "white", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <Trash2 size={13} /> Delete project
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── RECENT PROJECTS ─── */
export default function RecentProjects({ projects, onRestore, onDelete, onRename }) {
  const [editingId,   setEditingId]   = useState(null);
  const [editingName, setEditingName] = useState("");

  if (!projects.length) return null;

  return (
    <div style={{ width: "100%", maxWidth: 560, margin: "24px auto 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 4px" }}>
        <FolderOpen size={15} color="#6b7280" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Recent Projects</span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>({projects.length})</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="project-card"
            onClick={() => editingId !== proj.id && onRestore(proj)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "white", border: "1px solid #e5e7eb", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#a5b4fc"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(79,70,229,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>{DOMAIN_ICONS[proj.domain] || "📱"}</span>

            <div style={{ flex: 1, minWidth: 0 }}>
              {editingId === proj.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter")  { onRename(proj.id, editingName); setEditingId(null); }
                    if (e.key === "Escape") { setEditingId(null); }
                  }}
                  onBlur={() => { onRename(proj.id, editingName); setEditingId(null); }}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 13, fontWeight: 700, color: "#111827", border: "none", borderBottom: "2px solid #4f46e5", outline: "none", background: "transparent", width: "100%", fontFamily: "'DM Sans',sans-serif" }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                    {proj.name || "Unnamed App"}
                  </span>
                  <button
                    className="rename-btn"
                    onClick={e => { e.stopPropagation(); setEditingId(proj.id); setEditingName(proj.name || ""); }}
                    style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "#eef2ff", color: "#4f46e5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              )}
              <div style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ textTransform: "capitalize" }}>{proj.domain}</span>
                <span>·</span>
                <span>{proj.pageCount} pages</span>
                <span>·</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Clock size={10} /> {timeAgo(proj.createdAt)}
                </span>
              </div>
            </div>

            <button
              onClick={e => { e.stopPropagation(); onDelete(proj.id); }}
              title="Delete project"
              style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#fef2f2", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}