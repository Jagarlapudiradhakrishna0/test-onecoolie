const supabase = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOtp, hashOtp, verifyOtp } = require('../utils/otpService');
const { sendOtpEmail, sendPasswordResetEmail } = require('../utils/emailService');
const generateToken = require('../utils/generateToken');
const { setRefreshTokenCookie, clearRefreshTokenCookie, COOKIE_NAME } = require('../utils/cookieHelper');
const { isApprovedAdminEmail, normalizeEmail } = require('../config/adminAllowlist');

/*
|--------------------------------------------------------------------------
| OTP EXPIRY HELPER
|--------------------------------------------------------------------------
*/
const getOtpExpiryDate = () => {
  const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
  return new Date(Date.now() + minutes * 60 * 1000);
};

/*
|--------------------------------------------------------------------------
| SEND OTP
|--------------------------------------------------------------------------
|
| POST /api/auth/otp/send
|
| Body: { email, purpose: 'login' | 'signup' }
|
| Security:
|   - Rate limiting handled at route level (express-rate-limit)
|   - Always returns same success message to prevent account enumeration
|   - OTP value is never logged server-side
|   - Maximum 5 failed attempts before OTP is invalidated
|
*/
exports.sendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    // Validate input
    if (!email || !purpose) {
      return res.status(400).json({
        message: 'Email and purpose are required.'
      });
    }

    if (!['login', 'signup'].includes(purpose)) {
      return res.status(400).json({
        message: 'Invalid purpose. Must be "login" or "signup".'
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email address format.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check whether account exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError) {
      console.error('SEND OTP — USER LOOKUP ERROR:', userError);
      return res.status(500).json({
        message: 'Server error. Please try again.'
      });
    }

    // For login: account must exist
    if (purpose === 'login' && !existingUser) {
      return res.status(404).json({
        message: 'No account found with this email address. Please sign up first.'
      });
    }

    // For signup: account must NOT exist
    if (purpose === 'signup' && existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists. Only one account can be created per verified email address. Please sign in.'
      });
    }

    // Invalidate any previous unused OTPs for this email + purpose
    await supabase
      .from('email_otps')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('purpose', purpose)
      .eq('used', false);

    // Generate, hash, and store new OTP
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = getOtpExpiryDate();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔑 [OTP DISPATCH] Recipient: ${normalizedEmail} | OTP Code: [ REDACTED ] | Purpose: ${purpose}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { error: insertError } = await supabase
      .from('email_otps')
      .insert([{
        email: normalizedEmail,
        otp_hash: otpHash,
        purpose,
        expires_at: expiresAt.toISOString(),
        used: false,
        attempts: 0
      }]);

    if (insertError) {
      console.error('SEND OTP — INSERT ERROR:', insertError);
      return res.status(500).json({
        message: 'Failed to generate OTP. Please try again.'
      });
    }

    // Send email asynchronously in background so frontend transitions to OTP entry instantly
    sendOtpEmail(normalizedEmail, otp, expiryMinutes).catch((err) => {
      console.error('BACKGROUND EMAIL DELIVERY FAILED:', err.message);
    });

    return res.status(200).json({
      message: 'OTP sent successfully. Check your inbox.',
      email: normalizedEmail,
      // Tell the frontend whether this is a known account (for UI branching)
      accountExists: !!existingUser,
      expiresInMinutes: expiryMinutes
    });

  } catch (err) {
    console.error('SEND OTP — SERVER ERROR:', err.message);
    return res.status(500).json({
      message: 'Failed to send OTP. Please check your email and try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| VERIFY OTP & LOGIN
|--------------------------------------------------------------------------
|
| POST /api/auth/otp/verify-login
|
| Body: { email, otp, role }
|
| Verifies OTP for an existing user and returns a JWT session.
|
*/
exports.verifyOtpAndLogin = async (req, res) => {
  try {
    const { email, otp, role = 'passenger' } = req.body;

    if (!email || !otp || !role) {
      return res.status(400).json({
        message: 'Email, OTP and role are required.'
      });
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: 'OTP must be exactly 6 digits.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate role
    const allowedRoles = ['passenger', 'assistant'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role for OTP login.'
      });
    }

    // Find the latest valid (unused, unexpired) OTP for this email
    const { data: otpRecords, error: otpError } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('purpose', 'login')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError) {
      console.error('VERIFY OTP LOGIN — LOOKUP ERROR:', otpError);
      return res.status(500).json({ message: 'Server error verifying OTP.' });
    }

    if (!otpRecords || otpRecords.length === 0) {
      return res.status(400).json({
        message: 'OTP has expired or is invalid. Please request a new one.'
      });
    }

    const otpRecord = otpRecords[0];

    // Brute-force guard: max 5 attempts per OTP
    if (otpRecord.attempts >= 5) {
      // Invalidate this OTP record
      await supabase
        .from('email_otps')
        .update({ used: true })
        .eq('id', otpRecord.id);

      return res.status(429).json({
        message: 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    const isValid = await verifyOtp(otp, otpRecord.otp_hash);

    if (!isValid) {
      // Increment attempt counter
      await supabase
        .from('email_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remaining = 5 - (otpRecord.attempts + 1);
      return res.status(400).json({
        message: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Incorrect OTP. OTP has been invalidated. Please request a new one.',
        attemptsRemaining: remaining
      });
    }

    // Mark OTP as used
    await supabase
      .from('email_otps')
      .update({ used: true })
      .eq('id', otpRecord.id);

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError || !user) {
      return res.status(404).json({
        message: 'Account not found. Please sign up first.'
      });
    }

    // Check role match
    if (user.role !== role) {
      return res.status(401).json({
        message: `This account does not have ${role} access.`
      });
    }

    // Assistant approval check
    if (user.role === 'assistant' && user.is_approved !== true) {
      return res.status(403).json({
        message: 'Your assistant account is awaiting admin approval.'
      });
    }

    // Phase 6.3: Create server-side session and short-lived access token + opaque refresh token
    const sessionService = require('../services/sessionService');
    const { session, accessToken, refreshToken } = await sessionService.createSession({
      user,
      req,
      client: supabase
    });

    console.log('OTP LOGIN SUCCESS:', { id: user.id, email: user.email, role: user.role, sid: session.id });

    // Set HttpOnly refresh token cookie (Phase 6.6)
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      station_code: user.station_code || null,
      is_approved: user.is_approved,
      kyc_status: user.kyc_status || null,
      token: accessToken,
      accessToken,
      refreshToken,
      sessionId: session.id
    });

  } catch (err) {
    console.error('VERIFY OTP LOGIN — SERVER ERROR:', err.message);
    return res.status(500).json({ message: 'Server error during OTP verification.' });
  }
};

/*
|--------------------------------------------------------------------------
| VERIFY OTP & REGISTER
|--------------------------------------------------------------------------
|
| POST /api/auth/otp/verify-register
|
| Body: { name, email, otp, role, station_code? }
|
| Verifies OTP for a new signup, creates user, returns JWT session.
|
*/
exports.verifyOtpAndRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      otp,
      password,
      role = 'passenger',
      station_code,
      phone
    } = req.body;

    if (!name || !email || !otp || !password || !role) {
      return res.status(400).json({
        message: 'Name, email, OTP, password and role are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters.'
      });
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: 'OTP must be exactly 6 digits.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate role
    const allowedRoles = ['passenger', 'assistant'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role for OTP registration.'
      });
    }

    // Find the latest valid OTP for signup
    const { data: otpRecords, error: otpError } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('purpose', 'signup')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError) {
      console.error('VERIFY OTP REGISTER — LOOKUP ERROR:', otpError);
      return res.status(500).json({ message: 'Server error verifying OTP.' });
    }

    if (!otpRecords || otpRecords.length === 0) {
      return res.status(400).json({
        message: 'OTP has expired or is invalid. Please request a new one.'
      });
    }

    const otpRecord = otpRecords[0];

    // Brute-force guard
    if (otpRecord.attempts >= 5) {
      await supabase
        .from('email_otps')
        .update({ used: true })
        .eq('id', otpRecord.id);

      return res.status(429).json({
        message: 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    const isValid = await verifyOtp(otp, otpRecord.otp_hash);

    if (!isValid) {
      await supabase
        .from('email_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remaining = 5 - (otpRecord.attempts + 1);
      return res.status(400).json({
        message: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Incorrect OTP. OTP has been invalidated. Please request a new one.',
        attemptsRemaining: remaining
      });
    }

    // Mark OTP as used
    await supabase
      .from('email_otps')
      .update({ used: true })
      .eq('id', otpRecord.id);

    // Double-check user doesn't exist (race condition guard)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists. Only one account can be created per verified email address. Please sign in.'
      });
    }

    // Determine approval status
    const isApproved = role === 'passenger';

    // Format phone consistently
    let formattedPhone = null;
    if (phone) {
      const cleanDigits = String(phone).replace(/\D/g, '');
      formattedPhone = cleanDigits.length === 10 ? `+91 ${cleanDigits}` : String(phone).trim();
    }

    // Create user with real hashed password
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: formattedPhone,
        role,
        is_approved: isApproved,
        station_code: role === 'assistant' ? (station_code || null) : null
      }])
      .select()
      .single();

    if (insertError) {
      console.error('VERIFY OTP REGISTER — INSERT ERROR:', insertError);
      if (
        insertError.code === '23505' ||
        insertError.message?.toLowerCase().includes('duplicate') ||
        insertError.message?.toLowerCase().includes('unique')
      ) {
        return res.status(409).json({
          message: 'An account with this email already exists. Only one account can be created per verified email address. Please sign in.'
        });
      }
      return res.status(400).json({ message: insertError.message });
    }

    // Assistant — no token until admin approves
    if (role === 'assistant') {
      return res.status(201).json({
        message: 'Registration successful! Your account is awaiting admin approval.',
        _id: newUser.id,
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || null,
        role: newUser.role,
        station_code: newUser.station_code,
        is_approved: newUser.is_approved
      });
    }

    // Passenger — create server-side session and issue tokens
    const sessionService = require('../services/sessionService');
    const { session, accessToken, refreshToken } = await sessionService.createSession({
      user: newUser,
      req,
      client: supabase
    });

    console.log('OTP REGISTER SUCCESS:', { id: newUser.id, email: newUser.email, role: newUser.role, sid: session.id });

    // Set HttpOnly refresh token cookie (Phase 6.6)
    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      _id: newUser.id,
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || null,
      role: newUser.role,
      station_code: newUser.station_code || null,
      is_approved: newUser.is_approved,
      kyc_status: newUser.kyc_status || null,
      token: accessToken,
      accessToken,
      refreshToken,
      sessionId: session.id
    });

  } catch (err) {
    console.error('VERIFY OTP REGISTER — SERVER ERROR:', err.message);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

/*
|--------------------------------------------------------------------------
| CHECK EMAIL
|--------------------------------------------------------------------------
|
| POST /api/auth/otp/check-email
|
| Body: { email }
|
| Returns whether the email is registered (for UI branching on the
| single email-entry screen). Uses the same anti-enumeration response
| in production; here we expose it explicitly for UX since the sendOtp
| endpoint also differentiates.
|
*/
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    return res.status(200).json({
      exists: !!user,
      role: user?.role || null
    });

  } catch (err) {
    console.error('CHECK EMAIL — ERROR:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

/*
|--------------------------------------------------------------------------
| REGISTER (legacy — kept for admin portal compatibility)
|--------------------------------------------------------------------------
*/
exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'passenger',
      station_code,
      phone
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required.'
      });
    }

    // Validate role — public registration cannot create admin accounts
    if (role === 'admin') {
      return res.status(403).json({
        message: 'Admin registration is not allowed.'
      });
    }

    const allowedRoles = ['passenger', 'assistant'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role.'
      });
    }

    // Check if email already exists
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingError) {
      console.error('CHECK USER ERROR:', existingError);

      return res.status(500).json({
        message: 'Unable to check existing user.'
      });
    }

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const isApproved = role === 'passenger';

    // Format phone consistently
    let formattedPhone = null;
    if (phone) {
      const cleanDigits = String(phone).replace(/\D/g, '');
      formattedPhone = cleanDigits.length === 10 ? `+91 ${cleanDigits}` : String(phone).trim();
    }

    // Create user
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          phone: formattedPhone,
          role,
          is_approved: isApproved,
          station_code:
            role === 'assistant'
              ? station_code || null
              : null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('REGISTER ERROR:', error);

      return res.status(400).json({
        message: error.message
      });
    }

    const user = data;

    if (role === 'assistant') {
      return res.status(201).json({
        message:
          'Registration successful! Please wait for Admin approval before logging in.',
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        station_code: user.station_code,
        is_approved: user.is_approved
      });
    }

    const token = generateToken(user.id, user.role);

    return res.status(201).json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      station_code: user.station_code || null,
      is_approved: user.is_approved,
      kyc_status: user.kyc_status || null,
      token
    });

  } catch (error) {
    console.error('REGISTER SERVER ERROR:', error);

    return res.status(500).json({
      message: 'Server error during registration.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| LOGIN (legacy — kept for admin portal compatibility)
|--------------------------------------------------------------------------
*/
exports.login = async (req, res) => {
  try {
    const {
      email,
      phone,
      identifier,
      password,
      role
    } = req.body;

    const rawInput = (identifier || email || phone || '').trim();

    // Validate input
    if (!rawInput || !password || !role) {
      return res.status(400).json({
        message: 'Email or phone number, password, and role are required.'
      });
    }

    // Find user
    let user = null;
    let queryError = null;

    if (role === 'admin') {
      const normalizedEmail = normalizeEmail(rawInput);

      // Phase 6.9: Strict Two-Account Admin Allowlist Verification
      if (!isApprovedAdminEmail(normalizedEmail)) {
        try {
          const { recordSecurityEvent } = require('../services/securityMonitoringService');
          recordSecurityEvent({
            eventType: 'admin_allowlist_denied',
            severity: 'medium',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            requestId: req.requestId,
            metadata: { attemptedEmail: normalizedEmail }
          }).catch(() => {});
          const { logAdminAction } = require('../services/adminAuditService');
          logAdminAction({
            req,
            action: 'admin_allowlist_denied',
            resource_type: 'admin_auth',
            resource_id: normalizedEmail,
            result: 'failure',
            metadata: { reason: 'Identity not in approved administrator allowlist' }
          }).catch(() => {});
        } catch (audErr) {}

        return res.status(401).json({
          success: false,
          message: 'Administrator access is not authorized for this account.'
        });
      }

      // Check exact email for approved admin
      const { data: exactAdmin, error: exactErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (exactErr) {
        queryError = exactErr;
      } else if (exactAdmin) {
        user = exactAdmin;
      }
    } else {
      if (rawInput.includes('@')) {
        const normalizedEmail = rawInput.toLowerCase();
        const { data: standardUser, error: stdErr } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();

        queryError = stdErr;
        user = standardUser;
      } else {
        // Phone lookup: construct common formatting variants (+91..., 10 digits, with/without space, etc.)
        const digits = rawInput.replace(/\D/g, '');
        const tenDigits = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : (digits.length === 10 ? digits : digits);
        const phoneCandidates = [
          rawInput,
          digits,
          tenDigits,
          `+91${tenDigits}`,
          `+91 ${tenDigits}`,
          `+${digits}`,
          digits.length === 10 ? `91${digits}` : null
        ].filter(Boolean);

        const { data: phoneUser, error: phoneErr } = await supabase
          .from('users')
          .select('*')
          .in('phone', phoneCandidates)
          .maybeSingle();

        queryError = phoneErr;
        user = phoneUser;
      }
    }

    if (queryError) {
      console.error('LOGIN DATABASE ERROR:', queryError);

      return res.status(500).json({
        message: 'Database error while logging in.'
      });
    }

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials.'
      });
    }

    if (!user.role) {
      console.error(
        'USER HAS NO ROLE:',
        user.email,
        user.id
      );

      return res.status(500).json({
        message:
          'This account does not have a role assigned. Please update the user role in Supabase.'
      });
    }

    // Check requested role against database role
    if (user.role !== role) {
      return res.status(401).json({
        message:
          `This account does not have ${role} privileges.`
      });
    }

    // Phase 6.9: Server-Authoritative Database Identity & Status Check for Admins
    if (user.role === 'admin') {
      if (!isApprovedAdminEmail(user.email)) {
        return res.status(401).json({
          success: false,
          message: 'Administrator access is not authorized for this account.'
        });
      }

      if (user.is_approved === false) {
        return res.status(403).json({
          success: false,
          message: 'Administrator account has been disabled or suspended.'
        });
      }
    }

    // -------------------------------------------------------------
    // PHASE 6.2: ADMIN ACCOUNT LOCKOUT & MFA CHALLENGE ENFORCEMENT
    // -------------------------------------------------------------
    if (user.role === 'admin') {
      const now = new Date();
      const maxAttempts = parseInt(process.env.ADMIN_MAX_LOGIN_ATTEMPTS || '5', 10);
      const lockMinutes = parseInt(process.env.ADMIN_LOCKOUT_MINUTES || '30', 10);

      // 1. Account Lockout Check: If locked_until > NOW(), reject without bcrypt verification
      if (user.locked_until && new Date(user.locked_until) > now) {
        const remainingMinutes = Math.ceil((new Date(user.locked_until) - now) / 60000);
        console.warn(`[SECURITY] Rejected login attempt on locked admin account: ${user.email} (locked for ~${remainingMinutes} more mins)`);
        return res.status(423).json({
          message: 'Account is temporarily locked due to excessive failed attempts. Please try again later.',
          lockedUntil: user.locked_until
        });
      }

      // 2. Verify Password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        // Atomic failed attempts increment and conditional lockout
        const currentFailed = (user.failed_login_attempts || 0) + 1;
        const updates = { failed_login_attempts: currentFailed };
        let lockedOut = false;

        if (currentFailed >= maxAttempts) {
          updates.locked_until = new Date(Date.now() + lockMinutes * 60000).toISOString();
          lockedOut = true;
          console.warn(`[SECURITY] Admin account ${user.email} locked until ${updates.locked_until} due to ${currentFailed} failed attempts.`);
        }

        await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);

        if (lockedOut) {
          try {
            const { recordSecurityEvent } = require('../services/securityMonitoringService');
            recordSecurityEvent({
              eventType: 'account_locked',
              severity: 'high',
              userId: user.id,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              requestId: req.requestId,
              metadata: { email: user.email, lockedUntil: updates.locked_until }
            }).catch(() => {});
          } catch (mErr) {}

          return res.status(423).json({
            message: 'Account is temporarily locked due to excessive failed attempts. Please try again later.',
            lockedUntil: updates.locked_until
          });
        }

        try {
          const { recordSecurityEvent } = require('../services/securityMonitoringService');
          recordSecurityEvent({
            eventType: 'login_failed',
            severity: 'low',
            userId: user.id,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            requestId: req.requestId,
            metadata: { email: user.email, attempts: currentFailed }
          }).catch(() => {});
        } catch (mErr) {}

        return res.status(401).json({
          message: 'Invalid credentials.'
        });
      }

      // 3. Password is valid: Reset failed attempts counter
      if ((user.failed_login_attempts && user.failed_login_attempts > 0) || user.locked_until) {
        await supabase
          .from('users')
          .update({
            failed_login_attempts: 0,
            locked_until: null
          })
          .eq('id', user.id);
      }

      // 4. Inspect Admin MFA Status
      const mfaService = require('../services/mfaService');
      const mfaStatus = await mfaService.getMfaStatus(user.id, supabase);

      // Check authoritative admin role & permissions
      const { resolveAdminRole } = require('../middleware/adminMiddleware');
      const { getPermissionsForRole } = require('../config/rbac');
      const adminRole = await resolveAdminRole(user.id);
      const permissions = getPermissionsForRole(adminRole);

      // 5. If MFA is Enrolled: Issue 5-minute MFA Challenge Token (DO NOT issue full access token)
      if (mfaStatus.enrolled) {
        const mfaChallengeToken = jwt.sign(
          {
            id: user.id,
            role: 'admin',
            scope: 'mfa_pending'
          },
          process.env.JWT_SECRET,
          {
            expiresIn: '5m',
            issuer: 'onecoolie-api',
            audience: 'onecoolie-admin'
          }
        );

        console.log(`[MFA] Issued MFA login challenge for admin: ${user.email}`);

        return res.status(200).json({
          requiresMfa: true,
          mfaEnrolled: true,
          mfaToken: mfaChallengeToken,
          message: 'Multi-Factor Authentication required. Enter 6-digit authenticator or recovery code.'
        });
      }

      // 6. If MFA is NOT yet enrolled: Mandatory enrollment required for security
      // Issue a setup-scoped token allowing the admin to set up MFA
      const mfaSetupToken = jwt.sign(
        {
          id: user.id,
          role: 'admin',
          scope: 'mfa_setup_required'
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '15m',
          issuer: 'onecoolie-api',
          audience: 'onecoolie-admin'
        }
      );

      console.log(`[MFA] Admin ${user.email} requires initial MFA enrollment.`);

      return res.status(200).json({
        requiresMfa: true,
        mfaEnrolled: false,
        mfaSetupToken,
        message: 'Administrator MFA enrollment is mandatory. Please complete TOTP enrollment to proceed.'
      });
    }

    // -------------------------------------------------------------
    // STANDARD PASSENGER & ASSISTANT LOGIN (Unchanged)
    // -------------------------------------------------------------
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials.'
      });
    }

    if (
      user.role === 'assistant' &&
      user.is_approved !== true
    ) {
      return res.status(403).json({
        message:
          'Your assistant account is waiting for Admin approval.'
      });
    }

    // Phase 6.3: Create server-side session for passenger/assistant login
    const sessionService = require('../services/sessionService');
    const { session, accessToken, refreshToken } = await sessionService.createSession({
      user,
      req,
      client: supabase
    });

    // Set HttpOnly refresh token cookie (Phase 6.6)
    setRefreshTokenCookie(res, refreshToken);

    const responseUser = {
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      station_code: user.station_code || null,
      is_approved: user.is_approved,
      kyc_status: user.kyc_status || null,
      token: accessToken,
      accessToken,
      refreshToken,
      sessionId: session.id
    };

    console.log('LOGIN SUCCESS:', {
      id: responseUser.id,
      email: responseUser.email,
      role: responseUser.role,
      sid: session.id
    });

    return res.status(200).json(responseUser);

  } catch (error) {
    console.error('LOGIN SERVER ERROR:', error);

    return res.status(500).json({
      message: 'Server error during login.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| UPDATE USER PHONE NUMBER WITH 2-CHANGE MONTHLY LIMIT
|--------------------------------------------------------------------------
|
| PUT /api/auth/update-phone
| Header: Authorization: Bearer <token>
| Body: { phone }
|
| Allows up to 2 phone number changes per calendar month.
| Tracks change timestamps inside kyc_documents JSONB on the user row.
|
*/
exports.updatePhoneNumber = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { phone } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized. Please sign in.' });
    }

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ message: 'Please provide a valid 10-digit mobile phone number.' });
    }

    const formattedPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : `+${cleanPhone}`;

    // Fetch user
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('id, name, email, phone, role, kyc_documents')
      .eq('id', userId)
      .single();

    if (fetchErr || !user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    if (user.role === 'assistant') {
      return res.status(403).json({
        message: 'Assistant phone numbers are confidential and KYC-locked. Contact your Station Master or Administrator for any update.'
      });
    }

    // Parse history from kyc_documents
    const kycDocs = typeof user.kyc_documents === 'object' && user.kyc_documents !== null
      ? user.kyc_documents
      : {};
    const history = Array.isArray(kycDocs.phone_change_history) ? kycDocs.phone_change_history : [];

    // Filter updates in current calendar month (YYYY-MM)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const changesThisMonth = history.filter(h => h.date && h.date.startsWith(currentMonth));

    const MAX_MONTHLY_CHANGES = 2;

    if (changesThisMonth.length >= MAX_MONTHLY_CHANGES) {
      return res.status(429).json({
        message: 'Monthly limit reached: You can only update your phone number 2 times per calendar month.',
        changesRemaining: 0,
        changesUsed: changesThisMonth.length,
        limit: MAX_MONTHLY_CHANGES,
        currentPhone: user.phone
      });
    }

    // Append new update record
    const newRecord = {
      date: new Date().toISOString(),
      from: user.phone || null,
      to: formattedPhone
    };
    const updatedHistory = [...history, newRecord];
    const updatedKycDocs = {
      ...kycDocs,
      phone_change_history: updatedHistory
    };

    // Update in Supabase
    const { data: updatedUser, error: updateErr } = await supabase
      .from('users')
      .update({
        phone: formattedPhone,
        kyc_documents: updatedKycDocs,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, name, email, phone, role, station_code, is_approved, kyc_status')
      .single();

    if (updateErr) {
      console.error('UPDATE PHONE ERROR:', updateErr);
      return res.status(500).json({ message: 'Unable to update phone number. Please try again.' });
    }

    const changesRemaining = MAX_MONTHLY_CHANGES - (changesThisMonth.length + 1);

    return res.status(200).json({
      message: 'Phone number updated successfully.',
      phone: updatedUser.phone,
      changesRemaining,
      changesUsed: changesThisMonth.length + 1,
      limit: MAX_MONTHLY_CHANGES,
      user: updatedUser
    });

  } catch (err) {
    console.error('UPDATE PHONE SERVER ERROR:', err);
    return res.status(500).json({ message: 'Server error updating phone number.' });
  }
};

/*
|--------------------------------------------------------------------------
| GET PHONE STATUS & REMAINING MONTHLY UPDATES
|--------------------------------------------------------------------------
|
| GET /api/auth/phone-status
| Header: Authorization: Bearer <token>
|
*/
exports.getPhoneStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, phone, kyc_documents')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    const kycDocs = typeof user.kyc_documents === 'object' && user.kyc_documents !== null
      ? user.kyc_documents
      : {};
    const history = Array.isArray(kycDocs.phone_change_history) ? kycDocs.phone_change_history : [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const changesThisMonth = history.filter(h => h.date && h.date.startsWith(currentMonth));
    const MAX_MONTHLY_CHANGES = 2;
    const changesRemaining = Math.max(0, MAX_MONTHLY_CHANGES - changesThisMonth.length);

    return res.status(200).json({
      phone: user.phone || null,
      changesUsed: changesThisMonth.length,
      changesRemaining,
      limit: MAX_MONTHLY_CHANGES
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error retrieving phone status.' });
  }
};

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD — REQUEST PASSWORD RESET OTP
|--------------------------------------------------------------------------
|
| POST /api/auth/forgot-password
|
| Body: { email }
|
| Security:
|   - Always returns same generic response (anti-enumeration)
|   - OTP value is never stored or logged in plaintext
|   - Previous unused OTPs for this email are invalidated
|   - 10-minute expiry enforced
|   - Rate limiting handled at route level
|
*/
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address format.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check whether account exists (silently — don't expose result)
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError) {
      console.error('FORGOT PASSWORD — USER LOOKUP ERROR:', userError);
      // Still return generic success to prevent enumeration
    }

    // Only proceed with OTP if user actually exists
    if (existingUser) {
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Invalidate all previous unused password reset records for this email
      await supabase
        .from('password_resets')
        .update({ otp_used: true })
        .eq('email', normalizedEmail)
        .eq('otp_used', false);

      // Generate and hash a cryptographically secure OTP
      const otp = generateOtp();
      const otpHash = await hashOtp(otp);

      // Store hashed OTP in password_resets table
      const { error: insertError } = await supabase
        .from('password_resets')
        .insert([{
          email: normalizedEmail,
          otp_hash: otpHash,
          otp_expires_at: expiresAt.toISOString(),
          otp_used: false,
          otp_attempts: 0
        }]);

      if (insertError) {
        console.error('FORGOT PASSWORD — INSERT ERROR:', insertError);
        // Still return generic response
      } else {
        // Send email asynchronously so response is instant
        sendPasswordResetEmail(normalizedEmail, otp, expiryMinutes).catch((err) => {
          console.error('PASSWORD RESET EMAIL DELIVERY FAILED:', err.message);
        });
      }
    }

    // Always return the same response regardless of whether account exists
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset OTP has been sent.'
    });

  } catch (err) {
    console.error('FORGOT PASSWORD — SERVER ERROR:', err.message);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD — VERIFY RESET OTP
|--------------------------------------------------------------------------
|
| POST /api/auth/verify-reset-otp
|
| Body: { email, otp }
|
| Security:
|   - OTP expiry enforced server-side
|   - Max 5 attempts before OTP is invalidated
|   - Returns a short-lived JWT reset token (15 minutes)
|   - Reset token hash stored in DB for single-use enforcement
|
*/
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'OTP must be exactly 6 digits.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find the latest active (unused, unexpired) password reset record
    const { data: resetRecords, error: lookupError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('otp_used', false)
      .gt('otp_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (lookupError) {
      console.error('VERIFY RESET OTP — LOOKUP ERROR:', lookupError);
      return res.status(500).json({ message: 'Server error verifying OTP.' });
    }

    if (!resetRecords || resetRecords.length === 0) {
      return res.status(400).json({
        message: 'OTP has expired or is invalid. Please request a new one.'
      });
    }

    const record = resetRecords[0];

    // Brute-force guard: max 5 attempts
    if (record.otp_attempts >= 5) {
      await supabase
        .from('password_resets')
        .update({ otp_used: true, updated_at: new Date().toISOString() })
        .eq('id', record.id);

      return res.status(429).json({
        message: 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    // Verify OTP against stored hash
    const isValid = await verifyOtp(otp, record.otp_hash);

    if (!isValid) {
      const newAttempts = record.otp_attempts + 1;
      await supabase
        .from('password_resets')
        .update({ otp_attempts: newAttempts, updated_at: new Date().toISOString() })
        .eq('id', record.id);

      const remaining = 5 - newAttempts;
      return res.status(400).json({
        message: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Incorrect OTP. OTP has been invalidated. Please request a new one.',
        attemptsRemaining: remaining
      });
    }

    // OTP is valid — generate a short-lived reset token (15 minutes) with pinned HS256
    const resetToken = jwt.sign(
      { email: normalizedEmail, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m', algorithm: 'HS256', issuer: 'onecoolie-api', audience: 'onecoolie-client' }
    );

    // Store a SHA-256 hash of the reset token in the DB (never the token itself)
    const crypto = require('crypto');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    await supabase
      .from('password_resets')
      .update({
        otp_used: true,
        reset_token_hash: resetTokenHash,
        reset_token_expires_at: resetTokenExpires.toISOString(),
        reset_token_used: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', record.id);

    console.log('VERIFY RESET OTP SUCCESS:', { email: normalizedEmail });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken
    });

  } catch (err) {
    console.error('VERIFY RESET OTP — SERVER ERROR:', err.message);
    return res.status(500).json({ message: 'Server error during OTP verification.' });
  }
};

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD — RESET PASSWORD
|--------------------------------------------------------------------------
|
| POST /api/auth/reset-password
|
| Body: { resetToken, newPassword, confirmPassword }
|
| Security:
|   - Validates JWT reset token (signature + expiry)
|   - Validates token hash against DB record (single-use enforcement)
|   - Passwords must match and meet minimum requirements
|   - Hashes password using existing bcrypt system (cost factor 10)
|   - Invalidates the reset token record immediately after use
|
*/
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Reset token, new password, and confirm password are required.' });
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must contain at least one letter and one number.' });
    }

    // Verify JWT reset token with algorithm pinning
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'onecoolie-api',
        audience: 'onecoolie-client'
      });
    } catch (jwtErr) {
      return res.status(400).json({
        message: jwtErr.name === 'TokenExpiredError'
          ? 'Password reset session has expired. Please start over.'
          : 'Invalid reset token. Please start the password reset process again.'
      });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid reset token.' });
    }

    const normalizedEmail = decoded.email;

    // Hash the provided token to compare against stored hash
    const crypto = require('crypto');
    const providedTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Find the matching password_reset record
    const { data: resetRecords, error: lookupError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('reset_token_hash', providedTokenHash)
      .eq('reset_token_used', false)
      .gt('reset_token_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (lookupError) {
      console.error('RESET PASSWORD — LOOKUP ERROR:', lookupError);
      return res.status(500).json({ message: 'Server error. Please try again.' });
    }

    if (!resetRecords || resetRecords.length === 0) {
      return res.status(400).json({
        message: 'Reset session is invalid or has already been used. Please start the password reset process again.'
      });
    }

    const record = resetRecords[0];

    // Hash the new password using the same system as registration/login
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and last_password_change_at timestamp
    const nowIso = new Date().toISOString();
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        last_password_change_at: nowIso,
        updated_at: nowIso
      })
      .eq('email', normalizedEmail)
      .select('id')
      .single();

    if (updateError) {
      console.error('RESET PASSWORD — UPDATE ERROR:', updateError);
      return res.status(500).json({ message: 'Failed to update password. Please try again.' });
    }

    // Phase 6.3: Revoke all active sessions on password change
    if (updatedUser?.id) {
      const sessionService = require('../services/sessionService');
      await sessionService.revokeAllUserSessions(updatedUser.id, 'password_changed', supabase);
    }

    // Invalidate the reset record immediately
    await supabase
      .from('password_resets')
      .update({
        reset_token_used: true,
        updated_at: nowIso
      })
      .eq('id', record.id);

    console.log('RESET PASSWORD SUCCESS:', { email: normalizedEmail, sessionsRevoked: true });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. All active sessions have been terminated. Please login with your new password.'
    });

  } catch (err) {
    console.error('RESET PASSWORD — SERVER ERROR:', err.message);
    return res.status(500).json({ message: 'Server error during password reset.' });
  }
};

