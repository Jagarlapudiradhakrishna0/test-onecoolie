/**
 * server/src/utils/protectionConfig.js
 *
 * Server-authoritative Journey Protection Configuration & Pre-Launch Policy Terms (v2)
 * 
 * CRITICAL REQUIREMENTS:
 * - Authoritative customer price: ₹0.50 (50 paise in Razorpay)
 * - Pre-launch status: DEMONSTRATION ONLY
 * - Versioned policy terms: ONECOOLIE-PROTECTION-PRELAUNCH-v2
 * - Expanded Baggage Loss & Damage Terms (Small, Medium, Large, Extra-Large)
 * - Server-generated cryptographic ID: OCP-XXXXXXXX
 * - ZERO display or passenger API exposure of any fake insurance certificates, IRDAI credentials, or guaranteed payouts.
 */

const crypto = require('crypto');

const BAGGAGE_PROTECTION_LIMITS = [
  {
    tier: 'small',
    label: 'Small Bag',
    weightRange: 'Up to 5 kg',
    maxWeightKg: 5,
    proposedLimitInr: 2500,
    proposedLimitLabel: 'Up to ₹2,500'
  },
  {
    tier: 'medium',
    label: 'Medium Bag',
    weightRange: 'Above 5 kg and up to 15 kg',
    maxWeightKg: 15,
    proposedLimitInr: 5000,
    proposedLimitLabel: 'Up to ₹5,000'
  },
  {
    tier: 'large',
    label: 'Large Bag',
    weightRange: 'Above 15 kg and up to 25 kg',
    maxWeightKg: 25,
    proposedLimitInr: 10000,
    proposedLimitLabel: 'Up to ₹10,000'
  },
  {
    tier: 'extra_large',
    label: 'Extra-Large Bag',
    weightRange: 'Above 25 kg',
    maxWeightKg: null,
    proposedLimitInr: 15000,
    proposedLimitLabel: 'Up to ₹15,000'
  }
];

const DAMAGE_SEVERITY_TIERS = {
  MINOR: {
    name: 'Minor Damage',
    examples: ['small scratches', 'superficial marks', 'minor scuffs', 'dirt', 'stains', 'cosmetic imperfections'],
    treatment: 'Not covered'
  },
  MODERATE: {
    name: 'Moderate Damage',
    examples: ['damaged wheel', 'broken handle', 'damaged zipper', 'functional non-structural damage'],
    treatment: 'May be considered subject to verification'
  },
  MAJOR: {
    name: 'Major Damage',
    examples: ['cracked shell', 'broken shell', 'major structural deformation', 'baggage rendered unusable'],
    treatment: 'May be considered subject to verification and applicable protection limit'
  }
};

const DAMAGE_TERMS_TABLE = [
  { damageType: 'Minor scratches', treatment: 'Not covered' },
  { damageType: 'Minor scuffs', treatment: 'Not covered' },
  { damageType: 'Dirt/stains', treatment: 'Not covered' },
  { damageType: 'Normal wear and tear', treatment: 'Not covered' },
  { damageType: 'Pre-existing damage', treatment: 'Not covered' },
  { damageType: 'Damaged wheel', treatment: 'May be considered' },
  { damageType: 'Broken handle', treatment: 'May be considered' },
  { damageType: 'Damaged zipper', treatment: 'May be considered' },
  { damageType: 'Cracked shell', treatment: 'May be considered' },
  { damageType: 'Major structural damage', treatment: 'May be considered' },
  { damageType: 'Intentional damage', treatment: 'Not covered' },
  { damageType: 'Improper packaging damage', treatment: 'Generally excluded' },
  { damageType: 'Damage to excluded valuables', treatment: 'Not covered' }
];

const VALUABLE_EXCLUDED_ITEMS = [
  'cash',
  'currency',
  'jewelry',
  'gold',
  'silver',
  'precious metals',
  'precious stones',
  'passports',
  'identity documents',
  'credit cards',
  'debit cards',
  'bank cards',
  'financial instruments',
  'securities',
  'important financial documents',
  'laptops',
  'tablets',
  'mobile phones',
  'cameras',
  'expensive electronics',
  'luxury watches',
  'irreplaceable personal items',
  'confidential documents',
  'fragile valuables',
  'perishable goods',
  'prohibited/illegal items'
];

