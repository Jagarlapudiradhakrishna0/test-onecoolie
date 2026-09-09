# ONECOOLIE Production Disaster Recovery & Operational Runbook

**Document Revision:** Phase 6.8  
**Authoritative Scope:** ONECOOLIE Backend API, Real-Time Socket.IO, Multi-Tenant Session Authority, Supabase Infrastructure  
**RPO Target:** 24 hours (Point-in-Time Recovery enables near-zero RPO)  
**RTO Target:** 4 hours  

---

## 1. Incident Classification Framework

When an operational disruption occurs, classify the incident according to the following severity taxonomy:

| Classification | Definition | Typical Root Causes | Initial Response Priority |
|---|---|---|---|
| **CRITICAL-1: Service Outage** | Complete loss of API availability or failure of `/health` probe. | Node.js crash, unhandled event loop stall, reverse-proxy drop. | P0 (< 15 min response) |
| **CRITICAL-2: Database Outage** | Database connectivity unreachable or PostgREST timeout > 3000ms. | Supabase network partition, connection pool exhaustion, migration lock. | P0 (< 15 min response) |
| **CRITICAL-3: Security Compromise** | Confirmed refresh token reuse, brute-force bypass, credential stuffing. | Stolen tokens, unrotated secrets, unauthorized admin escalation. | P0 (< 15 min response) |
| **HIGH-1: Deployment Failure** | Deployment verification audit fails post-release. `/ready` returns 503. | Missing env variables, schema migration mismatch, CORS misconfiguration. | P1 (< 30 min response) |
| **HIGH-2: Dependency Degraded** | Third-party service failure (SMS gateway, Email provider, Payment webhook). | Razorpay API degradation, Resend/Brevo quota exhaustion. | P1 (< 1 hour response) |
| **MEDIUM: Data Anomaly / Corruption** | Financial ledger invariant discrepancy or unmatched payment webhook. | Async webhook race condition, partial network partition. | P2 (< 4 hours response) |

---

## 2. Emergency Recovery Procedures

### 2.1 Application Deployment Rollback Procedure
If a newly deployed release fails automated deployment verification or introduces high error rates (5xx):

1. **Enter Draining Mode:**
   Trigger `/ready` failure or notify load balancer to cease routing new traffic to unhealthy containers.
2. **Halt Active Traffic:**
   Point reverse-proxy (Nginx / Cloudflare / Vercel) to the previous healthy container pool.
3. **Roll Back Release Tag:**
   Checkout and deploy previous validated git release commit or roll back container image tag:
   ```bash
   git checkout <PREVIOUS_HEALTHY_TAG>
   npm ci --production
   ```
4. **Execute Post-Rollback Readiness:**
   Verify the restored service reports healthy:
   ```bash
   curl -i http://localhost:5000/api/health
   curl -i http://localhost:5000/api/ready
   ```
5. **Verify Core Security Controls:**
   - Execute test smoke suite:
     ```bash
     node test_phase6_production_reliability.js
     ```
   - Confirm authentication, session rotation, and Socket.IO handshake pass.
6. **Resume Traffic:**
   Re-enable routing on load balancer.

---

### 2.2 Database Outage & Point-In-Time Recovery (PITR)
> [!CAUTION]
> Application code NEVER performs automated destructive restores or schema truncations. Database restoration is strictly executed through authoritative Supabase infrastructure procedures.

1. **Triage & Preserve Evidence:**
   - Confirm if failure is connectivity/pool exhaustion vs data corruption.
   - Inspect PostgreSQL connection pool metrics in Supabase dashboard.
   - Do NOT run destructive DDL scripts (`DROP TABLE`, `TRUNCATE`).
2. **Execute Infrastructure Restoration:**
   - Navigate to Supabase Project Settings -> Database -> Backups.
   - Select Point-In-Time Recovery (PITR) timestamp immediately preceding the corruption or outage event.
   - Initiate restore to a dedicated staging environment or primary cluster.
3. **Validate Application Schema Post-Recovery:**
   - Trigger deployment verification to audit critical tables:
     ```bash
     curl -X POST http://localhost:5000/api/admin/operations/verify-deployment \
       -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
     ```
4. **Record Disaster Recovery Drill:**
   - Record the recovery drill in public audit records:
     ```bash
     curl -X POST http://localhost:5000/api/admin/operations/recovery-verifications \
       -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{"verificationType":"database_pitr_verification","status":"verified","backupReference":"pitr_snapshot_restored"}'
     ```

---

### 2.3 Security Compromise & Threat Containment
If a critical security breach is detected (e.g. refresh token reuse storm or compromised admin key):

1. **Automated Containment Verification:**
   - Phase 6.7 centralized response engine immediately revokes affected session families and disconnects active WebSockets.
   - Confirm in Admin Incident Command Center: `/api/admin/security/incidents`.
2. **Administrative Forced Revocation:**
   - For suspected credential compromises, forcibly terminate all active sessions:
     ```bash
     POST /api/admin/users/:userId/revoke-sessions
     ```
3. **Secret & Key Rotation:**
   - If `JWT_SECRET` is suspected of leakage:
     1. Generate fresh 64-character high-entropy secret.
     2. Update `JWT_SECRET` across production environment.
     3. Restart application. (All existing JWTs immediately invalidate, forcing re-authentication).
   - If `MFA_ENCRYPTION_KEY` is rotated:
     1. Re-encrypt stored TOTP secrets using dual-key migration script.
4. **Forensic Audit Inspection:**
   - Review immutable records in `public.admin_audit_logs` and `public.security_events`.

---

## 3. Recovery Targets (RPO & RTO)

- **Recovery Point Objective (RPO):** Maximum allowable data loss measured in time.
  - **Configured Target:** 24 hours (Automated daily snapshots).
  - **Actual with PITR:** < 5 minutes of transaction write data.
- **Recovery Time Objective (RTO):** Maximum allowable downtime to restore full operations.
  - **Configured Target:** 4 hours.
  - **Application Service Rollback:** < 10 minutes.
  - **Database PITR Recovery:** < 45 minutes.

---

## 4. Disaster Recovery Drill Schedule

To ensure operational readiness, perform quarterly disaster recovery drills:
1. **Q1:** Database Point-in-Time Recovery validation on staging environment.
2. **Q2:** Simulated Load Balancer failure & application container draining verification.
3. **Q3:** Security Key Rotation drill (JWT_SECRET & Session Secret rotation).
4. **Q4:** Payment gateway webhook timeout & stuck payment automated recovery drill.

Every drill must be recorded in `public.recovery_verifications` via `POST /api/admin/operations/recovery-verifications`.