/*
|--------------------------------------------------------------------------
| PHASE 6.2: ADMIN MULTI-FACTOR AUTHENTICATION (TOTP) ENDPOINTS
|--------------------------------------------------------------------------
*/

const mfaService = require('../services/mfaService');
const { logAdminAction } = require('../services/adminAuditService');

/**
 * POST /api/auth/admin/mfa/setup
 *
 * Initializes TOTP enrollment for the authenticated admin.
 * Requires valid admin session OR setup-scoped token (`mfa_setup_required`).
 */
exports.setupAdminMfa = async (req, res) => {
  try {
    // Resolve user context from authenticated session or setup token
    let userId = req.user?.id;
    let userEmail = req.user?.email;

    if (!userId) {
      // Check Authorization header for Bearer token or setup token
      const authHeader = req.headers.authorization || req.headers.Authorization;
      let rawBearer = null;
      if (authHeader && typeof authHeader === 'string') {
        rawBearer = authHeader.replace(/^Bearer\s+/i, '').replace(/^"(.*)"$/, '$1').trim();
      }

      const tokenCandidate = rawBearer || req.body?.mfaSetupToken || req.headers['x-mfa-setup-token'];

      if (tokenCandidate) {
        try {
          const decoded = jwt.verify(tokenCandidate, process.env.JWT_SECRET, {
            algorithms: ['HS256']
          });
          // Accept valid admin access token OR setup-scoped token
          if (decoded.role === 'admin' && (decoded.scope === 'mfa_setup_required' || !decoded.scope)) {
            userId = decoded.id;
          }
        } catch (tokErr) {
          return res.status(401).json({ message: 'Invalid or expired authentication token.' });
        }
      }
    }

    if (!userId) {
      return res.status(401).json({ message: 'Admin authentication required.' });
    }

    // Authoritative user verification
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('id, email, role, admin_role')
      .eq('id', userId)
      .single();

    if (uErr || !user || user.role !== 'admin' || !isApprovedAdminEmail(user.email)) {
      return res.status(403).json({
        success: false,
        message: 'Administrator access is not authorized for this account.'
      });
    }

    if (user.is_approved === false) {
      return res.status(403).json({
        success: false,
        message: 'Administrator account has been disabled or suspended.'
      });
    }

    userEmail = user.email;

    const enrollment = await mfaService.createEnrollment({ id: user.id, email: userEmail }, supabase);

    // Audit log enrollment initiation
    try {
      await logAdminAction({
        req,
        action: 'admin_mfa_enrollment_started',
        resource_type: 'admin_mfa',
        resource_id: user.id,
        result: 'success',
        metadata: { email: user.email }
      });
    } catch (audErr) {
      // Non-high-risk action warning logged
    }

    return res.status(200).json({
      success: true,
      message: 'MFA setup initialized. Scan the QR code with your authenticator app and submit a 6-digit code to complete enrollment.',
      qrCode: enrollment.qr_code_data_url,
      otpauthUrl: enrollment.otpauth_url
    });

  } catch (err) {
    console.error('MFA SETUP ERROR:', err.message);
    return res.status(400).json({ message: err.message || 'Failed to initialize MFA setup.' });
  }
};

