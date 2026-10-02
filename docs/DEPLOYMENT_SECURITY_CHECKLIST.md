# ONECOOLIE DEPLOYMENT SECURITY CHECKLIST (PHASE 6.6)

This document provides a comprehensive operational checklist for deploying ONECOOLIE to staging and production environments. It reflects the hardened security controls established throughout Phases 6.1–6.6.

---

## 1. Environment & Secret Configuration

### Mandatory Production Environment Variables
The application validates critical secrets at bootstrap and **fails closed** if any are missing, placeholders, or insecure.

| Variable | Requirement | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production hardening, suppresses stack traces, enforces strict validations. |
| `JWT_SECRET` | $\ge 32$ chars | Cryptographic secret for signing short-lived access tokens. Never reuse default or placeholder keys. |
| `MFA_ENCRYPTION_KEY` | 32 bytes (64-char hex or 32 raw chars) | AES-256-GCM master key for encrypting TOTP secrets in `admin_mfa`. Must be independent of `JWT_SECRET`. |
| `SUPABASE_URL` | Valid HTTPS URL | Supabase backend endpoint. |
| `SUPABASE_SERVICE_ROLE_KEY` | Valid Service Role Token | High-privilege backend key for authoritative database & RLS operations. Never expose to client. |
| `CLIENT_ORIGINS` | Comma-delimited origins | Explicit list of trusted frontend origins (e.g. `https://app.onecoolie.com,https://admin.onecoolie.com`). No wildcards (`*`). |
| `SOCKET_CORS_ORIGIN` | Comma-delimited origins | Allowed origins for Socket.IO connections (defaults to `CLIENT_ORIGINS`). |

### Recommended Cookie Variables
| Variable | Default | Recommended Production Value | Notes |
| :--- | :--- | :--- | :--- |
| `COOKIE_SECURE` | Auto (`NODE_ENV === 'production'`) | `true` | Requires HTTPS. |
| `COOKIE_SAME_SITE` | `lax` | `none` (if cross-origin) / `lax` (if same-site) | Use `none` with `Secure: true` when API and frontend are on different subdomains/domains. |
| `COOKIE_DOMAIN` | `undefined` | `.onecoolie.com` (optional) | Scope cookie across related subdomains. |
| `COOKIE_NAME` | `onecoolie_refresh` | `onecoolie_refresh` | HttpOnly refresh token cookie. |

---

## 2. HTTPS & Reverse Proxy Setup

- [ ] **HTTPS Enforcement**: Terminate TLS at the reverse proxy (Nginx, Caddy, Cloudflare) or load balancer with TLS 1.2+.
- [ ] **Strict-Transport-Security (HSTS)**: Enabled with `max-age=31536000; includeSubDomains; preload`.
- [ ] **Proxy Headers**: Configure `X-Forwarded-For`, `X-Forwarded-Proto` (https), and `X-Forwarded-Host`. Express `trust proxy` must be set if using rate limiting by IP behind proxies.
- [ ] **Secure Cookies**: Ensure client sends and server sets `Secure: true` on all authentication and CSRF cookies.

---

## 3. Database & Row Level Security (RLS)

- [ ] **Phase 6.1 Database Foundation Applied**:
  - `public.users` contains `failed_login_attempts`, `locked_until`, `last_login_at`, `last_password_change_at`.
  - `public.user_sessions` table created with `user_id` foreign key referencing `users(id) ON DELETE CASCADE`.
  - `public.admin_mfa` table created with `user_id` foreign key referencing `users(id) ON DELETE CASCADE`.
  - `public.mfa_recovery_codes` table created with `user_id` foreign key referencing `users(id) ON DELETE CASCADE`.
- [ ] **RLS Enforcement**:
  - RLS enabled on `user_sessions`, `admin_mfa`, `mfa_recovery_codes`, and `admin_audit_logs`.
  - Anonymous (`anon`) and authenticated (`authenticated`) Supabase client roles have NO read/write permissions to internal tables.
  - All operations performed via backend server using the Supabase Service Role key.
- [ ] **Hash & Key Protection**:
  - Raw refresh tokens are NEVER stored in the database; only SHA-256 hashes (`refresh_token_hash`).
  - Raw TOTP secrets are NEVER stored in the database; only AES-256-GCM ciphertexts with IV and auth tag.
  - Recovery codes are NEVER stored in plaintext; only salted bcrypt hashes (`code_hash`).

---

## 4. Authentication, Sessions & Token Lifecycle

- [ ] **Token Expirations**:
  - Passenger Access Token: 1 hour.
  - Assistant Access Token: 1 hour.
  - Admin Access Token: 15 minutes.
  - Passenger Session Absolute Expiration: 30 days.
  - Assistant Session Absolute Expiration: 30 days.
  - Admin Session Absolute Expiration: 7 days.
- [ ] **HttpOnly Refresh Transport**:
  - Refresh tokens transported via `HttpOnly`, `Secure`, `SameSite` cookie (`onecoolie_refresh`).
  - No `refreshToken` persisted in `localStorage` or `sessionStorage`.
  - Access token retained in memory (`AuthContext`) and sent via `Authorization: Bearer <token>`.
