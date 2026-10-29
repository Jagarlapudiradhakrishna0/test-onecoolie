/**
 * client/src/utils/paymentClassification.js
 *
 * Centralized Payment Method Classification for ONECOOLIE Frontend
 *
 * Keeps frontend 100% in sync with backend server/src/utils/paymentClassification.js
 * Enforces Option C (Cash + Online Hybrid) payment rules.
 */

export const CASH_PAYMENT_METHODS = ['cash', 'cod', 'pay_on_arrival', 'pay_on_delivery'];

export const ONLINE_PAYMENT_METHODS = [
  'upi',
  'online',
  'card',
  'netbanking',
  'razorpay'
];

/**
 * Safely normalizes payment method string (trimmed, lowercased).
 * @param {string} method
 * @returns {string}
 */
export function normalizePaymentMethod(method) {
  if (!method || typeof method !== 'string') return '';
  return method.trim().toLowerCase();
}

/**
 * Checks if the payment method is cash.
 * @param {string} method
 * @returns {boolean}
 */
export function isCashPayment(method) {
  const normalized = normalizePaymentMethod(method);
  return CASH_PAYMENT_METHODS.includes(normalized);
}

/**
 * Checks if the payment method is an online method (UPI, netbanking, card, etc.)
 * @param {string} method
 * @returns {boolean}
 */
export function isOnlinePayment(method) {
  const normalized = normalizePaymentMethod(method);
  return ONLINE_PAYMENT_METHODS.includes(normalized);
}

/**
 * Validates whether the given method is supported by the platform.
 * @param {string} method
 * @returns {boolean}
 */
export function isValidPaymentMethod(method) {
  const normalized = normalizePaymentMethod(method);
  return CASH_PAYMENT_METHODS.includes(normalized) || ONLINE_PAYMENT_METHODS.includes(normalized);
}
