import { useState, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import client from "../../api/client";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend
);

// ── ParkPerfect Brand Tokens ──────────────────────────────────────────────────
const LOT_COLORS = ["#D72B2B", "#F5A623", "#e05c2a", "#c44f7a"];
const LOT_LABELS_FALLBACK = ["Lot A", "Lot B", "Lot C", "Lot D"];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Format "2024-03-15 08:00:00" → "08:00"
const formatPeakTime = (raw) => {
  if (!raw || raw === "N/A") return "N/A";
  return raw.split(" ")[1]?.slice(0, 5) ?? raw;
};

// Format "2024-03-15 06:00:00" → "06:00" for chart x-axis labels
const formatHourLabel = (raw) => raw.split(" ")[1]?.slice(0, 5) ?? raw;

// Build the trend dataset the chart expects from the API's occupancyRates arrays.
// The API returns per-lot trend arrays with different hour sets, so we merge them
// into a unified hour axis and fill missing values with null.
const buildTrendData = (statistics) => {
  if (!statistics?.length) return { labels: [], datasets: [] };

  // Collect every unique hour string across all lots and sort chronologically
  const hourSet = new Set();
  statistics.forEach((lot) =>
    lot.occupancyRates?.forEach((entry) => hourSet.add(entry.hour))
  );
  const sortedHours = [...hourSet].sort();
  const labels = sortedHours.map(formatHourLabel);

  const datasets = statistics.map((lot, i) => {
    // Build a map of hour → avgAvailableSpaces for quick lookup
    const map = {};
    lot.occupancyRates?.forEach((entry) => {
      map[entry.hour] = entry.avgAvailableSpaces;
    });

    // Convert avgAvailableSpaces → occupancy % so the chart stays 0-100
    const occupancyData = sortedHours.map((hour) => {
      const avail = map[hour];
      if (avail == null || !lot.totalSpaces) return null;
      return parseFloat((((lot.totalSpaces - avail) / lot.totalSpaces) * 100).toFixed(1));
    });

    return {
      label: lot.name?.split("–")[0].trim() ?? `Lot ${i + 1}`,
      data: occupancyData,
      borderColor: LOT_COLORS[i % LOT_COLORS.length],
      backgroundColor: LOT_COLORS[i % LOT_COLORS.length] + "22",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4,
      spanGaps: true,
    };
  });

  return { labels, datasets };
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "#1a1a1a",
      border: "1px solid rgba(255,255,255,0.07)",
      borderTop: `3px solid ${color}`,
      borderRadius: 12,
      padding: "1.25rem 1.5rem",
      minWidth: 0,
    }}>
      <p style={{ margin: 0, fontSize: 13, color: "#888", fontWeight: 500 }}>{label}</p>
      <p style={{ margin: "8px 0 4px", fontSize: 28, fontWeight: 700, color: "#f1f1f1" }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: "#555" }}>{sub}</p>}
    </div>
  );
}

