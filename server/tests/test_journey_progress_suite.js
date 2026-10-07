// Test Suite for ONECOOLIE Passenger Portal Journey Progress status & ETA logic

function evaluateJourneyProgress({ booking, now = Date.now() }) {
  const rawStatus = String(booking?.booking_status || booking?.status || 'pending').toLowerCase();
  const rawAssistantStatus = String(booking?.assistant_status || booking?.services?.assistant_status || '').toLowerCase();

  const isCancelled = rawStatus === 'cancelled' || rawStatus === 'canceled' || rawAssistantStatus === 'cancelled';
  const isCompleted = !isCancelled && (rawStatus === 'completed' || rawAssistantStatus === 'completed');
  const isInService = !isCancelled && !isCompleted && (
    rawStatus === 'in_service' ||
    rawStatus === 'in_progress' ||
    rawAssistantStatus === 'in_service'
  );
  const isReached = !isCancelled && !isCompleted && !isInService && (
    rawStatus === 'reached' ||
    rawStatus === 'arrived' ||
    rawAssistantStatus === 'reached' ||
    rawAssistantStatus === 'arrived'
  );
  const isServiceDone = isCompleted;

  // Genuine assistant acceptance from persisted backend/database state
  const isAssistantAccepted = Boolean(
    !isCancelled && (
      ['accepted', 'arriving', 'reached', 'arrived', 'in_service', 'completed'].includes(rawAssistantStatus) ||
      (
        ['accepted', 'arriving', 'reached', 'arrived', 'in_service', 'completed'].includes(rawStatus) &&
        rawAssistantStatus !== 'pending' &&
        rawAssistantStatus !== 'assigned'
      )
    )
  );

  // Active "On the Way" stage: assistant accepted and en route, before reaching the station
  const isAssistantOnTheWay = Boolean(
    !isCancelled &&
    !isCompleted &&
    !isReached &&
    !isInService &&
    isAssistantAccepted &&
    (
      rawAssistantStatus === 'accepted' ||
      rawAssistantStatus === 'arriving' ||
      rawStatus === 'accepted' ||
      rawStatus === 'arriving'
    )
  );

  // Data-driven ETA calculation from persisted assignment and acceptance timestamps
  const etaText = (() => {
    if (!isAssistantOnTheWay) return null;
    if (booking?.eta_unavailable) return null;

    const rawAcceptedAt =
      booking?.accepted_at ||
      booking?.services?.accepted_at ||
      (isAssistantAccepted ? (booking?.updated_at || booking?.created_at) : null);

    if (!rawAcceptedAt) return null;

    const acceptedTime = new Date(rawAcceptedAt).getTime();
    if (isNaN(acceptedTime) || acceptedTime <= 0) return null;

    const totalMinutes = Number(
      booking?.eta_minutes ??
      booking?.services?.eta_minutes ??
      booking?.assistant_eta_minutes ??
      8
    );

    if (isNaN(totalMinutes) || totalMinutes <= 0) return null;

    const totalMs = totalMinutes * 60 * 1000;
    const elapsedMs = Math.max(0, now - acceptedTime);
    const remainingMs = totalMs - elapsedMs;
    const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));

    if (remainingMinutes <= 0) {
      return 'Arriving now';
    }
    if (remainingMinutes === 1) {
      return 'Arriving in 1 minute';
    }
    return `Arriving in ${remainingMinutes} minutes`;
  })();

  const currentActiveStepId = (() => {
    if (isCancelled || isServiceDone) return null;
    if (isInService) return 'in_progress';
    if (isReached) return 'reaches_you';
    if (isAssistantOnTheWay) return 'on_the_way';
    return 'confirmed';
  })();

  const stepIds = ['confirmed', 'on_the_way', 'reaches_you', 'in_progress', 'completed'];
  const activeStepIdx = isServiceDone ? 5 : stepIds.indexOf(currentActiveStepId);

  const progressSteps = [
    {
      id: 'confirmed',
      label: 'Booking Confirmed',
      sub: '07 Oct 2026, 12:36',
      isDone: isServiceDone || activeStepIdx > 0,
      isCurrent: currentActiveStepId === 'confirmed',
    },
    {
      id: 'on_the_way',
      label: isAssistantAccepted ? 'Assistant On the Way' : 'Assistant Needed',
      sub: isAssistantOnTheWay
        ? (etaText || null)
        : (isReached || isInService || isServiceDone ? 'Assigned & en route' : null),
      isDone: isServiceDone || activeStepIdx > 1,
      isCurrent: currentActiveStepId === 'on_the_way',
    },
    {
      id: 'reaches_you',
      label: 'Assistant Reaches You',
      sub: 'At platform',
      isDone: isServiceDone || activeStepIdx > 2,
      isCurrent: currentActiveStepId === 'reaches_you',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      sub: 'During your journey',
      isDone: isServiceDone || activeStepIdx > 3,
      isCurrent: currentActiveStepId === 'in_progress',
    },
    {
      id: 'completed',
      label: 'Completed',
      sub: 'After drop-off',
      isDone: isServiceDone,
      isCurrent: false,
    },
  ];

  return {
    isCancelled,
    isCompleted,
    isAssistantAccepted,
    isAssistantOnTheWay,
    currentActiveStepId,
    etaText,
    progressSteps,
  };
}

