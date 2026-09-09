require('dotenv').config();

const dns = require('node:dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

// Config & Security
const { validateEnvironment, isProduction, getAllowedOrigins } = require('./config/environment');
const { logger, requestLoggerMiddleware } = require('./utils/logger');
const { requestIdMiddleware } = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const productionReadinessService = require('./services/productionReadinessService');

// Validate environment on boot (fail-safe abort if critical secrets are missing)
const envValidation = validateEnvironment({ exitOnFailure: true });
if (!envValidation.valid) {
  logger.warn('Environment validation warning: missing non-critical or development variables', {
    missing: envValidation.missing
  });
} else {
  logger.info('Environment validated successfully for ONECOOLIE API', {
    env: process.env.NODE_ENV || 'development'
  });
}

// Routes
const authRoutes = require('./routes/authRoutes');
const trainRoutes = require('./routes/trainRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const assistantPayoutRoutes = require('./routes/assistantPayoutRoutes');
const assistantWalletRoutes = require('./routes/assistantWalletRoutes');
const supportRoutes = require('./routes/supportRoutes');

// Database Client
const supabase = require('./config/db');
const { resolveBooking } = require('./utils/bookingResolver');
const socketSessionService = require('./services/socketSessionService');

// Controllers
const serviceController = require('./controllers/serviceController');
const payoutController = require('./controllers/payoutController');
const supportController = require('./controllers/supportController');

const app = express();
const server = http.createServer(app);

// Enable reverse proxy trust for real client IP resolution & rate limit accuracy
app.set('trust proxy', 1);

// --------------------------------------------------
// SECURITY HEADERS (HELMET)
// --------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://checkout.razorpay.com"],
        frameSrc: ["'self'", "https://api.razorpay.com"],
        connectSrc: ["'self'", "https://api.razorpay.com", "wss:", "ws:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProduction() ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: isProduction()
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    xFrameOptions: { action: "deny" },
    xContentTypeOptions: true
  })
);

// --------------------------------------------------
// CORS
// --------------------------------------------------
const allowedOrigins = getAllowedOrigins();

const corsOriginHandler = (origin, callback) => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server health probes)
  if (!origin) return callback(null, true);

  // Normalize origin
  const normalized = origin.trim().replace(/\/+$/, '');

  // Match explicit allowlist
  if (allowedOrigins.includes(normalized)) {
    return callback(null, true);
  }

  // Allow localhost during non-production development testing ONLY
  if (!isProduction()) {
    const isDevLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:(5173|3000|5000|4173))?$/.test(normalized);
    if (isDevLocalhost) {
      return callback(null, true);
    }
  }

  // Reject all other origins fail-closed
  const corsErr = new Error(`Origin '${origin}' not allowed by CORS policy`);
  corsErr.status = 403;
  corsErr.statusCode = 403;
  corsErr.isOperational = true;
  return callback(corsErr);
};

app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Client-Version', 'x-razorpay-signature', 'X-CSRF-Token', 'x-csrf-token', 'X-XSRF-TOKEN', 'x-xsrf-token']
  })
);

// --------------------------------------------------
// REQUEST CORRELATION & STRUCTURED LOGGING & RELIABILITY TELEMETRY
// --------------------------------------------------
const { securityTelemetry } = require('./middleware/securityTelemetry');
const { reliabilityTelemetry } = require('./middleware/reliabilityTelemetry');
app.use(requestIdMiddleware);
app.use(securityTelemetry);
app.use(reliabilityTelemetry);
app.use(requestLoggerMiddleware);

// --------------------------------------------------
// BODY PARSING (Hardened with 1MB bounds to prevent payload DoS)
// --------------------------------------------------
// Razorpay Webhook requires exact raw byte buffer for HMAC signature verification (Phase 2C)
app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// --------------------------------------------------
// SOCKET.IO
// --------------------------------------------------
const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  }
});

