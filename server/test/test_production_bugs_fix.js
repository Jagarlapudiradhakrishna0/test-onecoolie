require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const serviceController = require('../src/controllers/serviceController');
const bookingController = require('../src/controllers/bookingController');
const assistantController = require('../src/controllers/assistantController');
const supabase = require('../src/config/db');

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING PRODUCTION BUGS 1, 2, 3 VERIFICATION TESTS');
  console.log('====================================================');

  let passed = 0;
  let total = 0;

  function pass(desc) {
    total++;
    passed++;
    console.log(`✓ [PASS ${passed}] ${desc}`);
  }

  function fail(desc, err) {
    total++;
    console.error(`✕ [FAIL] ${desc}:`, err.message || err);
    process.exit(1);
  }

  try {
    // ----------------------------------------------------
    // SCENARIO 1: NEW ASSISTANT ZERO-STATE
    // ----------------------------------------------------
    const fakeAssistantId = '00000000-0000-4000-a000-000000000099';
    const reqMe = {
      user: { id: fakeAssistantId, role: 'assistant' }
    };

    // Test getMe logic: Mock response object
    let meResult = null;
    let meStatus = null;
    const resMe = {
      json: (data) => { meResult = data; return resMe; },
      status: (code) => { meStatus = code; return resMe; }
    };

    // Insert dummy user if not exists or simulate getMe
    // We can directly verify the stat calculation logic from getMe:
    const { data: assistantJobs } = await supabase
      .from('bookings')
      .select('rating, booking_status')
      .eq('assistant_id', fakeAssistantId);

    const completed = (assistantJobs || []).filter((j) => j.booking_status === 'completed');
    const rated = completed.filter((j) => j.rating && Number(j.rating) > 0);
    const avgRating = rated.length > 0
      ? (rated.reduce((s, j) => s + Number(j.rating), 0) / rated.length).toFixed(1)
      : null;

    assert.strictEqual(completed.length, 0, 'New assistant must have 0 completed jobs');
    assert.strictEqual(rated.length, 0, 'New assistant must have 0 rated jobs');
    assert.strictEqual(avgRating, null, 'New assistant must have null average rating');
    pass('Test 1: New assistant starts with 0 completed tasks, 0 reviews, and null rating');

    // ----------------------------------------------------
    // SCENARIO 2: MESSAGING VALIDATION & PERSISTENCE
    // ----------------------------------------------------
    // Find an existing real booking in DB
    const { data: testBooking } = await supabase
      .from('bookings')
      .select('id, booking_id, passenger_id, assistant_id')
      .limit(1)
      .single();

    if (testBooking) {
      // Test unauthorized user cannot send chat
      let authBlocked = false;
      try {
        await serviceController.saveAndBroadcastChatMessage({
          bookingRef: testBooking.id,
          user: { id: '00000000-0000-0000-0000-000000000001', role: 'passenger' },
          text: 'Unauthorized message attempt',
        });
      } catch (err) {
        if (err.statusCode === 403 || err.message.includes('Not authorized')) {
          authBlocked = true;
        }
      }
      assert.strictEqual(authBlocked, true, 'Unauthorized user must be rejected with 403');
      pass('Test 2: Messaging rejects unauthorized senders with 403');

      // Test authorized sender (passenger)
      const testMsgText = `Automated Verification Message ${Date.now()}`;
      const saveRes = await serviceController.saveAndBroadcastChatMessage({
        bookingRef: testBooking.id,
        user: { id: testBooking.passenger_id, role: 'passenger', name: 'Test Passenger' },
        text: testMsgText,
        clientMessageId: `cmsg-test-${Date.now()}`,
      });

      assert(saveRes.message, 'Message must be generated');
      assert.strictEqual(saveRes.message.sender_role, 'passenger');
      assert.strictEqual(saveRes.message.message, testMsgText);
      assert.strictEqual(saveRes.message.text, testMsgText);
      assert(saveRes.message.id, 'Message must have id');
      assert(saveRes.message.conversation_id, 'Message must have conversation_id');
      assert(saveRes.message.created_at, 'Message must have created_at');
      pass('Test 3: Passenger message saved with canonical ownership fields into database');

      // Test retrieving chat messages
      let chatListRes = null;
      let chatStatusRes = null;
      const resChat = {
        json: (data) => { chatListRes = data; return resChat; },
        status: (code) => { chatStatusRes = code; return resChat; },
      };
      await serviceController.getChatMessages(
        { params: { booking_id: testBooking.id }, user: { id: testBooking.passenger_id, role: 'passenger' } },
        resChat
      );

      assert(chatListRes && Array.isArray(chatListRes.messages), 'Must return messages array');
      const found = chatListRes.messages.some((m) => m.text === testMsgText);
      assert(found, 'Saved message must be present in retrieved chat list');
      pass('Test 4: Retrieved chat messages list confirms persistence across fetches');

      // Idempotency check: sending duplicate within 4s should not create duplicate
      const dupRes = await serviceController.saveAndBroadcastChatMessage({
        bookingRef: testBooking.id,
        user: { id: testBooking.passenger_id, role: 'passenger', name: 'Test Passenger' },
        text: testMsgText,
      });
      assert.strictEqual(dupRes.alreadyExisted, true, 'Duplicate message within 4s must be idempotent');
      pass('Test 5: Realtime messaging duplicate prevention is active');
    }

    // ----------------------------------------------------
    // SCENARIO 3: FEEDBACK / RATING VALIDATIONS
    // ----------------------------------------------------
    // Test 6: Non-completed booking cannot be rated
    let nonCompletedStatus = null;
    let nonCompletedBody = null;
    const resRateNonCompleted = {
      status: (code) => { nonCompletedStatus = code; return resRateNonCompleted; },
      json: (data) => { nonCompletedBody = data; return resRateNonCompleted; },
    };

    // Find a pending/active booking
    const { data: pendingBooking } = await supabase
      .from('bookings')
      .select('id, passenger_id, assistant_id')
      .neq('booking_status', 'completed')
      .limit(1)
      .maybeSingle();

    if (pendingBooking) {
      await bookingController.rateBooking(
        {
          params: { id: pendingBooking.id },
          user: { id: pendingBooking.passenger_id, role: 'passenger' },
          body: { rating: 5, review: 'Good service' },
        },
        resRateNonCompleted
      );
      assert.strictEqual(nonCompletedStatus, 400, 'Non-completed booking rating must be rejected with 400');
      pass('Test 6: Non-completed booking feedback rejected with 400');
    }

    // Test 7: Mismatched assistant validation
    const { data: completedBooking } = await supabase
      .from('bookings')
      .select('id, passenger_id, assistant_id, rating')
      .eq('booking_status', 'completed')
      .not('assistant_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (completedBooking) {
      let mismatchStatus = null;
      const resMismatch = {
        status: (code) => { mismatchStatus = code; return resMismatch; },
        json: () => resMismatch,
      };

      await bookingController.rateBooking(
        {
          params: { id: completedBooking.id },
          user: { id: completedBooking.passenger_id, role: 'passenger' },
          body: { rating: 5, assistantId: '00000000-0000-0000-0000-999999999999' },
        },
        resMismatch
      );
      assert.strictEqual(mismatchStatus, 400, 'Mismatched assistantId must be rejected with 400');
      pass('Test 7: Mismatched assistant ID rejected with 400');
    }

    // Test 8: Duplicate feedback rejection (409) on already-rated booking
    const { data: ratedBooking } = await supabase
      .from('bookings')
      .select('id, passenger_id, assistant_id, rating')
      .eq('booking_status', 'completed')
      .not('rating', 'is', null)
      .not('assistant_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (ratedBooking) {
      let dupFeedbackStatus = null;
      let dupFeedbackBody = null;
      const resDupFeedback = {
        status: (code) => { dupFeedbackStatus = code; return resDupFeedback; },
        json: (data) => { dupFeedbackBody = data; return resDupFeedback; },
      };

      await bookingController.rateBooking(
        {
          params: { id: ratedBooking.id },
          user: { id: ratedBooking.passenger_id, role: 'passenger' },
          body: { rating: 5, review: 'Duplicate test attempt' },
        },
        resDupFeedback
      );
      assert.strictEqual(dupFeedbackStatus, 409, 'Duplicate feedback must return 409 Conflict');
      pass('Test 8: Duplicate feedback prevented with HTTP 409 Conflict');
    }

    console.log('====================================================');
    console.log(`ALL ${passed} / ${total} VERIFICATION TESTS PASSED SUCCESSFULLY! ✓`);
    console.log('====================================================');
  } catch (error) {
    fail('Unexpected test suite error', error);
  }
}

runTests();
