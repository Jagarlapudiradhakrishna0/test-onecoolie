import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STATIONS } from '../utils/services';

/* ============================================================
   ONECOOLIE AUTH PAGE — Production Hybrid Auth Flow
   • Sign In: Email + Password directly (NEVER asks for OTP!)
   • Sign Up: Name + Email + Password + ONE-TIME Email OTP Verification
   • Design: Swiss Minimal Identity, High contrast, Apple-tier polish
   ============================================================ */

const maskEmail = (e) => {
  const [l, d] = (e || '').split('@');
  if (!d) return e;
  return `${l[0]}${'•'.repeat(Math.min(l.length - 1, 4))}@${d}`;
};

/* ─── OTP BOXES ─────────────────────────────────────────────── */
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
    <div className="flex gap-2 sm:gap-3">
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
            'flex-1 min-w-0 h-14 sm:h-16 text-center text-2xl font-bold font-mono rounded-2xl border-2',
            'transition-all duration-150 outline-none select-none',
            disabled ? 'opacity-40 cursor-not-allowed bg-zinc-50' : 'cursor-text',
            d
              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md shadow-blue-100'
              : 'border-zinc-200 bg-white text-zinc-900 focus:border-blue-500 focus:bg-blue-50/40 focus:shadow-sm',
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
    <span className="font-mono font-bold text-blue-600 text-sm tabular-nums">
      {String(Math.floor(t / 60)).padStart(2, '0')}:{String(t % 60).padStart(2, '0')}
    </span>
  );
}