// --------------------------------------------------
// SOCKET.IO AUTHENTICATION MIDDLEWARE (PHASE 6.5 HARDENED)
// --------------------------------------------------
io.use(async (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization ||
    socket.handshake.headers?.['x-auth-token'];

  if (!token || typeof token !== 'string') {
    logger.warn('Socket connection rejected: Missing token', {
      socketId: socket.id,
      ip: socket.handshake.address
    });
    return next(new Error('Authentication error: Token required'));
  }

  let cleanToken = token.trim();
  if (/^Bearer\s+/i.test(cleanToken)) {
    cleanToken = cleanToken.replace(/^Bearer\s+/i, '').trim();
  }
  cleanToken = cleanToken.replace(/^"(.*)"$/, '$1').trim();

  if (!cleanToken) {
    logger.warn('Socket connection rejected: Empty token', {
      socketId: socket.id
    });
    return next(new Error('Authentication error: Token required'));
  }

  // 1. Verify cryptographic signature, pinned algorithm, issuer, and audience
  let decoded;
  try {
    decoded = jwt.verify(cleanToken, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'onecoolie-api',
      audience: 'onecoolie-client'
    });
  } catch (err) {
    logger.warn('Socket connection rejected: Token verification failed', {
      socketId: socket.id,
      name: err.name,
      error: err.message
    });
    if (err.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    return next(new Error(`Authentication error: ${err.message || 'Invalid token'}`));
  }

  // 2. Reject intermediate authentication tokens (MFA pending or MFA setup)
  if (decoded.scope === 'mfa_pending' || decoded.scope === 'mfa_setup_required') {
    logger.warn('Socket connection rejected: Intermediate MFA token cannot connect to WebSocket', {
      socketId: socket.id,
      scope: decoded.scope
    });
    return next(new Error('Authentication error: Intermediate MFA token cannot establish socket connection'));
  }

  // 3. Require valid sid claim (server-side session ID)
  if (!decoded.sid || typeof decoded.sid !== 'string') {
    logger.warn('Socket connection rejected: Token missing sid claim', {
      socketId: socket.id,
      userId: decoded.id
    });
    return next(new Error('Authentication error: Session ID (sid) required'));
  }

  // 4. Server-Side Session Verification in public.user_sessions
  try {
    const { data: session, error: sessErr } = await supabase
      .from('user_sessions')
      .select('id, user_id, family_id, expires_at, revoked_at, revocation_reason')
      .eq('id', decoded.sid)
      .maybeSingle();

    if (sessErr || !session) {
      logger.warn('Socket connection rejected: Session not found in database', {
        socketId: socket.id,
        sessionId: decoded.sid,
        error: sessErr?.message
      });
      return next(new Error('Authentication error: Session not found or invalid'));
    }

    if (session.user_id !== decoded.id) {
      logger.warn('Socket connection rejected: Session identity mismatch', {
        socketId: socket.id,
        sessionUserId: session.user_id,
        tokenUserId: decoded.id
      });
      return next(new Error('Authentication error: Session identity mismatch'));
    }

    if (session.revoked_at) {
      logger.warn('Socket connection rejected: Session is revoked', {
        socketId: socket.id,
        sessionId: session.id,
        revocationReason: session.revocation_reason
      });
      return next(new Error(`Authentication error: Session revoked (${session.revocation_reason || 'revoked'})`));
    }

    if (new Date(session.expires_at) <= new Date()) {
      logger.warn('Socket connection rejected: Session expired', {
        socketId: socket.id,
        sessionId: session.id,
        expiresAt: session.expires_at
      });
      return next(new Error('Authentication error: Session expired'));
    }

    // 5. Authoritative User Lookup in public.users
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, role, name, phone, email, is_approved, admin_role, station_code')
      .eq('id', session.user_id)
      .maybeSingle();

    if (userErr || !user) {
      logger.warn('Socket connection rejected: User not found or lookup failed', {
        socketId: socket.id,
        userId: session.user_id,
        error: userErr?.message
      });
      return next(new Error('Authentication error: User not found or inactive'));
    }

    // Assistant approval check
    if (user.role === 'assistant' && user.is_approved === false) {
      logger.warn('Socket connection rejected: Assistant account pending approval', {
        socketId: socket.id,
        userId: user.id
      });
      return next(new Error('Authentication error: Assistant account not approved'));
    }

    // 6. Attach authoritative authenticated context
    socket.user = user;
    socket.sessionId = session.id;
    socket.userId = user.id;
    socket.role = user.role;
    socket.familyId = session.family_id;

    // Backward-compatible socket.data namespace
    socket.data = socket.data || {};
    socket.data.user = user;
    socket.data.sessionId = session.id;
    socket.data.userId = user.id;
    socket.data.role = user.role;
    socket.data.familyId = session.family_id;

    logger.info('Socket authenticated successfully with active session', {
      socketId: socket.id,
      userId: user.id,
      sessionId: session.id,
      role: user.role
    });

    return next();
  } catch (dbErr) {
    logger.error('Socket authentication database validation error:', {
      socketId: socket.id,
      error: dbErr.message
    });
    return next(new Error('Authentication error: Database validation failure'));
  }
});