function OccupancyBar({ rate, color }) {
  return (
    <div style={{ background: "#2a2a2a", borderRadius: 99, height: 8, width: "100%", overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(rate, 100)}%`,
        height: "100%",
        background: color,
        borderRadius: 99,
        transition: "width 0.4s ease",
      }} />
    </div>
  );
}

// Loading skeleton card
function SkeletonCard() {
  return (
    <div style={{
      background: "#1a1a1a",
      border: "1px solid rgba(255,255,255,0.07)",
      borderTop: "3px solid #2a2a2a",
      borderRadius: 12,
      padding: "1.25rem 1.5rem",
      minWidth: 0,
    }}>
      {[60, 40, 80].map((w, i) => (
        <div key={i} style={{
          height: i === 1 ? 28 : 12,
          width: `${w}%`,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 6,
          marginBottom: i < 2 ? 12 : 0,
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

function LotTable({ lots }) {
  return (
    <div style={{
      background: "#1a1a1a",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f1f1f1" }}>Parking Lots</h2>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#111" }}>
            {["Lot", "Total", "Available", "Occupancy", "Peak Time"].map((h) => (
              <th key={h} style={{
                padding: "10px 16px", textAlign: "left", fontWeight: 600,
                color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lots.map((lot, i) => (
            <tr
              key={lot.lotID}
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#222")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* lot.name comes directly from the API */}
              <td style={{ padding: "12px 16px", fontWeight: 600, color: "#f1f1f1" }}>{lot.name}</td>
              {/* totalSpaces & availableSpaces come from the ParkingLot model */}
              <td style={{ padding: "12px 16px", color: "#aaa" }}>{lot.totalSpaces ?? "—"}</td>
              <td style={{ padding: "12px 16px", color: "#aaa" }}>{lot.availableSpaces ?? "—"}</td>
              <td style={{ padding: "12px 16px", minWidth: 160 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    {/* occupancyRate comes from calculate_occupancy_rate() */}
                    <OccupancyBar rate={lot.occupancyRate} color={LOT_COLORS[i % LOT_COLORS.length]} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: LOT_COLORS[i % LOT_COLORS.length], minWidth: 44 }}>
                    {lot.occupancyRate?.toFixed(1)}%
                  </span>
                </div>
              </td>
              {/* peakTime comes from calculate_peak_time() */}
              <td style={{ padding: "12px 16px", color: "#555", fontSize: 13 }}>
                {formatPeakTime(lot.peakTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendChart({ data }) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 12 }, color: "#888" } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%` } },
    },
    scales: {
      y: {
        min: 0, max: 100,
        ticks: { callback: (v) => `${v}%`, font: { size: 12 }, color: "#555" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      x: {
        ticks: { font: { size: 12 }, color: "#555" },
        grid: { display: false },
      },
    },
  };

  return (
    <div style={{
      background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "1.25rem 1.5rem",
    }}>
      <h2 style={{ margin: "0 0 1.25rem", fontSize: 16, fontWeight: 600, color: "#f1f1f1" }}>
        Occupancy trend (%)
      </h2>
      <div style={{ height: 260 }}>
        {data.labels?.length
          ? <Line data={data} options={options} />
          : <p style={{ color: "#555", fontSize: 14, margin: 0 }}>No trend data for this date range.</p>
        }
      </div>
    </div>
  );
}