- [ ] **Refresh Token Rotation & Reuse Detection**:
  - Every `/api/auth/refresh` rotates the token and marks the previous token in history.
  - Attempting to reuse an already-rotated token immediately revokes the entire `family_id` session family and disconnects associated sockets.
- [ ] **CSRF Protection**:
  - Double-submit CSRF cookie (`onecoolie_csrf`) and `X-CSRF-Token` header enforced for state-changing cookie-authenticated requests.
  - Pure Bearer-token requests (mobile / API clients) cleanly exempt.
- [ ] **Account Lockout**:
  - Admin accounts lock out for 15 minutes after 5 consecutive failed login attempts (HTTP 423).

---

## 5. Security Headers & Content Security Policy (CSP)

- [ ] **Helmet Middleware Enabled**:
  - `Content-Security-Policy`: Restrictive policy (`default-src 'self'`, script and style directives scoped, `img-src 'self' data: blob: https:`, `connect-src 'self' https: wss:`).
  - `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(self)`.

---

## 6. Socket.IO Real-Time Revocation

- [ ] **Handshake Authentication**:
  - Requires valid JWT access token with pinned `HS256`, valid issuer, valid audience, non-expired, and explicit session ID (`sid`).
  - MFA challenge tokens and intermediate tokens rejected.
  - Server-authoritative lookup verifies `user_sessions` status (`is_revoked = false` and not expired).
- [ ] **Real-Time Revocation Synchronization**:
  - On `/api/auth/logout`: Target socket disconnected immediately.
  - On `/api/auth/logout-all`: All user sessions and sockets disconnected.
  - On Password Reset / Role Change: All existing sessions and sockets invalidated.
  - On Refresh Token Reuse Detection: All sockets in the compromised session family severed.

---

## 7. Logging & Error Sanitization

- [ ] **Redaction Utility (`logger.js`) Active**:
  - Scrubbed keys: `password`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `secret`, `mfaSecret`, `recoveryCode`, `otp`, `MFA_ENCRYPTION_KEY`, `credentials`.
- [ ] **Safe Client Responses**:
  - Production mode suppresses stack traces, file paths, database queries, and internal crypto errors.
  - Returns sanitized error messages (`{ success: false, message: "An unexpected error occurred." }`).

---

## 8. Health & Observability Endpoints

- [ ] `GET /health`: Liveness probe for load balancers (process status, uptime, memory, version).
- [ ] `GET /ready`: Readiness probe with dependency timeouts, draining state detection, and short TTL caching.

---

## 9. Pre-Deployment, Post-Deployment & Rollback Checklists (Phase 6.8)

### Pre-Deployment
- [ ] **Environment Validation**: `validateEnvironment()` passes with zero missing production secrets.
- [ ] **Database Migrations**:
  - `phase6_security_monitoring.sql` applied.
  - `phase6_production_reliability.sql` applied (`deployment_verifications`, `recovery_verifications`, `application_operational_events`).
- [ ] **CORS & Cookies**: Explicit origins configured; `Secure: true` and `SameSite` enforced.
- [ ] **Build Verification**: `client && npm run build` completes with 0 errors.
- [ ] **Automated Test Matrix**: All 8 backend verification test suites pass at 100%.

### Post-Deployment
- [ ] `/health` returns status `ok`.
- [ ] `/ready` returns status `healthy` or `degraded` (HTTP 200).
- [ ] Run automated deployment verification:
  ```bash
  POST /api/admin/operations/verify-deployment
  ```
- [ ] Authentication smoke test passes (Login, Session creation, Refresh token rotation).
- [ ] Socket.IO connects with active session and authenticates cleanly.
- [ ] Metrics collection active (`/api/admin/operations/status`).

### Rollback Readiness
- [ ] Previous git commit tag / container release identified.
- [ ] Rollback procedure verified per `server/DISASTER_RECOVERY_RUNBOOK.md`.
- [ ] Database migration compatibility confirmed (no destructive DDL).

---

## 10. Security & Reliability Test Verification Matrix

Before promoting code to production, execute all automated verification suites:

```bash
# 1. Production Reliability & Disaster Recovery Suite (Phase 6.8)
cd server && node test_phase6_production_reliability.js

# 2. Security Monitoring & Incident Response Suite (Phase 6.7)
cd server && node test_phase6_security_monitoring.js

# 3. Production Security & Hardening Suite (Phase 6.6)
cd server && node test_phase6_production_security.js

# 4. Socket.IO Session Revocation Suite (Phase 6.5)
cd server && node test_phase6_socket_sessions.js

# 5. Frontend Integration & Refresh Coordination Suite (Phase 6.4)
cd server && node test_phase6_frontend_integration.js

# 6. Session & Rotation Suite (Phase 6.3)
cd server && node test_phase6_sessions.js

# 7. MFA & Lockout Suite (Phase 6.2)
cd server && node test_phase6_mfa.js

# 8. RBAC & Data Hardening Suite (Phase 5)
cd server && node test_phase5_hardening.js

# 9. Frontend Production Bundle Build
cd client && npm run build
```

All suites must pass with 100% success rates.
