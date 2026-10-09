import { useEffect, useRef, useState } from "react";
import {
    Chart,
    LineElement, PointElement, LineController,
    BarElement, BarController,
    ArcElement, DoughnutController,
    CategoryScale, LinearScale,
    Tooltip, Legend, Filler,
} from "chart.js";
import "./App.css";

Chart.register(
    LineElement, PointElement, LineController,
    BarElement, BarController,
    ArcElement, DoughnutController,
    CategoryScale, LinearScale,
    Tooltip, Legend, Filler
);

const API = "http://localhost:5000";

// ── Colour palettes ──────────────────────────────────────────
const PRIORITY_COLORS = {
    CRITICAL: "#ef4444",
    HIGH:     "#f97316",
    MEDIUM:   "#f59e0b",
    LOW:      "#6366f1",
};

const STATUS_COLORS = {
    PENDING:    "#6366f1",
    VERIFIED:   "#8b5cf6",
    IN_PROGRESS:"#f59e0b",
    RESOLVED:   "#10b981",
    CLOSED:     "#374151",
    REJECTED:   "#ef4444",
};

const CHART_PALETTE = [
    "#6366f1","#8b5cf6","#ec4899","#f43f5e",
    "#f97316","#f59e0b","#10b981","#06b6d4",
];

function kpiCard(icon, label, value, color) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${color}33`,
            borderRadius: "14px",
            padding: "16px",
            textAlign: "center",
            flex: "1 1 130px",
        }}>
            <div style={{ fontSize: "22px", marginBottom: "4px" }}>{icon}</div>
            <div style={{ fontSize: "26px", fontWeight: "800", color }}>{value ?? "—"}</div>
            <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>{label}</div>
        </div>
    );
}

// Reusable canvas chart wrapper
function ChartBox({ title, height = 200, children }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            padding: "18px",
            marginBottom: "16px",
        }}>
            <div style={{ fontWeight: "700", color: "#c4c9d6", marginBottom: "14px", fontSize: "14px" }}>
                {title}
            </div>
            <div style={{ height }}>
                {children}
            </div>
        </div>
    );
}

// ── Hook: create & destroy a Chart.js instance ───────────────
function useChart(ref, config, deps) {
    useEffect(() => {
        if (!ref.current) return;
        const ctx = ref.current.getContext("2d");
        const chart = new Chart(ctx, config);
        return () => chart.destroy();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

// ── Timeline line chart ──────────────────────────────────────
function TimelineChart({ data }) {
    const ref = useRef();
    useChart(ref, {
        type: "line",
        data: {
            labels: data.map(d => new Date(d.day).toLocaleDateString("en-IN", { month: "short", day: "numeric" })),
            datasets: [{
                label: "Issues Reported",
                data:  data.map(d => d.count),
                borderColor: "#6366f1",
                backgroundColor: "rgba(99,102,241,0.12)",
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: "#6366f1",
                fill: true,
                tension: 0.4,
            }],
        },
        options: chartOptions("Issues per Day (last 30 days)"),
    }, [data]);
    return <canvas ref={ref} />;
}

// ── Category doughnut ────────────────────────────────────────
function CategoryChart({ data }) {
    const ref = useRef();
    useChart(ref, {
        type: "doughnut",
        data: {
            labels:   data.map(d => d.category_name),
            datasets: [{
                data:            data.map(d => d.count),
                backgroundColor: CHART_PALETTE,
                borderColor:     "rgba(0,0,0,0.3)",
                borderWidth: 2,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: { color: "#9ca3af", font: { size: 11 }, padding: 12, boxWidth: 12 },
                },
                tooltip: tooltipStyle(),
            },
            cutout: "62%",
        },
    }, [data]);
    return <canvas ref={ref} />;
}

// ── Priority bar ──────────────────────────────────────────────
function PriorityChart({ data }) {
    const ref = useRef();
    useChart(ref, {
        type: "bar",
        data: {
            labels:   data.map(d => d.priority),
            datasets: [{
                label: "Count",
                data:  data.map(d => d.count),
                backgroundColor: data.map(d => PRIORITY_COLORS[d.priority] || "#6366f1"),
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: chartOptions("Issues by Priority"),
    }, [data]);
    return <canvas ref={ref} />;
}

// ── Status horizontal bar ─────────────────────────────────────
function StatusChart({ data }) {
    const ref = useRef();
    useChart(ref, {
        type: "bar",
        data: {
            labels:   data.map(d => d.status.replace("_", " ")),
            datasets: [{
                label: "Count",
                data:  data.map(d => d.count),
                backgroundColor: data.map(d => STATUS_COLORS[d.status] || "#6366f1"),
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: {
            ...chartOptions("Status Pipeline"),
            indexAxis: "y",
        },
    }, [data]);
    return <canvas ref={ref} />;
}

// ── Resolution time bar ───────────────────────────────────────
function ResolutionChart({ data }) {
    const ref = useRef();
    useChart(ref, {
        type: "bar",
        data: {
            labels:   data.map(d => d.category_name),
            datasets: [{
                label: "Avg hours to resolve",
                data:  data.map(d => d.avg_hours),
                backgroundColor: "#10b981",
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: chartOptions("Avg Resolution Time (hours) by Category"),
    }, [data]);
    return <canvas ref={ref} />;
}

// ── Shared chart option helpers ───────────────────────────────
function tooltipStyle() {
    return {
        backgroundColor: "rgba(10,10,20,0.9)",
        titleColor: "#e2e8f0",
        bodyColor:  "#9ca3af",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
    };
}

function chartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: tooltipStyle(),
        },
        scales: {
            x: {
                ticks:  { color: "#6b7280", font: { size: 11 } },
                grid:   { color: "rgba(255,255,255,0.04)" },
                border: { color: "rgba(255,255,255,0.07)" },
            },
            y: {
                ticks:     { color: "#6b7280", font: { size: 11 } },
                grid:      { color: "rgba(255,255,255,0.04)" },
                border:    { color: "rgba(255,255,255,0.07)" },
                beginAtZero: true,
            },
        },
    };
}

// ── Main component ────────────────────────────────────────────
function Analytics({ onBack }) {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API}/api/issues/analytics`)
            .then(r => r.json())
            .then(d => { if (d.success) setData(d); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{
            minHeight: "100vh",
            background: "#07070d",
            overflowY: "auto",
            paddingBottom: "40px",
        }}>

            {/* ── HEADER ── */}
            <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "20px 16px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                position: "sticky", top: 0, zIndex: 10,
                background: "rgba(7,7,13,0.95)",
                backdropFilter: "blur(10px)",
            }}>
                <button onClick={onBack} style={{
                    background: "none", border: "none",
                    color: "#888", fontSize: "20px", cursor: "pointer", padding: "0 4px"
                }}>←</button>
                <span style={{ fontSize: "22px" }}>📊</span>
                <div>
                    <div style={{ fontWeight: "800", color: "#e2e8f0", fontSize: "16px" }}>Analytics</div>
                    <div style={{ color: "#555", fontSize: "11px" }}>Real-time campus issue insights</div>
                </div>
            </div>

            {loading ? (
                <div className="feed-loading" style={{ marginTop: "80px" }}>
                    <div className="feed-spinner" />
                    <p>Loading analytics…</p>
                </div>
            ) : !data ? (
                <div className="feed-empty" style={{ marginTop: "80px" }}>
                    <div className="feed-empty-icon">📊</div>
                    <h3>No data available</h3>
                    <p>Submit some issues first to see analytics.</p>
                </div>
            ) : (
                <div style={{ padding: "16px" }}>

                    {/* ── KPI CARDS ── */}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
                        {kpiCard("📋", "Total Issues",  data.kpis.total,           "#e2e8f0")}
                        {kpiCard("✅", "Resolved",      data.kpis.resolved,         "#10b981")}
                        {kpiCard("⚙️", "In Progress",  data.kpis.in_progress,      "#f59e0b")}
                        {kpiCard("🔴", "Urgent",        data.kpis.urgent,           "#ef4444")}
                        {kpiCard("📈", "Resolution %",  data.kpis.resolution_rate != null ? `${data.kpis.resolution_rate}%` : "0%", "#6366f1")}
                    </div>

                    {/* ── TIMELINE ── */}
                    {data.timeline.length > 0 ? (
                        <ChartBox title="📈 Issues Reported — Last 30 Days" height={190}>
                            <TimelineChart data={data.timeline} />
                        </ChartBox>
                    ) : (
                        <ChartBox title="📈 Issues Reported — Last 30 Days" height={80}>
                            <div style={{ color: "#444", fontSize: "13px", paddingTop: "20px", textAlign: "center" }}>
                                No issues in the last 30 days
                            </div>
                        </ChartBox>
                    )}

                    {/* ── CATEGORY + PRIORITY (side by side on wide screens) ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "0" }}>
                        <ChartBox title="🍩 By Category" height={200}>
                            <CategoryChart data={data.categories} />
                        </ChartBox>
                        <ChartBox title="🔥 By Priority" height={200}>
                            <PriorityChart data={data.priorities} />
                        </ChartBox>
                    </div>

                    {/* ── STATUS FUNNEL ── */}
                    <ChartBox title="🔄 Status Pipeline" height={180}>
                        <StatusChart data={data.statuses} />
                    </ChartBox>

                    {/* ── RESOLUTION TIME ── */}
                    {data.resolution.length > 0 ? (
                        <ChartBox title="⏱️ Avg Resolution Time by Category (hours)" height={190}>
                            <ResolutionChart data={data.resolution} />
                        </ChartBox>
                    ) : (
                        <ChartBox title="⏱️ Avg Resolution Time" height={80}>
                            <div style={{ color: "#444", fontSize: "13px", paddingTop: "20px", textAlign: "center" }}>
                                No resolved issues yet — data will appear once issues are resolved
                            </div>
                        </ChartBox>
                    )}

                </div>
            )}
        </div>
    );
}

export default Analytics;
