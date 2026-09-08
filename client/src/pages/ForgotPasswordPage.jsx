import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Train,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

/* ============================================================
   ONECOOLIE — FORGOT PASSWORD PAGE
   4-step flow:
     1. email     → Enter registered email, request OTP
     2. otp       → Verify 6-digit OTP (with resend cooldown)
     3. newPass   → Set new password (strength meter + visibility toggle)
     4. success   → Success screen with Go to Login
   ============================================================ */

/* ─── HELPERS ────────────────────────────────────────────── */
const maskEmail = (e) => {
  const [l, d] = (e || '').split('@');
  if (!d) return e;
  return `${l[0]}${'•'.repeat(Math.min(l.length - 1, 4))}@${d}`;
};

/* ─── PASSWORD STRENGTH ───────────────────────────────────── */
const getStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-5
};
const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#15803d'];

/* ─── 6-DIGIT OTP BOXES ─────────────────────────────────── */
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
          id={`fp-otp-${i}`}
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
              ? 'border-[#1463FF] bg-blue-50/70 text-[#1463FF] shadow-xs'
              : 'border-[#E3E8F0] bg-white text-zinc-900 focus:border-[#1463FF] focus:bg-blue-50/30',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

/* ─── COUNTDOWN TIMER ───────────────────────────────────── */
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
    <span className="font-mono font-bold text-[#1463FF] text-xs tabular-nums">
      {String(Math.floor(t / 60)).padStart(2, '0')}:{String(t % 60).padStart(2, '0')}
    </span>
  );
}

