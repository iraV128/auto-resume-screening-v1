// src/App.jsx
// ============================================================
// APP ROUTING
// - Public jobs + job details
// - Auth pages
// - Role-based dashboards
// - Recruiter job management
// - Admin logs
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";

import PublicJobs from "./pages/PublicJobs";
import PublicJobDetails from "./pages/PublicJobDetails";
import ApplyJob from "./pages/ApplyJob";

// Candidate
import CandidateDashboard from "./pages/candidate/CandidateDashboard";

// Recruiter
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import RankingsPage from "./pages/recruiter/RankingsPage";
import CandidateDetails from "./pages/recruiter/CandidateDetails";
import RecruiterJobs from "./pages/RecruiterJobs";
import RecruiterJobForm from "./pages/RecruiterJobForm";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import SystemLogs from "./pages/admin/SystemLogs";

import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

import { getToken, getUser } from "./api";

// Public-only route wrapper
function PublicRoute({ children }) {
  const token = getToken();
  return token ? <Navigate to="/dashboard" replace /> : children;
}

// Redirect /dashboard to the correct role dashboard
function DashboardRedirect() {
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "recruiter") return <Navigate to="/recruiter" replace />;

  // Default candidate/jobseeker route
  return <Navigate to="/candidate" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================================================== */}
        {/* PUBLIC ROUTES */}
        {/* ================================================== */}
        <Route path="/" element={<PublicJobs />} />
        <Route path="/jobs/:jobId" element={<PublicJobDetails />} />
        <Route path="/jobs/:jobId/apply" element={<ApplyJob />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* ================================================== */}
        {/* AUTH ROUTES (public only) */}
        {/* ================================================== */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />

        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* ================================================== */}
        {/* DASHBOARD REDIRECT */}
        {/* ================================================== */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* ================================================== */}
        {/* CANDIDATE */}
        {/* ================================================== */}
        <Route
          path="/candidate"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["jobseeker"]}>
                <CandidateDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* ================================================== */}
        {/* RECRUITER */}
        {/* ================================================== */}
        <Route
          path="/recruiter"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["recruiter", "admin"]}>
                <RecruiterDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/jobs"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["recruiter", "admin"]}>
                <RecruiterJobs />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/jobs/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["recruiter", "admin"]}>
                <RecruiterJobForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/jobs/:jobId/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["recruiter", "admin"]}>
                <RecruiterJobForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/jobs/:jobId/rankings"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["recruiter", "admin"]}>
                <RankingsPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/jobs/:jobId/candidate/:resumeId"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["recruiter", "admin"]}>
                <CandidateDetails />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* ================================================== */}
        {/* ADMIN */}
        {/* ================================================== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <AppShell title="Admin Dashboard" subtitle="Admin controls and monitoring">
                  <AdminDashboard />
                </AppShell>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <AppShell title="System Logs" subtitle="FR-13 Logging and Auditing">
                  <SystemLogs />
                </AppShell>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}