io.on('connection', (socket) => {
  logger.info('User connected to WebSocket', {
    socketId: socket.id,
    userId: socket.userId || socket.data?.user?.id,
    sessionId: socket.sessionId || socket.data?.sessionId,
    role: socket.role || socket.data?.user?.role
  });

  // Central Socket Session Registration (Phase 6.5)
  if (socket.sessionId) {
    socketSessionService.registerSocket(socket.sessionId, socket, {
      userId: socket.userId,
      familyId: socket.familyId
    });
  }

  // Phase 6.8: Operational Socket Metrics Tracking
  try {
    const { recordSocketActivity } = require('./services/metricsService');
    recordSocketActivity(io.engine?.clientsCount || 1);
  } catch {}

  // Automatically join assistant-specific rooms if user is an assistant
  if (socket.data?.user?.role === 'assistant') {
    socket.join(`assistant_${socket.data.user.id}`);
    socket.join(`user_${socket.data.user.id}`);
  }

  // Join booking-specific room with strict database authorization check
  socket.on('join_booking', async (bookingId) => {
    if (!bookingId || typeof bookingId !== 'string') return;
    const cleanBookingId = bookingId.trim();
    const user = socket.data?.user;

    if (!user || !user.id) {
      logger.warn('Socket join_booking rejected: unauthenticated socket', { socketId: socket.id });
      return socket.emit('booking_auth_error', { message: 'Unauthorized: Authentication required.' });
    }

    try {
      const { booking, error } = await resolveBooking(
        supabase,
        cleanBookingId,
        'id, booking_id, passenger_id, assistant_id'
      );

      if (error || !booking) {
        logger.warn('Socket join_booking failed lookup or booking not found', {
          socketId: socket.id,
          userId: user.id,
          bookingId: cleanBookingId
        });
        return socket.emit('booking_auth_error', { message: 'Unauthorized: Booking not found or access denied.' });
      }

      const isPassenger = String(booking.passenger_id) === String(user.id);
      const isAssistant = booking.assistant_id && String(booking.assistant_id) === String(user.id);
      const isAdmin = user.role === 'admin';

      if (!isPassenger && !isAssistant && !isAdmin) {
        logger.warn('Unauthorized join_booking attempt', {
          socketId: socket.id,
          userId: user.id,
          role: user.role,
          bookingId: cleanBookingId
        });
        return socket.emit('booking_auth_error', { message: 'Unauthorized: You are not a party to this booking.' });
      }

      socket.join(`booking_${cleanBookingId}`);
      if (booking.id && booking.id !== cleanBookingId) {
        socket.join(`booking_${booking.id}`);
      }
      if (booking.booking_id && booking.booking_id !== cleanBookingId) {
        socket.join(`booking_${booking.booking_id}`);
      }

      socket.emit('booking_joined', { bookingId: cleanBookingId });
    } catch (err) {
      logger.error('Error in socket join_booking handler', {
        error: err.message,
        bookingId: cleanBookingId
      });
      return socket.emit('booking_auth_error', { message: 'Unauthorized: Failed to verify booking access.' });
    }
  });

  // Explicit join assistant room (only allowed for matching assistant or admin)
  socket.on('join_assistant', (assistantId) => {
    if (!assistantId || typeof assistantId !== 'string') return;
    const cleanAssistantId = assistantId.trim();
    const user = socket.data?.user;
    if (!user || !user.id) {
      return socket.emit('assistant_auth_error', { message: 'Unauthorized: Authentication required.' });
    }

    const isAuthorizedAssistant = user.role === 'assistant' && String(user.id) === cleanAssistantId;
    const isAdmin = user.role === 'admin';

    if (isAuthorizedAssistant || isAdmin) {
      socket.join(`assistant_${cleanAssistantId}`);
      socket.join(`user_${cleanAssistantId}`);
      socket.emit('assistant_joined', { assistantId: cleanAssistantId });
    } else {
      logger.warn('Unauthorized join_assistant attempt', {
        socketId: socket.id,
        requesterId: user.id,
        requesterRole: user.role,
        targetAssistantId: cleanAssistantId
      });
      socket.emit('assistant_auth_error', { message: 'Unauthorized: Access to assistant room denied.' });
    }
  });

  // Join admin room — strictly requires admin role from verified JWT and approved admin identity
  socket.on('join_admin', () => {
    const user = socket.data?.user;
    const { isApprovedAdminEmail } = require('./config/adminAllowlist');
    if (!user || user.role !== 'admin' || !isApprovedAdminEmail(user.email) || user.is_approved === false) {
      logger.warn('Unauthorized join_admin attempt', {
        socketId: socket.id,
        userId: user?.id,
        role: user?.role,
        email: user?.email
      });
      return socket.emit('admin_auth_error', {
        message: 'Unauthorized: Admin privileges required.'
      });
    }

    socket.join('admin_room');
    logger.info('Admin socket joined admin_room', {
      socketId: socket.id,
      adminId: user.id
    });
    socket.emit('admin_joined', { success: true });
  });

  // Chat — broadcast to the booking room only
  socket.on('chat_message', (payload) => {
    if (!payload?.bookingId || !payload?.text) return;

    io.to(`booking_${payload.bookingId}`).emit('chat_message', {
      bookingId: payload.bookingId,
      from: socket.data?.user?.id || payload.from || 'unknown',
      role: socket.data?.user?.role || 'passenger',
      text: String(payload.text).slice(0, 1000), // cap message length
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', (reason) => {
    try {
      const { recordSocketActivity } = require('./services/metricsService');
      recordSocketActivity(Math.max(0, (io.engine?.clientsCount || 1) - 1), reason);
    } catch {}
    logger.info('User disconnected from WebSocket', {
      socketId: socket.id,
      userId: socket.data?.user?.id,
      reason
    });
  });
});

// Controllers & Services Socket.IO injection
const incidentController = require('./controllers/incidentController');
const financialMonitoringService = require('./services/financialMonitoringService');

serviceController.setIO(io);
payoutController.setIO(io);
incidentController.setIO(io);
financialMonitoringService.setIO(io);
supportController.setIO(io);

// --------------------------------------------------
// OPERATIONAL PROBES & HEALTH CHECKS
// --------------------------------------------------
const { getLiveness, getReadiness } = require('./services/healthService');

// Liveness probe: ultra-fast check returning 200 if Node.js event loop is healthy
app.get(['/health', '/api/health'], (req, res) => {
  res.json(getLiveness());
});

// Readiness probe: verifies DB connectivity, critical schema, and draining status
app.get(['/ready', '/api/ready'], async (req, res) => {
  try {
    const report = await getReadiness({ client: supabase });
    const httpStatus = (report.status === 'unhealthy' || report.status === 'NOT_READY') ? 503 : 200;
    return res.status(httpStatus).json(report);
  } catch (err) {
    logger.error('Readiness check failed', { error: err.message });
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Readiness check encountered an internal error.'
    });
  }
});

