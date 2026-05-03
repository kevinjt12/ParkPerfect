import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";

export default function AdminReports() {
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];
  const [start_date, set_start_date] = useState(today);
  const [end_date, set_end_date] = useState(today);

  const [reports, set_reports] = useState([]);
  const [loading, set_loading] = useState(false);
  const [generating, set_generating] = useState(false);
  const [error, set_error] = useState("");
  const [success, set_success] = useState("");

  // ── Fetch existing reports ──────────────────────────────────────────────────
  const fetch_reports = useCallback(async () => {
    set_loading(true);
    set_error("");
    try {
      const response = await client.get("reports/");
      set_reports(response.data ?? []);
    } catch (err) {
      if (err.response?.status === 403) {
        set_error("You do not have permission to view reports.");
      } else {
        set_error("Failed to load reports.");
      }
    } finally {
      set_loading(false);
    }
  }, []);

  useEffect(() => {
    fetch_reports();
  }, [fetch_reports]);

  // ── Generate a new report ───────────────────────────────────────────────────
  const handle_generate = async () => {
    set_generating(true);
    set_error("");
    set_success("");
    try {
      await client.post("reports/generate/", { start_date, end_date });
      set_success("Report generated successfully.");
      fetch_reports();
    } catch {
      set_error("Failed to generate report. Please try again.");
    } finally {
      set_generating(false);
    }
  };

  // ── Export a report ─────────────────────────────────────────────────────────
  const handle_export = async (id) => {
    try {
      const response = await client.get(`reports/${id}/export/`, {
        responseType: "blob",
        //params: {format: "csv"},
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report_${id}.pdf`); // or .csv based on your backend
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      set_error("Failed to export report.");
    }
  };

  const s = {
    page: {
      minHeight: "100vh",
      background: "#0f0f0f",
      backgroundImage: `
        linear-gradient(rgba(215,43,43,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(215,43,43,0.04) 1px, transparent 1px)
      `,
      backgroundSize: "40px 40px",
      fontFamily: "'DM Sans', sans-serif",
      padding: "2rem",
    },
    card: {
      background: "#1a1a1a",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: "1.5rem",
    },
    card_header: {
      padding: "1rem 1.5rem",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
    },
    card_title: { margin: 0, fontSize: 16, fontWeight: 600, color: "#f1f1f1" },
    date_row: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "#111",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10,
      padding: "8px 14px",
    },
    date_input: {
      border: "none", outline: "none",
      fontSize: 14, color: "#aaa", background: "transparent",
    },
    generate_btn: {
      background: "#D72B2B", color: "#fff", border: "none",
      borderRadius: 8, padding: "9px 20px",
      fontSize: 14, fontWeight: 700, cursor: "pointer",
      letterSpacing: "0.03em", transition: "background 0.2s",
    },
    generate_btn_disabled: {
      background: "#7a1a1a", color: "rgba(255,255,255,0.4)",
      border: "none", borderRadius: 8, padding: "9px 20px",
      fontSize: 14, fontWeight: 700, cursor: "not-allowed",
      letterSpacing: "0.03em",
    },
    ghost_btn: {
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "#888", borderRadius: 8,
      padding: "8px 16px", fontSize: 13, fontWeight: 600,
      cursor: "pointer", transition: "border-color 0.2s, color 0.2s",
    },
    alert_error: {
      display: "flex", alignItems: "center", gap: 8,
      background: "rgba(215,43,43,0.08)",
      border: "1px solid rgba(215,43,43,0.25)",
      color: "#f87171", fontSize: 13,
      padding: "10px 14px", borderRadius: 8, marginBottom: "1rem",
    },
    alert_success: {
      display: "flex", alignItems: "center", gap: 8,
      background: "rgba(34,197,94,0.08)",
      border: "1px solid rgba(34,197,94,0.2)",
      color: "#4ade80", fontSize: 13,
      padding: "10px 14px", borderRadius: 8, marginBottom: "1rem",
    },
    th: {
      padding: "10px 16px", textAlign: "left",
      fontWeight: 600, color: "#555", fontSize: 12,
      textTransform: "uppercase", letterSpacing: "0.05em",
      background: "#111",
    },
    td: {
      padding: "12px 16px", color: "#aaa",
      borderTop: "1px solid rgba(255,255,255,0.05)",
    },
    export_btn: {
      background: "transparent",
      border: "1px solid rgba(215,43,43,0.4)",
      color: "#D72B2B", borderRadius: 6,
      padding: "5px 12px", fontSize: 12, fontWeight: 700,
      cursor: "pointer", transition: "background 0.2s",
    },
    view_btn: {
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "#888", borderRadius: 6,
      padding: "5px 12px", fontSize: 12, fontWeight: 700,
      cursor: "pointer", marginRight: 8,
      transition: "border-color 0.2s, color 0.2s",
    },
    empty: { textAlign: "center", padding: "3rem", color: "#555", fontSize: 14 },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #0f0f0f; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>

      <div style={s.page}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/Park Perfect Logo.png" alt="ParkPerfect" style={{ width: 44, height: 44, objectFit: "contain" }} />
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f1f1f1", letterSpacing: "-0.5px" }}>
                <span style={{ color: "#D72B2B" }}>Park</span>Perfect
                <span style={{ fontSize: 13, fontWeight: 500, color: "#555", marginLeft: 10 }}>Reports</span>
              </h1>
              <p style={{ margin: "3px 0 0", color: "#555", fontSize: 13 }}>Generate and export parking reports</p>
            </div>
          </div>
          <button
            style={s.ghost_btn}
            onClick={() => navigate("/admin/dashboard")}
            onMouseEnter={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.3)"; e.target.style.color = "#f1f1f1"; }}
            onMouseLeave={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.color = "#888"; }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* ── Alerts ───────────────────────────────────────────────────────── */}
        {error && (
          <div style={s.alert_error}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div style={s.alert_success}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            {success}
          </div>
        )}

        {/* ── Generate card ─────────────────────────────────────────────────── */}
        <div style={s.card}>
          <div style={s.card_header}>
            <h2 style={s.card_title}>Generate new report</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={s.date_row}>
                <input type="date" value={start_date} onChange={(e) => set_start_date(e.target.value)} style={s.date_input} />
                <span style={{ color: "#D72B2B", fontWeight: 700 }}>→</span>
                <input type="date" value={end_date} onChange={(e) => set_end_date(e.target.value)} style={s.date_input} />
              </div>
              <button
                style={generating ? s.generate_btn_disabled : s.generate_btn}
                disabled={generating}
                onClick={handle_generate}
                onMouseEnter={(e) => { if (!generating) e.target.style.background = "#b52222"; }}
                onMouseLeave={(e) => { if (!generating) e.target.style.background = "#D72B2B"; }}
              >
                {generating ? "Generating…" : "Generate report"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Reports table ─────────────────────────────────────────────────── */}
        <div style={s.card}>
          <div style={s.card_header}>
            <h2 style={s.card_title}>All reports</h2>
            <button
              style={{ ...s.ghost_btn, fontSize: 12, padding: "6px 12px" }}
              onClick={fetch_reports}
              onMouseEnter={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.3)"; e.target.style.color = "#f1f1f1"; }}
              onMouseLeave={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.color = "#888"; }}
            >
              ↺ Refresh
            </button>
          </div>

          {loading ? (
            <div style={s.empty}>Loading reports…</div>
          ) : reports.length === 0 ? (
            <div style={s.empty}>No reports yet. Generate one above.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  {["ID", "Date range", "Created", "Actions"].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.report_id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#222")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...s.td, color: "#f1f1f1", fontWeight: 600 }}>#{report.report_id}</td>
                    <td style={s.td}>{report.date_range?.start ?? "—"} → {report.date_range?.end ?? "—"}</td>
                    <td style={s.td}>
                      {report.created_at ? new Date(report.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td style={s.td}>
                      <button
                        style={s.view_btn}
                        onClick={() => navigate(`/admin/reports/${report.report_id}`)}
                        onMouseEnter={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.3)"; e.target.style.color = "#f1f1f1"; }}
                        onMouseLeave={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.color = "#888"; }}
                      >
                        View
                      </button>
                      <button
                        style={s.export_btn}
                        onClick={() => handle_export(report.report_id)}
                        onMouseEnter={(e) => { e.target.style.background = "rgba(215,43,43,0.1)"; }}
                        onMouseLeave={(e) => { e.target.style.background = "transparent"; }}
                      >
                        Export CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

