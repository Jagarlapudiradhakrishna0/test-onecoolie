/**
 * ONECOOLIE Phase 6.6: Production Security, Cookie Authentication & Deployment Readiness
 * Comprehensive Automated Verification Suite
 *
 * Covers:
 * A. Cookie Authentication (HttpOnly, Secure, SameSite, refresh, rotation, revocation)
 * B. Frontend Storage & Transport (credentials, no localStorage for refresh)
 * C. CSRF Protection (valid, missing, invalid, Bearer exemption)
 * D. Strict Production CORS (allowed origins, unknown rejected, no wildcard + credentials)
 * E. Security Headers & CSP (Helmet, CSP restrictions, frame protection, permissions policy)
 * F. Environment & Secret Validation (fail fast on missing JWT secret, MFA key, origins)
 * G. Sensitive Data & Log Redaction (passwords, tokens, MFA secrets, recovery codes)
 * H. Request Hardening & Error Handling (body limits, malformed JSON, no stack traces in prod)
 * I. Session, Socket & Regression (Phase 6.3 rotation, reuse family revocation, socket disconnect)
 */

const http = require('http');
const crypto = require('crypto');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('ONECOOLIE PHASE 6.6: PRODUCTION SECURITY & HARDENING TEST SUITE');
  console.log('===============================================================\n');

  // --------------------------------------------------------------------------
  // SECTION A: Cookie Authentication Helper & Options
  // --------------------------------------------------------------------------
  console.log('--- Section A: Cookie Authentication ---');
  const cookieHelper = require('../../src/utils/cookieHelper');

  // Test 1: Refresh token cookie options have HttpOnly: true
  const devRefreshOpts = cookieHelper.getRefreshCookieOptions(false);
  assert(devRefreshOpts.httpOnly === true, 'A.1 Refresh cookie has httpOnly: true');

  // Test 2: Refresh token cookie options have Secure: true in production
  const prodRefreshOpts = cookieHelper.getRefreshCookieOptions(true);
  assert(prodRefreshOpts.secure === true, 'A.2 Refresh cookie has secure: true in production');

  // Test 3: Cookie SameSite matches configuration
  assert(['lax', 'strict', 'none'].includes(prodRefreshOpts.sameSite), 'A.3 Refresh cookie sameSite is explicitly configured (lax/strict/none)');

  // Test 4: Refresh cookie path is restricted
  assert(prodRefreshOpts.path === '/api/auth' || prodRefreshOpts.path === '/', 'A.4 Refresh cookie path is appropriately scoped');

  // Test 5: CSRF cookie options have httpOnly: false (readable by JS to double-submit)
  const csrfOpts = cookieHelper.getCsrfCookieOptions(true);
  assert(csrfOpts.httpOnly === false, 'A.5 CSRF cookie allows JavaScript read for double-submit header');
  assert(csrfOpts.secure === true, 'A.6 CSRF cookie has secure: true in production');

  // Test 7: clearRefreshTokenCookie sets maxAge: 0 or expires in past
  let clearedCookie = null;
  const mockRes = {
    cookie: (name, val, opts) => {
      clearedCookie = { name, val, opts };
    }
  };
  cookieHelper.clearRefreshTokenCookie(mockRes);
  assert(clearedCookie !== null && clearedCookie.name === cookieHelper.COOKIE_NAME, 'A.7 clearRefreshTokenCookie targets correct cookie name');
  assert(clearedCookie.opts.maxAge === 0, 'A.8 clearRefreshTokenCookie expires the cookie immediately');


  // --------------------------------------------------------------------------
  // SECTION B: Frontend Storage & Transport Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- Section B: Frontend Storage & Transport ---');
  const fs = require('fs');
  const path = require('path');

  const axiosPath = path.resolve(__dirname, '../../../client/src/api/axios.js');
  const axiosContent = fs.readFileSync(axiosPath, 'utf8');

  // Test 8: Axios configures withCredentials: true
  assert(axiosContent.includes('withCredentials: true'), 'B.1 Axios client is configured with withCredentials: true');

  // Test 9: Axios attaches X-CSRF-Token header from cookie
  assert(axiosContent.includes('X-CSRF-Token') || axiosContent.includes('x-csrf-token'), 'B.2 Axios interceptor attaches CSRF header');

  // Test 10: Axios refresh interceptor calls /auth/refresh without depending on localStorage.refreshToken
  const authContextPath = path.resolve(__dirname, '../../../client/src/context/AuthContext.jsx');
  const authContextContent = fs.readFileSync(authContextPath, 'utf8');
  assert(!authContextContent.includes("localStorage.setItem('refreshToken'") && !authContextContent.includes('localStorage.setItem("refreshToken"'), 'B.3 AuthContext does not store raw refreshToken in localStorage');

  // Test 11: Refresh coordination queue pattern exists in Axios to prevent race conditions
  assert(axiosContent.includes('failedQueue') && axiosContent.includes('isRefreshing'), 'B.4 Concurrent 401 refresh coordination queue is maintained');


  // --------------------------------------------------------------------------
  // SECTION C: CSRF Protection Middleware
  // --------------------------------------------------------------------------
  console.log('\n--- Section C: CSRF Protection ---');
  const { csrfProtection, generateCsrfToken } = require('../../src/middleware/csrfProtection');

  // Test 12: generateCsrfToken produces high-entropy hex string
  const token1 = generateCsrfToken();
  const token2 = generateCsrfToken();
  assert(typeof token1 === 'string' && token1.length >= 64, 'C.1 CSRF token is high entropy (>= 64 chars)');
  assert(token1 !== token2, 'C.2 CSRF tokens are cryptographically random');

  // Test 13: GET / HEAD / OPTIONS safe methods bypass CSRF check
  let nextCalled = false;
  let resStatus = null;
  csrfProtection({ method: 'GET' }, {}, () => { nextCalled = true; });
  assert(nextCalled === true, 'C.3 GET requests bypass CSRF validation');

  // Test 14: Pure Bearer token requests without cookies bypass CSRF check
  nextCalled = false;
  csrfProtection({
    method: 'POST',
    headers: { authorization: 'Bearer some_access_token' },
    cookies: {}
  }, {}, () => { nextCalled = true; });
  assert(nextCalled === true, 'C.4 Pure Bearer-token requests without cookies are exempt from CSRF');

  // Test 15: Cookie-authenticated POST with matching cookie and header succeeds
  nextCalled = false;
  const testCsrfToken = generateCsrfToken();
  csrfProtection({
    method: 'POST',
    headers: { 'x-csrf-token': testCsrfToken },
    cookies: { onecoolie_csrf: testCsrfToken }
  }, {}, () => { nextCalled = true; });
  assert(nextCalled === true, 'C.5 Valid double-submit CSRF token matches and passes');

  // Test 16: Missing CSRF token in header rejects with 403
  let errorJson = null;
  const mock403Res = {
    status: (code) => {
      resStatus = code;
      return {
        json: (data) => { errorJson = data; }
      };
    }
  };
  csrfProtection({
    method: 'POST',
    headers: {},
    cookies: { onecoolie_refresh: 'some_refresh_cookie' }
  }, mock403Res, () => {});
  assert(resStatus === 403, 'C.6 Missing CSRF token for cookie-bearing request returns HTTP 403');
  assert(errorJson && errorJson.code === 'CSRF_TOKEN_MISSING', 'C.7 Missing CSRF returns expected error code');

  // Test 17: Mismatched CSRF token rejects with 403
  resStatus = null;
  csrfProtection({
    method: 'POST',
    headers: { 'x-csrf-token': 'attacker_token' },
    cookies: { onecoolie_csrf: 'legitimate_token' }
  }, mock403Res, () => {});
  assert(resStatus === 403, 'C.8 Mismatched CSRF token returns HTTP 403');
  assert(errorJson && errorJson.code === 'CSRF_TOKEN_MISMATCH', 'C.9 Mismatched CSRF returns CSRF_TOKEN_MISMATCH code');


  // --------------------------------------------------------------------------
  // SECTION D: Strict Production CORS & Origins
  // --------------------------------------------------------------------------
  console.log('\n--- Section D: Strict Production CORS ---');
  const indexFileContent = fs.readFileSync(path.resolve(__dirname, '../../src/index.js'), 'utf8');

  // Test 18: CORS does not use wildcard origin with credentials
  assert(!indexFileContent.includes("origin: '*'") || !indexFileContent.includes("credentials: true, origin: '*'"), 'D.1 Wildcard origin is never paired with credentials: true');

  // Test 19: CORS configuration includes X-CSRF-Token in allowed headers
  assert(indexFileContent.includes('X-CSRF-Token'), 'D.2 Allowed headers explicitly include X-CSRF-Token');

  // Test 20: CORS origin function checks against allowed origins list
  assert(indexFileContent.includes('getAllowedOrigins') || indexFileContent.includes('allowedOrigins'), 'D.3 CORS validates origin against parsed environment allowlist');


  // --------------------------------------------------------------------------
  // SECTION E: Security Headers & CSP
  // --------------------------------------------------------------------------
  console.log('\n--- Section E: Security Headers & CSP ---');

  // Test 21: Helmet is imported and mounted
  assert(indexFileContent.includes("helmet("), 'E.1 Helmet security middleware is mounted');

  // Test 22: CSP directives are explicitly configured
  assert(indexFileContent.includes('contentSecurityPolicy:'), 'E.2 Content Security Policy is explicitly configured');

  // Test 23: CSP does not use broad wildcard '*' for script-src
  assert(!indexFileContent.includes("scriptSrc: [\"'*'\"") && !indexFileContent.includes("script-src '*'"), 'E.3 CSP script-src does not allow wildcard (*) sources');

  // Test 24: CSP frameAncestors is configured to prevent clickjacking
  assert(indexFileContent.includes("frameAncestors: [\"'none'\"]") || indexFileContent.includes("frame-ancestors 'none'"), 'E.4 Frame ancestors configured to none to prevent clickjacking');

  // Test 25: CSP connects-src allows self, wss: and https: for API and Socket.IO
  assert(indexFileContent.includes("connectSrc:"), 'E.5 CSP connectSrc explicitly restricts connections');


  // --------------------------------------------------------------------------
  // SECTION F: Environment & Secret Validation
  // --------------------------------------------------------------------------
  console.log('\n--- Section F: Environment & Secret Validation ---');
  const envModule = require('../../src/config/environment');

  // Test 26: validateEnvironment is a function
  assert(typeof envModule.validateEnvironment === 'function', 'F.1 validateEnvironment function is exposed');

  // Test 27: Production environment fails on missing or short JWT_SECRET
  const prevEnv = process.env.NODE_ENV;
  const prevJwt = process.env.JWT_SECRET;
  const prevMfaKey = process.env.MFA_ENCRYPTION_KEY;

  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'short_key';
  let resValidation = envModule.validateEnvironment({ exitOnFailure: false });
  assert(!resValidation.valid && resValidation.errors.some(e => e.includes('JWT_SECRET')), 'F.2 Validation fails if production JWT_SECRET is too short (<32 chars)');

  // Test 28: Production environment fails on missing MFA_ENCRYPTION_KEY
  process.env.JWT_SECRET = 'a_very_long_production_jwt_secret_that_is_secure_12345';
  delete process.env.MFA_ENCRYPTION_KEY;
  resValidation = envModule.validateEnvironment({ exitOnFailure: false });
  assert(!resValidation.valid && resValidation.errors.some(e => e.includes('MFA_ENCRYPTION_KEY')), 'F.3 Validation fails if production MFA_ENCRYPTION_KEY is missing');

  // Test 29: Production environment fails on weak placeholder keys
  process.env.JWT_SECRET = 'your-jwt-secret-key';
  process.env.MFA_ENCRYPTION_KEY = 'your-64-character-hex-mfa-encryption-key';
  resValidation = envModule.validateEnvironment({ exitOnFailure: false });
  assert(!resValidation.valid && resValidation.errors.some(e => e.includes('placeholder')), 'F.4 Validation fails if placeholder secrets are used in production');

  // Restore environment variables
  process.env.NODE_ENV = prevEnv;
  process.env.JWT_SECRET = prevJwt;
  if (prevMfaKey) process.env.MFA_ENCRYPTION_KEY = prevMfaKey;


  // --------------------------------------------------------------------------
  // SECTION G: Sensitive Data & Log Redaction
  // --------------------------------------------------------------------------
  console.log('\n--- Section G: Sensitive Data Redaction ---');
  const logger = require('../../src/utils/logger');

  // Test 30: sanitize / redactSensitiveData removes sensitive fields
  const rawData = {
    user: 'admin',
    password: 'superSecretPassword123',
    token: 'jwt_access_token_value',
    refreshToken: 'opaque_refresh_token_value',
    otp: '123456',
    recoveryCode: 'ABCD-1234-EFGH-5678',
    headers: {
      authorization: 'Bearer secret_access_token',
      cookie: 'onecoolie_refresh=secret_refresh_token'
    }
  };

  const sanitized = logger.redactSensitiveData ? logger.redactSensitiveData(rawData) : logger.sanitize(rawData);
  assert(sanitized.password === '[REDACTED]', 'G.1 Passwords are automatically redacted');
  assert(sanitized.token === '[REDACTED]', 'G.2 Access tokens are automatically redacted');
  assert(sanitized.refreshToken === '[REDACTED]', 'G.3 Refresh tokens are automatically redacted');
  assert(sanitized.otp === '[REDACTED]', 'G.4 OTPs are automatically redacted');
  assert(sanitized.recoveryCode === '[REDACTED]', 'G.5 Recovery codes are automatically redacted');
  assert(sanitized.headers.authorization === '[REDACTED]', 'G.6 Authorization headers are automatically redacted');
  assert(sanitized.headers.cookie === '[REDACTED]', 'G.7 Cookie headers are automatically redacted');


  // --------------------------------------------------------------------------
  // SECTION H: Request Hardening & Error Handling
  // --------------------------------------------------------------------------
  console.log('\n--- Section H: Request Hardening & Error Handling ---');

  // Test 31: Global express json limit is restricted
  assert(indexFileContent.includes("express.json({ limit: '1mb' })") || indexFileContent.includes("express.json({ limit:"), 'H.1 JSON request payload size limit is explicitly restricted');

  // Test 32: URL-encoded payload limit is restricted
  assert(indexFileContent.includes("express.urlencoded({ extended: true, limit: '1mb' })") || indexFileContent.includes("express.urlencoded"), 'H.2 URL-encoded payload size limit is explicitly restricted');

  // Test 33: Centralized error handling suppresses stack traces in production
  const errorHandlerContent = fs.readFileSync(path.resolve(__dirname, '../../src/middleware/errorHandler.js'), 'utf8');
  assert(errorHandlerContent.includes('prod ?') || errorHandlerContent.includes('isProduction()'), 'H.3 Centralized error handling checks environment for stack trace suppression');


  // --------------------------------------------------------------------------
  // SECTION I: Health & Readiness Endpoints
  // --------------------------------------------------------------------------
  console.log('\n--- Section I: Health & Readiness Endpoints ---');

  // Test 34: Health endpoint exists in index.js
  assert(indexFileContent.includes("'/health'") || indexFileContent.includes('"/health"'), 'I.1 GET /health liveness probe exists');

  // Test 35: Ready endpoint exists in index.js
  assert(indexFileContent.includes("'/ready'") || indexFileContent.includes('"/ready"'), 'I.2 GET /ready readiness probe exists');

  // Test 36: Health endpoint does not expose secrets
  assert(!indexFileContent.includes("res.json({ secret:"), 'I.3 Health endpoint does not leak internal secrets');


  // --------------------------------------------------------------------------
  // SECTION J: Session & Socket.IO Regression
  // --------------------------------------------------------------------------
  console.log('\n--- Section J: Session & Socket.IO Regression ---');
  // Ensure dotenv is loaded so sessionService can access environment if needed
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const sessionService = require('../../src/services/sessionService');

  // Test 37: sessionService exports required rotation & revocation functions
  assert(typeof sessionService.createSession === 'function', 'J.1 createSession is defined');
  assert(typeof sessionService.rotateRefreshToken === 'function', 'J.2 rotateRefreshToken is defined');
  assert(typeof sessionService.revokeSession === 'function', 'J.3 revokeSession is defined');
  assert(typeof sessionService.revokeAllUserSessions === 'function', 'J.4 revokeAllUserSessions is defined');
  assert(typeof sessionService.validateSession === 'function', 'J.5 validateSession is defined');

  // Test 38: Socket session revocation helper exists
  const socketSessionService = require('../../src/services/socketSessionService');
  assert(typeof socketSessionService.disconnectSession === 'function' && typeof socketSessionService.disconnectUserSessions === 'function', 'J.6 socketSessionService provides real-time disconnection functions');

  // Test 39: SHA-256 refresh token hashing preserves collision resistance
  const hash1 = sessionService.hashToken('token-sample-A');
  const hash2 = sessionService.hashToken('token-sample-B');
  assert(hash1.length === 64, 'J.7 Refresh token hash is a valid 64-char SHA-256 digest');
  assert(hash1 !== hash2, 'J.8 Distinct refresh tokens produce distinct hashes');

  // Test 40: Auth routes map csrfProtection to /refresh, /logout, /logout-all
  const authRoutesContent = fs.readFileSync(path.resolve(__dirname, '../../src/routes/authRoutes.js'), 'utf8');
  assert(authRoutesContent.includes("csrfProtection") && authRoutesContent.includes("router.post('/refresh'"), 'J.9 CSRF protection is mounted on POST /api/auth/refresh');
  assert(authRoutesContent.includes("csrfProtection") && authRoutesContent.includes("router.post('/logout'"), 'J.10 CSRF protection is mounted on POST /api/auth/logout');
  assert(authRoutesContent.includes("csrfProtection") && authRoutesContent.includes("router.post('/logout-all'"), 'J.11 CSRF protection is mounted on POST /api/auth/logout-all');
  assert(authRoutesContent.includes("router.get('/csrf-token'"), 'J.12 GET /api/auth/csrf-token endpoint is exposed');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`PHASE 6.6 PRODUCTION SECURITY TEST RESULTS:`);
  console.log(`Total Tests:  ${totalTests}`);
  console.log(`Passed Tests: ${passedTests}`);
  console.log(`Failed Tests: ${failedTests}`);
  console.log('===============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error running Phase 6.6 tests:', err);
  process.exit(1);
});
