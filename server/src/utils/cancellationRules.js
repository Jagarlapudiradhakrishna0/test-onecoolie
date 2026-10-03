/**
 * server/src/utils/cancellationRules.js
 *
 * Centralized Cancellation & Refund Rules Engine for ONECOOLIE
 *
 * Implements real-world production cancellation and refund policies:
 *
 * CASE 1 — ASSISTANT NOT YET ASSIGNED:
 * - 100% refund under configured unassigned cancellation policy.
 * - ₹0 cancellation charge.
 * - Reason required with selectable categories.
 *
 * CASE 2 — ASSISTANT ALREADY ASSIGNED:
 * - Option to Change Booking (rebook) or Cancel.
 * - Genuine/Eligible travel disruption reasons: 100% refund (configurable).
 * - Voluntary cancellation ("I simply want to cancel"): 70% refund, 30% cancellation charge.
 *
 * PAYMENT METHODS:
 * - COD: 0 gateway refund call. Recorded in payment & booking ledger.
 * - Online (Razorpay/Cashfree): Gateway refund executed for calculated refund amount.
 * - Service in_service / completed: Cancellation strictly disallowed.
 */

const { isCashPayment, isOnlinePayment } = require('./paymentClassification');

// Configurable Policy Percentages (Source of truth)
const UNASSIGNED_REFUND_PERCENTAGE = 100;
const ASSIGNED_ASSISTANT_VALID_REASON_REFUND_PERCENTAGE = 100;
const ASSIGNED_ASSISTANT_VOLUNTARY_REFUND_PERCENTAGE = 70;
const VOLUNTARY_CANCELLATION_CHARGE_PERCENTAGE = 30;

const CANCELLATION_POLICY_CONFIG = {
  UNASSIGNED_REFUND_PERCENTAGE,
  ASSIGNED_ASSISTANT_VALID_REASON_REFUND_PERCENTAGE,
  ASSIGNED_ASSISTANT_VOLUNTARY_REFUND_PERCENTAGE,
  VOLUNTARY_CANCELLATION_CHARGE_PERCENTAGE
};

// Legacy aliases for backward compatibility with previous services
const PASSENGER_CANCEL_BEFORE_ACCEPT_REFUND_PERCENT = UNASSIGNED_REFUND_PERCENTAGE;
const PASSENGER_CANCEL_AFTER_ACCEPT_REFUND_PERCENT = ASSIGNED_ASSISTANT_VALID_REASON_REFUND_PERCENTAGE;

// ── Selectable Reason Categories ──
const UNASSIGNED_REASONS = [
  { id: 'TRAIN_CANCELLED', label: 'Train cancelled', isEligible: true },
  { id: 'TRAIN_SCHEDULE_CHANGED', label: 'Train schedule changed', isEligible: true },
  { id: 'JOURNEY_DATE_CHANGED', label: 'Journey date changed', isEligible: true },
  { id: 'JOURNEY_TIME_CHANGED', label: 'Journey time changed', isEligible: true },
  { id: 'DESTINATION_CHANGED', label: 'Destination changed', isEligible: true },
  { id: 'DUPLICATE_BOOKING', label: 'Duplicate booking', isEligible: true },
  { id: 'BOOKED_BY_MISTAKE', label: 'Booked by mistake', isEligible: true },
  { id: 'PERSONAL_EMERGENCY', label: 'Personal emergency', isEligible: true },
  { id: 'CHANGE_OF_PLANS', label: 'Change of travel plans', isEligible: true },
  { id: 'OTHER', label: 'Other', isEligible: true, requiresDetails: true },
];

const ASSIGNED_REASONS = [
  { id: 'TRAIN_CANCELLED', label: 'Train cancelled', isEligible: true },
  { id: 'TRAIN_SCHEDULE_CHANGED', label: 'Train schedule changed', isEligible: true },
  { id: 'JOURNEY_DATE_CHANGED', label: 'Journey date changed', isEligible: true },
  { id: 'JOURNEY_TIME_CHANGED', label: 'Journey time changed', isEligible: true },
  { id: 'DESTINATION_CHANGED', label: 'Destination changed', isEligible: true },
  { id: 'PERSONAL_EMERGENCY', label: 'Emergency', isEligible: true },
  { id: 'DUPLICATE_BOOKING', label: 'Duplicate booking', isEligible: true },
  { id: 'BOOKED_BY_MISTAKE', label: 'Booking made by mistake', isEligible: true },
  { id: 'OTHER_GENUINE', label: 'Other genuine travel reason', isEligible: true, requiresDetails: true },
  { id: 'VOLUNTARY_CANCEL', label: 'I simply want to cancel', isEligible: false },
];

/**
 * Validates text explanation for "Other" reasons against gibberish or spam.
 */
