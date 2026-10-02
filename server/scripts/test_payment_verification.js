require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const supabase = require('../src/config/db');
const generateToken = require('../src/utils/generateToken');
const { createOrder, getPaymentStatus, confirmTestPayment } = require('../src/controllers/paymentController');

async function runTests() {
  console.log('--- STARTING PAYMENT FLOW AUTOMATED VERIFICATION ---');

  // 1. Fetch an existing passenger
  const { data: passengers, error: userErr } = await supabase
    .from('users')
    .select('id, name, phone, email, role')
    .eq('role', 'passenger')
    .limit(2);

  if (userErr || !passengers || passengers.length === 0) {
    console.error('Could not fetch test passenger:', userErr);
    process.exit(1);
  }

  const passengerA = passengers[0];
  const passengerB = passengers.length > 1 ? passengers[1] : { id: '00000000-0000-0000-0000-000000000099', name: 'Other User' };
  console.log(`[PASSENGER A] ${passengerA.name} (${passengerA.id})`);
  console.log(`[PASSENGER B] ${passengerB.name} (${passengerB.id})`);

  const mockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
    return res;
  };

  // TEST 1: CREATE ORDER IN TEST MODE
  console.log('\n[TEST 1] Creating online booking & payment order...');
  const req1 = {
    user: passengerA,
    body: {
      amount: 150,
      currency: 'INR',
      payment_method: 'online',
      booking_mode: 'train',
      train_number: '12301',
      train_name: 'Rajdhani Express',
      station_code: 'NDLS',
      journey_date: '2026-10-15',
      journey_time: '18:00',
      coach: 'B2',
      seat_number: '21',
      berth_type: 'Lower',
      action_type: 'load_to_seat',
      pnr: '2345678901',
      services: { luggage: 2, escort: true }
    }
  };
  const res1 = mockRes();
  await createOrder(req1, res1);

  if ((res1.statusCode !== 200 && res1.statusCode !== 201) || !res1.jsonData.success) {
    console.error('TEST 1 FAILED:', res1.statusCode, res1.jsonData);
    process.exit(1);
  }
  const createdBooking = res1.jsonData.booking;
  const isTestMode = res1.jsonData.isTestMode;
  console.log(`TEST 1 PASSED: Order created. Booking ID: ${createdBooking.id} (${createdBooking.booking_id}), isTestMode: ${isTestMode}`);

  // Verify DB state for booking & payment
  const { data: dbBooking } = await supabase.from('bookings').select('*').eq('id', createdBooking.id).single();
  const { data: dbPayment } = await supabase.from('payments').select('*').eq('booking_id', createdBooking.id).single();

  if (dbBooking.payment_status !== 'pending') {
    console.error('TEST 1 DB check failed: payment_status is not pending in bookings table');
    process.exit(1);
  }
  if (!dbPayment || dbPayment.status !== 'pending') {
    console.error('TEST 1 DB check failed: payment ledger record is missing or not pending');
    process.exit(1);
  }
  console.log('TEST 1 DB VERIFICATION PASSED: DB booking is pending, payment ledger record is pending.');

  // TEST 2: CHECK PAYMENT STATUS BEFORE CONFIRMATION
  console.log('\n[TEST 2] Checking payment status (pending)...');
  const req2 = {
    user: passengerA,
    params: { bookingId: createdBooking.id }
  };
  const res2 = mockRes();
  await getPaymentStatus(req2, res2);

  if (res2.statusCode !== 200 || res2.jsonData.status !== 'pending') {
    console.error('TEST 2 FAILED: Expected pending, got:', res2.jsonData);
    process.exit(1);
  }
  console.log(`TEST 2 PASSED: Payment status query correctly returned status='pending'.`);

  // TEST 3: CROSS-PASSENGER VERIFICATION (SECURITY CHECK)
  console.log('\n[TEST 3] Security check: Passenger B attempting to confirm Passenger A booking...');
  const req3 = {
    user: passengerB,
    body: {
      booking_id: createdBooking.id,
      test_transaction_ref: 'TEST-HACK-ATTEMPT'
    }
  };
  const res3 = mockRes();
  await confirmTestPayment(req3, res3);

  if (res3.statusCode !== 403) {
    console.error('TEST 3 FAILED: Cross-passenger access was not blocked! Status:', res3.statusCode);
    process.exit(1);
  }
  console.log(`TEST 3 PASSED: Cross-passenger confirmation blocked with HTTP 403 Forbidden.`);

  // TEST 4: PRODUCTION SAFEGUARD
  console.log('\n[TEST 4] Production safeguard check: Confirming when PAYMENT_MODE=production...');
  const origEnv = process.env.PAYMENT_MODE;
  process.env.PAYMENT_MODE = 'production';

  const req4 = {
    user: passengerA,
    body: {
      booking_id: createdBooking.id,
      test_transaction_ref: 'TEST-PROD-ATTEMPT'
    }
  };
  const res4 = mockRes();
  await confirmTestPayment(req4, res4);

  process.env.PAYMENT_MODE = origEnv; // restore

  if (res4.statusCode !== 403) {
    console.error('TEST 4 FAILED: Production bypass was allowed! Status:', res4.statusCode);
    process.exit(1);
  }
  console.log(`TEST 4 PASSED: Test confirmation strictly blocked when PAYMENT_MODE=production (403 Forbidden).`);

  // TEST 5: CONFIRM TEST PAYMENT (AUTHORIZED PASSENGER IN TEST MODE)
  console.log('\n[TEST 5] Confirming test payment as authorized passenger...');
  const req5 = {
    user: passengerA,
    body: {
      booking_id: createdBooking.id,
      test_transaction_ref: `TEST-${Date.now()}`
    }
  };
  const res5 = mockRes();
  await confirmTestPayment(req5, res5);

  if (res5.statusCode !== 200 || !res5.jsonData.success) {
    console.error('TEST 5 FAILED: Could not confirm test payment:', res5.statusCode, res5.jsonData);
    process.exit(1);
  }
  console.log(`TEST 5 PASSED: Test payment successfully verified and recorded.`);

  // Check DB state after confirmation
  const { data: dbBookingAfter } = await supabase.from('bookings').select('*').eq('id', createdBooking.id).single();
  const { data: dbPaymentAfter } = await supabase.from('payments').select('*').eq('booking_id', createdBooking.id).single();

  if (dbBookingAfter.payment_status !== 'paid') {
    console.error('TEST 5 DB check failed: booking payment_status is not paid');
    process.exit(1);
  }
  if (dbPaymentAfter.status !== 'paid') {
    console.error('TEST 5 DB check failed: payment ledger status is not paid');
    process.exit(1);
  }
  console.log(`TEST 5 DB VERIFICATION PASSED: booking payment_status='${dbBookingAfter.payment_status}', payment ledger status='${dbPaymentAfter.status}'.`);

  // TEST 6: IDEMPOTENCY (DUPLICATE CONFIRMATION)
  console.log('\n[TEST 6] Testing duplicate confirmation callback (Idempotency)...');
  const res6 = mockRes();
  await confirmTestPayment(req5, res6);

  if (res6.statusCode !== 200 || !res6.jsonData.success) {
    console.error('TEST 6 FAILED: Duplicate callback failed:', res6.statusCode, res6.jsonData);
    process.exit(1);
  }
  console.log(`TEST 6 PASSED: Duplicate callback safely handled and returns already-paid status.`);

  // TEST 7: STATUS QUERY AFTER PAYMENT (RELOAD RECOVERY TEST)
  console.log('\n[TEST 7] Querying status after payment (Reload recovery simulation)...');
  const res7 = mockRes();
  await getPaymentStatus(req2, res7);

  if (res7.statusCode !== 200 || res7.jsonData.status !== 'paid' || !res7.jsonData.booking) {
    console.error('TEST 7 FAILED: Reload status did not return paid with booking:', res7.jsonData);
    process.exit(1);
  }
  console.log(`TEST 7 PASSED: Payment status query returns status='paid' and full booking object for reload recovery.`);

  // CLEANUP TEST RECORD
  console.log('\nCleaning up test booking & payment records...');
  await supabase.from('payments').delete().eq('booking_id', createdBooking.id);
  await supabase.from('bookings').delete().eq('id', createdBooking.id);
  console.log('Cleanup completed.');

  console.log('\n=========================================');
  console.log('ALL 7 AUTOMATED VERIFICATION TESTS PASSED');
  console.log('=========================================');
}

runTests().catch((err) => {
  console.error('Unexpected test error:', err);
  process.exit(1);
});
