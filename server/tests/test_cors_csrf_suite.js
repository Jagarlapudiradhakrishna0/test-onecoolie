/**
 * server/test_cors_csrf_suite.js
 *
 * ONECOOLIE Automated CORS & CSRF Domain Verification Suite
 * Validates cross-origin access and CSRF protection for production domains:
 * - https://onecoolie.in
 * - https://www.onecoolie.in
 * - https://onecoolie.vercel.app
 * - Strict rejection of malicious / arbitrary origins
 */

const assert = require('assert');
const http = require('http');
const path = require('path');

// Ensure environment is loaded
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://fake-supabase-for-tests.supabase.co';
if (!process.env.SUPABASE_SECRET_KEY) process.env.SUPABASE_SECRET_KEY = 'fake-supabase-secret-key-for-test-suite';
process.env.PAYMENT_MODE = 'production';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_test_dummy_key';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_dummy_secret';

const { getAllowedOrigins, isProduction } = require('../src/config/environment');
const { app } = require('../src/index');

console.log('====================================================');
console.log('RUNNING ONECOOLIE CORS & CSRF DOMAIN VERIFICATION SUITE');
console.log('====================================================\n');

let passedTests = 0;
function pass(num, desc) {
  console.log(`✓ TEST ${num} PASSED: ${desc}`);
  passedTests++;
}