// Running the 10 Tests:
console.log('--- STARTING 10 SPECIFICATION TESTS ---');

let passed = 0;
let total = 0;

function assert(condition, testName, details) {
  total++;
  if (condition) {
    console.log(`[PASS] Test ${total}: ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] Test ${total}: ${testName}`, details);
  }
}

// 1. Booking created → no ETA
const t1 = evaluateJourneyProgress({
  booking: {
    booking_status: 'pending',
    assistant_status: 'pending',
    assistant_id: null,
    created_at: new Date().toISOString(),
  }
});
assert(
  t1.currentActiveStepId === 'confirmed' &&
  t1.progressSteps[1].label === 'Assistant Needed' &&
  t1.progressSteps[1].sub === null &&
  t1.etaText === null,
  '1. Booking created → no ETA (Step 2 shows "Assistant Needed", sub is null)'
);

// 2. Assistant assigned but not accepted → no ETA
const t2 = evaluateJourneyProgress({
  booking: {
    booking_status: 'pending',
    assistant_status: 'pending',
    assistant_id: 'ast-101',
    created_at: new Date().toISOString(),
  }
});
assert(
  t2.isAssistantAccepted === false &&
  t2.progressSteps[1].label === 'Assistant Needed' &&
  t2.progressSteps[1].sub === null &&
  t2.etaText === null,
  '2. Assistant not accepted → no ETA'
);

// 3. Assistant accepts → ETA appears
const now3 = Date.now();
const t3 = evaluateJourneyProgress({
  booking: {
    booking_status: 'accepted',
    assistant_status: 'accepted',
    assistant_id: 'ast-101',
    accepted_at: new Date(now3).toISOString(),
    eta_minutes: 8,
  },
  now: now3,
});
assert(
  t3.currentActiveStepId === 'on_the_way' &&
  t3.progressSteps[1].label === 'Assistant On the Way' &&
  t3.progressSteps[1].sub === 'Arriving in 8 minutes' &&
  t3.progressSteps[1].isCurrent === true,
  '3. Assistant accepts → ETA appears ("Arriving in 8 minutes", step active)'
);

// 4. Refresh → ETA/state persists
const acceptedTime4 = Date.now() - (3 * 60 * 1000); // 3 mins ago
const t4 = evaluateJourneyProgress({
  booking: {
    booking_status: 'accepted',
    assistant_status: 'accepted',
    assistant_id: 'ast-101',
    accepted_at: new Date(acceptedTime4).toISOString(),
    eta_minutes: 8,
  },
  now: Date.now(),
});
assert(
  t4.currentActiveStepId === 'on_the_way' &&
  t4.progressSteps[1].sub === 'Arriving in 5 minutes',
  '4. Refresh → ETA/state persists (3 mins elapsed, shows 5 minutes remaining)'
);

