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

  // Debug: Print auth state
  console.log('Auth loading:', loading, 'User:', user);

  // Print stack trace if stuck in loading
  if (loading) {
    console.trace('ProtectedRoute loading state');
    // Extra: Show a message if loading takes too long
    // Optionally, you can add a timeout to show a warning if loading > 5s
    // This helps debug if the auth context is stuck
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-gray-500 text-sm">
          Loading... If this takes too long, check your network connection or backend API.
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user, rendering LoginForm');
    return <LoginForm />;
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  const { user } = useAuth();

  // Debug: Print user for routing
  console.log('AppRoutes user:', user);

  if (!user) {
    console.log('AppRoutes: No user, rendering LoginForm');
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
      {/* Employee Routes */}
      {(user.role === 'Graphic Designer' || user.role === 'Printing Technician' || user.role === 'Delivery Supervisor') && (
        <>
          <Route path="/salary" element={<Salary />} />
        </>
      )}
      {/* Common Routes */}
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
  // Debug: Print when App renders
  console.log('App rendered');

  // Print stack trace on every render for debugging
  console.trace('App render stack');

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

// In your main layout/header/navbar component, update the logo/title:
// <div className="flex items-center gap-2">
//   {/* ...logo icon... */}
//   <span className="font-bold text-lg tracking-tight">Edgesync ERP</span>
// </div>