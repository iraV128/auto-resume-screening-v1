// src/pages/recruiter/RankingsPage.jsx
// ============================================================
// RANKINGS PAGE
// - Recruiter/Admin view of ranked candidates for a job
// - Uses: GET /api/analysis/ranked-feedback/:jobId
// - Shows score, top matching terms, PII removed badge
// - View details opens candidate-specific ranking/feedback page
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { apiFetch } from "../../api";

export default function RankingsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");              // Search by resume filename/name
  const [minScore, setMinScore] = useState(0); // Minimum score filter
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        // Best endpoint: rankings + feedback summary in one call
        const data = await apiFetch(`/api/analysis/ranked-feedback/${jobId}`);
        setRows(Array.isArray(data?.results) ? data.results : []);
      } catch (e) {
        setError(e?.message || "Failed to load rankings.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [jobId]);

  // Filter rows by candidate name and minimum score
  const filtered = useMemo(() => {
    return rows
      .filter((r) =>
        (r.resumeName || "").toLowerCase().includes(q.toLowerCase())
      )
      .filter((r) => Number(r.scorePercent || 0) >= Number(minScore || 0));
  }, [rows, q, minScore]);

  return (
    <AppShell
      title={`Ranked Candidates (Job ${jobId})`}
      subtitle="Scores are computed using TF-IDF + cosine similarity. PII is removed before scoring."
    >
      {/* Filter controls */}
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <input
            placeholder="Search candidate name (resume filename)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <input
            type="number"
            min="0"
            max="100"
            placeholder="Min score %"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
          />
        </div>

        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          ✅ Transparency: “Top Terms” helps explain why a candidate matched.
        </div>
      </div>

      <div style={{ height: 12 }} />

      {loading && <div className="muted">Loading rankings...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="card">No ranked results yet. Run analysis first.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Candidate (Resume)</th>
                <th>Score %</th>
                <th>Top Terms</th>
                <th>PII</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => (
                <tr key={r.resumeId}>
                  <td>
                    <div style={{ fontWeight: 800 }}>{r.resumeName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Resume ID: {r.resumeId}
                    </div>
                  </td>

                  <td style={{ fontWeight: 800 }}>
                    {Math.round(Number(r.scorePercent || 0))}%
                  </td>

                  <td className="muted" style={{ fontSize: 13 }}>
                    {Array.isArray(r.topTerms)
                      ? r.topTerms.slice(0, 6).join(", ")
                      : ""}
                  </td>

                  {/* Ranking is based on sanitised text / stripPII */}
                  <td>
                    <span className="badge badge-ok">PII Removed</span>
                  </td>

                  <td>
                    <button
                      onClick={() =>
                        navigate(`/recruiter/jobs/${jobId}/candidate/${r.resumeId}`)
                      }
                    >
                      View details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Note: “PII Removed” is backed by bias-mitigation handling in the ranking flow.
          </div>
        </div>
      )}
    </AppShell>
  );
}