/* ─── BUTTON LOADER ─────────────────────────────────────── */
function ButtonLoader({ text = 'Processing...' }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-0.5">
      <div className="relative w-20 h-5 flex items-center overflow-hidden">
        <div className="absolute inset-x-0 bottom-1.5 h-0.5 border-b border-dashed border-white/50" />
        <div className="animate-train-glide flex items-center gap-1 text-white">
          <Train className="w-5 h-5 drop-shadow-sm" />
          <span className="w-1.5 h-1 bg-white/80 rounded-full" />
        </div>
      </div>
      <span className="text-xs font-bold tracking-wider uppercase text-white/95">{text}</span>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { forgotPassword, verifyResetOtp, resetPassword } = useAuth();

  // Pre-fill email if navigated from AuthPage with state
  const prefillEmail = location.state?.email || '';

  // Step: 'email' | 'otp' | 'newPass' | 'success'
  const [step, setStep] = useState('email');

  // Fields
  const [email, setEmail] = useState(prefillEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [resendKey, setResendKey] = useState(0);
  const [resetToken, setResetToken] = useState('');

  const strength = getStrength(newPassword);

  const clearAlerts = () => { setError(''); setInfoMsg(''); };

  // Auto-verify OTP on 6th digit
  useEffect(() => {
    if (step === 'otp' && otp.length === 6 && !loading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => document.getElementById('fp-otp-0')?.focus(), 120);
    }
  }, [step]);

  /* ── STEP 1: Request OTP ──────────────────────────────── */
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    clearAlerts();

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(trimmed);
      setInfoMsg(res?.message || 'If an account exists with this email, a verification code has been sent.');
      setOtp('');
      setCanResend(false);
      setResendKey((k) => k + 1);
      setStep('otp');
    } catch (err) {
      // Rate limiting or validation errors
      const msg = err?.response?.data?.message || 'Unable to send reset code. Please try again.';
      if (err?.response?.status === 429) {
        setError(msg);
      } else {
        // Don't leak whether email exists — show generic info
        setInfoMsg('If an account exists with this email, a verification code has been sent.');
        setStep('otp');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── STEP 2: Verify OTP ───────────────────────────────── */
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    clearAlerts();

    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyResetOtp(email.trim().toLowerCase(), otp);
      setResetToken(res.resetToken);
      setStep('newPass');
      clearAlerts();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid or expired OTP. Please try again.';
      setError(msg);
      if (/expired|invalidated/i.test(msg)) {
        setCanResend(true);
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ──────────────────────────────────────── */
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    clearAlerts();
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setInfoMsg(res?.message || 'A new verification code has been sent to your email.');
      setOtp('');
      setCanResend(false);
      setResendKey((k) => k + 1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── STEP 3: Reset Password ───────────────────────────── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(resetToken, newPassword, confirmPassword);
      setStep('success');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to reset password. Please try again.';
      if (/expired|invalid.*token|start over/i.test(msg)) {
        setError(msg + ' Please request a new OTP.');
        setStep('email');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ─── SHARED CARD WRAPPER ─────────────────────────────── */
  const Card = ({ children }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA] p-4 sm:p-6 font-sans">
      {/* Back to Login */}
      <div className="w-full max-w-[480px] mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (step === 'otp') setStep('email');
            else if (step === 'newPass') setStep('otp');
            else navigate('/auth');
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7C8494] hover:text-[#071A3D] transition-colors py-2 px-3.5 rounded-full hover:bg-white border border-transparent hover:border-[#E3E8F0]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{step === 'email' ? 'Back to Login' : 'Go Back'}</span>
        </button>

        <Link
          to="/auth"
          className="text-xs font-semibold text-[#1463FF] hover:underline"
        >
          Sign In
        </Link>
      </div>

      <div className="w-full max-w-[480px] bg-white rounded-[28px] sm:rounded-[32px] border border-blue-100/90 shadow-[0_20px_60px_-15px_rgba(7,26,61,0.06)] p-6 sm:p-9 transition-all">
        {children}
      </div>

      {/* Security note */}
      {step !== 'success' && (
        <p className="mt-4 text-[10px] text-[#7C8494] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Encrypted · Secure · OneCoolie Rail Network</span>
        </p>
      )}
    </div>
  );

  /* ── STEP 4: SUCCESS ──────────────────────────────────── */
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-6 font-sans">
        <div className="w-full max-w-[440px] text-center space-y-6 bg-white p-8 sm:p-10 rounded-[32px] border border-[#E3E8F0] shadow-xl">
          {/* Animated checkmark */}
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30" />
            <div className="relative w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#071A3D] mb-2">
              Password Reset Successfully!
            </h1>
            <p className="text-sm text-[#7C8494] leading-relaxed">
              Your password has been updated successfully.
              <br />
              You can now sign in with your new password.
            </p>
          </div>

          <button
            id="btn-goto-login"
            onClick={() => navigate('/auth')}
            className="w-full h-[52px] px-6 rounded-[28px] bg-[#1463FF] hover:bg-[#0d52dd] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-md shadow-[#1463FF]/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Go to Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[10px] text-[#7C8494]">
            OneCoolie · Safer Journeys · Stronger India.
          </p>
        </div>
      </div>
    );
  }

  /* ── STEP 1: EMAIL ENTRY ──────────────────────────────── */
  if (step === 'email') {
    return (
      <Card>
        {/* Icon + Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1463FF]/10 border border-[#1463FF]/20 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-7 h-7 text-[#1463FF]" />
          </div>
          <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#071A3D] tracking-tight mb-1.5">
            Forgot Password?
          </h1>
          <p className="text-xs sm:text-sm text-[#7C8494]">
            Enter your registered email address and we'll send you a 6-digit verification code.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-snug">{error}</span>
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-800 text-xs flex items-start gap-2.5">
            <span className="font-bold shrink-0">ℹ️</span>
            <span className="leading-snug font-medium">{infoMsg}</span>
          </div>
        )}

        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7C8494] mb-1.5">
              Email Address
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/70 hover:bg-white focus-within:bg-white border border-[#E3E8F0] focus-within:border-[#1463FF] focus-within:ring-4 focus-within:ring-[#1463FF]/10 rounded-2xl transition-all duration-200">
              <Mail className="w-5 h-5 text-[#7C8494] shrink-0" />
              <input
                id="fp-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) clearAlerts(); }}
                disabled={loading}
                className="w-full bg-transparent text-sm text-[#071A3D] placeholder:text-[#7C8494] outline-none font-medium"
              />
            </div>
          </div>

          <button
            id="btn-send-reset-otp"
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full h-[54px] sm:h-[56px] px-6 rounded-[28px] bg-[#1463FF] hover:bg-[#0d52dd] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-md shadow-[#1463FF]/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <ButtonLoader text="Sending Code..." />
            ) : (
              <>
                <span>Send Verification Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-1 text-center text-xs text-[#7C8494]">
            <span>Remember your password? </span>
            <Link to="/auth" className="font-bold text-[#1463FF] hover:underline ml-1">
              Sign In
            </Link>
          </div>
        </form>
      </Card>
    );
  }

  /* ── STEP 2: OTP VERIFICATION ─────────────────────────── */
  if (step === 'otp') {
    return (
      <Card>
        {/* Icon + Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1463FF]/10 border border-[#1463FF]/20 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-[#1463FF]" />
          </div>
          <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#071A3D] tracking-tight mb-1.5">
            Verify Your Email
          </h1>
          <p className="text-xs sm:text-sm text-[#7C8494]">
            Enter the 6-digit code sent to{' '}
            <span className="font-semibold text-[#071A3D]">{maskEmail(email)}</span>
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-snug">{error}</span>
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-800 text-xs flex items-start gap-2.5">
            <span className="font-bold shrink-0">ℹ️</span>
            <span className="leading-snug font-medium">{infoMsg}</span>
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-5">
          {/* OTP Boxes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7C8494] mb-2.5">
              Verification Code
            </label>
            <OtpBoxes value={otp} onChange={setOtp} disabled={loading} />
          </div>

          {/* Verify button */}
          <button
            id="btn-verify-reset-otp"
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full h-[54px] sm:h-[56px] px-6 rounded-[28px] bg-[#1463FF] hover:bg-[#0d52dd] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-md shadow-[#1463FF]/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <ButtonLoader text="Verifying..." />
            ) : (
              <>
                <span>Verify Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Resend section */}
          <div className="text-center text-xs text-[#7C8494]">
            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="inline-flex items-center gap-1.5 font-semibold text-[#1463FF] hover:underline cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend Code</span>
              </button>
            ) : (
              <span className="text-[#7C8494]">
                Resend code in{' '}
                <Countdown
                  key={resendKey}
                  seconds={60}
                  onDone={() => setCanResend(true)}
                />
              </span>
            )}
          </div>

          <div className="pt-1 flex justify-center">
            <button
              type="button"
              onClick={() => { setStep('email'); clearAlerts(); setOtp(''); }}
              className="text-xs font-semibold text-[#7C8494] hover:text-[#071A3D] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Change email address
            </button>
          </div>
        </form>
      </Card>
    );
  }

  /* ── STEP 3: SET NEW PASSWORD ─────────────────────────── */
  return (
    <Card>
      {/* Icon + Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#1463FF]/10 border border-[#1463FF]/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-[#1463FF]" />
        </div>
        <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#071A3D] tracking-tight mb-1.5">
          Create New Password
        </h1>
        <p className="text-xs sm:text-sm text-[#7C8494]">
          Choose a strong password for your OneCoolie account.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-4">
        {/* New Password */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7C8494] mb-1.5">
            New Password
          </label>
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/70 hover:bg-white focus-within:bg-white border border-[#E3E8F0] focus-within:border-[#1463FF] focus-within:ring-4 focus-within:ring-[#1463FF]/10 rounded-2xl transition-all duration-200">
            <Lock className="w-5 h-5 text-[#7C8494] shrink-0" />
            <input
              id="fp-new-password"
              type={showNewPass ? 'text' : 'password'}
              required
              autoFocus
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); if (error) clearAlerts(); }}
              disabled={loading}
              className="w-full bg-transparent text-sm text-[#071A3D] placeholder:text-[#7C8494] outline-none font-medium"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowNewPass((s) => !s)}
              className="text-[#7C8494] hover:text-[#071A3D] transition-colors p-1"
              aria-label={showNewPass ? 'Hide password' : 'Show password'}
            >
              {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Strength meter */}
          {newPassword.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: strength >= s ? strengthColor[strength] : '#E3E8F0'
                    }}
                  />
                ))}
              </div>
              <p className="text-[11px] font-semibold" style={{ color: strengthColor[strength] || '#94a3b8' }}>
                {strengthLabel[strength] || 'Too Short'}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7C8494] mb-1.5">
            Confirm Password
          </label>
          <div className={`flex items-center gap-3 px-4 py-3 bg-zinc-50/70 hover:bg-white focus-within:bg-white border focus-within:ring-4 focus-within:ring-[#1463FF]/10 rounded-2xl transition-all duration-200 ${
            confirmPassword && newPassword !== confirmPassword
              ? 'border-rose-300 focus-within:border-rose-400'
              : 'border-[#E3E8F0] focus-within:border-[#1463FF]'
          }`}>
            <Lock className="w-5 h-5 text-[#7C8494] shrink-0" />
            <input
              id="fp-confirm-password"
              type={showConfirmPass ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (error) clearAlerts(); }}
              disabled={loading}
              className="w-full bg-transparent text-sm text-[#071A3D] placeholder:text-[#7C8494] outline-none font-medium"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirmPass((s) => !s)}
              className="text-[#7C8494] hover:text-[#071A3D] transition-colors p-1"
              aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
            >
              {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Match indicator */}
          {confirmPassword.length > 0 && (
            <p className={`mt-1.5 text-[11px] font-semibold ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-500'}`}>
              {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}
        </div>

        {/* Password requirements */}
        <div className="bg-zinc-50 rounded-xl p-3 border border-[#E3E8F0]">
          <p className="text-[11px] font-bold text-[#7C8494] uppercase tracking-wide mb-2">Requirements</p>
          <ul className="space-y-1">
            {[
              { label: 'At least 8 characters', met: newPassword.length >= 8 },
              { label: 'Contains a letter', met: /[A-Za-z]/.test(newPassword) },
              { label: 'Contains a number', met: /[0-9]/.test(newPassword) },
            ].map(({ label, met }) => (
              <li key={label} className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${met ? 'text-emerald-600' : 'text-[#94a3b8]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${met ? 'bg-emerald-500' : 'bg-[#CBD5E1]'}`} />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <button
          id="btn-reset-password"
          type="submit"
          disabled={
            loading ||
            newPassword.length < 8 ||
            !(/[A-Za-z]/.test(newPassword)) ||
            !(/[0-9]/.test(newPassword)) ||
            newPassword !== confirmPassword
          }
          className="w-full h-[54px] sm:h-[56px] px-6 rounded-[28px] bg-[#1463FF] hover:bg-[#0d52dd] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-md shadow-[#1463FF]/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <ButtonLoader text="Resetting..." />
          ) : (
            <>
              <span>Reset Password</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </Card>
  );
}