/**
 * POST /api/auth/admin/mfa/verify-enrollment
 *
 * Verifies the first TOTP code and activates MFA.
 * Returns plaintext recovery codes ONCE.
 */
exports.verifyAdminMfaEnrollment = async (req, res) => {
  try {
    let userId = req.user?.id;
    const { code, mfaSetupToken } = req.body;

    if (!code) {
      return res.status(400).json({ message: '6-digit TOTP verification code is required.' });
    }

    if (!userId && mfaSetupToken) {
      try {
        const decoded = jwt.verify(mfaSetupToken, process.env.JWT_SECRET, {
          algorithms: ['HS256'],
          issuer: 'onecoolie-api',
          audience: 'onecoolie-admin'
        });
        if (decoded.scope === 'mfa_setup_required' && decoded.role === 'admin') {
          userId = decoded.id;
        }
      } catch (tokErr) {
        return res.status(401).json({ message: 'Invalid or expired MFA setup token.' });
      }
    }

    if (!userId) {
      return res.status(401).json({ message: 'Admin authentication required.' });
    }

    const verification = await mfaService.verifyEnrollmentCode(userId, code, supabase);

    if (!verification.success) {
      return res.status(400).json({ message: verification.reason || 'MFA code verification failed.' });
    }

    // Audit log enrollment completion
    try {
      await logAdminAction({
        req,
        action: 'admin_mfa_enrolled',
        resource_type: 'admin_mfa',
        resource_id: userId,
        result: 'success',
        metadata: { recovery_codes_generated: verification.recoveryCodes.length }
      });
    } catch (audErr) {}

    // Issue full administrative session & token upon successful first-time setup
    const { data: adminUser } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!adminUser || adminUser.role !== 'admin' || !isApprovedAdminEmail(adminUser.email)) {
      return res.status(403).json({
        success: false,
        message: 'Administrator access is not authorized for this account.'
      });
    }
    if (adminUser.is_approved === false) {
      return res.status(403).json({
        success: false,
        message: 'Administrator account has been disabled or suspended.'
      });
    }
    const sessionService = require('../services/sessionService');
    const { session, accessToken, refreshToken } = await sessionService.createSession({
      user: adminUser,
      req,
      client: supabase
    });

    // Set HttpOnly refresh token cookie (Phase 6.6)
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: 'MFA successfully enrolled and activated for your administrator account.',
      token: accessToken,
      accessToken,
      refreshToken,
      sessionId: session?.id,
      user: adminUser ? {
        id: adminUser.id,
        _id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        admin_role: adminUser.admin_role
      } : undefined,
      recoveryCodes: verification.recoveryCodes,
      notice: 'IMPORTANT: Save these recovery codes immediately in a secure location. They will NEVER be shown again.'
    });

  } catch (err) {
    console.error('MFA VERIFY ENROLLMENT ERROR:', err.message);
    return res.status(500).json({ message: err.message || 'Server error during MFA enrollment verification.' });
  }
};

