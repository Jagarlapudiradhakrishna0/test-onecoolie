import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.jsx';

import './index.css';

import { io } from 'socket.io-client';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import ToastProvider from './components/Toast';

const socketUrl = (() => {
  if (import.meta.env.DEV) {
    const envSock = import.meta.env.VITE_SOCKET_URL;
    if (envSock && (envSock.includes('localhost') || envSock.includes('127.0.0.1'))) {
      return envSock;
    }
    return 'http://localhost:5000';
  }
  const prodSock = import.meta.env.VITE_SOCKET_URL;
  if (prodSock && !prodSock.includes('localhost') && !prodSock.includes('127.0.0.1')) {
    return prodSock;
  }
  const prodApi = import.meta.env.VITE_API_URL;
  if (prodApi && !prodApi.includes('localhost') && !prodApi.includes('127.0.0.1') && !prodApi.startsWith('/')) {
    return prodApi.replace(/\/api\/?$/, '');
  }
  return 'https://onecoolie.onrender.com';
})();

window.socket = io(socketUrl, {
  transports: ['websocket', 'polling'],
});

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider />
          <App />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);