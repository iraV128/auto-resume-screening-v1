// frontend/src/pages/Privacy.jsx
// -----------------------------------------------------------------------------
// Privacy / Ethics page (HD evidence)
// Purpose:
// - Explain what data we collect, why we collect it, and how we protect it.
// - Supports ethical AI + transparency claims in the report.
// -----------------------------------------------------------------------------

import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 6 }}>Why We Collect This Data</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Transparency notice for candidates and recruiters using the Automated Resume Screening Tool.
      </p>

      <div className="card" style={{ padding: 16, display: "grid", gap: 14 }}>
        <section>
          <h3 style={{ marginBottom: 6 }}>What data we collect</h3>
          <ul className="muted" style={{ marginTop: 0 }}>
            <li>Account information (email, role) for authentication and access control.</li>
            <li>Resumes uploaded by candidates (for parsing and matching to job descriptions).</li>
            <li>Job descriptions created by recruiters (used as the “matching target”).</li>
            <li>System audit logs (e.g., ranking started/done, feedback generated, errors).</li>
          </ul>
        </section>

        <section>
          <h3 style={{ marginBottom: 6 }}>Why we collect it</h3>
          <ul className="muted" style={{ marginTop: 0 }}>
            <li>To perform resume–job matching (TF-IDF scoring) and generate explainable feedback.</li>
            <li>To provide role-based dashboards (candidate / recruiter / admin).</li>
            <li>To improve accountability using logs and auditing (admin-only access).</li>
          </ul>
        </section>

        <section>
          <h3 style={{ marginBottom: 6 }}>How we reduce bias</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Before scoring, the system removes personally identifiable information (PII) where possible
            (e.g., names, emails, phone numbers). This reduces identity-based influence on ranking.
          </p>
        </section>

        <section>
          <h3 style={{ marginBottom: 6 }}>How data is protected</h3>
          <ul className="muted" style={{ marginTop: 0 }}>
            <li>JWT authentication and role-based access control (RBAC).</li>
            <li>Admin-only access to logs and monitoring pages.</li>
            <li>Input validation + safe error handling (to avoid leaking sensitive info).</li>
          </ul>
        </section>

        <section>
          <h3 style={{ marginBottom: 6 }}>Retention (student project)</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            For assessment purposes, data is stored locally in the project database.
            A production deployment would include formal retention policies and deletion features.
          </p>
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/login" className="btn-primary">
            Back to Login
          </Link>
          <Link to="/" className="">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}