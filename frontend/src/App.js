import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';

// Auth Pages
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

// Main Pages
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import TimeEntryPage from './pages/TimeEntryPage';
import EmployeeCalendarPage from './pages/EmployeeCalendarPage';
import ValidationPage from './pages/ValidationPage';
import ProjectManagementPage from './pages/ProjectManagementPage';
import AnalyticsPage from './pages/AnalyticsPage';
import OrganizationPage from './pages/OrganizationPage';
import ActivityPage from './pages/ActivityPage';
import ProfilePage from './pages/ProfilePage';
import PlanningPage from './pages/PlanningPage';
import UserManagementPage from './pages/UserManagementPage';
import TeamsPage from './pages/TeamsPage';
import AdminBookingCodesPage from './pages/AdminBookingCodesPage';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 1: TEMPS & ACTIVITÉ (Tous)
             ═══════════════════════════════════════════════════════════ */}
          <Route
            path="/time-entry"
            element={
              <ProtectedRoute>
                <TimeEntryPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/employee-calendar"
            element={
              <ProtectedRoute>
                <EmployeeCalendarPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/my-history"
            element={
              <ProtectedRoute>
                <TimeEntryPage />
              </ProtectedRoute>
            }
          />
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 2: PILOTAGE (Manager+)
             ═══════════════════════════════════════════════════════════ */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/activity"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                <ActivityPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/validation"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                <ValidationPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/alerts"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/analytics"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 3: ORGANISATION (Manager+)
             ═══════════════════════════════════════════════════════════ */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                <ProjectManagementPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/planning"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                <PlanningPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/teams"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                <TeamsPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/organization"
            element={
              <ProtectedRoute>
                <OrganizationPage />
              </ProtectedRoute>
            }
          />
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 4: ADMINISTRATION (Admin uniquement)
             ═══════════════════════════════════════════════════════════ */}
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/roles"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/disciplines"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                <AdminBookingCodesPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/activities"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                <AdminBookingCodesPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/booking-codes"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                <AdminBookingCodesPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                <AdminBookingCodesPage />
              </ProtectedRoute>
            }
          />
          
          {/* ═══════════════════════════════════════════════════════════
             SECTION 5: MON COMPTE (Tous)
             ═══════════════════════════════════════════════════════════ */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/preferences"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/time-entry" replace />} />
          <Route path="*" element={<Navigate to="/time-entry" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