function isMeaningfulReason(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (clean.length < 10) return false;

  // Check repeating characters (e.g. "aaaaa", "1111111111")
  if (/^(.)\1+$/.test(clean)) return false;

  // Check repeating 2-char pattern (e.g. "ababababab")
  if (/^(.{2})\1+$/.test(clean)) return false;

  // Check common keyboard mash patterns
  const lower = clean.toLowerCase();
  const mashPatterns = [
    'asdf', 'hjkl', 'qwerty', 'zxcv', '12345', 'test test', 'none', 'nothing', 'blah'
  ];
  if (mashPatterns.some(p => lower === p || lower.replace(/[^a-z0-9]/g, '') === p)) {
    return false;
  }

  // Detect substrings like asdf, qwerty, zxcv, hjkl mash
  if (mashPatterns.some(p => p.length >= 4 && lower.includes(p))) {
    return false;
  }

  // Ensure reasonable character variety
  const uniqueChars = new Set(clean.toLowerCase().replace(/\s+/g, ''));
  if (uniqueChars.size < 4) return false;

  return true;
}

/**
 * Validates incoming cancellation reason payload.
 */
function validateCancellationReason(reasonCategory, reasonDetails, isAssigned) {
  if (!reasonCategory || typeof reasonCategory !== 'string') {
    return {
      isValid: false,
      message: 'Please select a reason for your cancellation.'
    };
  }

  const validIds = isAssigned
    ? ASSIGNED_REASONS.map((r) => r.id)
    : UNASSIGNED_REASONS.map((r) => r.id);

  // Allow either set for robust client backward-compatibility
  const allKnownIds = [...new Set([...UNASSIGNED_REASONS.map(r => r.id), ...ASSIGNED_REASONS.map(r => r.id)])];
  if (!allKnownIds.includes(reasonCategory)) {
    return {
      isValid: false,
      message: 'Invalid cancellation reason category selected.'
    };
  }

  if (reasonCategory === 'OTHER' || reasonCategory === 'OTHER_GENUINE') {
    if (!isMeaningfulReason(reasonDetails)) {
      return {
        isValid: false,
        message: 'Please provide a meaningful explanation for your cancellation reason (at least 10 characters).'
      };
    }
  }

  return { isValid: true };
}

/**
 * Evaluates whether a passenger is permitted to cancel the booking.
 */