// 5. Countdown works correctly (8m -> 7m -> ... -> Arriving now)
const t5_7m = evaluateJourneyProgress({
  booking: {
    booking_status: 'accepted',
    assistant_status: 'accepted',
    accepted_at: new Date(Date.now() - 65 * 1000).toISOString(),
    eta_minutes: 8,
  },
  now: Date.now(),
});
const t5_exp = evaluateJourneyProgress({
  booking: {
    booking_status: 'accepted',
    assistant_status: 'accepted',
    accepted_at: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    eta_minutes: 8,
  },
  now: Date.now(),
});
assert(
  t5_7m.progressSteps[1].sub === 'Arriving in 7 minutes' &&
  t5_exp.progressSteps[1].sub === 'Arriving now',
  '5. Countdown works correctly (counts down, expires gracefully to "Arriving now" without negative values)'
);

// 6. Assistant reaches → countdown stops
const t6 = evaluateJourneyProgress({
  booking: {
    booking_status: 'reached',
    assistant_status: 'reached',
    assistant_id: 'ast-101',
    accepted_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  now: Date.now(),
});
assert(
  t6.isAssistantOnTheWay === false &&
  t6.etaText === null &&
  t6.currentActiveStepId === 'reaches_you' &&
  t6.progressSteps[2].isCurrent === true &&
  t6.progressSteps[1].sub === 'Assigned & en route',
  '6. Assistant reaches → countdown stops (Step 3 active, Step 2 done)'
);

// 7. Completed → no ETA
const t7 = evaluateJourneyProgress({
  booking: {
    booking_status: 'completed',
    assistant_status: 'completed',
    accepted_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  now: Date.now(),
});
assert(
  t7.isCompleted === true &&
  t7.currentActiveStepId === null &&
  t7.etaText === null &&
  t7.progressSteps.every(s => s.isDone === true),
  '7. Completed → no ETA (All steps done, no active pulse, no ETA)'
);

// 8. Cancelled → no ETA
const t8 = evaluateJourneyProgress({
  booking: {
    booking_status: 'cancelled',
    assistant_status: 'cancelled',
    accepted_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  now: Date.now(),
});
assert(
  t8.isCancelled === true &&
  t8.etaText === null &&
  t8.currentActiveStepId === null,
  '8. Cancelled → no ETA (Cancelled banner, no ETA)'
);

// 9. No valid ETA → no ETA text
const t9 = evaluateJourneyProgress({
  booking: {
    booking_status: 'accepted',
    assistant_status: 'accepted',
    eta_unavailable: true,
  },
  now: Date.now(),
});
assert(
  t9.currentActiveStepId === 'on_the_way' &&
  t9.progressSteps[1].label === 'Assistant On the Way' &&
  t9.progressSteps[1].sub === null,
  '9. No valid ETA → no ETA text (Shows "Assistant On the Way" with no ETA subtext)'
);

// 10. Multiple bookings → each booking uses its own assistant/ETA data
const bA = evaluateJourneyProgress({
  booking: {
    id: 'booking-A',
    booking_status: 'pending',
    assistant_status: 'pending',
  }
});
const bB = evaluateJourneyProgress({
  booking: {
    id: 'booking-B',
    booking_status: 'accepted',
    assistant_status: 'accepted',
    accepted_at: new Date().toISOString(),
    eta_minutes: 12,
  }
});
assert(
  bA.progressSteps[1].label === 'Assistant Needed' &&
  bA.progressSteps[1].sub === null &&
  bB.progressSteps[1].label === 'Assistant On the Way' &&
  bB.progressSteps[1].sub === 'Arriving in 12 minutes',
  '10. Multiple bookings → each booking uses its own assistant/ETA data'
);

console.log(`\nRESULTS: ${passed}/${total} TESTS PASSED.`);
if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
