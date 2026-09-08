import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import oneCoolieLogo from '../assets/onecoolie-logo.png';
import passengerHeroBg from '../assets/images/passenger-hero-bg.jpg';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Train,
  ArrowRight,
  ArrowLeft,
  Users,
  CheckCircle2,
  Luggage,
  Armchair,
  Accessibility,
  AlertCircle,
  RefreshCw,
  KeyRound,
} from 'lucide-react';

/* ============================================================
   ONECOOLIE — FORGOT PASSWORD PAGE
   Pixel-perfect match with AuthPage split-screen layout.
   Four internal steps managed via `step` state:
     'email'   → Enter registered email, request OTP
     'otp'     → Verify 6-digit code (auto-submit, resend countdown)
     'newPass' → Set new password (strength meter, requirements card)
     'success' → Animated success screen, go to Sign In
   ============================================================ */

/* ─── HELPERS ──────────────────────────────────────────────── */
const maskEmail = (e) => {
  const [l, d] = (e || '').split('@');
  if (!d) return e;
  return `${l[0]}${'•'.repeat(Math.min(l.length - 1, 4))}@${d}`;
};

/* ─── PASSWORD STRENGTH ─────────────────────────────────────── */
const getStrength = (pw) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0-5
};
const STRENGTH_LABEL = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLOR = ['#cbd5e1', '#ef4444', '#f97316', '#eab308', '#22c55e', '#15803d'];

/* ─── 6-DIGIT OTP BOXES — exact AuthPage pattern ───────────── */
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

/* ─── COUNTDOWN TIMER — exact AuthPage pattern ──────────────── */
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

/* ─── BUTTON TRAIN LOADER — exact AuthPage pattern ──────────── */
function ButtonTrainLoader({ text = 'Processing...' }) {
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

/* ─── LEFT BRANDING PANEL — mirrors AuthPage left section ───── */
function BrandingPanel() {
  const features = [
    { title: 'Luggage Assistance', desc: 'Porters for hassle-free travel', icon: Luggage },
    { title: 'Seat Escorting', desc: 'Get help to your coach', icon: Armchair },
    { title: 'Wheelchair Assistance', desc: 'Travel comfortably', icon: Accessibility },
    { title: 'Senior Citizen Support', desc: 'A safer, smoother journey', icon: Users },
  ];

  return (
    <div className="hidden lg:flex lg:w-[58%] xl:w-[60%] relative overflow-hidden flex-col justify-between p-8 xl:p-12 2xl:p-14 select-none">
      {/* Railway background image */}
      <img
        src={passengerHeroBg}
        alt="OneCoolie Passenger Railway Assistance"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Layered gradient scrims — exact match */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-white/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-transparent to-white/95 pointer-events-none" />

      {/* Content (above scrims) */}
      <div className="relative z-10 flex flex-col justify-between h-full">

        {/* Top-Left Header: Brand Identity & Status Pill */}
        <div className="space-y-3">
          <Link to="/" className="inline-block group">
            <img
              src={oneCoolieLogo}
              alt="OneCoolie"
              className="h-10 sm:h-12 md:h-13 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
            />
          </Link>

          <p className="text-xs text-[#7C8494] font-medium tracking-wide">
            Making Every Journey Easier.
          </p>

          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xs text-[11px] font-semibold text-zinc-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Trusted. Safe. Hassle-Free.</span>
            </div>
          </div>
        </div>

        {/* Center: Headline, Subheading & 4 Feature Rows */}
        <div className="py-4 xl:py-6 max-w-lg">
          <h1 className="text-3xl sm:text-4xl xl:text-5xl 2xl:text-[52px] font-extrabold text-[#071A3D] tracking-tight leading-[1.1] mb-3.5">
            Your Journey.<br />
            <span className="text-[#1463FF]">Our Support.</span>
          </h1>
          <p className="text-xs sm:text-sm xl:text-base text-zinc-600 font-normal leading-relaxed mb-6">
            Book trained assistants, get real-time help at railway stations, and travel with confidence.
          </p>

          {/* 4 Feature Rows */}
          <div className="space-y-3.5">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className="flex items-center gap-3.5 group">
                  <div className="w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-[#1463FF]/10 text-[#1463FF] border border-[#1463FF]/20 flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#071A3D] tracking-tight leading-snug">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-[#7C8494] leading-tight">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: Brand Statement & Station Pill */}
        <div className="pt-4 border-t border-slate-200/70 flex items-end justify-between">
          <div>
            <div className="w-6 h-0.5 bg-[#1463FF] mb-2 rounded-full" />
            <span className="text-xs font-bold text-[#071A3D] block tracking-tight">
              People. Journeys.
            </span>
            <span className="text-xs font-medium text-[#7C8494]">
              A Stronger India.
            </span>
          </div>

          <div className="hidden xl:inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E3E8F0] shadow-2xs">
            <Train className="w-5 h-5 text-[#1463FF]" />
            <div className="text-[11px] leading-tight text-left font-medium text-[#071A3D]">
              <span className="font-bold block">More Stations. More Journeys.</span>
              <span className="text-[#7C8494]">A More Inclusive India.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── STEP PROGRESS INDICATOR ───────────────────────────────── */
function StepDots({ current }) {
  const steps = ['email', 'otp', 'newPass'];
  return (
    <div className="flex items-center gap-1.5 justify-center mb-5">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`rounded-full transition-all duration-300 ${
            s === current
              ? 'w-5 h-1.5 bg-[#1463FF]'
              : steps.indexOf(current) > i
              ? 'w-1.5 h-1.5 bg-[#1463FF]/40'
              : 'w-1.5 h-1.5 bg-[#E3E8F0]'
          }`}
        />
      ))}
    </div>
  );
}

