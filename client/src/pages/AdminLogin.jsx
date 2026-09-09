import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Brand from '../components/Brand';
import { useAuth } from '../context/AuthContext';
import {
  Shield, KeyRound, Smartphone, AlertOctagon,
  Copy, Download, CheckCircle, ArrowLeft, Lock
} from 'lucide-react';

/* ============================================================
   ADMIN LOGIN — Operations Console Authentication with MFA
   Strict Swiss Minimal Palette: Black (#000000), White (#FFFFFF), Blue (#2563EB)
   ============================================================ */

export default function AdminLogin() {
  const navigate = useNavigate();
  const {
    login,
    verifyAdminMfaLogin,
    setupAdminMfa,
    verifyAdminMfaEnrollment
  } = useAuth();

  // Mode: 'credentials' | 'verify_mfa' | 'enroll_mfa' | 'enroll_recovery_codes'
  const [mode, setMode] = useState('credentials');

  // Step 1: Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockoutInfo, setLockoutInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 2: MFA Verification
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaType, setMfaType] = useState('totp'); // 'totp' | 'recovery'

  // Step 3: MFA Enrollment
  const [mfaSetupToken, setMfaSetupToken] = useState('');
  const [enrollData, setEnrollData] = useState(null); // { qrCode, otpauthUrl }
  const [enrollCode, setEnrollCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [acknowledgedCodes, setAcknowledgedCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // ============================================================
  // HANDLER: Step 1 Submit Credentials
  // ============================================================
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLockoutInfo(null);
    setLoading(true);

    try {
      const res = await login(email, password, 'admin');

      if (res?.requiresMfa) {
        if (res.mfaEnrolled && res.mfaToken) {
          // Case A: Admin has MFA enrolled -> Proceed to verify challenge
          setMfaToken(res.mfaToken);
          setMode('verify_mfa');
        } else if (!res.mfaEnrolled && res.mfaSetupToken) {
          // Case B: First-time admin requires MFA enrollment
          setMfaSetupToken(res.mfaSetupToken);
          const setupRes = await setupAdminMfa({ mfaSetupToken: res.mfaSetupToken });
          setEnrollData(setupRes);
          setMode('enroll_mfa');
        } else {
          setError('Unexpected MFA configuration response from server.');
        }
      } else {
        // Direct login succeeded
        navigate('/admin');
      }
    } catch (err) {
      if (err.response?.status === 423) {
        // Account Lockout
        const lockedUntil = err.response.data?.lockedUntil;
        setLockoutInfo({
          message: err.response.data?.message || 'Administrator account is temporarily locked due to multiple failed login attempts.',
          lockedUntil: lockedUntil ? new Date(lockedUntil).toLocaleTimeString() : null
        });
      } else {
        setError(err.response?.data?.message || 'Invalid administrator credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLER: Step 2 MFA Verification
  // ============================================================
  const handleMfaVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedCode = mfaType === 'recovery' ? mfaCode.trim().toUpperCase() : mfaCode.trim();
      const res = await verifyAdminMfaLogin({
        mfaToken,
        code: formattedCode
      });

      if (res?.usedRecoveryCode) {
        // Logged in with recovery code notice
      }

      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLER: Step 3 Verify Enrollment & Show Recovery Codes
  // ============================================================
  const handleEnrollVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await verifyAdminMfaEnrollment({
        mfaSetupToken,
        code: enrollCode.trim()
      });

      if (res?.recoveryCodes && Array.isArray(res.recoveryCodes)) {
        setRecoveryCodes(res.recoveryCodes);
        setMode('enroll_recovery_codes');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid TOTP enrollment code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // COPY & DOWNLOAD RECOVERY CODES
  // ============================================================
  const handleCopyCodes = () => {
    const text = recoveryCodes.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    const text = `ONECOOLIE ADMIN EMERGENCY RECOVERY CODES\nGenerated: ${new Date().toISOString()}\nAccount: ${email}\n\n` +
      recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nKeep these codes in a secure password manager or offline vault. Each code can only be used once.';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `onecoolie-mfa-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetToCredentials = () => {
    setMode('credentials');
    setMfaCode('');
    setEnrollCode('');
    setError('');
    setLockoutInfo(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Brand dark sub="Ops Console" />
          <Link
            to="/"
            className="text-xs font-mono text-zinc-500 hover:text-white"
          >
            Exit &rarr;
          </Link>
        </div>

        <div className="border border-zinc-800 rounded-2xl p-7 bg-zinc-950/70 shadow-2xl">

          {/* ==================================================== */}
          {/* MODE 1: CREDENTIALS (Email & Password) */}
          {/* ==================================================== */}
          {mode === 'credentials' && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-blue-500" />
                <h2 className="text-xl font-bold tracking-tight text-white">
                  System Administration
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Authorized station controllers and supervisors only
              </p>

              {/* Account Lockout Banner */}
              {lockoutInfo && (
                <div className="mb-5 p-4 rounded-xl bg-red-950/50 border border-red-800 text-xs text-red-200 flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-red-100">{lockoutInfo.message}</p>
                    {lockoutInfo.lockedUntil && (
                      <p className="text-[11px] text-red-300">
                        Account unlocks at: <span className="font-mono font-semibold">{lockoutInfo.lockedUntil}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400 pt-1">
                      Contact station infrastructure if you suspect unauthorized access attempts.
                    </p>
                  </div>
                </div>
              )}

              {/* Normal Error */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@OneCoolie.in"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Master Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3 text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <span>Enter Operations Console</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ==================================================== */}
          {/* MODE 2: MFA VERIFICATION (TOTP or Recovery Code) */}
          {/* ==================================================== */}
          {mode === 'verify_mfa' && (
            <>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    MFA Verification
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleResetToCredentials}
                  className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-5">
                Two-factor authentication required for <span className="text-zinc-200 font-mono">{email}</span>
              </p>

              {/* Verification Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 mb-5">
                <button
                  type="button"
                  onClick={() => { setMfaType('totp'); setError(''); }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mfaType === 'totp'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Authenticator App</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMfaType('recovery'); setError(''); }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mfaType === 'recovery'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Recovery Code</span>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleMfaVerifySubmit} className="space-y-4">
                {mfaType === 'totp' ? (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      6-Digit Security Code
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-center text-xl tracking-[0.3em] text-white font-mono placeholder-zinc-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1.5 text-center">
                      Open your Google Authenticator, 1Password, or Authy app
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Emergency Recovery Code
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={9}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-center text-lg tracking-[0.2em] text-white font-mono placeholder-zinc-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all uppercase"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1.5 text-center">
                      Enter one of your 8-character single-use recovery codes
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || (mfaType === 'totp' ? mfaCode.length !== 6 : mfaCode.length < 8)}
                    className="btn-primary w-full py-3 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                        <span>Verifying Security Code...</span>
                      </>
                    ) : (
                      <span>Verify & Enter Console</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ==================================================== */}
          {/* MODE 3: MFA ENROLLMENT (First-time QR scan & code) */}
          {/* ==================================================== */}
          {mode === 'enroll_mfa' && (
            <>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Set Up Two-Factor Auth
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleResetToCredentials}
                  className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-5">
                Scan QR code with your authenticator application to protect this admin account.
              </p>

              {/* QR Code Container */}
              {enrollData?.qrCode && (
                <div className="bg-white p-4 rounded-xl flex items-center justify-center mb-4 max-w-[200px] mx-auto shadow-inner">
                  <img
                    src={enrollData.qrCode}
                    alt="MFA QR Code"
                    className="w-full h-auto"
                  />
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleEnrollVerifySubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 text-center">
                    Enter First 6-Digit Code from App
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={enrollCode}
                    onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-center text-xl tracking-[0.3em] text-white font-mono placeholder-zinc-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || enrollCode.length !== 6}
                    className="btn-primary w-full py-3 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                        <span>Activating MFA...</span>
                      </>
                    ) : (
                      <span>Verify & Generate Recovery Codes</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ==================================================== */}
          {/* MODE 4: RECOVERY CODES DISPLAY */}
          {/* ==================================================== */}
          {mode === 'enroll_recovery_codes' && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Save Recovery Codes
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Store these single-use recovery codes in a secure vault. <span className="text-amber-400 font-semibold">They will NEVER be shown again.</span>
              </p>

              {/* Recovery Codes Grid */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800 mb-4 font-mono text-xs text-zinc-200">
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} className="p-2 rounded bg-black/50 border border-zinc-800 text-center tracking-wider font-bold">
                    {code}
                  </div>
                ))}
              </div>

              {/* Action Buttons: Copy & Download */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <button
                  type="button"
                  onClick={handleCopyCodes}
                  className="py-2.5 px-3 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCodes ? 'Copied!' : 'Copy All'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCodes}
                  className="py-2.5 px-3 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .txt</span>
                </button>
              </div>

              {/* Acknowledgment Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-zinc-300 mb-5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledgedCodes}
                  onChange={(e) => setAcknowledgedCodes(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 text-blue-600 focus:ring-blue-600 bg-zinc-900"
                />
                <span>
                  I have copied or downloaded these emergency recovery codes and saved them in a secure location.
                </span>
              </label>

              <button
                type="button"
                disabled={!acknowledgedCodes}
                onClick={() => navigate('/admin')}
                className="btn-primary w-full py-3 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Complete Setup & Enter Console
              </button>
            </>
          )}

        </div>

        <p className="text-center text-[11px] font-mono text-zinc-600">
          OneCoolie Network Dispatch v2.0 • Pinned MFA HS256
        </p>
      </div>
    </div>
  );
}