const PROTECTION_CONFIG = {
  PRODUCT_NAME: 'ONECOOLIE JOURNEY PROTECTION',
  CUSTOMER_FACING_DESCRIPTION: 'Optional protection associated with an eligible ONECOOLIE journey and eligible baggage.',
  PRICE_INR: 0.50,
  PRICE_PAISE: 50,
  CUSTOMER_PRICE: 0.50,
  TERMS_VERSION: 'ONECOOLIE-PROTECTION-PRELAUNCH-v2',
  CURRENT_TERMS_VERSION: 'ONECOOLIE-PROTECTION-PRELAUNCH-v2',
  STATUS_PRE_LAUNCH: 'PRE-LAUNCH',
  PRE_LAUNCH_DISCLAIMER: 'ONECOOLIE Journey Protection is currently a pre-launch product demonstration and proposed protection service. It is not currently an insurance policy and does not constitute legally binding insurance coverage or a guarantee of payment. Any future insurance product will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed.',
  STATUSES: {
    PENDING_PAYMENT: 'pending_payment',
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    REFUNDED: 'refunded'
  },
  BAGGAGE_PROTECTION_LIMITS,
  DAMAGE_SEVERITY_TIERS,
  DAMAGE_TERMS_TABLE,
  VALUABLE_EXCLUDED_ITEMS
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
 * Authoritatively calculates the applicable proposed baggage protection tier from booking/luggage data.
 *
 * Multiple Bags Rule:
 * In ONECOOLIE, Journey Protection is priced authoritatively at ₹0.50 per journey / booking.
 * Proposed baggage protection limits apply per declared, eligible bag up to the specific category limit of that bag
 * (Small: Up to ₹2,500; Medium: Up to ₹5,000; Large: Up to ₹10,000; Extra-Large: Up to ₹15,000).
 * The overall booking's maximum proposed protection tier reflects the highest declared eligible bag category,
 * or defaults to the Small Bag category (Up to ₹2,500) for general station assistance.
 *
 * @param {object} bookingOrServices - Raw booking object or booking.services
 * @returns {object} Applicable Baggage Protection Tier
 */
function calculateProposedProtectionTier(bookingOrServices) {
  const services = bookingOrServices?.services || bookingOrServices || {};
  const counts = services.luggageCounts || {};

  if (Number(counts.extra_large) > 0) {
    return BAGGAGE_PROTECTION_LIMITS.find(l => l.tier === 'extra_large');
  }
  if (Number(counts.large) > 0) {
    return BAGGAGE_PROTECTION_LIMITS.find(l => l.tier === 'large');
  }
  if (Number(counts.medium) > 0) {
    return BAGGAGE_PROTECTION_LIMITS.find(l => l.tier === 'medium');
  }
  if (Number(counts.small) > 0) {
    return BAGGAGE_PROTECTION_LIMITS.find(l => l.tier === 'small');
  }

  // Fallback to Small Bag baseline for general assistance bookings
  return BAGGAGE_PROTECTION_LIMITS.find(l => l.tier === 'small');
}

/**
 * Versioned Pre-Launch Policy Document Content (25 Structured Sections - v2)
 * Comprehensive baggage loss & damage terms, severity classification, and exclusion rules.
 */
const PRE_LAUNCH_POLICY_TERMS = {
  version: 'ONECOOLIE-PROTECTION-PRELAUNCH-v2',
  effectiveDate: '2026-10-04',
  status: 'PRE-LAUNCH / DEMONSTRATION ONLY',
  price: '₹0.50 / journey',
  title: 'ONECOOLIE JOURNEY PROTECTION — PRE-LAUNCH POLICY & BAGGAGE TERMS (DEMONSTRATION ONLY)',
  disclaimer: 'IMPORTANT — PRE-LAUNCH PRODUCT: ONECOOLIE Journey Protection is currently a product demonstration and proposed protection service. The baggage protection limits, loss and damage provisions, exclusions, eligibility rules, and claim process shown here are proposed terms and do not currently constitute an insurance policy or legally binding insurance coverage. ONECOOLIE does not currently represent itself as an insurer under these demonstration terms. Any future insurance product will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed. Final product terms may differ from this demonstration.',
  limits: BAGGAGE_PROTECTION_LIMITS,
  damageTerms: DAMAGE_TERMS_TABLE,
  sections: [
    {
      number: 1,
      title: 'Product Overview',
      content: 'ONECOOLIE Journey Protection is an optional journey-protection service associated with an eligible ONECOOLIE station assistance booking and eligible declared baggage. The customer price is ₹0.50 per journey. This product is currently in PRE-LAUNCH DEMONSTRATION phase and does not constitute an insurance policy or guarantee of payment.'
    },
    {
      number: 2,
      title: 'Pre-launch Status',
      content: 'ONECOOLIE Journey Protection is currently a pre-launch product demonstration and proposed protection service. It is not currently an insurance policy and does not constitute legally binding insurance coverage or a guarantee of payment. Any future insurance product will be introduced only after the required regulatory, underwriting, and insurance-provider arrangements are completed.'
    },
    {
      number: 3,
      title: 'Eligibility',
      content: 'Protection is available to passengers holding a valid, confirmed ONECOOLIE station assistance booking for an eligible scheduled rail journey, who explicitly opt in and accept these versioned terms, and whose payment of ₹0.50 is server-verified (via online gateway or authorized cash collection). Protection is non-transferable and strictly bound to the authenticated passenger and booking.'
    },
    {
      number: 4,
      title: 'Protection Activation',
      content: 'For online Razorpay bookings, protection activates immediately upon server-side cryptographic signature and amount verification. For CASH / COD bookings, protection is initialized as PENDING PAYMENT upon booking creation and activates only after authorized assistant cash collection is verified on the server. Selecting cash does not activate protection.'
    },
    {
      number: 5,
      title: 'Protection Period',
      content: 'Protection applies strictly during the scheduled station assistance process associated with the booking, beginning when the assistant meets the passenger at the station and ending upon completion of the booked platform/coach transit service.'
    },
    {
      number: 6,
      title: 'Baggage Categories',
      content: 'Eligible baggage is classified into four standard operational categories based on weight and container dimensions: Small Bag (up to 5 kg), Medium Bag (>5 kg to 15 kg), Large Bag (>15 kg to 25 kg), and Extra-Large Bag (>25 kg).'
    },
    {
      number: 7,
      title: 'Proposed Baggage Protection Limits',
      content: 'PROPOSED PRE-LAUNCH PROTECTION LIMITS: Small Bag (Up to 5 kg): Up to ₹2,500; Medium Bag (>5–15 kg): Up to ₹5,000; Large Bag (>15–25 kg): Up to ₹10,000; Extra-Large Bag (>25 kg): Up to ₹15,000. These limits are illustrative product terms for the current pre-launch demonstration and do not constitute active insurance coverage or a guaranteed payout. The proposed protection limit represents the maximum amount that may be considered under the applicable product terms. It does not represent an automatic payout or guaranteed reimbursement.'
    },
    {
      number: 8,
      title: 'Baggage Loss',
      content: 'Baggage Loss Protection concerns eligible baggage that cannot be located after the applicable ONECOOLIE service process. A loss incident may be considered where there is a valid booking, active protection, eligible recorded baggage, verifiable occurrence during the service, timely passenger reporting, sufficient evidence, and no applicable exclusion. Loss claims are not automatically approved and remain subject to verification and approved final terms.'
    },
    {
      number: 9,
      title: 'Baggage Damage',
      content: 'Baggage Damage Protection distinguishes genuine accidental physical damage from ordinary wear. Potentially considered damage includes broken suitcase shell, cracked hard-shell body, damaged wheel, detached wheel, broken handle, damaged telescopic handle, broken zipper caused by an eligible incident, damaged lock attached to baggage, and major structural deformation rendering baggage unusable. All damage claims are subject to verification.'
    },
    {
      number: 10,
      title: 'Damage Assessment',
      content: 'Damage is classified into three severity tiers: (1) Minor Damage (small scratches, superficial marks, minor scuffs, dirt, stains, cosmetic imperfections) — Not covered; (2) Moderate Damage (damaged wheel, broken handle, damaged zipper, functional non-structural damage) — May be considered subject to verification; (3) Major Damage (cracked shell, broken shell, major structural deformation, baggage rendered unusable) — May be considered subject to verification and applicable protection limit.'
    },
    {
      number: 11,
      title: 'Valuable and Excluded Items',
      content: 'VALUABLE ITEMS — PASSENGER RESPONSIBILITY: Passengers are responsible for keeping cash, currency, jewelry, gold, silver, precious metals, precious stones, passports, identity documents, credit/debit/bank cards, financial instruments, securities, important financial documents, laptops, tablets, mobile phones, cameras, expensive electronics, luxury watches, irreplaceable personal items, confidential documents, fragile valuables, and perishable goods with them. These items should not be placed inside checked or assisted baggage. ONECOOLIE is not responsible for loss, theft, disappearance, or damage to items that are excluded under the applicable Journey Protection terms. This statement describes proposed pre-launch product terms and does not constitute an active insurance exclusion.'
    },
    {
      number: 12,
      title: 'Prohibited/Restricted Items',
      content: 'PROHIBITED OR RESTRICTED ITEMS: Weapons, explosives, hazardous materials, flammable materials, illegal substances, stolen goods, prohibited chemicals, dangerous goods, and any items prohibited by Indian Railways or applicable law are strictly excluded. Passengers must comply with applicable railway, transport, safety, and legal requirements.'
    },
    {
      number: 13,
      title: 'Pre-existing Damage',
      content: 'Pre-existing damage is not intended to be covered. Existing cracks, pre-existing dents, previously damaged wheels, previously broken handles or zippers, and prior structural weakness are excluded. The condition of baggage may be observed and recorded upon acceptance.'
    },
    {
      number: 14,
      title: 'Normal Wear and Tear',
      content: 'Normal wear and tear is not covered. Ordinary surface scratches, minor scuffs, fabric fading, superficial stains, cosmetic deterioration, ordinary aging, minor zipper wear, and normal wheel tread wear resulting from regular transit use are excluded.'
    },
    {
      number: 15,
      title: 'Packaging Responsibilities',
      content: 'Passengers are responsible for properly securing fragile belongings and ensuring baggage is adequately closed and sealed. Proposed protection does not apply to damage caused solely by inadequate packaging, unzipped bags, overpacking, structural fatigue, or poor pre-existing condition.'
    },
    {
      number: 16,
      title: 'Passenger Responsibilities',
      content: 'Passengers are responsible for accurately declaring baggage count and category during booking, keeping all valuable and fragile items on their person, inspecting baggage upon handoff, and reporting any incident promptly.'
    },
    {
      number: 17,
      title: 'Incident Reporting',
      content: 'Passengers should report baggage loss or damage as soon as reasonably possible after becoming aware of the incident. A report should include Protection ID, Booking ID, baggage reference, incident type (Loss, Damage, or Theft/Unaccounted), date, time, station location, full bag photograph, close-up photograph of damage, and passenger statement.'
    },
    {
      number: 18,
      title: 'Evidence Requirements',
      content: 'Future assessment of reported incidents may require the booking record, Protection ID, acceptance record, service telemetry, assistant verification notes, photographic evidence, and proof of ownership. Unsubstantiated or unverified reports are not eligible.'
    },
    {
      number: 19,
      title: 'Proposed Claim Process',
      content: 'In the future authorized insurance provider model: Protection Active → Incident Occurs → Passenger Reports Loss/Damage with Evidence → ONECOOLIE Verifies Booking & Assistant Telemetry → Eligibility & Exclusions Checked → Future Authorized Provider Review → Determination. In the current pre-launch phase, no real claim adjudication or payout takes place.'
    },
    {
      number: 20,
      title: 'Repair/Replacement',
      content: 'Where damage is eventually determined eligible under future approved terms, resolution may take the form of authorized repair, replacement, or approved settlement up to the applicable bag protection limit. Cash payout or full replacement is not guaranteed.'
    },
    {
      number: 21,
      title: 'Cancellation and Refund',
      content: 'If an associated ONECOOLIE booking is cancelled prior to service commencement in accordance with the Cancellation Policy, the ₹0.50 protection fee is 100% refundable via the original payment method. For cash bookings cancelled before collection, the protection is cancelled without surcharge. Once a service is in progress or completed, the protection fee is non-refundable.'
    },
    {
      number: 22,
      title: 'Terms Acceptance',
      content: 'By selecting Journey Protection, the passenger explicitly confirms having read, understood, and accepted these pre-launch product terms. Acceptance is authoritatively logged with user ID, booking ID, Protection ID, timestamp, and version string ONECOOLIE-PROTECTION-PRELAUNCH-v2.'
    },
    {
      number: 23,
      title: 'Policy Version',
      content: 'This policy is version ONECOOLIE-PROTECTION-PRELAUNCH-v2 (effective October 2026). Historical protection records retain the exact terms version accepted at purchase and are not retroactively modified.'
    },
    {
      number: 24,
      title: 'Future Provider Integration',
      content: 'ONECOOLIE is a technology platform and not an insurance company. Legitimate insurance coverage will be underwritten solely by an authorized, IRDAI-registered insurance partner once formal regulatory and commercial agreements are finalized. Provider fields in this version remain null.'
    },
    {
      number: 25,
      title: 'Important Disclaimer',
      content: 'This feature is currently a pre-launch product demonstration and proposed protection service. It does not constitute an insurance policy, certificate of insurance, or guarantee of financial reimbursement. Neither ONECOOLIE nor its operating entities shall be liable for claims or financial compensation under this pre-launch concept demonstration.'
    }
  ]
};

module.exports = {
  PROTECTION_CONFIG,
  JOURNEY_PROTECTION_CONFIG: PROTECTION_CONFIG,
  BAGGAGE_PROTECTION_LIMITS,
  DAMAGE_SEVERITY_TIERS,
  DAMAGE_TERMS_TABLE,
  VALUABLE_EXCLUDED_ITEMS,
  generateProtectionId,
  calculateProposedProtectionTier,
  PRE_LAUNCH_POLICY_TERMS
};
