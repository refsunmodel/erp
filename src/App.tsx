import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { LoginForm } from '@/components/auth/LoginForm';
import { Dashboard } from '@/pages/Dashboard';
import { Employees } from '@/pages/Employees';
import { Tasks } from '@/pages/Tasks';
import { Stats } from '@/pages/Stats';
import { Salary } from '@/pages/Salary';
import { Chat } from '@/pages/Chat';
import { Attendance } from '@/pages/Attendance';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  const { user } = useAuth();

  if (!user) {
    return <LoginForm />;
  }

  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      
      {/* Admin Routes */}
      {user.role === 'Admin' && (
        <>
          <Route path="/employees" element={<Employees />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/stats" element={<Stats />} />
        </>
      )}
      
      {/* Manager Routes */}
      {user.role === 'Manager' && (
        <>
          <Route path="/employees" element={<Employees />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/stats" element={<Stats />} />
        </>
      )}
      
      {/* Employee Routes - Graphic Designer, Printing Technician, Delivery Supervisor */}
      {(user.role === 'Graphic Designer' || user.role === 'Printing Technician' || user.role === 'Delivery Supervisor') && (
        <>
          <Route path="/salary" element={<Salary />} />
        </>
      )}
      
      {/* Common Routes for all users */}
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/chat" element={<Chat />} />
      
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ProtectedRoute>
          <AppRoutes />
        </ProtectedRoute>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;