async function request(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runSuite() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    // ----------------------------------------------------
    // TEST 1: Environment allowlist contains all 3 legitimate production origins
    // ----------------------------------------------------
    {
      const allowed = getAllowedOrigins();
      assert(allowed.includes('https://onecoolie.in'), 'Must include https://onecoolie.in');
      assert(allowed.includes('https://www.onecoolie.in'), 'Must include https://www.onecoolie.in');
      assert(allowed.includes('https://onecoolie.vercel.app'), 'Must include https://onecoolie.vercel.app');
      assert(!allowed.includes('*'), 'Production must NEVER include wildcard origin *');
      pass(1, 'Authoritative production allowlist includes onecoolie.in, www.onecoolie.in, onecoolie.vercel.app');
    }

    // ----------------------------------------------------
    // TEST 2: Preflight OPTIONS on /api/auth/csrf-token from https://www.onecoolie.in
    // ----------------------------------------------------
    {
      const res = await request(server, {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/csrf-token',
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://www.onecoolie.in',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, X-Request-ID'
        }
      });

      assert.strictEqual(res.statusCode, 204, 'Preflight must return 204 No Content');
      assert.strictEqual(res.headers['access-control-allow-origin'], 'https://www.onecoolie.in', 'CORS origin must match www.onecoolie.in');
      assert.strictEqual(res.headers['access-control-allow-credentials'], 'true', 'Credentials must be allowed');
      pass(2, 'Preflight OPTIONS /api/auth/csrf-token allowed for https://www.onecoolie.in');
    }

    // ----------------------------------------------------
    // TEST 3: Preflight OPTIONS on /api/auth/login from https://www.onecoolie.in
    // ----------------------------------------------------
    {
      const res = await request(server, {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/login',
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://www.onecoolie.in',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, X-CSRF-Token, X-Request-ID'
        }
      });

      assert.strictEqual(res.statusCode, 204, 'Login preflight must return 204 No Content');
      assert.strictEqual(res.headers['access-control-allow-origin'], 'https://www.onecoolie.in', 'Login CORS origin must match www.onecoolie.in');
      assert.strictEqual(res.headers['access-control-allow-credentials'], 'true', 'Login credentials must be allowed');
      pass(3, 'Preflight OPTIONS /api/auth/login allowed for https://www.onecoolie.in');
    }

    // ----------------------------------------------------
    // TEST 4: GET /api/auth/csrf-token from https://www.onecoolie.in sets cookie and returns token
    // ----------------------------------------------------
    {
      const res = await request(server, {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/csrf-token',
        method: 'GET',
        headers: {
          'Origin': 'https://www.onecoolie.in'
        }
      });

      assert.strictEqual(res.statusCode, 200, 'GET csrf-token must return 200 OK');
      assert.strictEqual(res.headers['access-control-allow-origin'], 'https://www.onecoolie.in', 'Must return Access-Control-Allow-Origin');
      assert.strictEqual(res.headers['access-control-allow-credentials'], 'true', 'Must allow credentials');

      const parsed = JSON.parse(res.body);
      assert.strictEqual(parsed.success, true, 'Response must be success: true');
      assert.strictEqual(typeof parsed.csrfToken, 'string', 'Must provide csrfToken string');
      assert(parsed.csrfToken.length >= 32, 'CSRF token must have high entropy');

      // Check cookie headers
      const setCookie = res.headers['set-cookie'];
      assert(Array.isArray(setCookie) && setCookie.length > 0, 'Must set onecoolie_csrf cookie');
      const csrfCookie = setCookie.find(c => c.startsWith('onecoolie_csrf='));
      assert(csrfCookie, 'Cookie onecoolie_csrf must be present');
      pass(4, 'GET /api/auth/csrf-token issues CSRF cookie & token to https://www.onecoolie.in');
    }

    // ----------------------------------------------------
    // TEST 5: GET /api/auth/csrf-token from https://onecoolie.in (Apex domain)
    // ----------------------------------------------------
    {
      const res = await request(server, {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/csrf-token',
        method: 'GET',
        headers: {
          'Origin': 'https://onecoolie.in'
        }
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['access-control-allow-origin'], 'https://onecoolie.in');
      assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
      pass(5, 'GET /api/auth/csrf-token allowed for apex domain https://onecoolie.in');
    }

    // ----------------------------------------------------
    // TEST 6: GET /api/auth/csrf-token from https://onecoolie.vercel.app (Vercel preview/app domain)
    // ----------------------------------------------------
    {
      const res = await request(server, {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/csrf-token',
        method: 'GET',
        headers: {
          'Origin': 'https://onecoolie.vercel.app'
        }
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['access-control-allow-origin'], 'https://onecoolie.vercel.app');
      assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
      pass(6, 'GET /api/auth/csrf-token allowed for Vercel app domain https://onecoolie.vercel.app');
    }

    // ----------------------------------------------------
    // TEST 7: Arbitrary malicious origin https://evil-attacker.com is strictly rejected
    // ----------------------------------------------------
    {
      const res = await request(server, {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/csrf-token',
        method: 'GET',
        headers: {
          'Origin': 'https://evil-attacker.com'
        }
      });

      assert.strictEqual(res.statusCode, 403, 'Must return 403 Forbidden for unauthorized origin');
      assert.strictEqual(res.headers['access-control-allow-origin'], undefined, 'Must NOT set Access-Control-Allow-Origin header');
      pass(7, 'Arbitrary malicious origin https://evil-attacker.com strictly rejected (403 Forbidden, no CORS header)');
    }

    // ----------------------------------------------------
    // TEST 8: Domain suffix spoofing attempt https://onecoolie.in.evil.com is strictly rejected
    // ----------------------------------------------------
    {
      const res = await request(server, {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/csrf-token',
        method: 'GET',
        headers: {
          'Origin': 'https://onecoolie.in.evil.com'
        }
      });

      assert.strictEqual(res.statusCode, 403, 'Must reject spoofed suffix domain');
      assert.strictEqual(res.headers['access-control-allow-origin'], undefined, 'Must NOT set Access-Control-Allow-Origin header');
      pass(8, 'Suffix spoofing attempt https://onecoolie.in.evil.com strictly rejected (403)');
    }

    // ----------------------------------------------------
    // TEST 9: CSRF Protection validates trusted origin for state-changing endpoints
    // ----------------------------------------------------
    {
      // Attempting refresh with an untrusted origin and cookie must trigger 403
      const res = await request(server, {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/refresh',
        method: 'POST',
        headers: {
          'Origin': 'https://attacker.org',
          'Cookie': 'onecoolie_refresh=test-token; onecoolie_csrf=token123',
          'X-CSRF-Token': 'token123',
          'Content-Type': 'application/json'
        }
      });

      // Will be blocked by CORS first (403) or CSRF origin validation (403)
      assert.strictEqual(res.statusCode, 403, 'Untrusted origin on state-changing endpoint must return 403');
      assert.strictEqual(res.headers['access-control-allow-origin'], undefined, 'No CORS permission granted');
      pass(9, 'CSRF Protection rejects untrusted origin on state-changing endpoint');
    }

    // ----------------------------------------------------
    // TEST 10: CSRF Protection accepts legitimate Referer with path from https://www.onecoolie.in/login
    // ----------------------------------------------------
    {
      const { csrfEndpoint, csrfProtection } = require('../src/middleware/csrfProtection');
      let nextCalled = false;
      const fakeReq = {
        method: 'POST',
        headers: {
          referer: 'https://www.onecoolie.in/login',
          'x-csrf-token': 'match_token'
        },
        cookies: {
          onecoolie_csrf: 'match_token',
          onecoolie_refresh: 'sample_refresh_token'
        },
        ip: '127.0.0.1',
        originalUrl: '/api/auth/refresh'
      };
      const fakeRes = {
        status: (code) => ({ json: (d) => ({ code, d }) })
      };

      csrfProtection(fakeReq, fakeRes, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true, 'CSRF middleware must accept legitimate referer from https://www.onecoolie.in');
      pass(10, 'CSRF Protection accepts Referer header originating from https://www.onecoolie.in');
    }

    console.log('\n====================================================');
    console.log(`ALL ${passedTests} / 10 CORS & CSRF DOMAIN TESTS PASSED!`);
    console.log('CORS & CSRF READINESS: PASS');
    console.log('====================================================\n');

  } finally {
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1000);
  }
}

runSuite().catch((err) => {
  console.error('\n❌ CORS & CSRF SUITE TEST FAILED:', err);
  process.exit(1);
});
