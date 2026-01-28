import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import TimeEntryPage from './pages/TimeEntryPage';
import UserManagementPage from './pages/UserManagementPage';
import ValidationPage from './pages/ValidationPage';
import ProjectManagementPage from './pages/ProjectManagementPage';
import AnalyticsPage from './pages/AnalyticsPage';
import OrganizationPage from './pages/OrganizationPage';
import ActivityPage from './pages/ActivityPage';
import ProfilePage from './pages/ProfilePage';
import PlanningPage from './pages/PlanningPage';
import EmployeeCalendarPage from './pages/EmployeeCalendarPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
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
            path="/time-entry"
            element={
              <ProtectedRoute>
                <TimeEntryPage />
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
            path="/projects"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                <ProjectManagementPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin']}>
                <UserManagementPage />
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
          
          <Route
            path="/planning"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                <PlanningPage />
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
            path="/organization"
            element={
              <ProtectedRoute>
                <OrganizationPage />
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
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;