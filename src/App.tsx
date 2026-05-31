import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute, AdminRoute } from "./routes/ProtectedRoute";
import { AuthLayout } from "./layouts/AuthLayout";
import { PhysioLayout } from "./layouts/PhysioLayout";
import { ResearchLayout } from "./layouts/ResearchLayout";
import { AdminLayout } from "./layouts/AdminLayout";

// Auth
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";

// Physio
import { PhysioDashboard } from "./features/physio/dashboard/PhysioDashboard";
import { PatientsList } from "./features/physio/patients/PatientsList";
import { ToolsHub } from "./features/physio/ToolsHub";
import { FMSAssessment } from "./features/physio/FMSAssessment";
import { ROMAssessment } from "./features/physio/ROMAssessment";
import { MSKAssessment } from "./features/physio/MSKAssessment";
import { PostureAnalysis } from "./features/physio/PostureAnalysis";
import { GaitHub } from "./features/physio/GaitHub";
import { GaitAnalysis } from "./features/physio/GaitAnalysis";
import { ClinicalGaitAnalysis } from "./features/physio/ClinicalGaitAnalysis";
import { DigitalInclinometer } from "./features/physio/DigitalInclinometer";
import { FacialStressAnalysis } from "./features/physio/FacialStressAnalysis";
import { SpinalAnalysis } from "./features/physio/SpinalAnalysis";
import { LivePoseAnalysis } from "./features/physio/LivePoseAnalysis";
import { CricketLivePosePage } from "./features/physio/CricketLivePosePage";
import { RehabGames } from "./features/physio/RehabGames";
import { AIManuscriptGenerator } from "./features/physio/AIManuscriptGenerator";
import { ResearchHub } from "./features/physio/ResearchHub";
import { SmartPrescription } from "./features/physio/tools/SmartPrescription";
import { ReportsList } from "./features/physio/reports/ReportsList";

// Research
import { ResearchDashboard } from "./features/research/dashboard/ResearchDashboard";
import { OrgResearchDashboard } from "./features/research/dashboard/OrgResearchDashboard";

// Admin
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { AdminUsers } from "./features/admin/AdminUsers";
import { AdminAssessments } from "./features/admin/AdminAssessments";
import { AdminOrganisations } from "./features/admin/AdminOrganisations";
import { AdminAuditLogs } from "./features/admin/AdminAuditLogs";
import { AdminSettings } from "./features/admin/AdminSettings";

export const App = () => {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            borderRadius: "1rem",
            fontSize: "0.875rem",
          },
        }}
      />
      <Routes>
        {/* Public — redirect root */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth layout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Physio routes */}
        <Route element={<ProtectedRoute allowedRole="physio" />}>
          <Route element={<PhysioLayout />}>
            <Route path="/physio/dashboard" element={<PhysioDashboard />} />
            <Route path="/physio/patients" element={<PatientsList />} />
            <Route path="/physio/tools" element={<ToolsHub />} />
            <Route path="/physio/tools/fms" element={<FMSAssessment />} />
            <Route path="/physio/tools/rom" element={<ROMAssessment />} />
            <Route path="/physio/tools/msk" element={<MSKAssessment />} />
            <Route path="/physio/tools/posture" element={<PostureAnalysis />} />
            <Route path="/physio/tools/gait" element={<GaitHub />} />
            <Route path="/physio/tools/gait/score" element={<GaitAnalysis />} />
            <Route path="/physio/tools/gait/clinical" element={<ClinicalGaitAnalysis />} />
            <Route path="/physio/tools/inclinometer" element={<DigitalInclinometer />} />
            <Route path="/physio/tools/facial-stress" element={<FacialStressAnalysis />} />
            <Route path="/physio/tools/spinal" element={<SpinalAnalysis />} />
            <Route path="/physio/tools/live-pose" element={<LivePoseAnalysis />} />
            <Route path="/physio/tools/live-pose-2" element={<CricketLivePosePage />} />
            <Route path="/physio/tools/rehab-games" element={<RehabGames />} />
            <Route path="/physio/tools/ai-manuscript" element={<AIManuscriptGenerator />} />
            <Route path="/physio/tools/research" element={<ResearchHub />} />
            <Route path="/physio/tools/prescription" element={<SmartPrescription />} />
            <Route path="/physio/reports" element={<ReportsList />} />
          </Route>
        </Route>

        {/* Research routes */}
        <Route element={<ProtectedRoute allowedRole="research" />}>
          <Route element={<ResearchLayout />}>
            <Route path="/research/org-dashboard" element={<OrgResearchDashboard />} />
            <Route path="/research/dashboard" element={<ResearchDashboard />} />
          </Route>
        </Route>

        {/* Admin routes — any authenticated user with isAdmin=true */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/assessments" element={<AdminAssessments />} />
            <Route path="/admin/organisations" element={<AdminOrganisations />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};
