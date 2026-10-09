import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000";

// Heat intensity levels based on open issue count
function getHeatLevel(openCount) {
  if (openCount >= 5) return { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.18)", glow: "0 0 16px rgba(239,68,68,0.4)" };
  if (openCount >= 3) return { label: "High",     color: "#f97316", bg: "rgba(249,115,22,0.15)", glow: "0 0 12px rgba(249,115,22,0.3)" };
  if (openCount >= 2) return { label: "Medium",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)", glow: "none" };
  if (openCount >= 1) return { label: "Low",      color: "#6366f1", bg: "rgba(99,102,241,0.1)",  glow: "none" };
  return                      { label: "Clear",   color: "#10b981", bg: "rgba(16,185,129,0.08)", glow: "none" };
}

function HeatMap() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    fetch(`${API}/api/issues/heatmap`)
      .then(r => r.json())
      .then(d => { if (d.success) setLocations(d.locations || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxOpen = Math.max(...locations.map(l => Number(l.open_count)), 1);

  return (
    <div className="feed-page">

      {/* ── HEADER ── */}
      <div className="feed-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🗺️</span>
          <span className="feed-logo">Campus Heat Map</span>
        </div>
        <span className="feed-tagline" style={{ marginLeft: "28px" }}>
          Issue hotspots across campus — darker = more active
        </span>
      </div>

      {/* ── LEGEND ── */}
      <div style={{
        display: "flex", gap: "12px", padding: "0 16px 16px",
        flexWrap: "wrap",
      }}>
        {["Critical", "High", "Medium", "Low", "Clear"].map(level => {
          const h = getHeatLevel(level === "Critical" ? 5 : level === "High" ? 3 : level === "Medium" ? 2 : level === "Low" ? 1 : 0);
          return (
            <div key={level} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#888" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: h.color, opacity: 0.8 }} />
              {level}
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="feed-loading">
          <div className="feed-spinner" />
          <p>Loading campus map…</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">🗺️</div>
          <h3>No location data</h3>
          <p>Issue heatmap will appear once complaints are reported.</p>
        </div>
      ) : (
        <div style={{ padding: "0 16px" }}>

          {/* ── GRID MAP ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "10px",
            marginBottom: "24px",
          }}>
            {locations.map(loc => {
              const open = Number(loc.open_count);
              const h    = getHeatLevel(open);
              const intensity = maxOpen > 0 ? open / maxOpen : 0;
              const isSelected = selected?.location === loc.location;

              return (
                <div
                  key={loc.location}
                  onClick={() => setSelected(isSelected ? null : loc)}
                  style={{
                    background: h.bg,
                    border: `1px solid ${h.color}${isSelected ? "" : "55"}`,
                    borderRadius: "14px",
                    padding: "14px 12px",
                    cursor: "pointer",
                    boxShadow: isSelected ? h.glow : "none",
                    transform: isSelected ? "scale(1.03)" : "scale(1)",
                    transition: "all 0.2s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Background intensity fill */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    height: `${intensity * 100}%`,
                    background: `${h.color}18`,
                    pointerEvents: "none",
                  }} />

                  <div style={{ fontWeight: "700", color: "#e2e8f0", fontSize: "14px", marginBottom: "4px" }}>
                    {loc.location}
                  </div>

                  <div style={{ fontSize: "22px", fontWeight: "800", color: h.color }}>
                    {open}
                  </div>
                  <div style={{ fontSize: "11px", color: "#666" }}>open issues</div>

                  <div style={{
                    marginTop: "8px",
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: `${h.color}22`,
                    color: h.color,
                    fontSize: "11px",
                    fontWeight: "600",
                  }}>
                    {h.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── SELECTED DETAIL ── */}
          {selected && (
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "18px",
              marginBottom: "24px",
            }}>
              <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "12px", color: "#e2e8f0" }}>
                📍 {selected.location} — Breakdown
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "12px" }}>
                {[
                  { label: "Total Issues",   value: selected.issue_count,    color: "#e2e8f0" },
                  { label: "Open / Active",  value: selected.open_count,     color: "#f59e0b" },
                  { label: "Resolved",       value: selected.resolved_count,  color: "#10b981" },
                  { label: "Critical",       value: selected.critical_count,  color: "#ef4444" },
                  { label: "High Priority",  value: selected.high_count,      color: "#f97316" },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "10px", padding: "12px",
                  }}>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TABLE ── */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px",
            overflow: "hidden",
            marginBottom: "80px",
          }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 60px 60px 60px",
              padding: "10px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              color: "#555", fontSize: "12px", fontWeight: "600",
            }}>
              <div>Location</div>
              <div style={{ textAlign: "center" }}>Open</div>
              <div style={{ textAlign: "center" }}>Total</div>
              <div style={{ textAlign: "center" }}>Done</div>
            </div>
            {locations.map((loc, i) => {
              const h = getHeatLevel(Number(loc.open_count));
              return (
                <div key={loc.location} style={{
                  display: "grid", gridTemplateColumns: "1fr 60px 60px 60px",
                  padding: "11px 16px",
                  borderBottom: i < locations.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  alignItems: "center",
                  background: selected?.location === loc.location ? "rgba(99,102,241,0.07)" : "transparent",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                  onClick={() => setSelected(selected?.location === loc.location ? null : loc)}
                >
                  <div style={{ fontWeight: "600", color: "#c4c9d6", fontSize: "14px" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: h.color, marginRight: "8px" }} />
                    {loc.location}
                  </div>
                  <div style={{ textAlign: "center", color: h.color, fontWeight: "700" }}>{loc.open_count}</div>
                  <div style={{ textAlign: "center", color: "#888" }}>{loc.issue_count}</div>
                  <div style={{ textAlign: "center", color: "#10b981" }}>{loc.resolved_count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default HeatMap;
