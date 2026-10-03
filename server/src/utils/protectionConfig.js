/**
 * server/src/utils/protectionConfig.js
 *
 * Server-authoritative Journey Protection Configuration
 * 
 * CRITICAL REQUIREMENTS:
 * - Authoritative customer price: ₹0.50 (50 paise in Razorpay)
 * - Pre-launch status: DEMONSTRATION ONLY
 * - Versioned policy terms: ONECOOLIE-PROTECTION-PRELAUNCH-v1
 * - Server-generated cryptographic ID: OCP-XXXXXXXX
 * - ZERO display or passenger API exposure of any benefit, payout, or coverage amounts.
 */

const crypto = require('crypto');

const PROTECTION_CONFIG = {
  PRODUCT_NAME: 'ONECOOLIE JOURNEY PROTECTION',
  CUSTOMER_FACING_DESCRIPTION: 'Optional protection for your journey.',
  PRICE_INR: 0.50,
  PRICE_PAISE: 50,
  STATUS_PRE_LAUNCH: 'PRE-LAUNCH',
  CURRENT_TERMS_VERSION: 'ONECOOLIE-PROTECTION-PRELAUNCH-v1',
  PRE_LAUNCH_DISCLAIMER: 'This feature is currently a pre-launch product demonstration and does not constitute an insurance policy or guarantee of payment. Actual insurance coverage will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed.',
  STATUSES: {
    PENDING_PAYMENT: 'pending_payment',
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    REFUNDED: 'refunded'
  }
};

/**
 * Generates a unique, non-sequential, cryptographically strong Protection ID.
 * Format: OCP-XXXXXXXX (8 uppercase alphanumeric characters)
 * Example: OCP-7K2N9F4Q
 *
 * @returns {string} Unique Protection ID
 */
function generateProtectionId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars (0, 1, I, O)
  const bytes = crypto.randomBytes(8);
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return `OCP-${id}`;
}

/**
 * Versioned Pre-Launch Policy Document Content (13 Structured Sections)
 * STRICT: ZERO specific benefit/payout amounts. Pre-launch demonstration wording only.
 */
const PRE_LAUNCH_POLICY_TERMS = {
  version: 'ONECOOLIE-PROTECTION-PRELAUNCH-v1',
  effectiveDate: '2026-10-01',
  status: 'PRE-LAUNCH / DEMONSTRATION ONLY',
  price: '₹0.50 / journey',
  title: 'ONECOOLIE JOURNEY PROTECTION — PRE-LAUNCH PRODUCT TERMS (DEMONSTRATION ONLY)',
  disclaimer: 'IMPORTANT — PRE-LAUNCH PRODUCT: ONECOOLIE Journey Protection is currently a product demonstration and proposed service concept. It is not an insurance policy and does not currently provide legally binding insurance coverage or guarantee of payment. Any future insurance product will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed. Final terms may differ from this demonstration.',
  sections: [
    {
      number: 1,
      title: 'About Journey Protection',
      content: 'ONECOOLIE Journey Protection is a proposed optional journey-protection service designed to provide additional assistance and support to passengers during eligible rail journeys booked through the ONECOOLIE platform. This feature is currently a PRE-LAUNCH PRODUCT DEMONSTRATION and does NOT constitute an insurance policy, certificate of insurance, or guarantee of financial payout.'
    },
    {
      number: 2,
      title: 'Eligibility',
      content: 'To be eligible for proposed Journey Protection, the passenger must hold an active and valid ONECOOLIE station assistance booking for an eligible train journey, explicitly opt in to Journey Protection during or for that booking, and successfully complete the server-verified payment of ₹0.50. Protection is non-transferable and remains strictly tied to the designated booking and authenticated passenger.'
    },
    {
      number: 3,
      title: 'Protection Activation',
      content: 'Protection becomes ACTIVE only upon: (1) explicit passenger opt-in and versioned terms acceptance, (2) successful completion of the ₹0.50 transaction via the authorized gateway, (3) server-authoritative cryptographic signature and amount verification, (4) authenticated booking ownership validation, and (5) successful server-side issuance of a unique Protection ID (OCP-XXXXXXXX). Frontend confirmation alone never activates protection.'
    },
    {
      number: 4,
      title: 'Protection Period',
      content: 'Journey Protection is intended to apply strictly during the eligible scheduled rail journey associated with the protected ONECOOLIE booking, commencing from the scheduled departure or arrival assistance time at the station and concluding upon completion of the booked station assistance service.'
    },
    {
      number: 5,
      title: 'Proposed Protection Events',
      content: 'Certain accidental or journey-related emergency events may be considered under the future protection product, subject to final underwriting terms, regulatory approvals, verification guidelines, and authorized insurance-provider arrangements. No specific monetary compensation or payout is guaranteed under this pre-launch demonstration.'
    },
    {
      number: 6,
      title: 'Exclusions',
      content: 'Proposed product-design exclusions include: (a) fraudulent or dishonest claims, (b) intentionally caused incidents or gross negligence, (c) false, incomplete, or misleading journey details, (d) events occurring outside the eligible journey timeframe, (e) protection purchased after an incident has already occurred, (f) invalid, cancelled, or refunded bookings, and (g) any events excluded under final provider-approved terms.'
    },
    {
      number: 7,
      title: 'Incident Reporting',
      content: 'Passengers experiencing journey disruption or emergency incidents during a protected journey may record details including incident date, time, station location, description, and supporting travel documentation. Incident reporting and claim processing will be formally enabled after the future insurance-provider integration is finalized.'
    },
    {
      number: 8,
      title: 'Future Claim Process',
      content: 'When legitimate insurance-provider integration is completed, a formal claims workflow will allow submission of verified claims to the underwriting partner. In the current pre-launch phase, no real insurance claim adjudication or financial payout takes place.'
    },
    {
      number: 9,
      title: 'Cancellation and Refund',
      content: 'If an associated ONECOOLIE booking is cancelled prior to service commencement in accordance with the ONECOOLIE Cancellation Policy, the ₹0.50 protection fee is 100% refundable via the original payment method. Unpaid protection requests are cancelled automatically. Once a protected journey is completed, the protection expires and the fee is non-refundable.'
    },
    {
      number: 10,
      title: 'Terms Acceptance',
      content: 'By selecting the Journey Protection option, the passenger confirms having read, understood, and accepted these pre-launch product terms. Acceptance is recorded server-side with an immutable timestamp, user ID, booking ID, and the exact terms version (ONECOOLIE-PROTECTION-PRELAUNCH-v1).'
    },
    {
      number: 11,
      title: 'Future Insurance Provider',
      content: 'ONECOOLIE is not an insurance company and does not underwrite risk. Future insurance coverage will be provided through licensed, IRDAI-registered insurance underwriting partners once commercial and regulatory agreements are concluded. Provider references in this version remain null.'
    },
    {
      number: 12,
      title: 'Important Limitations',
      content: 'This feature is provided for informational and demonstration purposes only. Neither ONECOOLIE nor its operating entity shall be liable for claims, damages, or financial compensation arising from this pre-launch concept demonstration.'
    },
    {
      number: 13,
      title: 'Pre-Launch Disclaimer',
      content: 'This feature is currently a pre-launch product demonstration and does not constitute an insurance policy or guarantee of payment. Actual insurance coverage will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed.'
    }
  ]
};

module.exports = {
  PROTECTION_CONFIG,
  generateProtectionId,
  PRE_LAUNCH_POLICY_TERMS
};
