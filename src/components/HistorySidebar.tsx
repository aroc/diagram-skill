import { useState, useRef, useEffect } from "react";
import { useHistory, type SavedDiagram } from "../hooks/useHistory";
import type { RendererType } from "../hooks/useDiagram";
import { THEMES } from "../lib/themes";
import { RendererToggle } from "./RendererToggle";

interface HistorySidebarProps {
  activeId: string | null;
  onLoad: (id: string) => void;
  onLoadLive: () => void;
  renderer: RendererType;
  onRendererChange: (r: RendererType) => void;
  themeId: string;
  onThemeChange: (id: string) => void;
  isStatic?: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function HistorySidebar({ activeId, onLoad, onLoadLive, renderer, onRendererChange, themeId, onThemeChange, isStatic, collapsed, onToggleCollapse }: HistorySidebarProps) {
  const { items, save, remove } = useHistory();
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name) return;
    setSaving(true);
    await save(name);
    setSaveName("");
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
  };

  const handleDelete = async (e: React.MouseEvent, item: SavedDiagram) => {
    e.stopPropagation();
    if (confirm(`Delete "${item.name}"?`)) {
      await remove(item.id);
      if (activeId === item.id) {
        onLoadLive();
      }
    }
  };

  const handleOpenFolder = () => {
    fetch("/api/history/open-folder", { method: "POST" });
  };

  const isLive = activeId === null;

  return (
    <div className={`history-sidebar ${collapsed ? "collapsed" : ""}`}>
      {!collapsed && (
        <>
          <div className="renderer-section">
            <div className="section-label">Diagram view mode</div>
            <RendererToggle renderer={renderer} onRendererChange={onRendererChange} />
          </div>

          <div className="theme-section">
            <div className="section-label">Theme</div>
            <select
              className="theme-select"
              value={themeId}
              onChange={(e) => onThemeChange(e.target.value)}
            >
              {Object.values(THEMES).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {!collapsed && !isStatic && (
        <>
          <div className="history-section-header">
            <span>Diagrams</span>
            <button className="sidebar-btn open-folder-btn" onClick={handleOpenFolder} title="Open folder in Finder">
              Open Folder
            </button>
          </div>

          <div className="sidebar-list">
            <div
              className={`sidebar-item current-item ${isLive ? "active" : ""}`}
              onClick={isLive ? undefined : onLoadLive}
            >
              <div className="current-item-label">
                <span className="live-dot" />
                <span className="item-name">Current Diagram</span>
              </div>
              <div className="item-meta">
                diagram.json
                {!isLive && <span className="unsaved-badge">unsaved</span>}
              </div>
              {isLive && (
                <div className="current-item-save" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Save snapshot as..."
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={saving}
                  />
                  <button
                    className="save-btn"
                    onClick={handleSave}
                    disabled={saving || !saveName.trim()}
                  >
                    {saving ? "..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className={`sidebar-item ${activeId === item.id ? "active" : ""}`}
                onClick={() => onLoad(item.id)}
              >
                <div className="item-name">{item.name}</div>
                <div className="item-meta">{item.relativeTime}</div>
                <div className="item-more" ref={openMenuId === item.id ? menuRef : undefined}>
                  <button
                    className="more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === item.id ? null : item.id);
                    }}
                  >
                    &middot;&middot;&middot;
                  </button>
                  {openMenuId === item.id && (
                    <div className="more-menu">
                      <a
                        className="more-menu-item"
                        href={`/api/history/${encodeURIComponent(item.id)}/download`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                        }}
                      >
                        Download
                      </a>
                      <button
                        className="more-menu-item delete-menu-item"
                        onClick={(e) => {
                          setOpenMenuId(null);
                          handleDelete(e, item);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <button className="sidebar-collapse-btn" onClick={onToggleCollapse} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d={collapsed ? "M6 3l5 5-5 5V3z" : "M10 3L5 8l5 5V3z"} />
        </svg>
      </button>
    </div>
  );
}
