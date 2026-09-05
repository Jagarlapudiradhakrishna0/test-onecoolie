import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
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
import TrainLoader from './components/TrainLoader';

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
      <TrainLoader
        text="Loading OneCoolie..."
        subtext="Verifying security credentials & station telemetry..."
      />
    );
  }

  const location = useLocation();

  // Not logged in
  if (!user) {
    if (allowedRoles.includes('admin')) {
      return <Navigate to={`/admin-auth${location.search}`} replace />;
    }

    if (allowedRoles.includes('assistant')) {
      return <Navigate to={`/assistant-auth${location.search}`} replace />;
    }

    return <Navigate to={`/auth${location.search}`} replace />;
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
  const location = useLocation();

  if (authLoading) {
    return (
      <TrainLoader
        text="Redirecting to Station Console..."
        subtext="Connecting your dashboard..."
      />
    );
  }

  if (!user) {
    return <Navigate to={`/auth${location.search}`} replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'assistant') {
    return <Navigate to="/assistant" replace />;
  }

  if (user.role === 'passenger') {
    return <Navigate to={`/dashboard${location.search}`} replace />;
  }

  return <Navigate to={`/auth${location.search}`} replace />;
}

export default function App() {
  const {
    user,
    authLoading
  } = useContext(AuthContext);

  if (authLoading) {
    return (
      <TrainLoader
        text="Loading OneCoolie..."
        subtext="Starting station assistance network..."
      />
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

          {/* Passenger Booking */}
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