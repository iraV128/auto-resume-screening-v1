// src/pages/recruiter/CandidateDetails.jsx
// ============================================================
// Wireframe 7: Candidate Details + Feedback (Recruiter/Admin)
// - Shows strengths/gaps/summary (FR-10)
// - Shows transparency panel (top terms + score)
// - Uses GET /api/analysis/feedback/:jobId/:resumeId
// ============================================================

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../../components/Appshell";
import { apiFetch } from "../../api";

export default function CandidateDetails() {
  const { jobId, resumeId } = useParams();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState(null);
  const [rankingRow, setRankingRow] = useState(null); // for score/topTerms
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        // 1) Feedback for this resume
        const f = await apiFetch(`/api/analysis/feedback/${jobId}/${resumeId}`);
        setFeedback(f);

        // 2) Pull ranking list and find this resume (simple approach)
        // If you want, we can add a dedicated endpoint later: /rankings/:jobId/:resumeId
        const rankings = await apiFetch(`/api/analysis/rankings/${jobId}`);
        const row = (rankings || []).find((x) => Number(x.resumeId) === Number(resumeId));
        setRankingRow(row || null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [jobId, resumeId]);

    // ✅ UI helper: choose badge color based on score (HD polish)
    function getScoreClass(score) {
    if (score >= 70) return "score-high";
    if (score >= 40) return "score-medium";
    return "score-low";
    }

  return (
    <AppShell
      title="Candidate Details"
      subtitle="Explainable match score + feedback (strengths, gaps, summary)."
    >
      <button onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>
        ← Back
      </button>

      {loading && <div className="muted">Loading candidate details...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && feedback && (
        <div className="grid dashboard-2col">
          {/* Left: Feedback */}
          <div className="card">
            <h3>{feedback.resumeName}</h3>

            {/* Match Score */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <span className="badge badge-ok">PII Removed</span>
              {rankingRow?.scorePercent != null && (
                <span className={`badge ${getScoreClass(Math.round(rankingRow.scorePercent))}`}>
                    Match Score: {Math.round(rankingRow.scorePercent)}%
                </span>
                 )}    
            </div>

            <div style={{ height: 12 }} />

            <h3 style={{ marginTop: 0 }}>✅ Strengths</h3>
            <ul>
              {(feedback.strengths || []).map((s, idx) => (
                <li key={idx} className="muted">{s}</li>
              ))}
              {(feedback.strengths || []).length === 0 && (
                <li className="muted">No strengths generated.</li>
              )}
            </ul>

            <h3>⚠ Gaps</h3>
            <ul>
              {(feedback.gaps || []).map((g, idx) => (
                <li key={idx} className="muted">{g}</li>
              ))}
              {(feedback.gaps || []).length === 0 && (
                <li className="muted">No gaps generated.</li>
              )}
            </ul>

            <h3>📝 Summary</h3>
            <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
              {feedback.summary || "No summary generated."}
            </div>
          </div>

          {/* Right: Explainability / Transparency */}
          <div className="grid">
            <div className="card">
              <h3>🔎 Transparency</h3>
              <div className="muted" style={{ fontSize: 13 }}>
                Explains why the score was produced (TF-IDF top terms).
              </div>

              <div style={{ height: 10 }} />

              <div className="card" style={{ padding: 10 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Top Terms (from ranking)
                </div>

                <div style={{ marginTop: 8 }}>
                  {rankingRow?.scorePercent != null && (
                    <span
                        className={`badge ${getScoreClass(
                        Math.round(rankingRow.scorePercent)
                        )}`}
                    >
                        Match Score: {Math.round(rankingRow.scorePercent)}%
                    </span>
                    )}
                </div>
              </div>

              <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                Bias mitigation proof exists in logs:
                BIAS_MITIGATION_USED_FOR_RANKING events are recorded during ranking.
              </div>
            </div>

            {/* Simple chart placeholder (Wireframe 7) */}
            <div className="card">
              <h3>📊 Visual Match (Placeholder)</h3>
              <div className="muted" style={{ fontSize: 13 }}>
                (Optional enhancement) Replace this box later with a bar chart or radar chart.
              </div>
              <div style={{ height: 120 }} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}