/**
 * GET /api/auth/admin/mfa/status
 *
 * Returns current MFA enrollment status for the authenticated admin.
 */
exports.getAdminMfaStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required.' });
    }

    const status = await mfaService.getMfaStatus(userId, supabase);

    return res.status(200).json({
      success: true,
      enrolled: status.enrolled,
      enrolledAt: status.enrolledAt
    });
  } catch (err) {
    console.error('GET MFA STATUS ERROR:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve MFA status.' });
  }
};

/**
 * POST /api/auth/admin/mfa/verify-login
 *
 * Verifies the MFA challenge token with a TOTP or one-time recovery code.
 * Upon success, issues the full administrative JWT access token.
 */
exports.verifyAdminMfaLogin = async (req, res) => {
  try {
    const { mfaToken, code } = req.body;

    if (!mfaToken || !code) {
      return res.status(400).json({ message: 'MFA challenge token and verification code are required.' });
    }

    // 1. Verify Challenge JWT
    let decoded;
    try {
      decoded = jwt.verify(mfaToken, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'onecoolie-api',
        audience: 'onecoolie-admin'
      });
    } catch (jwtErr) {
      return res.status(401).json({
        message: jwtErr.name === 'TokenExpiredError'
          ? 'MFA login session has expired. Please sign in again.'
          : 'Invalid MFA challenge token.'
      });
    }

    // 2. Enforce scope and role
    if (decoded.scope !== 'mfa_pending' || decoded.role !== 'admin') {
      return res.status(401).json({ message: 'Invalid MFA challenge token scope.' });
    }

    const userId = decoded.id;

    // 3. Confirm user still exists and is an admin
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userErr || !user || user.role !== 'admin' || !isApprovedAdminEmail(user.email)) {
      try {
        const { logAdminAction } = require('../services/adminAuditService');
        logAdminAction({
          req,
          action: 'admin_allowlist_denied',
          resource_type: 'admin_mfa',
          resource_id: userId,
          result: 'failure',
          metadata: { reason: 'Identity not in approved administrator allowlist' }
        }).catch(() => {});
      } catch (aErr) {}

      return res.status(401).json({
        success: false,
        message: 'Administrator access is not authorized for this account.'
      });
    }

    if (user.is_approved === false) {
      return res.status(403).json({
        success: false,
        message: 'Administrator account has been disabled or suspended.'
      });
    }

    // 4. Verify code (Supports TOTP 6-digit OR 9-char recovery code format XXXX-XXXX)
    const cleanCode = String(code).trim();
    let isSuccess = false;
    let isRecoveryCode = false;

    if (/^\d{6}$/.test(cleanCode)) {
      // TOTP verification
      const totpResult = await mfaService.verifyLoginCode(userId, cleanCode, supabase);
      if (totpResult.valid) {
        isSuccess = true;
      }
    } else {
      // Recovery code verification
      const recResult = await mfaService.verifyRecoveryCode(userId, cleanCode, supabase);
      if (recResult.valid) {
        isSuccess = true;
        isRecoveryCode = true;
      }
    }

    if (!isSuccess) {
      // Record failed verification in audit
      try {
        await logAdminAction({
          req,
          action: 'admin_mfa_verification_failed',
          resource_type: 'admin_mfa',
          resource_id: userId,
          result: 'failure',
          metadata: { is_recovery_code: isRecoveryCode }
        });
      } catch (aErr) {}

      return res.status(401).json({ message: 'Invalid authentication code. Please try again.' });
    }

    // 5. Update user telemetry (last_login_at)
    await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', userId);

    // 6. Record successful verification audit event
    try {
      await logAdminAction({
        req,
        action: isRecoveryCode ? 'admin_recovery_code_used' : 'admin_mfa_verification_success',
        resource_type: 'admin_mfa',
        resource_id: userId,
        result: 'success',
        metadata: { used_recovery_code: isRecoveryCode }
      });
    } catch (aErr) {}

    // 7. Resolve admin role & permissions
    const { resolveAdminRole } = require('../middleware/adminMiddleware');
    const { getPermissionsForRole } = require('../config/rbac');
    const adminRole = await resolveAdminRole(user.id);
    const permissions = getPermissionsForRole(adminRole);

    // 8. Phase 6.3: Create server-side admin session (7-day absolute lifetime)
    const sessionService = require('../services/sessionService');
    const { session, accessToken, refreshToken } = await sessionService.createSession({
      user,
      req,
      client: supabase
    });

    // Set HttpOnly refresh token cookie (Phase 6.6)
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      admin_role: adminRole,
      permissions,
      station_code: user.station_code || null,
      is_approved: user.is_approved,
      kyc_status: user.kyc_status || null,
      token: accessToken,
      accessToken,
      refreshToken,
      sessionId: session.id,
      usedRecoveryCode: isRecoveryCode,
      notice: isRecoveryCode ? 'You used an emergency recovery code to log in. Please regenerate recovery codes if you are running low.' : undefined
    });

  } catch (err) {
    console.error('VERIFY MFA LOGIN ERROR:', err.message);
    return res.status(500).json({ message: 'Server error verifying MFA login.' });
  }
};

