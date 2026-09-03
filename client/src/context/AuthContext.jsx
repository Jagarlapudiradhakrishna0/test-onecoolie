import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore login session
  useEffect(() => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      const token = localStorage.getItem('token');

      if (userInfo && token) {
        const parsedUser = JSON.parse(userInfo);

        if (parsedUser && parsedUser.role) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('userInfo');
          localStorage.removeItem('token');
        }
      }
    } catch (error) {
      console.error('Failed to restore authentication:', error);

      localStorage.removeItem('userInfo');
      localStorage.removeItem('token');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // ============================================================
  // INTERNAL: Persist user session from backend response
  // ============================================================
  const persistSession = (data) => {
    const backendUser = data.user || data;
    const token = data.token || backendUser?.token;

    if (!token || !backendUser?.id) return null;

    const userData = {
      id:           backendUser.id,
      _id:          backendUser.id,
      passenger_id: backendUser.passenger_id || null,
      assistant_id: backendUser.assistant_id || null,
      name:         backendUser.name,
      email:        backendUser.email,
      role:         backendUser.role,
      station_code: backendUser.station_code || null,
      is_approved:  backendUser.is_approved ?? false,
      kyc_status:   backendUser.kyc_status || null,
      token
    };

    localStorage.setItem('userInfo', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);

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
  const verifyOtpRegister = async (name, email, otp, password, role, station_code) => {
    try {
      const { data } = await axios.post('/auth/otp/verify-register', {
        name,
        email,
        otp,
        password,
        role,
        station_code
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
    email,
    password,
    role = 'passenger',
    admin_code = ''
  ) => {
    try {
      const { data } = await axios.post('/auth/login', {
        email,
        password,
        role,
        admin_code
      });

      console.log('LOGIN RESPONSE:', data);

      const backendUser = data.user || data;
      const token = data.token || backendUser.token;

      // Check token
      if (!token) {
        throw new Error(
          'Login successful but server did not return a token.'
        );
      }

      // Check user
      if (!backendUser || !backendUser.id) {
        throw new Error(
          'Login successful but server did not return user data.'
        );
      }

      // Check role
      if (!backendUser.role) {
        throw new Error(
          'Login successful but server did not return a user role.'
        );
      }

      // Build frontend user object
      const userData = {
        id: backendUser.id,
        _id: backendUser.id,

        passenger_id: backendUser.passenger_id || null,
        assistant_id: backendUser.assistant_id || null,

        name: backendUser.name,
        email: backendUser.email,
        role: backendUser.role,

        station_code: backendUser.station_code || null,

        is_approved: backendUser.is_approved ?? false,

        kyc_status: backendUser.kyc_status || null,

        token
      };

      console.log('USER SAVED:', userData);

      // Save authentication
      localStorage.setItem(
        'userInfo',
        JSON.stringify(userData)
      );

      localStorage.setItem(
        'token',
        token
      );

      // Update React state
      setUser(userData);

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
    station_code
  ) => {
    try {
      const { data } = await axios.post('/auth/register', {
        name,
        email,
        password,
        role,
        station_code
      });

      console.log('REGISTER RESPONSE:', data);

      const backendUser = data.user || data;
      const token = data.token || backendUser?.token;

      // If registration immediately logs the user in
      if (token && backendUser && backendUser.id) {
        const userData = {
          id: backendUser.id,
          _id: backendUser.id,

          passenger_id: backendUser.passenger_id || null,
          assistant_id: backendUser.assistant_id || null,

          name: backendUser.name,
          email: backendUser.email,
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
  // LOGOUT
  // ============================================================
  const logout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        login,
        register,
        logout,
        // OTP methods
        checkEmail,
        sendOtp,
        verifyOtpLogin,
        verifyOtpRegister
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