/* ─── PASSWORD INPUT WITH SHOW/HIDE & STRENGTH ──────────────── */
function PwdField({ id, value, onChange, placeholder, disabled, autoFocus, autoComplete, showStrength = false }) {
  const [show, setShow] = useState(false);
  const strength = !value ? 0 : value.length < 6 ? 1 : value.length < 10 ? 2 : 3;
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500'][strength];
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'][strength];

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder || 'Enter password'}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete={autoComplete || 'current-password'}
          className="input-base pr-16"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:text-blue-600 transition-colors px-1.5 py-1 rounded select-none"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>

      {showStrength && value && (
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex gap-1 flex-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  strength >= n ? strengthColor : 'bg-zinc-200'
                }`}
              />
            ))}
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              strength === 1 ? 'text-red-500' : strength === 2 ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {strengthLabel}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── LOGO ICON ─────────────────────────────────────────────── */
function OcMark({ size = 'md' }) {
  const s = size === 'sm' ? 'w-8 h-8 text-sm rounded-xl' : 'w-11 h-11 text-base rounded-2xl';
  return (
    <div className={`${s} bg-blue-600 text-white flex items-center justify-center font-black tracking-tight shadow-lg shadow-blue-200 shrink-0 select-none`}>
      OC
    </div>
  );
}

/* ─── MAIN AUTH PAGE COMPONENT ──────────────────────────────── */
export default function AuthPage({ role = 'passenger' }) {
  const isA = role === 'assistant';

  // Primary active tab: 'login' or 'signup'
  const [activeTab, setActiveTab] = useState('login');

  // Sign up verification sub-step: 'form' | 'otp' | 'success'
  const [signupStep, setSignupStep] = useState('form');

  // Form states
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName]         = useState('');
  const [signupEmail, setSignupEmail]       = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [stationCode, setStationCode]       = useState('KZJ');
  const [otpValue, setOtpValue]             = useState('');

  // UI status
  const [error, setError]         = useState('');
  const [infoMsg, setInfoMsg]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendKey, setResendKey] = useState(0);

  const { login, sendOtp, verifyOtpRegister } = useAuth();
  const navigate = useNavigate();

  // Focus OTP box when entering OTP view
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
     1. SIGN IN SUBMISSION (Email + Password ONLY — NO OTP!)
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
      }, 1000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     2. SIGN UP: STEP 1 — Send One-Time Verification OTP
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
        setError(msg || 'An account with this email already exists. Only one account can be created per verified email.');
        setLoginEmail(email);
      } else {
        setError(msg || 'Unable to send verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     3. SIGN UP: STEP 2 — Verify OTP & Create Account
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
        }, 1200);
      } else {
        // Assistant awaiting approval
        setActiveTab('login');
        setSignupStep('form');
        setInfoMsg(res.message || 'Account registered! Your assistant account is awaiting admin approval.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Verification failed. Please check the code.';
      if (err?.response?.status === 409 || msg.toLowerCase().includes('already exists')) {
        setError('An account with this verified email already exists. Only one account is permitted.');
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

  /* ── Resend Signup OTP ── */
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
     SUCCESS SCREEN (Redirecting)
     ============================================================ */
  if (signupStep === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center space-y-5 animate-scale-in max-w-sm">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-200 mx-auto">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900">
              {activeTab === 'login' ? 'Welcome back!' : 'Account Created!'}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Taking you to your OneCoolie dashboard...</p>
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
     RENDER AUTH PAGE
     ============================================================ */
  return (
    <div className="min-h-screen flex bg-white text-black selection:bg-blue-600 selection:text-white">

      {/* ── LEFT PANEL (Desktop Editorial & Branding) ─────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 bg-black text-white flex-col justify-between p-14 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-blue-600/30 blur-3xl pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mb-14"
          >
            ← Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <OcMark />
            <div>
              <p className="text-lg font-black tracking-tight">OneCoolie</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {isA ? 'Assistant Portal' : 'Passenger Platform'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 rounded-full px-4 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
              {isA ? 'Duty Dispatch Active' : 'Station Transit Assistance'}
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.1]">
            {isA ? (
              <>Empower every<br /><span className="text-blue-500">station journey.</span></>
            ) : (
              <>Effortless travel,<br /><span className="text-blue-500">every station.</span></>
            )}
          </h1>

          <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
            {isA
              ? 'Accept duty jobs, navigate passengers with luggage, and earn daily at major railway hubs.'
              : 'Book verified coolies, luggage handling, priority wheelchair escort, and coach navigation.'}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {(isA
              ? ['KYC Verified', 'Direct Dispatch', 'Instant Earnings']
              : ['Luggage Handling', 'Wheelchair Escort', 'Coach Navigation']
            ).map((f) => (
              <span
                key={f}
                className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-600">
            © {new Date().getFullYear()} OneCoolie
          </span>
          <span className="text-[10px] font-mono font-bold text-blue-500">
            KZJ · WL · BZA · SC
          </span>
        </div>
      </div>

      {/* ── RIGHT PANEL (Auth Forms) ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 min-h-screen">
        <div className="w-full max-w-[420px]">

          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <Link to="/" className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black">
              ← Home
            </Link>
            <div className="flex items-center gap-2">
              <OcMark size="sm" />
              <span className="font-black text-sm">OneCoolie</span>
            </div>
          </div>

          {/* Tab Selector: Sign In vs Create Account */}
          {signupStep !== 'otp' && (
            <div className="flex p-1 bg-zinc-100 rounded-2xl mb-8 border border-zinc-200/80">
              <button
                type="button"
                id="tab-login"
                onClick={() => switchTab('login')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                  activeTab === 'login'
                    ? 'bg-white text-black shadow-sm font-extrabold'
                    : 'text-zinc-500 hover:text-black'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-signup"
                onClick={() => switchTab('signup')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                  activeTab === 'signup'
                    ? 'bg-white text-black shadow-sm font-extrabold'
                    : 'text-zinc-500 hover:text-black'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Header text */}
          <div className="mb-6 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 font-mono">
              {isA ? 'Assistant Portal' : 'Passenger Platform'}
            </span>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900">
              {activeTab === 'login'
                ? 'Sign in to OneCoolie'
                : signupStep === 'otp'
                ? 'Verify your email'
                : 'Create an account'}
            </h2>
            <p className="text-xs text-zinc-500 pt-0.5">
              {activeTab === 'login'
                ? 'Enter your email and password to access your account.'
                : signupStep === 'otp'
                ? `Enter the 6-digit OTP sent to ${maskEmail(signupEmail)}`
                : 'Sign up with your details. One-time email OTP verification is required.'}
            </p>
          </div>

          {/* Alert: Error */}
          {error && (
            <div id="auth-error-banner" className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl animate-fade-in space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-600 text-[10px] font-black">!</span>
                </div>
                <p className="text-xs font-semibold text-red-700 leading-relaxed">{error}</p>
              </div>
              {error.toLowerCase().includes('already exists') && activeTab === 'signup' && (
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="w-full py-2 px-3 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  Go to Sign In →
                </button>
              )}
            </div>
          )}

          {/* Alert: Info */}
          {infoMsg && !error && (
            <div id="auth-info-banner" className="mb-5 flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl animate-fade-in">
              <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-blue-700 text-xs font-black">✓</span>
              </div>
              <p className="text-xs font-semibold text-blue-700 leading-relaxed">{infoMsg}</p>
            </div>
          )}

          {/* ============================================================
              TAB 1: SIGN IN (Email + Password ONLY — NO OTP!)
              ============================================================ */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fade-in-up">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={loading}
                  className="input-base"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400"
                  >
                    Password
                  </label>
                </div>
                <PwdField
                  id="login-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Your account password"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                disabled={loading || !loginEmail.trim() || !loginPassword}
                className="btn-primary w-full py-3.5 text-sm gap-2 font-bold shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>Sign In →</>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-zinc-500">
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('signup')}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Create one now
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ============================================================
              TAB 2: SIGN UP — STEP 1 (Details Form)
              ============================================================ */}
          {activeTab === 'signup' && signupStep === 'form' && (
            <form onSubmit={handleSendSignupOtp} className="space-y-4 animate-fade-in-up">
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-name"
                  className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400"
                >
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Rahul Sharma"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  disabled={loading}
                  className="input-base"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-email"
                  className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400"
                >
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  disabled={loading}
                  className="input-base"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-password"
                  className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400"
                >
                  Create Password
                </label>
                <PwdField
                  id="signup-password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={loading}
                  autoComplete="new-password"
                  showStrength={true}
                />
              </div>

              {isA && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-station"
                    className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400"
                  >
                    Assigned Railway Station
                  </label>
                  <select
                    id="signup-station"
                    value={stationCode}
                    onChange={(e) => setStationCode(e.target.value)}
                    disabled={loading}
                    className="input-base font-semibold"
                  >
                    {STATIONS.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code}) — {s.division} Division
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Verification notice */}
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  <strong className="text-zinc-800">One-Time Verification:</strong> We will send a 6-digit OTP to your email to verify your address before account creation.
                </p>
              </div>

              <button
                type="submit"
                id="btn-signup-send-otp"
                disabled={loading || !signupName.trim() || !signupEmail.trim() || signupPassword.length < 6}
                className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>Send Verification Code →</>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-zinc-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ============================================================
              TAB 2: SIGN UP — STEP 2 (OTP Entry)
              ============================================================ */}
          {activeTab === 'signup' && signupStep === 'otp' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-start gap-3.5 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-blue-900 mb-0.5">Verification code sent to</p>
                  <p className="text-sm font-bold text-blue-950 font-mono truncate">{signupEmail}</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">Check inbox & spam · Valid for 10 mins</p>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                    Enter 6-Digit Code
                  </label>
                  <OtpBoxes value={otpValue} onChange={setOtpValue} disabled={loading} />
                </div>

                <button
                  type="submit"
                  id="btn-verify-signup-otp"
                  disabled={loading || otpValue.length < 6}
                  className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-blue-500/20"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying &amp; Creating Account...
                    </>
                  ) : (
                    'Verify &amp; Create Account'
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
                  className="font-semibold text-zinc-500 hover:text-black transition-colors"
                >
                  ← Edit details
                </button>

                {canResend ? (
                  <button
                    type="button"
                    id="btn-resend-signup-otp"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    {loading ? 'Sending...' : 'Resend Code'}
                  </button>
                ) : (
                  <span className="text-zinc-400">
                    Resend in <Countdown key={resendKey} seconds={60} onDone={() => setCanResend(true)} />
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Portal Switch & Security Badge */}
          <div className="mt-10 pt-6 border-t border-zinc-100 space-y-3 text-center">
            <div className="flex items-center justify-center gap-4 text-xs font-semibold">
              {isA ? (
                <Link to="/auth" className="text-zinc-400 hover:text-blue-600 transition-colors">
                  Passenger Portal →
                </Link>
              ) : (
                <Link to="/assistant-auth" className="text-zinc-400 hover:text-blue-600 transition-colors">
                  Assistant Portal →
                </Link>
              )}
              <span className="text-zinc-300">·</span>
              <Link to="/admin-auth" className="text-zinc-400 hover:text-blue-600 transition-colors">
                Admin Console →
              </Link>
            </div>

            <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-zinc-300 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              <span>Encrypted · Verified Identity · ONECOOLIE Network</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}