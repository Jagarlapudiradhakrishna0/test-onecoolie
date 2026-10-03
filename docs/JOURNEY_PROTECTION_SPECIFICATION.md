# ONECOOLIE — Journey Protection Specification (Pre-Launch Product Feature)

## 1. Product Overview & Purpose
**ONECOOLIE Journey Protection** is an optional journey-protection service designed to provide peace of mind and additional assistance support to passengers booking station assistance through ONECOOLIE.

> **CRITICAL PRE-LAUNCH DISCLAIMER:**  
> This feature is currently a **pre-launch product demonstration** and service concept. It does **NOT** constitute an insurance policy, certificate of insurance, or guarantee of financial payout. Actual insurance coverage will be introduced only after required regulatory (IRDAI), underwriting, and authorized insurance-provider arrangements are formally completed.

---

## 2. Customer Price & Currency Precision
* **Authoritative Price:** **₹0.50 per journey**.
* **Razorpay Gateway Unit:** **50 paise** (`formatRazorpayAmount(0.50)` strictly converts to `50`).
* **Server-Authoritative Enforcement:** Frontend submissions of arbitrary amounts (e.g. 0.01, 50, 500) are strictly rejected. The backend authoritative config dictates the price.

---

## 3. Strict Non-Display of Monetary Benefit / Payout
To avoid regulatory misrepresentation during the demonstration phase:
* **NO monetary coverage, benefit, payout, sum insured, or compensation amounts** are displayed to passengers or returned in passenger-facing API payloads.
* Only the price of **₹0.50** is displayed.
* Pre-launch demonstration terms use general qualitative event descriptions rather than financial payout figures.

---

## 4. Booking Flow Integration
1. **Explicit Passenger Opt-in:**
   * Passenger selects station assistance booking.
   * During Step 4 (Review Your Booking) or on any eligible booking details view, an optional toggle card appears:
     ```
     ONECOOLIE JOURNEY PROTECTION
     Optional protection for your journey.
     ₹0.50 / journey
     [ ] Add Journey Protection (PRE-LAUNCH)
     [View Protection Terms]
     ```
   * Passenger must explicitly check the opt-in checkbox and confirm terms acceptance.
2. **Order Initialization:**
   * Backend generates cryptographic Protection ID (`OCP-XXXXXXXX`).
   * Razorpay order is initialized for 50 paise.
3. **Checkout & Cryptographic Verification:**
   * Passenger completes payment through Razorpay modal.
   * Backend cryptographically verifies the HMAC-SHA256 signature (`order_id|payment_id`).
   * Protection status is updated from `pending_payment` to `active`.
   * Telemetry is logged to tamper-evident financial audit tables.

---

## 5. Database Schema & RLS
* **Table:** `public.journey_protection`
  * `id`: UUID Primary Key
  * `protection_id`: Server-generated `OCP-XXXXXXXX` (Unique)
  * `booking_id`: References `public.bookings(id)`
  * `passenger_id`: References `public.users(id)`
  * `price`: `0.50` (CHECK constraint: `price = 0.50`)
  * `status`: Enum (`pending_payment`, `active`, `cancelled`, `expired`, `refunded`)
  * `terms_version`: `ONECOOLIE-PROTECTION-PRELAUNCH-v1`
  * `terms_accepted_at`: ISO Timestamp
  * `activated_at`: ISO Timestamp
  * Future provider columns (all NULL currently): `provider_id`, `provider_name`, `provider_policy_reference`, `provider_certificate_reference`
* **Idempotency Constraint:** Partial unique index `idx_uq_journey_protection_active_booking ON public.journey_protection(booking_id) WHERE status = 'active'` guarantees maximum 1 active protection record per booking.
* **RLS Policies:**
  * `service_role`: Full administrative and verification access.
  * Authenticated passengers: `SELECT` strictly restricted to `auth.uid() = passenger_id`.
  * Anonymous/public: Zero access (`REVOKE ALL`).

---

## 6. Future Claim Architecture
* **Table:** `public.protection_claims`
  * `claim_id`: Unique identifier
  * `protection_id`: Foreign key to `journey_protection`
  * `user_id`: Passenger ID
  * `booking_id`: Booking ID
  * `incident_date`: Date of incident
  * `incident_description`: Text details
  * `status`: `draft`, `submitted`, `under_review`, `approved`, `rejected`, `closed`
  * In pre-launch phase, no claims are settled or paid out.

---

## 7. Future Real Insurance Integration
When an authorized IRDAI-registered insurance partner is onboarded:
* Pre-existing nullable columns (`provider_id`, `provider_name`, `provider_policy_reference`, `provider_certificate_reference`) will be populated by provider webhooks without database migration or breaking changes.
* Policy terms version will increment from `ONECOOLIE-PROTECTION-PRELAUNCH-v1` to `ONECOOLIE-PROTECTION-v2` with provider-approved contract terms.