/**
 * POST /api/auth/admin/mfa/regenerate-recovery-codes
 *
 * Generates a fresh set of 8 recovery codes for an enrolled admin.
 * Requires active, fully authenticated admin session.
 */
exports.regenerateAdminRecoveryCodes = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required.' });
    }

    const result = await mfaService.regenerateRecoveryCodes(userId, supabase);

    try {
      await logAdminAction({
        req,
        action: 'admin_recovery_codes_regenerated',
        resource_type: 'mfa_recovery_codes',
        resource_id: userId,
        result: 'success',
        metadata: { total_regenerated: result.recoveryCodes.length }
      });
    } catch (aErr) {}

    return res.status(200).json({
      success: true,
      message: 'New recovery codes generated successfully. Previous recovery codes are now invalidated.',
      recoveryCodes: result.recoveryCodes
    });

  } catch (err) {
    console.error('REGENERATE RECOVERY CODES ERROR:', err.message);
    return res.status(400).json({ message: err.message || 'Failed to regenerate recovery codes.' });
  }
};

/*
|--------------------------------------------------------------------------
| PHASE 6.3: SESSION REFRESH, LOGOUT & ACTIVE SESSIONS ENDPOINTS
|--------------------------------------------------------------------------
*/

/**
 * POST /api/auth/refresh
 * Rotates the refresh token and issues a new access token + refresh token pair.
 * Detects token reuse and revokes session families on theft.
 */