function canPassengerCancel(booking, payment) {
  if (!booking) {
    return { allowed: false, reason: 'Booking not found.' };
  }

  const bookingStatus = String(booking.booking_status || '').toLowerCase();
  const paymentStatus = String(payment?.status || booking.payment_status || '').toLowerCase();
  const paymentMethod = booking.payment_method;

  // 1. Check if already cancelled
  if (bookingStatus === 'cancelled') {
    return {
      allowed: false,
      isAlreadyCancelled: true,
      reason: 'Booking is already cancelled.'
    };
  }

  // 2. Completed bookings cannot be cancelled
  if (bookingStatus === 'completed') {
    return {
      allowed: false,
      reason: 'Completed bookings cannot be cancelled.'
    };
  }

  // 3. Cash booking rule: once cash has been collected by assistant, self-cancellation is disallowed
  if (isCashPayment(paymentMethod) && paymentStatus === 'paid') {
    return {
      allowed: false,
      reason: 'Cash payment has already been collected by the assistant. Cancellations are not permitted.'
    };
  }

  // 4. In-service bookings cannot be cancelled
  if (bookingStatus === 'in_service') {
    return {
      allowed: false,
      reason: 'Service is currently in progress. Cancellations are not permitted once assistance has started.'
    };
  }

  // Allowed from: pending, accepted, arriving, assigned, confirmed
  if (['pending', 'accepted', 'arriving', 'assigned', 'confirmed'].includes(bookingStatus)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Booking cannot be cancelled at '${bookingStatus}' stage.`
  };
}

/**
 * Evaluates whether an assistant is permitted to cancel/release an assigned booking.
 */
function canAssistantCancel(booking, assistantUserId) {
  if (!booking) {
    return { allowed: false, reason: 'Job not found.' };
  }

  if (booking.assistant_id !== assistantUserId) {
    return { allowed: false, reason: 'You are not assigned to this job.' };
  }

  const status = String(booking.booking_status || '').toLowerCase();
  if (!['accepted', 'arriving'].includes(status)) {
    return {
      allowed: false,
      reason: 'Job cannot be cancelled at this stage. Service has already started or completed.'
    };
  }

  return { allowed: true };
}

/**
 * Authoritatively calculates refund amounts and charges based on assignment & reasons.
 */
function calculateCancellationRefund(booking, payment, reasonCategory = '', reasonDetails = '') {
  const originalAmount = Number(payment?.amount || booking?.total_price || 0);
  const isAssigned = Boolean(
    booking?.assistant_id &&
    ['accepted', 'arriving'].includes(String(booking?.booking_status || '').toLowerCase())
  );
  const paymentMethod = booking?.payment_method || 'cash';
  const isCash = isCashPayment(paymentMethod);
  const paymentStatus = String(payment?.status || booking?.payment_status || '').toLowerCase();

  let refundPercent = 100;
  let cancellationChargePercent = 0;
  let reasonNote = '';
  let isEligible = true;

  if (!isAssigned) {
    // Case 1: Assistant NOT yet assigned
    refundPercent = UNASSIGNED_REFUND_PERCENTAGE; // 100%
    cancellationChargePercent = 0;
    reasonNote = 'Eligible cancellation before assistant assignment receives a 100% refund according to payment method.';
  } else {
    // Case 2B: Assistant assigned
    const isVoluntary = reasonCategory === 'VOLUNTARY_CANCEL';

    if (isVoluntary) {
      refundPercent = ASSIGNED_ASSISTANT_VOLUNTARY_REFUND_PERCENTAGE; // 70%
      cancellationChargePercent = VOLUNTARY_CANCELLATION_CHARGE_PERCENTAGE; // 30%
      reasonNote = 'Voluntary cancellation after assistant assignment applies a 30% cancellation charge and 70% refund.';
      isEligible = false;
    } else {
      refundPercent = ASSIGNED_ASSISTANT_VALID_REASON_REFUND_PERCENTAGE; // 100%
      cancellationChargePercent = 100 - refundPercent; // 0%
      reasonNote = 'Eligible cancellation with valid travel disruption reason receives a 100% refund.';
      isEligible = true;
    }
  }

  const refundAmount = Math.round((originalAmount * refundPercent) / 100 * 100) / 100;
  const cancellationCharge = Math.round((originalAmount * cancellationChargePercent) / 100 * 100) / 100;

  let requiresGatewayRefund = false;
  if (!isCash && paymentStatus === 'paid' && refundAmount > 0) {
    requiresGatewayRefund = true;
  }

  return {
    isAssigned,
    isEligible,
    originalAmount,
    refundPercent,
    cancellationChargePercent,
    refundAmount,
    cancellationCharge,
    requiresGatewayRefund,
    isCash,
    reasonNote,
    policyNotice: isCash
      ? 'COD Booking: No online gateway deduction. Any cancellation charges are reconciled in your account summary.'
      : 'Online Booking: Refund will be routed via the originating payment gateway (Razorpay/Cashfree).'
  };
}

/**
 * Backward-compatible wrapper for existing controllers.
 */
function determineRefundEligibility(booking, payment, actorRole = 'passenger', reasonCategory = '') {
  const calc = calculateCancellationRefund(booking, payment, reasonCategory);
  return {
    requiresRefund: calc.requiresGatewayRefund,
    refundPercent: calc.refundPercent,
    refundAmount: calc.refundAmount,
    originalAmount: calc.originalAmount,
    cancellationCharge: calc.cancellationCharge,
    reason: calc.reasonNote
  };
}

/**
 * Evaluates whether an already assigned assistant is compatible with modified journey details.
 * If station or journey date changes, existing assignment must be released for reassignment.
 */
function evaluateAssistantAssignmentForRebooking(originalBooking, updatedDetails = {}) {
  if (!originalBooking?.assistant_id) {
    return {
      canKeepAssistant: true,
      requiresReassignment: false,
      reason: 'No assistant currently assigned.'
    };
  }

  const { station_code, journey_date } = updatedDetails;
  const stationChanged = Boolean(station_code && originalBooking.station_code && station_code.trim().toUpperCase() !== originalBooking.station_code.trim().toUpperCase());
  const dateChanged = Boolean(journey_date && originalBooking.journey_date && journey_date.trim() !== originalBooking.journey_date.trim());

  if (stationChanged) {
    return {
      canKeepAssistant: false,
      requiresReassignment: true,
      reason: `Station changed from ${originalBooking.station_code} to ${station_code}. Assistant operates only at original station.`
    };
  }

  if (dateChanged) {
    return {
      canKeepAssistant: false,
      requiresReassignment: true,
      reason: `Date changed from ${originalBooking.journey_date} to ${journey_date}. Reassignment required for revised schedule.`
    };
  }

  return {
    canKeepAssistant: true,
    requiresReassignment: false,
    reason: 'Assistant remains compatible with updated coach/seat details on the same schedule.'
  };
}

module.exports = {
  CANCELLATION_POLICY_CONFIG,
  UNASSIGNED_REFUND_PERCENTAGE,
  ASSIGNED_ASSISTANT_VALID_REASON_REFUND_PERCENTAGE,
  ASSIGNED_ASSISTANT_VOLUNTARY_REFUND_PERCENTAGE,
  VOLUNTARY_CANCELLATION_CHARGE_PERCENTAGE,
  PASSENGER_CANCEL_BEFORE_ACCEPT_REFUND_PERCENT,
  PASSENGER_CANCEL_AFTER_ACCEPT_REFUND_PERCENT,
  UNASSIGNED_REASONS,
  ASSIGNED_REASONS,
  isMeaningfulReason,
  validateCancellationReason,
  canPassengerCancel,
  canAssistantCancel,
  calculateCancellationRefund,
  determineRefundEligibility,
  evaluateAssistantAssignmentForRebooking
};
