import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import PublicJobs from "./pages/PublicJobs";
import PublicJobDetails from "./pages/PublicJobDetails";

import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import CandidateDashboard from "./pages/candidate/CandidateDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SystemLogs from "./pages/admin/SystemLogs";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

import RankingsPage from "./pages/recruiter/RankingsPage";
import CandidateDetails from "./pages/recruiter/CandidateDetails";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =====================================================
           PUBLIC (NO LOGIN REQUIRED)
           UC-00: Browse Open Jobs
           UC-00b: View Job Details
        ====================================================== */}
        <Route path="/" element={<PublicJobs />} />
        <Route path="/jobs/:jobId" element={<PublicJobDetails />} />
        <Route path="/login" element={<Login />} />

        {/* =====================================================
           PROTECTED ROLE ROUTES (LOGIN REQUIRED)
        ====================================================== */}

        {/* Jobseeker only */}
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

        {/* Recruiter + Admin */}
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

        {/* Admin only */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* UC-11: System Logs (Admin only) */}
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <SystemLogs />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Any unknown path goes to Public Jobs */}
        <Route path="*" element={<Navigate to="/" replace />} />

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
      </Routes>
    </BrowserRouter>
  );
}