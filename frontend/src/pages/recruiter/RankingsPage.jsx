// src/pages/recruiter/RankingsPage.jsx
// ============================================================
// Wireframe 6: Ranking List (Recruiter/Admin)
// - Shows ranked candidates for a job (scorePercent DESC)
// - Includes: score, top terms, PII removed badge, filters
// - Uses BEST endpoint: GET /api/analysis/ranked-feedback/:jobId
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../../components/Appshell";
import { apiFetch } from "../../api";

export default function RankingsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");              // search by resumeName
  const [minScore, setMinScore] = useState(0); // filter threshold
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        // One call gives rankings + feedback (best for proof/demo)
        const data = await apiFetch(`/api/analysis/ranked-feedback/${jobId}`);
        setRows(data?.results || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [jobId]);

  // Filter rows by name + minimum score
  const filtered = useMemo(() => {
    return rows
      .filter((r) => (r.resumeName || "").toLowerCase().includes(q.toLowerCase()))
      .filter((r) => Number(r.scorePercent || 0) >= Number(minScore || 0));
  }, [rows, q, minScore]);

  return (
    <AppShell
      title={`Ranked Candidates (Job ${jobId})`}
      subtitle="Scores are computed using TF-IDF + Cosine similarity. PII is removed before scoring."
    >
      {/* Filters */}
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

                  <td style={{ fontWeight: 800 }}>{Math.round(r.scorePercent)}%</td>

                  <td className="muted" style={{ fontSize: 13 }}>
                    {(r.topTerms || []).slice(0, 6).join(", ")}
                  </td>

                  {/* Since your ranking uses sanitised text, we show this badge as proof */}
                  <td>
                    <span className="badge badge-ok">PII Removed</span>
                  </td>

                  <td>
                    {/* Wireframe 7: View Candidate Details */}
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
            Note: “PII Removed” is backed by your bias-mitigation logs (FR-13) and stripPII usage.
          </div>
        </div>
      )}
    </AppShell>
  );
}