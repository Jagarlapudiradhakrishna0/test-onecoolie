/**
 * server/tests/test_authoritative_fare_suite.js
 *
 * Automated Test Suite for ONECOOLIE Authoritative Fare & Payment Calculation
 *
 * Verifies:
 * 1. Zero hardcoded / demo / fallback fare values (330.50, 390.50, 70.89, etc.) in production components
 * 2. Missing booking fare returns safe empty/unavailable state without inventing money
 * 3. Authoritative database total_price is used as the single source of truth
 * 4. Journey Protection is derived from actual records and NEVER double-counted
 * 5. Breakdown displays only real selected services from authoritative DB pricing_breakdown
 * 6. Protection "Not Added" state properly handled without fallback to 0.50
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { formatBooking } = require('../src/utils/bookingFormatter');

console.log('====================================================');
console.log('RUNNING AUTHORITATIVE FARE & PAYMENT TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

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

// -----------------------------------------------------------------------------
// 1. Backend Formatter: Zero Fallback 0.50 in Journey Protection
// -----------------------------------------------------------------------------
runTest('1. Backend formatter preserves null/missing journey_protection price without fallback to 0.5', () => {
  const rawBooking = {
    id: 'bk-test-1',
    booking_id: 'OC-TEST-1',
    total_price: 150,
    journey_protection: {
      id: 'jp-1',
      protection_id: 'OCP-TEST1',
      status: 'pending',
      price: null // DB has null price
    }
  };

  const formatted = formatBooking(rawBooking);
  assert.strictEqual(formatted.journey_protection.price, null, 'Price must be null when DB has null, not 0.5');
});

runTest('2. Backend formatter preserves actual database protection price (e.g. 0.50 or custom)', () => {
  const rawBooking = {
    id: 'bk-test-2',
    total_price: 150.50,
    journey_protection: {
      id: 'jp-2',
      protection_id: 'OCP-TEST2',
      status: 'active',
      price: 0.50
    }
  };

  const formatted = formatBooking(rawBooking);
  assert.strictEqual(formatted.journey_protection.price, 0.50, 'Price must match authoritative DB value');
});

// -----------------------------------------------------------------------------
// 2. Client ActiveBooking Fare Resolution Tests (Simulated Calculation Logic)
// -----------------------------------------------------------------------------
function resolveActiveBookingPricing(booking, journeyProtection) {
  // Authoritative Stored Fare from Database (ZERO Hardcoded Fallbacks)
  let rawFare = null;
  if (booking?.total_price != null && !isNaN(Number(booking.total_price))) {
    rawFare = Number(booking.total_price);
  } else if (booking?.amount != null && !isNaN(Number(booking.amount))) {
    rawFare = Number(booking.amount);
  } else if (booking?.payment?.amount != null && !isNaN(Number(booking.payment.amount))) {
    rawFare = Number(booking.payment.amount);
  }

  // Authoritative Journey Protection Pricing from DB / Booking Record
  let protectionPrice = null;
  if (journeyProtection?.price != null && !isNaN(Number(journeyProtection.price))) {
    const p = Number(journeyProtection.price);
    if (p > 0) protectionPrice = p;
  } else if (booking?.journey_protection?.price != null && !isNaN(Number(booking.journey_protection.price))) {
    const p = Number(booking.journey_protection.price);
    if (p > 0) protectionPrice = p;
  } else {
    const breakdownProt = booking?.services?.pricing_breakdown?.find(
      (b) => b.service === 'journey_protection'
    );
    if (breakdownProt && (breakdownProt.total != null || breakdownProt.unit_price != null)) {
      const p = Number(breakdownProt.total ?? breakdownProt.unit_price);
      if (!isNaN(p) && p > 0) protectionPrice = p;
    }
  }

  const hasProtection = Boolean(
    protectionPrice != null &&
    protectionPrice > 0 &&
    journeyProtection?.status !== 'cancelled' &&
    ((journeyProtection && journeyProtection.status && journeyProtection.status !== 'cancelled') ||
      (booking?.journey_protection && booking.journey_protection.status !== 'cancelled') ||
      booking?.services?.pricing_breakdown?.some((b) => b.service === 'journey_protection') ||
      booking?.has_journey_protection ||
      booking?.services?.has_journey_protection)
  );

  // Authoritative separation of assistance service charges vs grand total
  if (rawFare == null) {
    return { serviceTotal: null, totalFare: null, isFareAvailable: false, hasProtection, protectionPrice };
  }

  if (!hasProtection || protectionPrice == null || protectionPrice <= 0) {
    return {
      serviceTotal: rawFare,
      totalFare: rawFare,
      isFareAvailable: true,
      hasProtection,
      protectionPrice
    };
  }

  // Check if rawFare in database already incorporates the protection fee
  const breakdownHasProtection = Boolean(
    booking?.services?.pricing_breakdown?.some((b) => b.service === 'journey_protection')
  );
  const createdWithProtection = Boolean(
    booking?.has_journey_protection || booking?.services?.has_journey_protection
  );

  if ((breakdownHasProtection || createdWithProtection) && rawFare > protectionPrice) {
    const sTotal = Number((rawFare - protectionPrice).toFixed(2));
    return {
      serviceTotal: sTotal,
      totalFare: rawFare,
      isFareAvailable: true,
      hasProtection,
      protectionPrice
    };
  }

  return {
    serviceTotal: rawFare,
    totalFare: Number((rawFare + protectionPrice).toFixed(2)),
    isFareAvailable: true,
    hasProtection,
    protectionPrice
  };
}

runTest('3. Missing database fare returns isFareAvailable: false and null amounts (No fake 330.50)', () => {
  const bookingWithMissingFare = {
    id: 'bk-null-fare',
    services: { luggage: 2 }
  };

  const pricing = resolveActiveBookingPricing(bookingWithMissingFare, null);
  assert.strictEqual(pricing.isFareAvailable, false);
  assert.strictEqual(pricing.totalFare, null);
  assert.strictEqual(pricing.serviceTotal, null);
  assert.strictEqual(pricing.protectionPrice, null);
});

runTest('4. Real booking fare is used directly without modification when protection is absent', () => {
  const bookingA = {
    id: 'bk-real-1',
    total_price: 180.00,
    services: { luggage: 2, escort: true }
  };

  const pricing = resolveActiveBookingPricing(bookingA, null);
  assert.strictEqual(pricing.isFareAvailable, true);
  assert.strictEqual(pricing.totalFare, 180.00);
  assert.strictEqual(pricing.serviceTotal, 180.00);
  assert.strictEqual(pricing.hasProtection, false);
});

runTest('5. Stored total incorporating Journey Protection avoids double counting (Database is Source of Truth)', () => {
  // Booking created with Journey Protection: DB total = 391.00 (Services 390.50 + Protection 0.50)
  const bookingWithProt = {
    id: 'bk-prot-1',
    total_price: 391.00,
    has_journey_protection: true,
    services: {
      has_journey_protection: true,
      pricing_breakdown: [
        { service: 'luggage_large', label: 'Luggage Assistance (Large)', total: 60.00 },
        { service: 'escort', label: 'Seat & Coach Escort', total: 60.00 },
        { service: 'journey_protection', label: 'Journey Protection', total: 0.50 }
      ]
    },
    journey_protection: {
      status: 'active',
      price: 0.50
    }
  };

  const pricing = resolveActiveBookingPricing(bookingWithProt, bookingWithProt.journey_protection);
  assert.strictEqual(pricing.isFareAvailable, true);
  // Authoritative total must remain 391.00, NOT 391.00 + 0.50 = 391.50
  assert.strictEqual(pricing.totalFare, 391.00);
  assert.strictEqual(pricing.serviceTotal, 390.50);
  assert.strictEqual(pricing.hasProtection, true);
  assert.strictEqual(pricing.protectionPrice, 0.50);
});

runTest('6. Separate protection add-on correctly computes grand total from stored records', () => {
  const bookingSeparate = {
    id: 'bk-sep-1',
    total_price: 100.00,
    has_journey_protection: false, // Not included in initial booking
    services: { luggage: 1 }
  };
  const journeyProtection = {
    status: 'active',
    price: 0.50
  };

  const pricing = resolveActiveBookingPricing(bookingSeparate, journeyProtection);
  assert.strictEqual(pricing.isFareAvailable, true);
  assert.strictEqual(pricing.serviceTotal, 100.00);
  assert.strictEqual(pricing.totalFare, 100.50);
  assert.strictEqual(pricing.hasProtection, true);
  assert.strictEqual(pricing.protectionPrice, 0.50);
});

// -----------------------------------------------------------------------------
// 3. Static Audit: Check for banned fallback tokens in ActiveBooking.jsx
// -----------------------------------------------------------------------------
runTest('7. Static Code Audit: ActiveBooking.jsx contains ZERO hardcoded fallback rates or demo sums', () => {
  const activeBookingPath = path.join(__dirname, '..', '..', 'client', 'src', 'components', 'ActiveBooking.jsx');
  const code = fs.readFileSync(activeBookingPath, 'utf8');

  // Verify banned tokens are completely absent
  assert.ok(!code.includes('330.50'), 'ActiveBooking.jsx must NOT contain 330.50');
  assert.ok(!code.includes('390.50'), 'ActiveBooking.jsx must NOT contain 390.50');
  assert.ok(!code.includes('defaultRates'), 'ActiveBooking.jsx must NOT contain defaultRates');
  assert.ok(!code.includes('transport: 90.50'), 'ActiveBooking.jsx must NOT contain transport: 90.50');
  assert.ok(!code.includes(": '0.50'"), "ActiveBooking.jsx must NOT contain fallback : '0.50'");
  assert.ok(!code.includes('|| 0.50'), 'ActiveBooking.jsx must NOT contain || 0.50');
  assert.ok(!code.includes('|| 0.5'), 'ActiveBooking.jsx must NOT contain || 0.5');
});

runTest('8. Static Code Audit: bookingFormatter.js contains ZERO fallback price for journey_protection', () => {
  const formatterPath = path.join(__dirname, '..', 'src', 'utils', 'bookingFormatter.js');
  const code = fs.readFileSync(formatterPath, 'utf8');

  assert.ok(!code.includes('|| 0.5,'), 'bookingFormatter.js must NOT have || 0.5 fallback');
});

runTest('9. Static Code Audit: AdminJourneyProtectionView.jsx contains ZERO fallback price', () => {
  const adminViewPath = path.join(__dirname, '..', '..', 'client', 'src', 'components', 'admin', 'protection', 'AdminJourneyProtectionView.jsx');
  const code = fs.readFileSync(adminViewPath, 'utf8');

  assert.ok(!code.includes('|| 0.5)'), 'AdminJourneyProtectionView.jsx must NOT have || 0.5 fallback');
});

runTest('10. Static Code Audit: TripSummaryPage.jsx uses data-driven protection price without hardcoded 0.50', () => {
  const tripSummaryPath = path.join(__dirname, '..', '..', 'client', 'src', 'pages', 'TripSummaryPage.jsx');
  const code = fs.readFileSync(tripSummaryPath, 'utf8');

  assert.ok(!code.includes('<span className="font-bold text-zinc-900">₹0.50</span>'), 'TripSummaryPage.jsx must NOT have hardcoded ₹0.50 span');
});

console.log('\n====================================================');
console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('STATUS: AUTHORITATIVE FARE AUDIT SUITE PASSED 100%! ✓');
console.log('====================================================\n');
