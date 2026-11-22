import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { StudentsListPage } from './pages/students/StudentsListPage';
import { StudentDetailPage } from './pages/students/StudentDetailPage';
import { MentorAssignmentsPage } from './pages/mentors/MentorAssignmentsPage';
import { DocumentationPage } from './pages/documentation/DocumentationPage';
import { DocumentRequirementsPage } from './pages/documentation/DocumentRequirementsPage';
import { DocumentSubmissionsPage } from './pages/documentation/DocumentSubmissionsPage';
import { WeeklyTimelinePage } from './pages/progress/WeeklyTimelinePage';
import { TasksKanbanPage } from './pages/tasks/TasksKanbanPage';
import { CorrectionsPage } from './pages/reviews/CorrectionsPage';
import { MeetingsPage } from './pages/meetings/MeetingsPage';
import { EvaluationsPage } from './pages/evaluations/EvaluationsPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { StaffManagementPage } from './pages/staff/StaffManagementPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { SecurityAuditLogsPage } from './pages/audit/SecurityAuditLogsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070d1e] flex items-center justify-center text-cyan-400 font-mono text-xs">
        Loading Pinnacle Mindz...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Workspace Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="students" element={<StudentsListPage />} />
              <Route path="my-students" element={<StudentsListPage />} />
              <Route path="students/:id" element={<StudentDetailPage />} />
              <Route path="mentor-assignments" element={<MentorAssignmentsPage />} />
              <Route path="documentation" element={<DocumentationPage />} />
              <Route path="documentation/requirements" element={<DocumentRequirementsPage />} />
              <Route path="documentation/submissions" element={<DocumentSubmissionsPage />} />
              <Route path="weekly-progress" element={<WeeklyTimelinePage />} />
              <Route path="tasks" element={<TasksKanbanPage />} />
              <Route path="corrections" element={<CorrectionsPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="evaluations" element={<EvaluationsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="staff" element={<StaffManagementPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="audit-logs" element={<SecurityAuditLogsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