app.get('/api/health/email', (req, res) => {
  res.json({
    activeProvider: process.env.BREVO_API_KEY
      ? 'Brevo (HTTPS Port 443)'
      : process.env.RESEND_API_KEY
      ? 'Resend (HTTPS Port 443)'
      : 'Gmail SMTP (Port 465)',
    hasBrevoKey: !!process.env.BREVO_API_KEY,
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasGmailUser: !!process.env.GMAIL_USER,
    gmailUser: process.env.GMAIL_USER || null,
    hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
  });
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

const securityRoutes = require('./routes/securityRoutes');
const operationsRoutes = require('./routes/operationsRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin/operations', operationsRoutes);
app.use('/api/trains', trainRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/assistants', assistantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/assistant-wallet', assistantWalletRoutes);
app.use('/api/assistant-payouts', assistantPayoutRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/support-tickets', supportRoutes);

// --------------------------------------------------
// 404 HANDLER
// --------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    message: 'API route not found',
    path: req.originalUrl,
    requestId: req.requestId
  });
});

// --------------------------------------------------
// CENTRAL ERROR HANDLER (PHASE 6)
// --------------------------------------------------
app.use(errorHandler);

// --------------------------------------------------
// START SERVER & GRACEFUL SHUTDOWN
// --------------------------------------------------
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`OneCoolie API running on port ${PORT}`, {
      port: PORT,
      url: `http://localhost:${PORT}`,
      env: process.env.NODE_ENV || 'development'
    });
  });
}

// --------------------------------------------------
// GRACEFUL SHUTDOWN (PHASE 6.8 CENTRALIZED COORDINATOR)
// --------------------------------------------------
const { registerShutdownHandlers } = require('./services/gracefulShutdownService');

registerShutdownHandlers({
  httpServer: server,
  ioServer: io,
  gracePeriodMs: process.env.NODE_ENV === 'test' ? 0 : 3000,
  forceTimeoutMs: 10000
});

module.exports = { app, server, io };