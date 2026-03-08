// src/pages/ApplyJob.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser } from "../api";
import AppShell from "../components/AppShell";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function ApplyJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const user = getUser();

    if (!user) {
      navigate("/login", {
        replace: true,
        state: { from: `/jobs/${jobId}/apply` },
      });
      return;
    }

    // Admin / recruiter should not apply
    if (user.role !== "jobseeker") {
      navigate("/dashboard", {
        replace: true,
        state: {
          message: "Only candidates can apply for jobs.",
        },
      });
      return;
    }
  }, [jobId, navigate]);

  useEffect(() => {
    async function load() {
      setLoadingJob(true);
      setError("");

      try {
        const data = await apiFetch(`/api/jobs/${jobId}`);
        setJob(data);
      } catch (e) {
        setError(e?.message || "Failed to load job details.");
      } finally {
        setLoadingJob(false);
      }
    }

    load();
  }, [jobId]);

  const closingDate = job?.dueDate || job?.closing_date || job?.closingDate || null;

  const isClosed = useMemo(() => {
    if (!closingDate) return false;
    return new Date(closingDate) < new Date();
  }, [closingDate]);

  function handleFileChange(e) {
    setError("");
    setSuccess("");

    const file = e.target.files?.[0] || null;
    if (!file) {
      setResumeFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setResumeFile(null);
      setError(`Resume must be ${MAX_FILE_SIZE_MB}MB or smaller.`);
      return;
    }

    setResumeFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const user = getUser();

    if (!user?.id) {
      setError("You must be logged in to apply.");
      return;
    }

    if (user.role !== "jobseeker") {
      setError("Only candidates can apply for jobs.");
      return;
    }

    if (!resumeFile) {
      setError("Please choose a resume file before submitting.");
      return;
    }

    if (isClosed) {
      setError("Applications are closed for this job.");
      return;
    }

    setSubmitting(true);

    try {
      const form = new FormData();
      form.append("resume", resumeFile);

      const uploaded = await apiFetch("/api/resumes/upload", {
        method: "POST",
        body: form,
      });

      const resumeId = uploaded?.id;
      if (!resumeId) throw new Error("Resume uploaded but no resume ID returned.");

      const applied = await apiFetch("/api/applications/apply", {
        method: "POST",
        body: {
          jobId: Number(jobId),
          resumeId: Number(resumeId),
        },
      });

      setSuccess(`Application submitted successfully. Application ID: ${applied?.applicationId || "Created"}`);
      setResumeFile(null);
    } catch (err) {
      setError(err?.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Apply / Upload Resume" subtitle="Upload your resume and submit your application.">
      {loadingJob && <div className="muted">Loading job summary...</div>}
      {error && <div className="btn-error">{error}</div>}

      {!loadingJob && job && (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div>
            <h3>{job.title}</h3>
            <div className="muted">
              Closing date: {closingDate ? new Date(closingDate).toLocaleDateString() : "Not set"}
            </div>
          </div>

          <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {job.description || "No description provided."}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              disabled={isClosed || submitting}
            />

            <button className="btn-primary" type="submit" disabled={submitting || isClosed}>
              {submitting ? "Submitting..." : "Submit Application"}
            </button>

            {success && (
              <div className="btn-ok">
                {success}
                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link className="btn" to="/candidate">Go to Candidate Dashboard</Link>
                  <Link className="btn" to="/">Back to Open Jobs</Link>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </AppShell>
  );
}