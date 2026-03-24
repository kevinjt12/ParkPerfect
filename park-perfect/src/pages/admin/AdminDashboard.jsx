import { useState, useRef, useEffect } from "react";
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
 
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);
 
// ── Dummy Data ────────────────────────────────────────────────────────────────
 
const DUMMY_LOTS = [
  {
    lotID: 1,
    name: "Lot A – Main Street",
    totalSpaces: 120,
    availableSpaces: 34,
    occupancyRate: 71.7,
    peakTime: "2024-03-15 08:00:00",
  },
  {
    lotID: 2,
    name: "Lot B – Riverside",
    totalSpaces: 80,
    availableSpaces: 12,
    occupancyRate: 85.0,
    peakTime: "2024-03-15 09:00:00",
  },
  {
    lotID: 3,
    name: "Lot C – Downtown",
    totalSpaces: 200,
    availableSpaces: 110,
    occupancyRate: 45.0,
    peakTime: "2024-03-15 07:00:00",
  },
  {
    lotID: 4,
    name: "Lot D – Airport",
    totalSpaces: 350,
    availableSpaces: 20,
    occupancyRate: 94.3,
    peakTime: "2024-03-15 06:00:00",
  },
];
 
const DUMMY_TREND = [
  { hour: "06:00", a: 20, b: 55, c: 10, d: 80 },
  { hour: "07:00", a: 45, b: 65, c: 20, d: 88 },
  { hour: "08:00", a: 72, b: 80, c: 35, d: 92 },
  { hour: "09:00", a: 68, b: 85, c: 45, d: 94 },
  { hour: "10:00", a: 60, b: 78, c: 50, d: 91 },
  { hour: "11:00", a: 55, b: 70, c: 48, d: 89 },
  { hour: "12:00", a: 65, b: 75, c: 55, d: 95 },
  { hour: "13:00", a: 70, b: 72, c: 52, d: 93 },
  { hour: "14:00", a: 60, b: 68, c: 45, d: 90 },
  { hour: "15:00", a: 50, b: 60, c: 40, d: 85 },
];
 
const LOT_COLORS = ["#378ADD", "#1D9E75", "#D85A30", "#D4537E"];
const LOT_KEYS = ["a", "b", "c", "d"];
const LOT_LABELS = ["Lot A", "Lot B", "Lot C", "Lot D"];
 
// ── Sub-components ─────────────────────────────────────────────────────────────
 
function StatCard({ label, value, sub, color }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
        borderTop: `4px solid ${color}`,
        minWidth: 0,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
        {label}
      </p>
      <p style={{ margin: "8px 0 4px", fontSize: 28, fontWeight: 700, color: "#111827" }}>
        {value}
      </p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{sub}</p>}
    </div>
  );
}
 
