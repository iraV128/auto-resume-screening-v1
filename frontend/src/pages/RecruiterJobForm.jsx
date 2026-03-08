// src/pages/RecruiterJobForm.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiFetch } from "../api";

export default function RecruiterJobForm() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const isEdit = Boolean(jobId);

  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    description: "",
    closingDate: "",
  });

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    let alive = true;

    async function loadEditJob() {
      if (!isEdit) return;

      setLoading(true);
      setToast(null);

      try {
        const job = await apiFetch(`/api/jobs/${jobId}`);
        if (!alive) return;

        setForm({
          title: job.title || "",
          company: job.company || "",
          location: job.location || "",
          description: job.description || "",
          closingDate: job.closing_date || job.closingDate || job.dueDate || "",
        });
      } catch (e) {
        if (!alive) return;
        setToast({ type: "error", msg: e?.message || "Could not load job details." });
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadEditJob();
    return () => {
      alive = false;
    };
  }, [isEdit, jobId]);

  async function onSubmit(e) {
    e.preventDefault();
    setToast(null);
    setLoading(true);

    try {
      if (!form.title.trim() || !form.company.trim() || !form.location.trim() || !form.description.trim() || !form.closingDate) {
        setToast({
          type: "error",
          msg: "Title, company, location, description, and closing date are required.",
        });
        setLoading(false);
        return;
      }

      const payload = {
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        closingDate: form.closingDate,
      };

      if (!isEdit) {
        await apiFetch("/api/jobs", {
          method: "POST",
          body: payload,
        });
        setToast({ type: "success", msg: "Job created successfully." });
      } else {
        await apiFetch(`/api/jobs/${jobId}`, {
          method: "PUT",
          body: payload,
        });
        setToast({ type: "success", msg: "Job updated successfully." });
      }

      navigate("/recruiter/jobs");
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Request failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title={isEdit ? "Edit Job" : "Create Job"} subtitle={isEdit ? "Update your job listing." : "Create a new job listing."}>
      {toast && <div className="card">{toast.msg}</div>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Link className="btn" to="/recruiter/jobs">Back to Jobs</Link>
      </div>

      <form className="card" onSubmit={onSubmit}>
        <div style={{ display: "grid", gap: 10 }}>
          <input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="Title" />
          <input value={form.company} onChange={(e) => updateField("company", e.target.value)} placeholder="Company" />
          <input value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="Location" />
          <input type="date" value={form.closingDate} onChange={(e) => updateField("closingDate", e.target.value)} />
          <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Description" />
          <button className="btn" type="submit" disabled={loading}>{loading ? "Saving..." : isEdit ? "Save Changes" : "Create Job"}</button>
        </div>
      </form>
    </AppShell>
  );
}