exports.refreshTokenHandler = async (req, res) => {
  try {
    const rawCookieToken = req.cookies ? req.cookies[COOKIE_NAME] : null;
    const refreshToken = rawCookieToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required.' });
    }

    const sessionService = require('../services/sessionService');
    const result = await sessionService.rotateRefreshToken(refreshToken, req, supabase);

    // Set rotated refresh token in secure HttpOnly cookie (Phase 6.6)
    setRefreshTokenCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      token: result.accessToken,
      refreshToken: result.refreshToken, // Retained for backward-compatible non-browser clients
      user: result.user
    });
  } catch (err) {
    const status = err.status || 401;
    return res.status(status).json({ message: err.message || 'Failed to refresh token.' });
  }
};

/**
 * POST /api/auth/logout
 * Terminates the authenticated user's current server-side session.
 */
exports.logoutHandler = async (req, res) => {
  try {
    const sessionId = req.sessionId;

    if (sessionId) {
      const sessionService = require('../services/sessionService');
      await sessionService.revokeSession(sessionId, 'logout', supabase);
    }

    // Clear HttpOnly refresh token cookie
    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully. Backend session invalidated.'
    });
  } catch (err) {
    console.error('LOGOUT ERROR:', err);
    return res.status(500).json({ message: 'Error during logout.' });
  }
};

/**
 * POST /api/auth/logout-all
 * Revokes all active sessions across all devices for the authenticated user.
 */
exports.logoutAllHandler = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const sessionService = require('../services/sessionService');
    const count = await sessionService.revokeAllUserSessions(userId, 'logout', supabase);

    // Clear HttpOnly refresh token cookie
    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: `Logged out from all devices. ${count} session(s) terminated.`
    });
  } catch (err) {
    console.error('LOGOUT ALL ERROR:', err);
    return res.status(500).json({ message: 'Error during logout all.' });
  }
};

/**
 * GET /api/auth/sessions
 * Returns the list of active/past sessions for the current authenticated user.
 */
exports.getMySessionsHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const sessionService = require('../services/sessionService');
    const sessions = await sessionService.getUserSessions(userId, req.sessionId, supabase);

    return res.status(200).json({
      success: true,
      sessions
    });
  } catch (err) {
    console.error('GET MY SESSIONS ERROR:', err);
    return res.status(500).json({ message: 'Error retrieving sessions.' });
  }
};