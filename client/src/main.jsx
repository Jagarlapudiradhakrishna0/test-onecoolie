import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.jsx';
import GlobalErrorBoundary from './components/GlobalErrorBoundary.jsx';

import './index.css';

import { io } from 'socket.io-client';

import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import ToastProvider from './components/Toast';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'https://onecoolie.onrender.com';

const initialToken = localStorage.getItem('token') || '';

window.socket = io(socketUrl, {
  transports: ['websocket', 'polling'],
  auth: {
    token: initialToken
  },
  autoConnect: Boolean(initialToken),
});

window.socket.on('connect_error', (err) => {
  if (import.meta.env.DEV) {
    console.warn('[SOCKET] Connection notice:', err.message);
  }
});

// Phase 6.5: Real-time Socket.IO session revocation handler
window.socket.on('session-revoked', (data) => {
  const reason = data?.reason || 'revoked';
  if (import.meta.env.DEV) {
    console.warn(`[SOCKET] Session revoked by server: ${reason}`);
  }

  // 1. Stop and disconnect the current Socket.IO client
  try {
    window.socket.auth = { token: '' };
    window.socket.disconnect();
  } catch (err) {
    console.error('[SOCKET] Error disconnecting socket:', err);
  }

  // 2-5. Clear tokens, user auth state, and local session state
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
  } catch (err) {
    console.error('[SOCKET] Error clearing storage:', err);
  }

  // 6 & 8. Trigger existing session expiration mechanism with required message
  const message = 'Your session has ended. Please sign in again.';
  window.dispatchEvent(
    new CustomEvent('session-expired', {
      detail: { reason, message }
    })
  );

  // 7. Redirect the user to the appropriate login page
  const path = window.location.pathname;
  if (!path.includes('/auth') && !path.includes('/admin-auth')) {
    if (path.startsWith('/admin')) {
      window.location.href = '/admin-auth';
    } else {
      window.location.href = '/auth';
    }
  }
});

// Clear the chunk-reload guard on successful app boot so each new deployment
// gets a fresh auto-reload attempt. This runs only when the app loads cleanly
// (not inside an error boundary), so it cannot cause a reload loop.
GlobalErrorBoundary.clearChunkReloadFlag();

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <ToastProvider />
              <App />
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);