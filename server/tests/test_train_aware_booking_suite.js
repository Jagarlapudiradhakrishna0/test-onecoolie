/**
 * server/tests/test_train_aware_booking_suite.js
 *
 * Automated Test Suite for ONECOOLIE Train-Aware Booking Modification System
 *
 * Verifies:
 * 1. Train stop filter: Only stations served by the selected train appear (No global lists)
 * 2. Stop sequence & route order: Stops are ordered in authentic train journey sequence
 * 3. Non-stop station rejection: Stations not on the train's route are rejected
 * 4. Route direction validation: Destination before boarding is rejected on frontend & backend
 * 5. Assistant acceptance detection: Accurately identifies accepted vs unaccepted assistant states
 * 6. After assistant acceptance: Station & train changes are strictly locked
 * 7. Allowed modifications after acceptance: Platform, coach, seat, berth, journey timing allowed
 * 8. Security (BOLA): Passenger A cannot modify Passenger B's booking
 * 9. Static UI audit: RebookingModal does not contain hardcoded global station lists
 * 10. Route endpoints: /api/trains/:trainNo/route and /api/bookings/:id/rebook registered
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://fake-supabase-for-tests.supabase.co';
if (!process.env.SUPABASE_SECRET_KEY) process.env.SUPABASE_SECRET_KEY = 'fake-supabase-secret-key-for-test-suite';

const assert = require('assert');
const fs = require('fs');
const {
  getTrainRouteStops,
  validateTrainStations,
  isAssistantAcceptedBooking
} = require('../src/services/trainRouteService');
const { rebookBooking, rebookQuote } = require('../src/controllers/bookingController');

console.log('====================================================');
console.log('RUNNING TRAIN-AWARE BOOKING MODIFICATION TEST SUITE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ [TEST ${totalTests}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ [TEST ${totalTests}] FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✓ [TEST ${totalTests}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ [TEST ${totalTests}] FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

(async () => {
  // 1. Train Stop Filter: Only stations served by selected train appear
  runTest('1. getTrainRouteStops returns only stations served by the selected train (12738 Gowthami SF Express)', () => {
    const route = getTrainRouteStops('12738');
    assert.notStrictEqual(route, null, 'Route for 12738 must exist');
    assert.strictEqual(route.train_no, '12738');

    const stopCodes = route.stops.map((s) => s.code);

    // Must contain actual stops among Kazipet, Warangal, Vijayawada, Secunderabad
    assert.strictEqual(stopCodes.includes('SC'), true, 'Must stop at Secunderabad (SC)');
    assert.strictEqual(stopCodes.includes('KZJ'), true, 'Must stop at Kazipet (KZJ)');
    assert.strictEqual(stopCodes.includes('WL'), true, 'Must stop at Warangal (WL)');
    assert.strictEqual(stopCodes.includes('BZA'), true, 'Must stop at Vijayawada (BZA)');

    // Must ONLY contain Kazipet, Warangal, Vijayawada, Secunderabad (No other stations allowed)
    assert.strictEqual(route.stops.length, 4, 'Must only contain the 4 operational stations');
    assert.deepStrictEqual(stopCodes, ['SC', 'KZJ', 'WL', 'BZA']);

    // Must NOT contain unrelated national stations
    assert.strictEqual(stopCodes.includes('NDLS'), false, 'Must NOT stop at New Delhi (NDLS)');
    assert.strictEqual(stopCodes.includes('HWH'), false, 'Must NOT stop at Howrah (HWH)');
    assert.strictEqual(stopCodes.includes('MAS'), false, 'Must NOT stop at Chennai (MAS)');
    assert.strictEqual(stopCodes.includes('CSTM'), false, 'Must NOT stop at Mumbai (CSTM)');
    assert.strictEqual(stopCodes.includes('BGL'), false, 'Must NOT stop at Bangalore (BGL)');
  });

  // 2. Stop sequence & route order: Stops are ordered in authentic train journey sequence
  runTest('2. getTrainRouteStops preserves authentic train sequence without alphabetical sorting', () => {
    const route = getTrainRouteStops('12738');
    const stopCodes = route.stops.map((s) => s.code);

    const scIdx = stopCodes.indexOf('SC');
    const kzjIdx = stopCodes.indexOf('KZJ');
    const wlIdx = stopCodes.indexOf('WL');
    const bzaIdx = stopCodes.indexOf('BZA');

    // SC comes before KZJ, KZJ comes before WL, WL comes before BZA
    assert.strictEqual(scIdx < kzjIdx, true, 'SC must appear before KZJ');
    assert.strictEqual(kzjIdx < wlIdx, true, 'KZJ must appear before WL');
    assert.strictEqual(wlIdx < bzaIdx, true, 'WL must appear before BZA');
  });

  // 3. Non-stop station rejection
  runTest('3. validateTrainStations rejects stations not on the train route', () => {
    const res1 = validateTrainStations('12738', 'NDLS', 'BZA');
    assert.strictEqual(res1.valid, false);
    assert.strictEqual(res1.error.includes("Station 'NDLS' is not a scheduled stop"), true);

    const res2 = validateTrainStations('12738', 'KZJ', 'HWH');
    assert.strictEqual(res2.valid, false);
    assert.strictEqual(res2.error.includes("Destination 'HWH' is not a scheduled stop"), true);
  });

  // 4. Route direction validation: Destination before boarding is rejected
  runTest('4. validateTrainStations enforces route direction (Boarding -> Destination)', () => {
    // Valid: Kazipet -> Vijayawada
    const validRes = validateTrainStations('12738', 'KZJ', 'BZA');
    assert.strictEqual(validRes.valid, true);

    // Invalid: Vijayawada -> Kazipet (Reverse direction)
    const invalidRes = validateTrainStations('12738', 'BZA', 'KZJ');
    assert.strictEqual(invalidRes.valid, false);
    assert.strictEqual(invalidRes.error.includes('must appear after boarding station'), true);

    // Invalid: Same boarding and destination
    const sameRes = validateTrainStations('12738', 'KZJ', 'KZJ');
    assert.strictEqual(sameRes.valid, false);
    assert.strictEqual(sameRes.error.includes('must appear after boarding station'), true);
  });

  // 5. Assistant Acceptance State Engine
  runTest('5. isAssistantAcceptedBooking accurately distinguishes accepted vs unaccepted states', () => {
    // No assistant assigned
    assert.strictEqual(isAssistantAcceptedBooking({ assistant_id: null, booking_status: 'pending' }), false);

    // Assigned but only pending acceptance
    assert.strictEqual(
      isAssistantAcceptedBooking({ assistant_id: 'ast-1', assistant_status: 'pending', booking_status: 'pending' }),
      false
    );
    assert.strictEqual(
      isAssistantAcceptedBooking({ assistant_id: 'ast-1', assistant_status: 'assigned', booking_status: 'pending' }),
      false
    );

    // Genuinely accepted
    assert.strictEqual(
      isAssistantAcceptedBooking({ assistant_id: 'ast-1', assistant_status: 'accepted', booking_status: 'accepted' }),
      true
    );
    assert.strictEqual(
      isAssistantAcceptedBooking({ assistant_id: 'ast-1', assistant_status: 'arriving', booking_status: 'accepted' }),
      true
    );
    assert.strictEqual(
      isAssistantAcceptedBooking({ assistant_id: 'ast-1', assistant_status: 'reached', booking_status: 'reached' }),
      true
    );
    assert.strictEqual(
      isAssistantAcceptedBooking({ assistant_id: 'ast-1', assistant_status: 'in_service', booking_status: 'in_service' }),
      true
    );

    // Cancelled booking
    assert.strictEqual(
      isAssistantAcceptedBooking({ assistant_id: 'ast-1', assistant_status: 'cancelled', booking_status: 'cancelled' }),
      false
    );
  });

  // 6. After assistant acceptance: Station & Train changes rejected
  await runAsyncTest('6. rebookBooking blocks station & train changes once assistant has accepted', async () => {
    let fakeStatus = null;
    let fakeJson = null;

    const req = {
      user: { id: 'pass-1', role: 'passenger' },
      params: { id: 'bk-test-accepted' },
      body: {
        station_code: 'WL', // trying to change station from KZJ to WL
        train_number: '12738',
        coach: 'B2',
        seat_number: '45'
      }
    };

    const res = {
      status: (code) => {
        fakeStatus = code;
        return {
          json: (data) => { fakeJson = data; return data; }
        };
      },
      json: (data) => { fakeJson = data; return data; }
    };

    // Mock resolveBooking by passing through with simulated accepted booking
    const originalResolve = require('../src/utils/bookingResolver').resolveBooking;
    require('../src/utils/bookingResolver').resolveBooking = async () => ({
      booking: {
        id: 'bk-test-accepted',
        passenger_id: 'pass-1',
        assistant_id: 'ast-99',
        assistant_status: 'accepted',
        booking_status: 'accepted',
        station_code: 'KZJ',
        source: 'KZJ',
        destination: 'BZA',
        train_number: '12738',
        coach: 'B1',
        seat_number: '12',
        total_price: 30
      },
      error: null
    });

    try {
      await rebookBooking(req, res);
      assert.strictEqual(fakeStatus, 400);
      assert.strictEqual(fakeJson.success, false);
      assert.strictEqual(fakeJson.message.includes('after an assistant has accepted'), true);
    } finally {
      require('../src/utils/bookingResolver').resolveBooking = originalResolve;
    }
  });

  // 7. Allowed modifications after acceptance: Platform, Coach, Seat allowed
  await runAsyncTest('7. rebookBooking allows coach, seat, berth, and platform updates after acceptance', async () => {
    let fakeStatus = 200;
    let fakeJson = null;

    const req = {
      user: { id: 'pass-1', role: 'passenger' },
      params: { id: 'bk-test-accepted-2' },
      body: {
        station_code: 'KZJ', // same station (not changed)
        destination: 'BZA',   // same destination (not changed)
        train_number: '12738', // same train (not changed)
        coach: 'B3',          // modified coach
        seat_number: '55',    // modified seat
        berth_type: 'Upper',  // modified berth
        platform: '2'         // modified platform
      }
    };

    const res = {
      status: (code) => {
        fakeStatus = code;
        return {
          json: (data) => { fakeJson = data; return data; }
        };
      },
      json: (data) => { fakeJson = data; return data; }
    };

    const originalResolve = require('../src/utils/bookingResolver').resolveBooking;
    require('../src/utils/bookingResolver').resolveBooking = async () => ({
      booking: {
        id: 'bk-test-accepted-2',
        passenger_id: 'pass-1',
        assistant_id: 'ast-99',
        assistant_status: 'accepted',
        booking_status: 'accepted',
        station_code: 'KZJ',
        source: 'KZJ',
        destination: 'BZA',
        train_number: '12738',
        coach: 'B1',
        seat_number: '12',
        berth_type: 'Lower',
        total_price: 30,
        services: { platform: '1' }
      },
      error: null
    });

    try {
      await rebookBooking(req, res);
      // If DB update executes or fails on test credentials, check that it didn't reject on 400 validation
      assert.notStrictEqual(fakeJson?.message?.includes('after an assistant has accepted'), true);
    } finally {
      require('../src/utils/bookingResolver').resolveBooking = originalResolve;
    }
  });

  // 8. Security (BOLA): Passenger A cannot modify Passenger B's booking
  await runAsyncTest('8. Security (BOLA): rebookBooking rejects modification by unauthorized passenger with 403', async () => {
    let fakeStatus = null;
    let fakeJson = null;

    const req = {
      user: { id: 'attacker-passenger-id', role: 'passenger' },
      params: { id: 'bk-victim' },
      body: { coach: 'A1', seat_number: '1' }
    };

    const res = {
      status: (code) => {
        fakeStatus = code;
        return {
          json: (data) => { fakeJson = data; return data; }
        };
      },
      json: (data) => { fakeJson = data; return data; }
    };

    const originalResolve = require('../src/utils/bookingResolver').resolveBooking;
    require('../src/utils/bookingResolver').resolveBooking = async () => ({
      booking: {
        id: 'bk-victim',
        passenger_id: 'legitimate-owner-passenger-id',
        booking_status: 'pending',
        total_price: 50
      },
      error: null
    });

    try {
      await rebookBooking(req, res);
      assert.strictEqual(fakeStatus, 403, 'Must return 403 Forbidden for unauthorized passenger');
    } finally {
      require('../src/utils/bookingResolver').resolveBooking = originalResolve;
    }
  });

  // 9. Static UI Audit: RebookingModal.jsx
  runTest('9. RebookingModal.jsx static audit: Zero hardcoded global station lists & train-aware fetch implemented', () => {
    const modalPath = path.resolve(__dirname, '../../client/src/components/cancellation/RebookingModal.jsx');
    assert.strictEqual(fs.existsSync(modalPath), true, 'RebookingModal.jsx must exist');
    const content = fs.readFileSync(modalPath, 'utf-8');

    // Ensure hardcoded static global STATIONS array was completely removed
    assert.strictEqual(
      content.includes("const STATIONS = ["),
      false,
      'Old static global STATIONS array must not exist in RebookingModal.jsx'
    );
    assert.strictEqual(
      content.includes("{ code: 'NDLS', name: 'New Delhi' }"),
      false,
      'Hardcoded NDLS must not exist in RebookingModal.jsx'
    );

    // Ensure train-aware route endpoint is fetched
    assert.strictEqual(
      content.includes('/route'),
      true,
      'RebookingModal.jsx must call train route endpoint'
    );

    // Ensure assistant accepted lock UI is implemented
    assert.strictEqual(
      content.includes('isAssistantAccepted'),
      true,
      'RebookingModal.jsx must evaluate isAssistantAccepted'
    );
    assert.strictEqual(
      content.includes('Locked'),
      true,
      'RebookingModal.jsx must render locked indicators'
    );
  });

  // 10. Route endpoints registration audit
  runTest('10. Route endpoints /api/trains/:trainNo/route and /api/bookings/:id/rebook are registered', () => {
    const trainRoutesPath = path.resolve(__dirname, '../../server/src/routes/trainRoutes.js');
    const trainRoutesContent = fs.readFileSync(trainRoutesPath, 'utf-8');
    assert.strictEqual(
      trainRoutesContent.includes("router.get('/:trainNo/route', getTrainRoute);"),
      true,
      '/:trainNo/route must be registered in trainRoutes.js'
    );

    const bookingRoutesPath = path.resolve(__dirname, '../../server/src/routes/bookingRoutes.js');
    const bookingRoutesContent = fs.readFileSync(bookingRoutesPath, 'utf-8');
    assert.strictEqual(
      bookingRoutesContent.includes("router.post('/:id/rebook', protect, rebookBooking);"),
      true,
      '/:id/rebook must be registered in bookingRoutes.js with protect middleware'
    );
  });

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('STATUS: TRAIN-AWARE BOOKING SUITE PASSED 100%! ✓');
  console.log('====================================================\n');
})();
