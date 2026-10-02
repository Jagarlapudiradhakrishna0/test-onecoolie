/**
 * supportService.js
 *
 * Centralized support utilities, phone configuration, and device detection for OneCoolie.
 * Strictly prevents unwanted external tel: protocol prompts on desktop browsers.
 */

import toast from 'react-hot-toast';

// Official OneCoolie 24/7 Helpline constant
export const SUPPORT_PHONE = '1800-COOLIE';
export const SUPPORT_PHONE_DIALABLE = 'tel:1800-COOLIE';
export const SUPPORT_PHONE_NUMERIC = '1800266543';

/**
 * Robust detection of mobile / touch handheld devices.
 * Avoids triggering desktop OS "Open Pick an app?" protocol handlers.
 */
export function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // 1. User Agent testing
  const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
  const mobileUARegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|crios|fxios/i;
  const isMobileUA = mobileUARegex.test(ua);

  // 2. Hardware Touch Capabilities & coarse pointer
  const hasTouchScreen = (
    ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
    ('msMaxTouchPoints' in navigator && navigator.msMaxTouchPoints > 0)
  );

  const isCoarsePointer = typeof window.matchMedia === 'function' && 
    window.matchMedia('(pointer: coarse)').matches;

  // 3. Screen width sanity boundary (<= 768px with touch)
  const isSmallScreen = window.innerWidth <= 768;

  return isMobileUA || (hasTouchScreen && isCoarsePointer && isSmallScreen);
}

/**
 * Safe navigation handler for "Contact Support" buttons.
 * On desktop: ALWAYS navigates internally to /support.
 * On mobile: Navigates to /support by default (giving user Call, Copy, Ticket choices).
 */
export function handleContactSupport(navigate, options = {}) {
  if (!navigate) {
    if (typeof window !== 'undefined') {
      window.location.href = '/support';
    }
    return;
  }

  // If explicitly requested as direct call from a mobile device
  if (options.directCall && isMobileDevice()) {
    window.location.href = SUPPORT_PHONE_DIALABLE;
    return;
  }

  // Default safe action for all environments: internal router navigation
  navigate('/support');
}

/**
 * Safe copy of the official support number with user feedback
 */
export async function copySupportNumber() {
  if (typeof window === 'undefined') return false;

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(SUPPORT_PHONE);
      toast.success('Support number copied.');
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard write failed, attempting fallback:', err);
  }

  // Fallback using temporary textarea element
  try {
    const textArea = document.createElement('textarea');
    textArea.value = SUPPORT_PHONE;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      toast.success('Support number copied.');
      return true;
    }
  } catch (fallbackErr) {
    console.error('Fallback copy failed:', fallbackErr);
  }

  toast.error(`Helpline: ${SUPPORT_PHONE}`);
  return false;
}

/**
 * Triggers a phone call. On desktop, this is only called when the user
 * explicitly clicks the "Call Support" button.
 */
export function triggerSupportCall() {
  if (typeof window !== 'undefined') {
    window.location.href = SUPPORT_PHONE_DIALABLE;
  }
}
