import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STATIONS } from '../utils/services';

/* ============================================================
   ONECOOLIE AUTHENTICATION PAGE
   • Pixel-perfect match to Passenger Login Interface design
   • Left Column: Hero platform graphic (Smarter Journeys Ahead)
   • Right Column: Floating frosted card (Welcome Back / Sign In)
   • Production Auth Flow:
       - Sign In: Email + Password directly
       - Sign Up: Name + Email + Password + Email OTP Verification
   ============================================================ */

const maskEmail = (e) => {
  const [l, d] = (e || '').split('@');
  if (!d) return e;
  return `${l[0]}${'•'.repeat(Math.min(l.length - 1, 4))}@${d}`;
};

/* ─── 6-DIGIT OTP BOXES ─────────────────────────────────────── */
function OtpBoxes({ value, onChange, disabled }) {
  const refs = useRef([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const set = (i, ch) => {
    const next = [...digits];
    next[i] = ch;
    onChange(next.join(''));
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };

  return (
    <div className="flex gap-2 sm:gap-2.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          autoComplete="one-time-code"
          onChange={(e) => set(i, e.target.value.replace(/\D/, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              if (d) set(i, '');
              else if (i > 0) {
                refs.current[i - 1]?.focus();
                set(i - 1, '');
              }
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            onChange(p.padEnd(6, '').slice(0, 6));
            refs.current[Math.min(p.length, 5)]?.focus();
          }}
          style={{ caretColor: 'transparent' }}
          className={[
            'flex-1 min-w-0 h-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border-2',
            'transition-all duration-150 outline-none select-none',
            disabled ? 'opacity-40 cursor-not-allowed bg-zinc-50' : 'cursor-text',
            d
              ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs'
              : 'border-zinc-200 bg-white text-zinc-900 focus:border-blue-500 focus:bg-blue-50/30',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

/* ─── COUNTDOWN TIMER ───────────────────────────────────────── */
function Countdown({ seconds, onDone }) {
  const [t, setT] = useState(seconds);
  useEffect(() => { setT(seconds); }, [seconds]);
  useEffect(() => {
    if (t <= 0) { onDone?.(); return; }
    const id = setTimeout(() => setT((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [t, onDone]);
  if (t <= 0) return null;
  return (
    <span className="font-mono font-bold text-blue-600 text-xs tabular-nums">
      {String(Math.floor(t / 60)).padStart(2, '0')}:{String(t % 60).padStart(2, '0')}
    </span>
  );
}

/* ─── MAIN AUTH PAGE COMPONENT ──────────────────────────────── */
export default function AuthPage({ role = 'passenger' }) {
  const isA = role === 'assistant';

  // Primary active tab: 'login' | 'signup'
  const [activeTab, setActiveTab] = useState('login');

  // Sign up verification sub-step: 'form' | 'otp' | 'success'
  const [signupStep, setSignupStep] = useState('form');

  // Form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [stationCode, setStationCode] = useState('KZJ');
  const [otpValue, setOtpValue] = useState('');

  // UI status
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendKey, setResendKey] = useState(0);

  const { login, sendOtp, verifyOtpRegister } = useAuth();
  const navigate = useNavigate();

  // Focus OTP box when entering OTP step
  useEffect(() => {
    if (activeTab === 'signup' && signupStep === 'otp') {
      setTimeout(() => document.getElementById('otp-0')?.focus(), 100);
    }
  }, [activeTab, signupStep]);

  // Auto-verify on 6th digit in OTP step
  useEffect(() => {
    if (activeTab === 'signup' && signupStep === 'otp' && otpValue.length === 6 && !loading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpValue]);

  const clearAlerts = () => {
    setError('');
    setInfoMsg('');
  };

  const switchTab = (tab) => {
    clearAlerts();
    setActiveTab(tab);
    setSignupStep('form');
    setOtpValue('');
  };

  /* ============================================================
     1. SIGN IN SUBMISSION (Direct Email + Password)
     ============================================================ */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    const email = loginEmail.trim().toLowerCase();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const userData = await login(email, loginPassword, role);
      setSignupStep('success');
      setTimeout(() => {
        if (userData.role === 'assistant') {
          navigate('/assistant', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 900);
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     2. SIGN UP: STEP 1 — Send OTP
     ============================================================ */
  const handleSendSignupOtp = async (e) => {
    e.preventDefault();
    clearAlerts();

    const name = signupName.trim();
    const email = signupEmail.trim().toLowerCase();

    if (!name) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(email, 'signup');
      setInfoMsg(res?.message || `A 6-digit verification code has been sent to ${email}`);
      setCanResend(false);
      setResendKey((k) => k + 1);
      setOtpValue('');
      setSignupStep('otp');
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (err?.response?.status === 409 || msg?.toLowerCase().includes('already exists')) {
        setError(msg || 'An account with this email already exists.');
        setLoginEmail(email);
      } else {
        setError(msg || 'Unable to send verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     3. SIGN UP: STEP 2 — Verify OTP & Register
     ============================================================ */
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    clearAlerts();

    if (otpValue.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtpRegister(
        signupName.trim(),
        signupEmail.trim().toLowerCase(),
        otpValue,
        signupPassword,
        role,
        isA ? stationCode : undefined
      );

      if (res?.token || res?.user?.token) {
        setSignupStep('success');
        setTimeout(() => {
          navigate(role === 'assistant' ? '/assistant' : '/dashboard', { replace: true });
        }, 1100);
      } else {
        setActiveTab('login');
        setSignupStep('form');
        setInfoMsg(res.message || 'Account registered! Your assistant account is awaiting approval.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Verification failed. Please check the code.';
      if (err?.response?.status === 409 || msg.toLowerCase().includes('already exists')) {
        setError('An account with this verified email already exists.');
        setLoginEmail(signupEmail.trim().toLowerCase());
      } else {
        setError(msg);
      }
      if (/expired|invalidated/i.test(msg)) {
        setCanResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    clearAlerts();
    setLoading(true);
    try {
      const res = await sendOtp(signupEmail.trim().toLowerCase(), 'signup');
      setInfoMsg(res?.message || 'A fresh verification code was sent to your email.');
      setCanResend(false);
      setResendKey((k) => k + 1);
      setOtpValue('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     SUCCESS SCREEN
     ============================================================ */
  if (signupStep === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-5 max-w-sm bg-white p-8 sm:p-10 rounded-[32px] border border-zinc-100 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-[#09101d] text-white flex items-center justify-center shadow-md mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900">
              {activeTab === 'login' ? 'Welcome Back!' : 'Account Created!'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Taking you to your OneCoolie dashboard...</p>
          </div>
          <div className="flex justify-center gap-1.5 pt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER AUTH PAGE (Exact Recommended Structure)
     ============================================================ */
  return (
    <div className="h-screen flex flex-col lg:flex-row bg-[#F8FAFC] text-zinc-900 font-sans selection:bg-blue-600 selection:text-white overflow-hidden">

      {/* ── LEFT HERO PANEL (Full 100% Poster Image Fit - Zero Crop & Zero Side Bars) ── */}
      <div className="hidden lg:block h-screen shrink-0 relative overflow-hidden bg-zinc-950">
        <img
          src={isA ? '/images/assistant-login-hero.jpg' : '/images/passenger-login-hero.jpg'}
          alt={isA ? 'OneCoolie Assistant Portal - Assist Travelers Make Journeys Easier' : 'OneCoolie Passenger Portal - Your Journey, Our Support'}
          className="h-full w-auto max-w-[48vw] object-fill select-none pointer-events-none block"
          loading="eager"
        />
      </div>

      {/* ── RIGHT AUTH PANEL (Clean White/Light Blue Form Interface) ── */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden h-screen overflow-y-auto lg:overflow-y-hidden">

        {/* Ambient Soft Light Blue Glow Backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-50/70 rounded-full blur-2xl pointer-events-none -mb-16" />

        {/* Decorative Bottom Right Train Vector Accent */}
        <div className="absolute bottom-4 right-6 hidden lg:flex flex-col items-end opacity-20 pointer-events-none select-none">
          <svg className="w-24 h-8 text-blue-900" viewBox="0 0 120 40" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M0 35 H120 M10 35 C30 35, 40 20, 70 20 H120 M15 20 H50" />
          </svg>
          <span className="text-[9px] font-bold tracking-widest text-zinc-700 uppercase mt-0.5 text-right leading-tight">
            PEOPLE<br />BEHIND BETTER<br />JOURNEYS
          </span>
        </div>

        {/* Top Header Row: Back to Home Link */}
        <div className="relative z-20 flex items-center justify-between w-full max-w-[460px] mx-auto lg:max-w-none lg:justify-end">
          {/* Mobile Logo on top of screen */}
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <img src="/logo.png" alt="OneCoolie" className="h-7 w-auto object-contain" />
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-black transition-colors py-2 px-3 rounded-full hover:bg-white/80"
          >
            <span>&larr;</span>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Center: Floating White Card */}
        <div className="relative z-10 flex-1 flex items-center justify-center py-3 sm:py-4">
          <div className="w-full max-w-[440px] sm:max-w-[460px] bg-white rounded-[28px] sm:rounded-[36px] border border-zinc-100/90 shadow-[0_20px_60px_-15px_rgba(0,30,80,0.07)] p-5 sm:p-8 md:p-9 transition-all duration-300">

            {/* Card Brand Header & Clear Role Portal Badge */}
            <div className="text-center mb-3 sm:mb-4">
              <div className="flex flex-col items-center justify-center">
                <img
                  src="/logo.png"
                  alt="OneCoolie"
                  className="h-7 sm:h-8 w-auto object-contain mb-1.5"
                />

                {/* Clear Portal Badge (Passenger vs Assistant) */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border transition-all duration-200 ${isA
                      ? 'bg-amber-50 text-amber-900 border-amber-200/90 shadow-2xs'
                      : 'bg-blue-50 text-blue-900 border-blue-200/90 shadow-2xs'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full animate-pulse ${isA ? 'bg-amber-600' : 'bg-blue-600'}`} />
                  <span>{isA ? 'Assistant Portal' : 'Passenger Portal'}</span>
                </span>
              </div>
            </div>

            {/* Headline & Subtitle */}
            <div className="text-center mb-4 sm:mb-5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight mb-1">
                {activeTab === 'login'
                  ? 'Welcome Back'
                  : signupStep === 'otp'
                    ? 'Verify Email'
                    : 'Create Account'}
              </h1>
              <p className="text-xs text-zinc-500 font-normal">
                {activeTab === 'login'
                  ? isA
                    ? 'Sign in to access your assistant portal.'
                    : 'Sign in to continue your passenger journey.'
                  : signupStep === 'otp'
                    ? `Enter the 6-digit code sent to ${maskEmail(signupEmail)}`
                    : isA
                      ? 'Sign up to register as a station assistant.'
                      : 'Sign up to start your journey with OneCoolie.'}
              </p>
            </div>

            {/* Alert: Error */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50/90 border border-red-200/80 rounded-2xl flex items-start gap-2.5 animate-fade-in text-xs text-red-700">
                <span className="w-4 h-4 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">!</span>
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {/* Alert: Info */}
            {infoMsg && !error && (
              <div className="mb-5 p-3.5 bg-blue-50/90 border border-blue-200/80 rounded-2xl flex items-start gap-2.5 animate-fade-in text-xs text-blue-700">
                <span className="w-4 h-4 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">✓</span>
                <span className="leading-relaxed font-medium">{infoMsg}</span>
              </div>
            )}

            {/* ── TAB 1: SIGN IN FORM ────────────────────────────── */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                {/* Email Field with Left Mail Icon */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/70 hover:bg-white focus-within:bg-white border border-zinc-200/90 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100/50 rounded-2xl transition-all duration-200">
                    <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      placeholder="Email address"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={loading}
                      className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Password Field with Left Lock Icon & Right Eye Toggle */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/70 hover:bg-white focus-within:bg-white border border-zinc-200/90 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100/50 rounded-2xl transition-all duration-200">
                    <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loading}
                      className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none font-medium"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((s) => !s)}
                      className="text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Keep Me Signed In & Forgot Password Row */}
                <div className="flex items-center justify-between py-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-600 font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Keep me signed in</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      clearAlerts();
                      setInfoMsg('Password reset instructions will be sent to your email.');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Pill Button */}
                <button
                  type="submit"
                  id="btn-login-submit"
                  disabled={loading || !loginEmail.trim() || !loginPassword}
                  className="w-full py-3 px-6 rounded-full bg-[#09101d] hover:bg-black active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <span className="text-base">&rarr;</span>
                    </>
                  )}
                </button>

                {/* Account Toggle Divider */}
                <div className="relative pt-3 text-center">
                  <div className="absolute inset-0 flex items-center pt-3">
                    <div className="w-full border-t border-zinc-200/80" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-zinc-500 font-medium">
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchTab('signup')}
                        className="font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Create Account
                      </button>
                    </span>
                  </div>
                </div>

                {/* Security Reassurance & Subtle Secondary Portal Link */}
                <div className="pt-4 space-y-2 text-center">
                  <div className="flex items-center justify-center text-[11px] font-semibold text-zinc-400">
                    {isA ? (
                      <Link to="/auth" className="hover:text-blue-600 transition-colors">
                        Passenger Portal &rarr;
                      </Link>
                    ) : (
                      <Link to="/assistant-auth" className="hover:text-blue-600 transition-colors">
                        Assistant Portal &rarr;
                      </Link>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                    <svg className="w-3 h-3 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                    <span>Encrypted &bull; Verified Identity &bull; OneCoolie Rail Network</span>
                  </p>
                </div>
              </form>
            )}

            {/* ── TAB 2: SIGN UP — STEP 1 (Details Form) ─────────── */}
            {activeTab === 'signup' && signupStep === 'form' && (
              <form onSubmit={handleSendSignupOtp} className="space-y-4">
                {/* Name Field */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/70 hover:bg-white focus-within:bg-white border border-zinc-200/90 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100/50 rounded-2xl transition-all duration-200">
                    <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      id="signup-name"
                      type="text"
                      required
                      autoFocus
                      placeholder="Full Name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      disabled={loading}
                      className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/70 hover:bg-white focus-within:bg-white border border-zinc-200/90 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100/50 rounded-2xl transition-all duration-200">
                    <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Email address"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={loading}
                      className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/70 hover:bg-white focus-within:bg-white border border-zinc-200/90 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100/50 rounded-2xl transition-all duration-200">
                    <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="Create Password (min. 6 characters)"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={loading}
                      className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none font-medium"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowSignupPassword((s) => !s)}
                      className="text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Assistant Station Selection (Only if role === 'assistant') */}
                {isA && (
                  <div className="space-y-1">
                    <select
                      id="signup-station"
                      value={stationCode}
                      onChange={(e) => setStationCode(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-zinc-50/70 border border-zinc-200/90 rounded-2xl text-sm font-semibold text-zinc-900 outline-none"
                    >
                      {STATIONS.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.code}) — {s.division} Division
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Create Account Pill Button */}
                <button
                  type="submit"
                  id="btn-signup-send-otp"
                  disabled={loading || !signupName.trim() || !signupEmail.trim() || signupPassword.length < 6}
                  className="w-full py-3.5 px-6 rounded-full bg-[#09101d] hover:bg-black active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <span className="text-base">&rarr;</span>
                    </>
                  )}
                </button>

                {/* Account Toggle Divider */}
                <div className="relative pt-3 text-center">
                  <div className="absolute inset-0 flex items-center pt-3">
                    <div className="w-full border-t border-zinc-200/80" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-zinc-500 font-medium">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchTab('login')}
                        className="font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Sign In
                      </button>
                    </span>
                  </div>
                </div>

                {/* Security Badge (inside card) */}
                <div className="pt-3 text-center">
                  <p className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                    <svg className="w-3 h-3 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                    <span>Encrypted &bull; Verified Identity &bull; OneCoolie Rail Network</span>
                  </p>
                </div>
              </form>
            )}

            {/* ── TAB 2: SIGN UP — STEP 2 (OTP Entry) ────────────── */}
            {activeTab === 'signup' && signupStep === 'otp' && (
              <div className="space-y-5 animate-fade-in-up">
                <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                  <p className="text-xs text-blue-800 font-medium">
                    Code sent to <span className="font-mono font-bold text-blue-950">{signupEmail}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-center text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Enter 6-Digit Code
                    </label>
                    <OtpBoxes value={otpValue} onChange={setOtpValue} disabled={loading} />
                  </div>

                  <button
                    type="submit"
                    id="btn-verify-signup-otp"
                    disabled={loading || otpValue.length < 6}
                    className="w-full py-3.5 px-6 rounded-full bg-[#09101d] hover:bg-black active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify &amp; Create Account</span>
                        <span className="text-base">&rarr;</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSignupStep('form');
                      clearAlerts();
                    }}
                    className="font-semibold text-zinc-500 hover:text-black transition-colors cursor-pointer"
                  >
                    &larr; Edit details
                  </button>

                  {canResend ? (
                    <button
                      type="button"
                      id="btn-resend-signup-otp"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  ) : (
                    <span className="text-zinc-400">
                      Resend in <Countdown key={resendKey} seconds={60} onDone={() => setCanResend(true)} />
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}