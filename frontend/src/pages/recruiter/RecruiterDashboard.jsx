// src/pages/recruiter/RecruiterDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { apiFetch } from "../../api";

const LS_LAST_ANALYSIS = "recruiter:lastAnalysis";


function readLastAnalysis() {
  try {
    const raw = localStorage.getItem(LS_LAST_ANALYSIS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatMs(ms) {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${Math.round(ms / 100) / 10} s`;
}

function formatRelative(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day(s) ago`;
}

export default function RecruiterDashboard() {
  const location = useLocation();
  const redirectMessage = location.state?.message || "";

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalApplications: 0,
    avgMatchScore: null,
    topSkill: null,
    newCount: 0,
    pendingCount: 0,
  });

  const [lastAnalysis, setLastAnalysis] = useState(readLastAnalysis());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_LAST_ANALYSIS) setLastAnalysis(readLastAnalysis());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      try {
        const d = await apiFetch("/api/jobs/recruiter/metrics");

        if (!alive) return;

        setMetrics({
          totalApplications: Number(d.totalApplications ?? 0),
          avgMatchScore:
            d.avgMatchScore === null || d.avgMatchScore === undefined
              ? null
              : Number(d.avgMatchScore),
          topSkill: Array.isArray(d.topSkills) && d.topSkills.length > 0 ? d.topSkills[0].term : null,
          newCount: Number(d.newApplications ?? 0),
          pendingCount: Number(d.pendingAnalysis ?? 0),
        });
      } catch {
        if (!alive) return;
        setMetrics({
          totalApplications: 0,
          avgMatchScore: null,
          topSkill: null,
          newCount: 0,
          pendingCount: 0,
        });
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const avgMatchScoreText = useMemo(() => {
    if (metrics.avgMatchScore === null || Number.isNaN(metrics.avgMatchScore)) return "—";
    return `${Math.round(metrics.avgMatchScore)}%`;
  }, [metrics.avgMatchScore]);

  return (
    <AppShell title="Recruiter Dashboard" subtitle="Overview of your jobs, applications, and analysis performance.">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Link className="btn" to="/recruiter/jobs">Create / Manage Jobs</Link>
        <Link className="btn" to="/recruiter/jobs">Analyse Jobs</Link>
      </div>

      {redirectMessage && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            border: "1px solid rgba(255,255,255,0.18)"
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Notice</div>
          <div className="muted">{redirectMessage}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div className="card">
          <div className="muted">Total Applications</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{loading ? "…" : metrics.totalApplications}</div>
        </div>

        <div className="card">
          <div className="muted">Avg Match Score</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{loading ? "…" : avgMatchScoreText}</div>
        </div>

        <div className="card">
          <div className="muted">Top Skill Frequency</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{loading ? "…" : metrics.topSkill || "—"}</div>
        </div>

        <div className="card">
          <div className="muted">Analysis Time</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{formatMs(lastAnalysis?.durationMs)}</div>
          <div className="muted">Last analysed: {formatRelative(lastAnalysis?.atISO)}</div>
        </div>
      </div>
    </AppShell>
  );
}