/* ─── AUTH CARD WRAPPER (right section card) ────────────────── */
function AuthCard({ children }) {
  return (
    <div className="w-full max-w-[480px] sm:max-w-[520px] xl:max-w-[550px] bg-white rounded-[28px] sm:rounded-[32px] border border-blue-100/90 shadow-[0_20px_60px_-15px_rgba(7,26,61,0.06)] p-6 sm:p-9 xl:p-10 transition-all animate-fade-in-up">
      {children}
    </div>
  );
}

/* ─── CARD BRAND HEADER (logo + portal badge) ───────────────── */
function CardHeader() {
  return (
    <div className="text-center mb-4 sm:mb-5">
      <div className="flex flex-col items-center justify-center">
        <img
          src={oneCoolieLogo}
          alt="OneCoolie"
          className="h-10 sm:h-12 md:h-13 max-h-[52px] w-auto object-contain mb-2.5 transition-transform hover:scale-102"
        />
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border bg-blue-50 text-[#1463FF] border-blue-200/90 shadow-2xs transition-all duration-200">
          <Users className="w-3.5 h-3.5 text-[#1463FF]" />
          <span>PASSENGER PORTAL</span>
        </span>
      </div>
    </div>
  );
}

/* ─── INLINE ALERT ──────────────────────────────────────────── */
function Alert({ type, children }) {
  if (!children) return null;
  if (type === 'error') {
    return (
      <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-fade-in">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
        <span className="leading-snug">{children}</span>
      </div>
    );
  }
  if (type === 'info') {
    return (
      <div className="mb-4 p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-800 text-xs flex items-start gap-2.5 animate-fade-in">
        <span className="font-bold shrink-0">ℹ️</span>
        <span className="leading-snug font-medium">{children}</span>
      </div>
    );
  }
  return null;
}

/* ─── PRIMARY CTA BUTTON ─────────────────────────────────────── */
function PrimaryBtn({ id, disabled, loading, loadingText = 'Processing...', children, onClick, type = 'submit' }) {
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full h-[54px] sm:h-[56px] px-6 rounded-[28px] bg-[#1463FF] hover:bg-[#0d52dd] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-md shadow-[#1463FF]/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? (
        <ButtonTrainLoader text={loadingText} />
      ) : (
        <>
          <span>{children}</span>
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}

/* ─── INPUT WRAPPER ─────────────────────────────────────────── */
function InputWrap({ children, hasError }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-zinc-50/70 hover:bg-white focus-within:bg-white border focus-within:ring-4 focus-within:ring-[#1463FF]/10 rounded-2xl transition-all duration-200 ${
      hasError
        ? 'border-rose-300 focus-within:border-rose-400'
        : 'border-[#E3E8F0] focus-within:border-[#1463FF]'
    }`}>
      {children}
    </div>
  );
}

/* ─── SECURITY BADGE ─────────────────────────────────────────── */
function SecurityBadge() {
  return (
    <div className="pt-2 text-center">
      <p className="text-[10px] text-[#7C8494] flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Encrypted · Verified Identity · OneCoolie Rail Network</span>
      </p>
    </div>
  );
}

/* ─── INDIAN ACCENT TAG ──────────────────────────────────────── */
function IndiaAccent() {
  return (
    <div className="pt-2 flex justify-end">
      <div className="flex flex-col items-end text-right select-none opacity-85">
        <span className="text-[10px] font-bold text-[#071A3D] leading-tight">Safer Journeys</span>
        <span className="text-[10px] font-medium text-[#7C8494] leading-tight">Stronger India.</span>
        <div className="flex items-center gap-1 mt-1">
          <span className="w-3.5 h-0.5 rounded-full bg-[#FF9933]" />
          <span className="w-3.5 h-0.5 rounded-full bg-slate-300" />
          <span className="w-3.5 h-0.5 rounded-full bg-[#128807]" />
        </div>
      </div>
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

  // Pre-fill email from AuthPage navigation state
  const prefillEmail = location.state?.email || '';

  // Current step
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'newPass' | 'success'

  // Form values
  const [email, setEmail] = useState(prefillEmail);
  const [emailTouched, setEmailTouched] = useState(false);
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

  // Computed password requirements
  const reqs = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter (A–Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter (a–z)', met: /[a-z]/.test(newPassword) },
    { label: 'One number (0–9)', met: /[0-9]/.test(newPassword) },
  ];
  const allReqsMet = reqs.every((r) => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const emailError = emailTouched && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? 'Please enter a valid email address.'
    : '';

  const clearAlerts = () => { setError(''); setInfoMsg(''); };

  // Auto-verify on 6th OTP digit
  useEffect(() => {
    if (step === 'otp' && otp.length === 6 && !loading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // Focus first OTP box on step change
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => document.getElementById('fp-otp-0')?.focus(), 120);
    }
  }, [step]);

  /* ── STEP 1: Request OTP ─────────────────────────────────── */
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    clearAlerts();
    setEmailTouched(true);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(trimmed);
      setOtp('');
      setCanResend(false);
      setResendKey((k) => k + 1);
      setStep('otp');
      setInfoMsg('If an account exists with this email, a verification code has been sent.');
    } catch (err) {
      if (err?.response?.status === 429) {
        setError(err?.response?.data?.message || 'Too many requests. Please wait before trying again.');
      } else {
        // Anti-enumeration: always show generic success
        setOtp('');
        setCanResend(false);
        setResendKey((k) => k + 1);
        setStep('otp');
        setInfoMsg('If an account exists with this email, a verification code has been sent.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── STEP 2: Verify OTP ──────────────────────────────────── */
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
      const msg = err?.response?.data?.message || 'Invalid or expired verification code. Please try again.';
      setError(msg);
      if (/expired|invalidated/i.test(msg)) {
        setCanResend(true);
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ──────────────────────────────────────────── */
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    clearAlerts();
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setInfoMsg('A new verification code has been sent to your email.');
      setOtp('');
      setCanResend(false);
      setResendKey((k) => k + 1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── STEP 3: Reset Password ──────────────────────────────── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!allReqsMet) {
      setError('Please meet all password requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match. Please re-enter them.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(resetToken, newPassword, confirmPassword);
      setStep('success');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to reset password. Please try again.';
      if (/expired|invalid.*token|start over/i.test(msg)) {
        setError(msg + ' Please restart the password reset process.');
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

  /* ─── BACK HANDLER ────────────────────────────────────────── */
  const goBack = () => {
    clearAlerts();
    if (step === 'otp') { setStep('email'); setOtp(''); }
    else if (step === 'newPass') { setStep('otp'); }
    else navigate('/auth');
  };

  /* ─── MOBILE HERO BANNER (below form on mobile) ─────────── */
  const MobileHero = () => (
    <div className="lg:hidden w-full max-w-[480px] mx-auto mt-4 mb-6">
      <div className="relative rounded-[24px] overflow-hidden border border-[#E3E8F0] shadow-sm">
        <img
          src={passengerHeroBg}
          alt="OneCoolie Railway Station"
          className="w-full h-44 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071A3D]/90 via-[#071A3D]/40 to-transparent flex flex-col justify-end p-4 text-white">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#1463FF] bg-white/90 px-2.5 py-0.5 rounded-full w-fit mb-1">
            Passenger Support
          </span>
          <h3 className="text-base font-extrabold leading-tight">
            Your Journey. Our Support.
          </h3>
          <p className="text-xs text-slate-200 mt-0.5">
            Book trained assistants and travel with confidence.
          </p>
        </div>
      </div>
    </div>
  );

  /* ============================================================
     STEP 4: SUCCESS SCREEN
     ============================================================ */
  if (step === 'success') {
    return (
      <div className="min-h-screen lg:h-screen w-full flex flex-col lg:flex-row bg-[#F5F7FA] text-zinc-900 font-sans selection:bg-[#1463FF] selection:text-white overflow-x-hidden">
        <BrandingPanel />

        {/* Right: Success */}
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8 xl:p-10 relative overflow-y-auto min-h-screen lg:min-h-0 bg-[#F5F7FA]">
          {/* Top nav (spacer) */}
          <div className="h-12" />

          {/* Center card */}
          <div className="relative z-10 flex-1 flex items-center justify-center py-4 sm:py-6">
            <AuthCard>
              <CardHeader />

              {/* Animated success circle */}
              <div className="flex flex-col items-center text-center py-4 space-y-5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-25" />
                  <div className="relative w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#071A3D] tracking-tight mb-1.5">
                    Password Reset Successfully
                  </h2>
                  <p className="text-xs sm:text-sm text-[#7C8494] leading-relaxed">
                    Your password has been updated successfully.<br />
                    You can now sign in using your new password.
                  </p>
                </div>

                {/* Security confirmation card */}
                <div className="w-full bg-emerald-50/80 border border-emerald-200/80 rounded-2xl px-4 py-3.5 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-emerald-800">Your account is now secure</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                      Thank you for being a part of ONECOOLIE!
                    </p>
                  </div>
                </div>

                <PrimaryBtn
                  id="btn-goto-login-success"
                  type="button"
                  onClick={() => navigate('/auth')}
                >
                  Continue to Sign In
                </PrimaryBtn>
              </div>

              <IndiaAccent />
            </AuthCard>
          </div>

          {/* Footer */}
          <div className="relative z-20 text-center py-2 text-[11px] text-[#7C8494] font-medium">
            <span>© 2026 OneCoolie. Making Every Journey Easier.</span>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     MAIN LAYOUT (steps: email | otp | newPass)
     ============================================================ */
  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col lg:flex-row bg-[#F5F7FA] text-zinc-900 font-sans selection:bg-[#1463FF] selection:text-white overflow-x-hidden">

      {/* LEFT: Railway Branding Panel */}
      <BrandingPanel />

      {/* RIGHT: Auth Form Area */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8 xl:p-10 relative overflow-y-auto min-h-screen lg:min-h-0 bg-[#F5F7FA]">

        {/* Top nav row */}
        <div className="relative z-20 flex items-center justify-between w-full max-w-[500px] xl:max-w-[550px] mx-auto lg:max-w-none lg:justify-end">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <img src={oneCoolieLogo} alt="OneCoolie" className="h-8 sm:h-9 w-auto object-contain" />
          </Link>

          {/* Back to Sign In */}
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7C8494] hover:text-[#071A3D] transition-colors py-2 px-3.5 rounded-full hover:bg-white border border-transparent hover:border-[#E3E8F0]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 'email' ? 'Back to Sign In' : 'Go Back'}</span>
          </button>
        </div>

        {/* Center: Auth Card */}
        <div className="relative z-10 flex-1 flex items-center justify-center py-4 sm:py-6">
          <AuthCard>
            <CardHeader />

            {/* Step Progress Dots */}
            {step !== 'success' && <StepDots current={step} />}

            {/* ══════════════════════════════════
                STEP 1 — EMAIL ENTRY
                ══════════════════════════════════ */}
            {step === 'email' && (
              <form onSubmit={handleRequestOtp} className="space-y-4 animate-fade-in-up">

                {/* Heading */}
                <div className="text-center mb-4 sm:mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#1463FF]/10 border border-[#1463FF]/20 flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-6 h-6 text-[#1463FF]" />
                  </div>
                  <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#071A3D] tracking-tight mb-1">
                    Forgot Password?
                  </h2>
                  <p className="text-xs sm:text-sm text-[#7C8494] font-normal">
                    Enter your registered email address and we'll send you a verification code.
                  </p>
                </div>

                <Alert type="error">{error}</Alert>
                <Alert type="info">{infoMsg}</Alert>

                {/* Email Field */}
                <div className="space-y-1">
                  <InputWrap hasError={!!emailError}>
                    <Mail className="w-5 h-5 text-[#7C8494] shrink-0" />
                    <input
                      id="fp-email"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) clearAlerts();
                      }}
                      onBlur={() => setEmailTouched(true)}
                      disabled={loading}
                      className="w-full bg-transparent text-sm text-[#071A3D] placeholder:text-[#7C8494] outline-none font-medium"
                    />
                  </InputWrap>
                  {emailError && (
                    <p className="text-[11px] text-rose-500 font-medium pl-1">{emailError}</p>
                  )}
                </div>

                {/* CTA */}
                <PrimaryBtn
                  id="btn-send-reset-otp"
                  disabled={loading || !email.trim() || !!emailError}
                  loading={loading}
                  loadingText="Sending Code..."
                >
                  Send Verification Code
                </PrimaryBtn>

                {/* Info hint */}
                <div className="px-3.5 py-3 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-start gap-2.5">
                  <span className="text-blue-500 font-bold shrink-0 text-xs mt-0.5">ⓘ</span>
                  <p className="text-xs text-blue-700 leading-snug">
                    We'll send a secure 6-digit verification code to your registered email address.
                  </p>
                </div>

                {/* Remember password link */}
                <div className="pt-1 text-center text-xs text-[#7C8494] font-medium">
                  <span>Remember your password? </span>
                  <Link to="/auth" className="font-bold text-[#1463FF] hover:underline ml-1">
                    Sign In
                  </Link>
                </div>

                <SecurityBadge />
                <IndiaAccent />
              </form>
            )}

            {/* ══════════════════════════════════
                STEP 2 — OTP VERIFICATION
                ══════════════════════════════════ */}
            {step === 'otp' && (
              <div className="space-y-4 animate-fade-in-up">

                {/* Heading */}
                <div className="text-center mb-4 sm:mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#1463FF]/10 border border-[#1463FF]/20 flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-[#1463FF]" />
                  </div>
                  <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#071A3D] tracking-tight mb-1">
                    Verify Your Email
                  </h2>
                  <p className="text-xs sm:text-sm text-[#7C8494] font-normal">
                    We've sent a 6-digit verification code to
                  </p>
                  <p className="text-sm font-bold text-[#071A3D] font-mono mt-0.5">
                    {maskEmail(email)}
                  </p>
                </div>

                {/* Code sent pill */}
                <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-2xl text-center">
                  <p className="text-xs text-blue-800 font-medium">
                    Code sent to <span className="font-mono font-bold text-[#071A3D]">{email.trim().toLowerCase()}</span>
                  </p>
                </div>

                <Alert type="error">{error}</Alert>
                <Alert type="info">{infoMsg}</Alert>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-center text-xs font-bold uppercase tracking-wider text-[#7C8494]">
                      Enter 6-Digit Code
                    </label>
                    <OtpBoxes value={otp} onChange={setOtp} disabled={loading} />
                  </div>

                  <PrimaryBtn
                    id="btn-verify-reset-otp"
                    disabled={loading || otp.length !== 6}
                    loading={loading}
                    loadingText="Verifying..."
                  >
                    Verify Code
                  </PrimaryBtn>
                </form>

                {/* Resend + back row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); clearAlerts(); setOtp(''); }}
                    className="text-[#7C8494] hover:text-[#071A3D] font-medium flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Change email
                  </button>

                  <div className="text-right">
                    {canResend ? (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="inline-flex items-center gap-1 font-bold text-[#1463FF] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Resend Code
                      </button>
                    ) : (
                      <span className="text-[#7C8494]">
                        Resend in <Countdown key={resendKey} seconds={60} onDone={() => setCanResend(true)} />
                      </span>
                    )}
                  </div>
                </div>

                <SecurityBadge />
                <IndiaAccent />
              </div>
            )}

            {/* ══════════════════════════════════
                STEP 3 — CREATE NEW PASSWORD
                ══════════════════════════════════ */}
            {step === 'newPass' && (
              <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in-up">

                {/* Heading */}
                <div className="text-center mb-4 sm:mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#1463FF]/10 border border-[#1463FF]/20 flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-[#1463FF]" />
                  </div>
                  <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#071A3D] tracking-tight mb-1">
                    Create New Password
                  </h2>
                  <p className="text-xs sm:text-sm text-[#7C8494] font-normal">
                    Choose a strong password to secure your ONECOOLIE account.
                  </p>
                </div>

                <Alert type="error">{error}</Alert>

                {/* New Password */}
                <div className="space-y-1.5">
                  <InputWrap>
                    <Lock className="w-5 h-5 text-[#7C8494] shrink-0" />
                    <input
                      id="fp-new-password"
                      type={showNewPass ? 'text' : 'password'}
                      required
                      autoFocus
                      autoComplete="new-password"
                      placeholder="New Password"
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
                  </InputWrap>

                  {/* Password Strength Bar */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#7C8494]">Password Strength</span>
                        <span className="text-[11px] font-bold" style={{ color: STRENGTH_COLOR[strength] }}>
                          {STRENGTH_LABEL[strength]}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div
                            key={s}
                            className="flex-1 h-1 rounded-full transition-all duration-300"
                            style={{ backgroundColor: strength >= s ? STRENGTH_COLOR[strength] : '#E3E8F0' }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <InputWrap hasError={confirmPassword.length > 0 && !passwordsMatch}>
                    <Lock className="w-5 h-5 text-[#7C8494] shrink-0" />
                    <input
                      id="fp-confirm-password"
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="Confirm New Password"
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
                      aria-label={showConfirmPass ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </InputWrap>

                  {/* Match indicator */}
                  {confirmPassword.length > 0 && (
                    <p className={`text-[11px] font-semibold pl-1 ${passwordsMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                {/* Password Requirements Card */}
                <div className="bg-[#F8FAFC] rounded-2xl p-3.5 border border-[#E3E8F0]">
                  <p className="text-[11px] font-bold text-[#7C8494] uppercase tracking-wide mb-2.5">
                    Your password should contain:
                  </p>
                  <ul className="space-y-1.5">
                    {reqs.map(({ label, met }) => (
                      <li
                        key={label}
                        className={`flex items-center gap-2 text-[12px] font-medium transition-colors duration-200 ${
                          met ? 'text-emerald-700' : 'text-[#94a3b8]'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 ${
                          met
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-[#CBD5E1] bg-transparent'
                        }`}>
                          {met && (
                            <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                              <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Reset button */}
                <PrimaryBtn
                  id="btn-reset-password"
                  disabled={loading || !allReqsMet || !passwordsMatch}
                  loading={loading}
                  loadingText="Resetting..."
                >
                  Reset Password
                </PrimaryBtn>

                <SecurityBadge />
                <IndiaAccent />
              </form>
            )}

          </AuthCard>
        </div>

        {/* Mobile Hero */}
        <MobileHero />

        {/* Footer */}
        <div className="relative z-20 text-center py-2 text-[11px] text-[#7C8494] font-medium">
          <span>© 2026 OneCoolie. Making Every Journey Easier.</span>
        </div>

      </div>
    </div>
  );
}