function OccupancyBar({ rate, color }) {
  return (
    <div
      style={{
        background: "#f3f4f6",
        borderRadius: 99,
        height: 8,
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${rate}%`,
          height: "100%",
          background: color,
          borderRadius: 99,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}
 
function LotTable({ lots }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>
          Parking Lots
        </h2>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            {["Lot", "Total", "Available", "Occupancy", "Peak Time"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#6b7280",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lots.map((lot, i) => (
            <tr
              key={lot.lotID}
              style={{ borderTop: "1px solid #f3f4f6" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>
                {lot.name}
              </td>
              <td style={{ padding: "12px 16px", color: "#374151" }}>{lot.totalSpaces}</td>
              <td style={{ padding: "12px 16px", color: "#374151" }}>{lot.availableSpaces}</td>
              <td style={{ padding: "12px 16px", minWidth: 160 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <OccupancyBar rate={lot.occupancyRate} color={LOT_COLORS[i]} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: LOT_COLORS[i], minWidth: 44 }}>
                    {lot.occupancyRate.toFixed(1)}%
                  </span>
                </div>
              </td>
              <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 13 }}>
                {lot.peakTime.split(" ")[1].slice(0, 5)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
 
function TrendChart({ data }) {
  const chartData = {
    labels: data.map((d) => d.hour),
    datasets: LOT_LABELS.map((label, i) => ({
      label,
      data: data.map((d) => d[LOT_KEYS[i]]),
      borderColor: LOT_COLORS[i],
      backgroundColor: LOT_COLORS[i] + "22",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4,
    })),
  };
 
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 12 } } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%` } },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { callback: (v) => `${v}%`, font: { size: 12 }, color: "#9ca3af" },
        grid: { color: "#f3f4f6" },
      },
      x: {
        ticks: { font: { size: 12 }, color: "#9ca3af" },
        grid: { display: false },
      },
    },
  };
 
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
      }}
    >
      <h2 style={{ margin: "0 0 1.25rem", fontSize: 16, fontWeight: 600, color: "#111827" }}>
        Occupancy trend (%)
      </h2>
      <div style={{ height: 260 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
 
function BarComparison({ lots }) {
  const chartData = {
    labels: lots.map((l) => l.name.split("–")[0].trim()),
    datasets: [
      {
        label: "Occupied",
        data: lots.map((l) => l.totalSpaces - l.availableSpaces),
        backgroundColor: "#378ADD",
        borderRadius: 4,
      },
      {
        label: "Available",
        data: lots.map((l) => l.availableSpaces),
        backgroundColor: "#c7dff7",
        borderRadius: 4,
      },
    ],
  };
 
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 12 } } },
    },
    scales: {
      y: {
        ticks: { font: { size: 12 }, color: "#9ca3af" },
        grid: { color: "#f3f4f6" },
      },
      x: {
        ticks: { font: { size: 12 }, color: "#9ca3af" },
        grid: { display: false },
      },
    },
  };
 
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
      }}
    >
      <h2 style={{ margin: "0 0 1.25rem", fontSize: 16, fontWeight: 600, color: "#111827" }}>
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
  const [startDate, setStartDate] = useState("2024-03-01");
  const [endDate, setEndDate] = useState("2024-03-31");
 
  const totalSpaces = DUMMY_LOTS.reduce((s, l) => s + l.totalSpaces, 0);
  const totalAvailable = DUMMY_LOTS.reduce((s, l) => s + l.availableSpaces, 0);
  const totalOccupied = totalSpaces - totalAvailable;
  const avgOccupancy = (
    DUMMY_LOTS.reduce((s, l) => s + l.occupancyRate, 0) / DUMMY_LOTS.length
  ).toFixed(1);
 
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        fontFamily: "'Inter', sans-serif",
        padding: "2rem",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111827" }}>
            Parking Admin Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            Real-time overview of all parking lots
          </p>
        </div>
 
        {/* Date range filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 14,
          }}
        >
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "#374151",
              background: "transparent",
            }}
          />
          <span style={{ color: "#9ca3af" }}>→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "#374151",
              background: "transparent",
            }}
          />
        </div>
      </div>
 
      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: "1.5rem",
        }}
      >
        <StatCard label="Total Spaces" value={totalSpaces} sub="Across all lots" color="#378ADD" />
        <StatCard label="Occupied" value={totalOccupied} sub="Right now" color="#D85A30" />
        <StatCard label="Available" value={totalAvailable} sub="Right now" color="#1D9E75" />
        <StatCard label="Avg Occupancy" value={`${avgOccupancy}%`} sub="All lots combined" color="#D4537E" />
      </div>
 
      {/* Charts row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          marginBottom: "1.5rem",
        }}
      >
        <TrendChart data={DUMMY_TREND} />
        <BarComparison lots={DUMMY_LOTS} />
      </div>
 
      {/* Lot table */}
      <LotTable lots={DUMMY_LOTS} />
 
      <p style={{ textAlign: "center", marginTop: "2rem", fontSize: 12, color: "#d1d5db" }}>
        Showing dummy data — replace DUMMY_LOTS and DUMMY_TREND with real API calls
      </p>
    </div>
  );
}
 