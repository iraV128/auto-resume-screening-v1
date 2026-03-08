// src/pages/recruiter/CandidateDetails.jsx
// ============================================================
// CANDIDATE DETAILS + FEEDBACK
// ------------------------------------------------------------
// Recruiter/Admin page
// - Shows strengths, gaps, and summary (FR-10)
// - Shows score + transparency panel
// - Lets recruiter download the uploaded resume
// - Uses:
//   GET /api/analysis/feedback/:jobId/:resumeId
//   GET /api/analysis/rankings/:jobId
//   GET /api/resumes/:id/download
// ============================================================

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { apiFetch, getToken } from "../../api";

export default function CandidateDetails() {
  const { jobId, resumeId } = useParams();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState(null);
  const [rankingRow, setRankingRow] = useState(null); // holds score + topTerms
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const rankings = await apiFetch(`/api/analysis/rankings/${jobId}`);
        const row = (rankings || []).find(
          (x) => Number(x.resumeId) === Number(resumeId)
        );

        setRankingRow(row || null);

        try {
          const f = await apiFetch(`/api/analysis/feedback/${jobId}/${resumeId}`);
          setFeedback(f);
        } catch {
          // Rankings exist, but feedback is missing
          setFeedback({
            resumeName: row?.resumeName || `Resume ${resumeId}`,
            strengths: [],
            gaps: [],
            summary: "Feedback has not been generated yet for this candidate.",
          });
        }
      } catch (e) {
        setError(e?.message || "Failed to load candidate details.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [jobId, resumeId]);

  function getScoreClass(score) {
    if (score >= 70) return "score-high";
    if (score >= 40) return "score-medium";
    return "score-low";
  }

  const scoreValue =
    rankingRow?.scorePercent != null
      ? Math.round(Number(rankingRow.scorePercent || 0))
      : null;

  const topTerms = Array.isArray(rankingRow?.topTerms)
    ? rankingRow.topTerms
    : [];

  const [downloadError, setDownloadError] = useState("");

  async function handleDownloadResume() {
  try {
    setDownloadError("");

    const token = getToken();
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5050";

    const res = await fetch(`${apiBase}/api/resumes/${resumeId}/download`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      let message = "Failed to download resume.";
      try {
        const data = await res.json();
        message = data?.error || message;
      } catch {}
      throw new Error(message);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = feedback?.resumeName || `resume-${resumeId}`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (e) {
    setDownloadError(e?.message || "Failed to download resume.");
  }
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
          <div className="card">
            <h3>{feedback.resumeName || `Resume ${resumeId}`}</h3>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              <span className="badge badge-ok">PII Removed</span>

              {scoreValue != null && (
                <span className={`badge ${getScoreClass(scoreValue)}`}>
                  Match Score: {scoreValue}%
                </span>
              )}
            </div>

            <div style={{ height: 12 }} />

            <h3 style={{ marginTop: 0 }}>✅ Strengths</h3>
            <ul>
              {(feedback.strengths || []).map((s, idx) => (
                <li key={idx} className="muted">
                  {s}
                </li>
              ))}
              {(feedback.strengths || []).length === 0 && (
                <li className="muted">No strengths generated.</li>
              )}
            </ul>

            <h3>⚠ Gaps</h3>
            <ul>
              {(feedback.gaps || []).map((g, idx) => (
                <li key={idx} className="muted">
                  {g}
                </li>
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

          <div className="grid">
            <div className="card">
              <h3>🔎 Transparency</h3>
              <div className="muted" style={{ fontSize: 13 }}>
                Explains why the score was produced using ranking evidence.
              </div>

              <div style={{ height: 10 }} />

              <div className="card" style={{ padding: 10 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Top Terms (from ranking)
                </div>

                <div style={{ marginTop: 8 }}>
                  {scoreValue != null && (
                    <span className={`badge ${getScoreClass(scoreValue)}`}>
                      Match Score: {scoreValue}%
                    </span>
                  )}
                </div>

                <div className="muted" style={{ marginTop: 10 }}>
                  {topTerms.length > 0
                    ? topTerms.join(", ")
                    : "No top terms available."}
                </div>
              </div>

              <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                Bias mitigation proof exists in logs:
                BIAS_MITIGATION_USED_FOR_RANKING events are recorded during ranking.
              </div>
            </div>

            <div className="card">
              <h3>📄 Resume Access</h3>
              <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                Recruiters can download the uploaded resume to manually review the candidate.
              </div>

              <div className="muted" style={{ marginBottom: 12 }}>
                File: <b>{feedback.resumeName || `Resume ${resumeId}`}</b>
              </div>

              <button className="btn" onClick={handleDownloadResume}>
                Download Resume
              </button>
              
              {downloadError && (
                <div className="error" style={{ marginTop: 10 }}>
                  {downloadError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}