import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../api/axios';

import { clearStoredTokens, setStoredTokens, initCsrfToken } from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState('');

  // Proactively fetch and initialize CSRF token cookie on startup
  useEffect(() => {
    initCsrfToken().catch(() => { });
  }, []);

  // Restore login session
  useEffect(() => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      const token = localStorage.getItem('token');

      if (userInfo && token) {
        const parsedUser = JSON.parse(userInfo);

        if (parsedUser && parsedUser.role) {
          setUser(parsedUser);
          if (window.socket) {
            window.socket.auth = { token };
            if (window.socket.connected) {
              window.socket.disconnect().connect();
            } else {
              window.socket.connect();
            }
            if (parsedUser.id && parsedUser.role === 'passenger') {
              window.socket.emit('join_passenger', String(parsedUser.id));
            } else if (parsedUser.id && parsedUser.role === 'assistant') {
              window.socket.emit('join_assistant', String(parsedUser.id));
            }
          }
        } else {
          clearStoredTokens();
        }
      }
    } catch (error) {
      console.error('Failed to restore authentication:', error);
      clearStoredTokens();
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Listen for forced session expiration / revocation from axios interceptor
  useEffect(() => {
    const handleSessionExpired = (event) => {
      const msg = event?.detail?.message || 'Your session has ended. Please sign in again.';
      setSessionNotice(msg);
      setUser(null);
      clearStoredTokens();
      if (window.socket) {
        window.socket.auth = { token: '' };
        window.socket.disconnect();
      }
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, []);

  // Ensure socket joins identity room upon connect / reconnect
  useEffect(() => {
    if (!window.socket || !user?.id) return;
    const rebindRoom = () => {
      console.log('[FEEDBACK] Socket connected, joining room for user:', user.id, user.role);
      if (user.role === 'passenger') {
        window.socket.emit('join_passenger', String(user.id));
      } else if (user.role === 'assistant') {
        window.socket.emit('join_assistant', String(user.id));
      }
    };
    if (window.socket.connected) {
      rebindRoom();
    }
    window.socket.on('connect', rebindRoom);
    return () => {
      if (window.socket) {
        window.socket.off('connect', rebindRoom);
      }
    };
  }, [user?.id, user?.role]);

  // ============================================================
  // INTERNAL: Persist user session from backend response
  // ============================================================
  const persistSession = (data) => {
    const backendUser = data.user || data;
    const token = data.accessToken || data.token || backendUser?.token || backendUser?.accessToken;
    const refreshToken = data.refreshToken || backendUser?.refreshToken;
    const sessionId = data.sessionId || backendUser?.sessionId;

    if (!token || !backendUser?.id) return null;

    const userData = {
      id: backendUser.id,
      _id: backendUser.id,
      passenger_id: backendUser.passenger_id || (backendUser.role === 'passenger' ? backendUser.id : null),
      assistant_id: backendUser.assistant_id || (backendUser.role === 'assistant' ? backendUser.id : null),
      name: backendUser.name,
      email: backendUser.email,
      phone: backendUser.phone || null,
      role: backendUser.role,
      admin_role: backendUser.admin_role || null,
      permissions: backendUser.permissions || [],
      station_code: backendUser.station_code || null,
      is_approved: backendUser.is_approved ?? false,
      kyc_status: backendUser.kyc_status || null,
      sessionId: sessionId || null,
      token
    };

    localStorage.setItem('userInfo', JSON.stringify(userData));
    setStoredTokens({ accessToken: token, refreshToken });
    setUser(userData);
    setSessionNotice(''); // Clear any previous expired notice

    if (window.socket) {
      window.socket.auth = { token };
      if (window.socket.connected) {
        window.socket.disconnect().connect();
      } else {
        window.socket.connect();
      }
      if (userData.id && userData.role === 'passenger') {
        window.socket.emit('join_passenger', String(userData.id));
      } else if (userData.id && userData.role === 'assistant') {
        window.socket.emit('join_assistant', String(userData.id));
      }
    }

    return userData;
  };

  // ============================================================
  // OTP: CHECK EMAIL
  // Checks whether an email is already registered.
  // Used for UX branching on the auth page.
  // ============================================================
  const checkEmail = async (email) => {
    const { data } = await axios.post('/auth/otp/check-email', { email });
    return data; // { exists: boolean, role: string|null }
  };

  // ============================================================
  // OTP: SEND OTP
  // Sends a 6-digit OTP to the given email.
  // purpose: 'login' | 'signup'
  // ============================================================
  const sendOtp = async (email, purpose) => {
    const { data } = await axios.post('/auth/otp/send', { email, purpose });
    return data; // { message, email, accountExists, expiresInMinutes }
  };

  // ============================================================
  // OTP: VERIFY & LOGIN
  // Verifies OTP for an existing user and creates a session.
  // ============================================================
  const verifyOtpLogin = async (email, otp, role = 'passenger') => {
    try {
      const { data } = await axios.post('/auth/otp/verify-login', {
        email,
        otp,
        role
      });

      const userData = persistSession(data);

      if (!userData) {
        throw new Error('Login successful but session could not be created.');
      }

      return userData;
    } catch (error) {
      console.error('OTP LOGIN ERROR:', error.response?.data || error.message);
      throw error;
    }
  };

  // ============================================================
  // OTP: VERIFY & REGISTER
  // Verifies OTP for a new account and creates the user.
  // ============================================================
  const verifyOtpRegister = async (name, email, otp, password, role, station_code, phone) => {
    try {
      const { data } = await axios.post('/auth/otp/verify-register', {
        name,
        email,
        otp,
        password,
        role,
        station_code,
        phone
      });

      // Assistant registration: no token until admin approves
      if (!data.token) {
        return data;
      }

      const userData = persistSession(data);
      return { ...data, user: userData };
    } catch (error) {
      console.error('OTP REGISTER ERROR:', error.response?.data || error.message);
      throw error;
    }
  };

  // ============================================================
  // LOGIN (legacy — used by admin portal)
  // ============================================================
  const login = async (
    emailOrPhone,
    password,
    role = 'passenger',
    admin_code = '',
    phone = ''
  ) => {
    try {
      const isPhone = typeof emailOrPhone === 'string' && !emailOrPhone.includes('@') && /^[+\d\s-]+$/.test(emailOrPhone);
      const { data } = await axios.post('/auth/login', {
        email: isPhone ? '' : emailOrPhone,
        phone: isPhone ? emailOrPhone : (phone || ''),
        identifier: emailOrPhone,
        password,
        role,
        admin_code
      });

      // 1. Admin Multi-Factor Authentication challenge issued
      if (data.requiresMfa) {
        return data; // { requiresMfa: true, mfaEnrolled, mfaToken, mfaSetupToken, message }
      }

      // 2. Standard Session Login
      const userData = persistSession(data);
      if (!userData) {
        throw new Error('Login successful but server did not return valid session credentials.');
      }

      return userData;

    } catch (error) {
      console.error(
        'LOGIN ERROR:',
        error.response?.data || error.message
      );

      throw error;
    }
  };

  // ============================================================
  // REGISTER (legacy — kept for backward compatibility)
  // ============================================================
  const register = async (
    name,
    email,
    password,
    role,
    station_code,
    phone
  ) => {
    try {
      const { data } = await axios.post('/auth/register', {
        name,
        email,
        password,
        role,
        station_code,
        phone
      });

      const backendUser = data.user || data;
      const token = data.token || backendUser?.token;

      // If registration immediately logs the user in
      if (token && backendUser && backendUser.id) {
        const userData = {
          id: backendUser.id,
          _id: backendUser.id,

          passenger_id: backendUser.passenger_id || (backendUser.role === 'passenger' ? backendUser.id : null),
          assistant_id: backendUser.assistant_id || (backendUser.role === 'assistant' ? backendUser.id : null),

          name: backendUser.name,
          email: backendUser.email,
          phone: backendUser.phone || null,
          role: backendUser.role,

          station_code: backendUser.station_code || null,

          is_approved: backendUser.is_approved ?? false,

          kyc_status: backendUser.kyc_status || null,

          token
        };

        localStorage.setItem(
          'userInfo',
          JSON.stringify(userData)
        );

        localStorage.setItem(
          'token',
          token
        );

        setUser(userData);

        return {
          ...data,
          user: userData
        };
      }

      // Assistant registration usually comes here
      return data;

    } catch (error) {
      console.error(
        'REGISTER ERROR:',
        error.response?.data || error.message
      );

      throw error;
    }
  };

  // ============================================================
  // ============================================================
  // UPDATE PHONE NUMBER
  // ============================================================
  const updateUserPhone = async (newPhone) => {
    if (user?.role === 'assistant') {
      const err = new Error('Assistant phone numbers are confidential and KYC-locked. Contact the Station Administrator for updates.');
      err.response = { data: { message: err.message } };
      throw err;
    }

    // 1. Clean & validate input
    let cleanPhone = String(newPhone || '').trim();
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.slice(3).trim();
    }
    cleanPhone = cleanPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      const err = new Error('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      err.response = { data: { message: err.message } };
      throw err;
    }

    // 2. Call Express backend route directly
    const { data } = await axios.put('/auth/update-phone', { phone: cleanPhone });
    if (data && data.phone) {
      const stored = localStorage.getItem('userInfo');
      const parsed = stored ? JSON.parse(stored) : {};
      const updated = { ...parsed, ...(user || {}), phone: data.phone };
      localStorage.setItem('userInfo', JSON.stringify(updated));
      setUser(updated);
    }
    return data;
  };

  const getPhoneStatus = async () => {
    try {
      const { data } = await axios.get('/auth/phone-status');
      return data;
    } catch (error) {
      console.warn('Failed to load phone status:', error.message);
      return {
        phone: user?.phone || null,
        changesUsed: 0,
        changesRemaining: 2,
        limit: 2,
      };
    }
  };

  // ============================================================
  // FORGOT PASSWORD: REQUEST OTP
  // Sends a password reset OTP to the given email.
  // Always resolves (server returns generic response for security).
  // ============================================================
  const forgotPassword = async (email) => {
    const { data } = await axios.post('/auth/forgot-password', { email });
    return data; // { success, message }
  };

  // ============================================================
  // FORGOT PASSWORD: VERIFY OTP
  // Verifies the 6-digit reset OTP, returns a short-lived resetToken.
  // ============================================================
  const verifyResetOtp = async (email, otp) => {
    const { data } = await axios.post('/auth/verify-reset-otp', { email, otp });
    return data; // { success, message, resetToken }
  };

  // ============================================================
  // FORGOT PASSWORD: RESET PASSWORD
  // Uses the resetToken from verifyResetOtp to set a new password.
  // ============================================================
  const resetPassword = async (resetToken, newPassword, confirmPassword) => {
    const { data } = await axios.post('/auth/reset-password', {
      resetToken,
      newPassword,
      confirmPassword
    });
    return data; // { success, message }
  };

  // ============================================================
  // LOGOUT (Invalidates backend server-side session)
  // ============================================================
  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (e) {
      // Backend failure should not block frontend clearing
    } finally {
      clearStoredTokens();
      if (window.socket) {
        window.socket.auth = { token: '' };
        try { window.socket.removeAllListeners(); } catch {}
        window.socket.disconnect();
      }
      setUser(null);
    }
  };

  // ============================================================
  // LOGOUT ALL DEVICES (Terminates all user sessions on backend)
  // ============================================================
  const logoutAll = async () => {
    try {
      await axios.post('/auth/logout-all');
    } catch (e) {
      // Backend failure should not block frontend clearing
    } finally {
      clearStoredTokens();
      if (window.socket) {
        window.socket.auth = { token: '' };
        try { window.socket.removeAllListeners(); } catch {}
        window.socket.disconnect();
      }
      setUser(null);
    }
  };

  // ============================================================
  // ADMIN MFA OPERATIONS
  // ============================================================
  const verifyAdminMfaLogin = async ({ mfaToken, code }) => {
    const { data } = await axios.post('/auth/admin/mfa/verify-login', { mfaToken, code });
    const userData = persistSession(data);
    return { ...data, user: userData };
  };

  const setupAdminMfa = async ({ mfaSetupToken }) => {
    const { data } = await axios.post('/auth/admin/mfa/setup', { mfaSetupToken });
    return data; // { success, message, qrCode, otpauthUrl }
  };

  const verifyAdminMfaEnrollment = async ({ mfaSetupToken, code }) => {
    const { data } = await axios.post('/auth/admin/mfa/verify-enrollment', { mfaSetupToken, code });
    if (data?.token || data?.accessToken) {
      persistSession(data);
    }
    return data; // { success, message, token, recoveryCodes, notice }
  };

  // ============================================================
  // ACTIVE SESSIONS MANAGEMENT
  // ============================================================
  const getSessions = async () => {
    const { data } = await axios.get('/auth/sessions');
    return data; // { count, sessions }
  };

  const revokeUserSession = async (sessionId) => {
    const { data } = await axios.post(`/auth/sessions/${sessionId}/revoke`);
    return data;
  };

  const refreshSession = async () => {
    const rt = localStorage.getItem('refreshToken');
    if (!rt) throw new Error('No refresh token available');
    const { data } = await axios.post('/auth/refresh', { refreshToken: rt });
    if (data?.accessToken) {
      setStoredTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data;
    }
    throw new Error('Refresh failed');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        sessionNotice,
        clearSessionNotice: () => setSessionNotice(''),
        login,
        register,
        logout,
        logoutAll,
        verifyAdminMfaLogin,
        setupAdminMfa,
        verifyAdminMfaEnrollment,
        getSessions,
        revokeUserSession,
        refreshSession,
        updateUserPhone,
        getPhoneStatus,
        // OTP methods
        checkEmail,
        sendOtp,
        verifyOtpLogin,
        verifyOtpRegister,
        // Forgot Password methods
        forgotPassword,
        verifyResetOtp,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// useAuth Hook
// ============================================================
export const useAuth = () => {
  return useContext(AuthContext);
};
