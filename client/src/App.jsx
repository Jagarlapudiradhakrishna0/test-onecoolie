import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { useContext } from 'react';

import { AuthContext } from './context/AuthContext';

import AuthPage from './pages/AuthPage';
import AdminLogin from './pages/AdminLogin';
import HomePage from './pages/HomePage';
import PassengerDashboard from './pages/PassengerDashboard';
import AssistantDashboard from './pages/AssistantDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookingLive from './pages/BookingLive';

import OfflineBanner from './components/OfflineBanner';

function ProtectedRoute({
  children,
  allowedRoles
}) {
  const {
    user,
    authLoading
  } = useContext(AuthContext);

  // Wait until localStorage authentication is restored
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-sm font-semibold text-zinc-500">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    if (allowedRoles.includes('admin')) {
      return <Navigate to="/admin-auth" replace />;
    }

    if (allowedRoles.includes('assistant')) {
      return <Navigate to="/assistant-auth" replace />;
    }

    return <Navigate to="/auth" replace />;
  }

  // Wrong role
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function SmartRedirect() {
  const {
    user,
    authLoading
  } = useContext(AuthContext);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'assistant') {
    return <Navigate to="/assistant" replace />;
  }

  if (user.role === 'passenger') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/auth" replace />;
}

export default function App() {
  const {
    user,
    authLoading
  } = useContext(AuthContext);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-sm font-semibold text-zinc-500">
            Loading OneCoolie...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineBanner />

      <BrowserRouter>
        <Routes>

          {/* Public Home */}
          <Route
            path="/"
            element={<HomePage />}
          />

          {/* Passenger Login */}
          <Route
            path="/auth"
            element={
              !user
                ? <AuthPage role="passenger" />
                : <SmartRedirect />
            }
          />

          {/* Assistant Login */}
          <Route
            path="/assistant-auth"
            element={
              !user
                ? <AuthPage role="assistant" />
                : <SmartRedirect />
            }
          />

          {/* Admin Login */}
          <Route
            path="/admin-auth"
            element={
              !user
                ? <AdminLogin />
                : <SmartRedirect />
            }
          />

          {/* Passenger Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={['passenger']}
              >
                <PassengerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Passenger Booking & Live Tracking */}
          <Route
            path="/booking/:id"
            element={
              <ProtectedRoute
                allowedRoles={['passenger']}
              >
                <BookingLive />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live/:id"
            element={
              <ProtectedRoute
                allowedRoles={['passenger']}
              >
                <BookingLive />
              </ProtectedRoute>
            }
          />

          {/* Assistant */}
          <Route
            path="/assistant"
            element={
              <ProtectedRoute
                allowedRoles={['assistant']}
              >
                <AssistantDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute
                allowedRoles={['admin']}
              >
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Unknown URL */}
          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>
      </BrowserRouter>
    </>
  );
}