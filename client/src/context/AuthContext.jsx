import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../api/axios';

import { clearStoredTokens, setStoredTokens } from '../api/axios';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState('');

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
            if (!window.socket.connected) {
              window.socket.connect();
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
      if (!window.socket.connected) {
        window.socket.connect();
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

      console.log('LOGIN RESPONSE:', data);

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

      console.log('REGISTER RESPONSE:', data);

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
  // UPDATE PHONE NUMBER (With Monthly 2-Change Limit & Supabase Fallback)
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
    const formattedPhone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;

    // 2. Attempt Express backend route first
    try {
      const { data } = await axios.put('/auth/update-phone', { phone: cleanPhone });
      if (data && data.phone) {
        const stored = localStorage.getItem('userInfo');
        const parsed = stored ? JSON.parse(stored) : {};
        const updated = { ...parsed, ...(user || {}), phone: data.phone };
        localStorage.setItem('userInfo', JSON.stringify(updated));
        setUser(updated);
      }
      return data;
    } catch (error) {
      // If server explicitly returned 429 monthly limit exceeded, propagate immediately
      if (error.response?.status === 429) {
        throw error;
      }

      console.warn('Backend /auth/update-phone route unavailable, falling back to direct Supabase update...', error.message);

      // 3. Fallback directly to Supabase REST
      try {
        const userId = user?.id || user?._id || user?.passenger_id || user?.assistant_id;
        const userEmail = user?.email;

        if (!userId && !userEmail) {
          throw new Error('User session not found. Please log in again.');
        }

        const queryFilter = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(userEmail)}`;
        const userUrl = `${SUPABASE_URL}/rest/v1/users?${queryFilter}&select=id,name,email,phone,role,station_code,is_approved,kyc_status,kyc_documents`;

        const getRes = await fetch(userUrl, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });

        if (!getRes.ok) {
          throw new Error('Unable to connect to database to verify account.');
        }

        const rows = await getRes.json();
        const currentUser = rows && rows[0];
        if (!currentUser) {
          throw new Error('User account record not found in database.');
        }

        const kycDocs = typeof currentUser.kyc_documents === 'object' && currentUser.kyc_documents !== null
          ? currentUser.kyc_documents
          : {};
        const history = Array.isArray(kycDocs.phone_change_history) ? kycDocs.phone_change_history : [];
        const currentMonth = new Date().toISOString().slice(0, 7);
        const changesThisMonth = history.filter((h) => h && typeof h.date === 'string' && h.date.startsWith(currentMonth));
        const MAX_MONTHLY_CHANGES = 2;

        if (changesThisMonth.length >= MAX_MONTHLY_CHANGES) {
          const limitErr = new Error('Monthly limit reached: You can only update your phone number 2 times per calendar month.');
          limitErr.response = {
            status: 429,
            data: {
              message: 'Monthly limit reached: You can only update your phone number 2 times per calendar month.',
              changesRemaining: 0,
              changesUsed: changesThisMonth.length,
              limit: MAX_MONTHLY_CHANGES,
              currentPhone: currentUser.phone,
            },
          };
          throw limitErr;
        }

        // Append audit history
        const newRecord = {
          date: new Date().toISOString(),
          from: currentUser.phone || user?.phone || null,
          to: formattedPhone,
        };
        const updatedHistory = [...history, newRecord];
        const updatedKycDocs = {
          ...kycDocs,
          phone_change_history: updatedHistory,
        };

        // Update database via Supabase PATCH
        const updateUrl = `${SUPABASE_URL}/rest/v1/users?id=eq.${currentUser.id}`;
        const patchRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            phone: formattedPhone,
            kyc_documents: updatedKycDocs,
            updated_at: new Date().toISOString(),
          }),
        });

        if (!patchRes.ok) {
          const errBody = await patchRes.text();
          throw new Error(`Database update failed: ${errBody}`);
        }

        const patchData = await patchRes.json();
        const updatedDbUser = (patchData && patchData[0]) || { ...user, phone: formattedPhone };

        // Update local session
        const stored = localStorage.getItem('userInfo');
        const parsed = stored ? JSON.parse(stored) : {};
        const merged = { ...parsed, ...(user || {}), phone: formattedPhone };
        localStorage.setItem('userInfo', JSON.stringify(merged));
        setUser(merged);

        const changesRemaining = MAX_MONTHLY_CHANGES - (changesThisMonth.length + 1);

        return {
          message: 'Phone number updated successfully.',
          phone: formattedPhone,
          changesRemaining,
          changesUsed: changesThisMonth.length + 1,
          limit: MAX_MONTHLY_CHANGES,
          user: updatedDbUser,
        };
      } catch (fallbackErr) {
        console.error('SUPABASE FALLBACK UPDATE PHONE ERROR:', fallbackErr);
        throw fallbackErr;
      }
    }
  };

  const getPhoneStatus = async () => {
    try {
      const { data } = await axios.get('/auth/phone-status');
      return data;
    } catch (error) {
      // Fallback directly to Supabase
      try {
        const userId = user?.id || user?._id || user?.passenger_id || user?.assistant_id;
        const userEmail = user?.email;
        if (!userId && !userEmail) return null;

        const queryFilter = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(userEmail)}`;
        const userUrl = `${SUPABASE_URL}/rest/v1/users?${queryFilter}&select=id,phone,kyc_documents`;

        const res = await fetch(userUrl, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });

        if (!res.ok) throw new Error('Supabase query failed');
        const rows = await res.json();
        const u = rows && rows[0];
        if (!u) return null;

        const kycDocs = typeof u.kyc_documents === 'object' && u.kyc_documents !== null ? u.kyc_documents : {};
        const history = Array.isArray(kycDocs.phone_change_history) ? kycDocs.phone_change_history : [];
        const currentMonth = new Date().toISOString().slice(0, 7);
        const changesThisMonth = history.filter((h) => h && typeof h.date === 'string' && h.date.startsWith(currentMonth));
        const MAX_MONTHLY_CHANGES = 2;
        const changesRemaining = Math.max(0, MAX_MONTHLY_CHANGES - changesThisMonth.length);

        return {
          phone: u.phone || user?.phone || null,
          changesUsed: changesThisMonth.length,
          changesRemaining,
          limit: MAX_MONTHLY_CHANGES,
        };
      } catch (fbErr) {
        return {
          phone: user?.phone || null,
          changesUsed: 0,
          changesRemaining: 2,
          limit: 2,
        };
      }
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