function BarComparison({ lots }) {
  const chartData = {
    labels: lots.map((l) => l.name?.split("–")[0].trim()),
    datasets: [
      {
        label: "Occupied",
        // occupied = totalSpaces - availableSpaces (both from ParkingLot model)
        data: lots.map((l) => (l.totalSpaces ?? 0) - (l.availableSpaces ?? 0)),
        backgroundColor: "#D72B2B",
        borderRadius: 4,
      },
      {
        label: "Available",
        data: lots.map((l) => l.availableSpaces ?? 0),
        backgroundColor: "rgba(215,43,43,0.2)",
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 12 }, color: "#888" } },
    },
    scales: {
      y: {
        ticks: { font: { size: 12 }, color: "#555" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      x: {
        ticks: { font: { size: 12 }, color: "#555" },
        grid: { display: false },
      },
    },
  };

  return (
    <div style={{
      background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "1.25rem 1.5rem",
    }}>
      <h2 style={{ margin: "0 0 1.25rem", fontSize: 16, fontWeight: 600, color: "#f1f1f1" }}>
        Spaces by lot
      </h2>
      <div style={{ height: 220 }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  // Date range state — sent as query params to GET api/admin/statistics/
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate,   setEndDate]   = useState(today);

  // API response state
  const [statistics, setStatistics] = useState([]);  // array from response.statistics
  const [dateRange,  setDateRange]  = useState("");   // string from response.dateRange
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  // ── Fetch statistics from GET api/admin/statistics/?start=...&end=... ────────
  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // client.js automatically attaches the Bearer token from localStorage
      const response = await client.get("admin/statistics/", {
        params: { start: startDate, end: endDate },
      });
      // response.data shape: { dateRange: "...", statistics: [...] }
      setStatistics(response.data.statistics ?? []);
      setDateRange(response.data.dateRange ?? "");
    } catch (err) {
      if (err.response?.status === 403) {
        setError("You do not have permission to view this page.");
      } else {
        setError("Failed to load statistics. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Re-fetch whenever the date range changes
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // ── Aggregate stats (same logic as before, now from real data) ───────────────
  const totalSpaces    = statistics.reduce((s, l) => s + (l.totalSpaces    ?? 0), 0);
  const totalAvailable = statistics.reduce((s, l) => s + (l.availableSpaces ?? 0), 0);
  const totalOccupied  = totalSpaces - totalAvailable;
  const avgOccupancy   = statistics.length
    ? (statistics.reduce((s, l) => s + (l.occupancyRate ?? 0), 0) / statistics.length).toFixed(1)
    : "0.0";

  // Build trend chart data from the occupancyRates arrays in each lot object
  const trendData = buildTrendData(statistics);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background #0f0f0f; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        backgroundImage: `
          linear-gradient(rgba(215,43,43,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(215,43,43,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        fontFamily: "'DM Sans', sans-serif",
        padding: "2rem",
      
      }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "2rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/Park Perfect Logo.png" alt="ParkPerfect" style={{ width: 44, height: 44, objectFit: "contain" }} />
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f1f1f1", letterSpacing: "-0.5px" }}>
                <span style={{ color: "#D72B2B" }}>Park</span>Perfect
                <span style={{ fontSize: 13, fontWeight: 500, color: "#555", marginLeft: 10, letterSpacing: 0 }}>
                  Admin Dashboard
                </span>
              </h1>
              {/* Shows the dateRange string returned by the API e.g. "2024-03-01 to 2024-03-31" */}
              <p style={{ margin: "3px 0 0", color: "#555", fontSize: 13 }}>
                {dateRange ? `Showing: ${dateRange}` : "Real-time overview of all parking lots"}
              </p>
            </div>
          </div>

          {/* Date range filter — changing these triggers a new API call via useEffect */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "8px 14px", fontSize: 14,
          }}>
            <input
              type="date" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: 14, color: "#aaa", background: "transparent" }}
            />
            <span style={{ color: "#D72B2B", fontWeight: 700 }}>→</span>
            <input
              type="date" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: 14, color: "#aaa", background: "transparent" }}
            />
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(215,43,43,0.08)", border: "1px solid rgba(215,43,43,0.25)",
            color: "#f87171", fontSize: 14, padding: "12px 16px",
            borderRadius: 10, marginBottom: "1.5rem",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {error}
          </div>
        )}

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16, marginBottom: "1.5rem",
        }}>
          {loading ? (
            // Show skeletons while fetching
            [0,1,2,3].map((i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard label="Total Spaces"  value={totalSpaces}        sub="Across all lots"   color="#D72B2B" />
              <StatCard label="Occupied"      value={totalOccupied}      sub="Right now"         color="#F5A623" />
              <StatCard label="Available"     value={totalAvailable}     sub="Right now"         color="#e05c2a" />
              <StatCard label="Avg Occupancy" value={`${avgOccupancy}%`} sub="All lots combined" color="#c44f7a" />
            </>
          )}
        </div>

        {/* ── Charts row ───────────────────────────────────────────────────── */}
        {!loading && !error && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16, marginBottom: "1.5rem",
          }}>
            {/* trendData is built from statistics[].occupancyRates arrays */}
            <TrendChart data={trendData} />
            {/* BarComparison uses totalSpaces & availableSpaces per lot */}
            <BarComparison lots={statistics} />
          </div>
        )}

        {/* ── Lot table ────────────────────────────────────────────────────── */}
        {!loading && !error && statistics.length > 0 && (
          <LotTable lots={statistics} />
        )}

        {/* Empty state */}
        {!loading && !error && statistics.length === 0 && (
          <div style={{
            textAlign: "center", padding: "3rem",
            background: "#1a1a1a", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.07)", color: "#555",
          }}>
            No data found for this date range.
          </div>
        )}
      </div>
    </>
  );
}