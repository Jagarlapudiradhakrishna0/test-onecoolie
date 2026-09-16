import axios from 'axios';

// Centralized API Base URL resolution:
// Defaults strictly to deployed production backend URL
const resolvedBaseUrl = import.meta.env.VITE_API_URL || 'https://onecoolie.onrender.com/api';

const instance = axios.create({
  baseURL: resolvedBaseUrl,
  withCredentials: true, // Phase 6.6: Send and receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to read document cookie
export const getCookieValue = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
};

// Helper to reliably retrieve JWT token from storage
export const getStoredToken = () => {
  try {
    let token = localStorage.getItem('token');
    if (token && typeof token === 'string' && token !== 'undefined' && token !== 'null') {
      return token.replace(/^"(.*)"$/, '$1').trim();
    }

    const userRaw = localStorage.getItem('userInfo');
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      const uToken = parsed?.token || parsed?.accessToken;
      if (uToken && typeof uToken === 'string' && uToken !== 'undefined' && uToken !== 'null') {
        const clean = uToken.replace(/^"(.*)"$/, '$1').trim();
        localStorage.setItem('token', clean);
        return clean;
      }
    }
  } catch (e) {
    console.error('Error resolving stored token:', e);
  }
  return null;
};

export const getStoredRefreshToken = () => {
  try {
    const rt = localStorage.getItem('refreshToken');
    if (rt && typeof rt === 'string' && rt !== 'undefined' && rt !== 'null') {
      return rt.trim();
    }
  } catch (e) { }
  return null;
};

export const setStoredTokens = ({ accessToken, refreshToken }) => {
  try {
    if (accessToken) {
      localStorage.setItem('token', accessToken);
      if (typeof window !== 'undefined' && window.socket) {
        window.socket.auth = { token: accessToken };
      }
      const userRaw = localStorage.getItem('userInfo');
      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw);
          parsed.token = accessToken;
          parsed.accessToken = accessToken;
          delete parsed.refreshToken;
          localStorage.setItem('userInfo', JSON.stringify(parsed));
        } catch (pe) { }
      }
    }
    // Phase 6.6: HttpOnly cookie mode eliminates client-side refreshToken in localStorage
    if (refreshToken && typeof window !== 'undefined' && window.__FORCE_LOCALSTORAGE_REFRESH__) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  } catch (e) {
    console.error('Failed to set stored tokens:', e);
  }
};

export const clearStoredTokens = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userInfo');
  } catch (e) { }
};

// ============================================================
// CSRF TOKEN INITIALIZATION & CACHING
// Fetches fresh double-submit CSRF cookie from backend
// ============================================================
let csrfFetchPromise = null;

export const initCsrfToken = async () => {
  if (typeof document === 'undefined') return null;
  const existing = getCookieValue('onecoolie_csrf');
  if (existing) return existing;

  if (!csrfFetchPromise) {
    csrfFetchPromise = axios
      .get(`${resolvedBaseUrl}/auth/csrf-token`, { withCredentials: true })
      .then((res) => {
        return res.data?.csrfToken || getCookieValue('onecoolie_csrf');
      })
      .catch((err) => {
        console.warn('[CSRF] Failed to fetch initial CSRF token:', err.message);
        return null;
      })
      .finally(() => {
        csrfFetchPromise = null;
      });
  }
  return csrfFetchPromise;
};

// ============================================================
// REFRESH COORDINATION QUEUE & STATE
// Prevents multiple parallel /auth/refresh calls and loops
// ============================================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ============================================================
// REQUEST INTERCEPTOR: Attach Bearer Access Token & CSRF Token
// ============================================================
instance.interceptors.request.use(
  async (config) => {
    config.headers = config.headers || {};

    const method = (config.method || 'get').toUpperCase();
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    // If state-changing request and no CSRF cookie exists, proactively fetch one
    let csrfToken = getCookieValue('onecoolie_csrf');
    if (isStateChanging && !csrfToken && !config.url?.includes('/auth/csrf-token')) {
      try {
        csrfToken = await initCsrfToken();
      } catch (e) { }
    }

    if (!csrfToken) {
      csrfToken = getCookieValue('onecoolie_csrf');
    }

    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // Avoid attaching auth token to public refresh or login endpoints if unneeded
    if (config.url?.includes('/auth/refresh')) {
      return config;
    }

    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// RESPONSE INTERCEPTOR: Automatic 401 Refresh & Coordination
// ============================================================
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no response or status is not 401, reject immediately
    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Authentication and challenge endpoints intentionally return 401 on bad credentials / bad OTP / expired challenge.
    // They must NEVER trigger an automated /auth/refresh session loop.
    const isAuthChallengeEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/admin/mfa') ||
      originalRequest.url?.includes('/auth/otp') ||
      originalRequest.url?.includes('/auth/forgot-password') ||
      originalRequest.url?.includes('/auth/verify-reset-otp') ||
      originalRequest.url?.includes('/auth/reset-password') ||
      originalRequest.url?.includes('/auth/csrf-token');

    if (isAuthChallengeEndpoint) {
      return Promise.reject(error);
    }

    // 1. Loop Prevention: If this request is already a refresh call or was retried once
    if (originalRequest.url?.includes('/auth/refresh') || originalRequest._retry) {
      clearStoredTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('session-expired', {
            detail: { message: error.response?.data?.message || 'Your session has ended. Please sign in again.' }
          })
        );
      }
      return Promise.reject(error);
    }

    // 2. Queueing: If another request is currently refreshing the token, wait for it
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          if (typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
          }
          return instance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // 3. Initiate Refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const storedRefreshToken = getStoredRefreshToken();
      const refreshBody = storedRefreshToken ? { refreshToken: storedRefreshToken } : {};
      const refreshHeaders = { 'Content-Type': 'application/json' };

      let csrf = getCookieValue('onecoolie_csrf');
      if (!csrf) {
        try {
          csrf = await initCsrfToken();
        } catch (e) { }
      }
      if (!csrf) {
        csrf = getCookieValue('onecoolie_csrf');
      }
      if (csrf) refreshHeaders['X-CSRF-Token'] = csrf;

      // Use raw axios with withCredentials: true so the HttpOnly refresh cookie is sent
      const refreshResponse = await axios.post(
        `${resolvedBaseUrl}/auth/refresh`,
        refreshBody,
        {
          withCredentials: true,
          headers: refreshHeaders
        }
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;

      if (!newAccessToken) {
        throw new Error('Refresh response missing access token');
      }

      // Persist access token in memory/storage
      setStoredTokens({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });

      // Update default authorization header
      instance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

      // Process pending queue
      processQueue(null, newAccessToken);

      // Retry the original request
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      if (typeof originalRequest.headers.set === 'function') {
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
      }

      return instance(originalRequest);

    } catch (refreshErr) {
      // Refresh failed (e.g. revoked session, token reuse detected, expired)
      processQueue(refreshErr, null);
      clearStoredTokens();

      const errMsg = refreshErr.response?.data?.message || 'Your session has expired. Please sign in again.';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('session-expired', {
            detail: { message: errMsg }
          })
        );
      }

      return Promise.reject(refreshErr);

    } finally {
      isRefreshing = false;
    }
  }
);

export default instance;