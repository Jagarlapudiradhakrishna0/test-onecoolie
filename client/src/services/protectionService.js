import axios from '../api/axios';
import { loadRazorpayScript } from '../utils/razorpay';
import oneCoolieLogo from '../assets/onecoolie-logo.png';
import toast from 'react-hot-toast';

/* ============================================================
   ONECOOLIE JOURNEY PROTECTION SERVICE
   • Authoritative customer price: ₹0.50 (50 paise)
   • Server-verified Razorpay payment flow
   • STRICT: ZERO display or storage of benefit/payout amounts
   ============================================================ */

/**
 * Fetches Journey Protection details for a specific booking
 * @param {string} bookingId
 * @returns {Promise<object|null>}
 */
export async function fetchBookingProtection(bookingId) {
  if (!bookingId) return null;
  try {
    const res = await axios.get(`/protection/booking/${bookingId}`);
    return res.data?.protection || null;
  } catch (err) {
    console.error('[PROTECTION] Error fetching protection for booking:', err);
    return null;
  }
}

/**
 * Initiates Razorpay checkout for Journey Protection (₹0.50 / 50 paise)
 * and cryptographically verifies payment on the server.
 *
 * @param {object} params
 * @param {string} params.bookingId
 * @param {object} [params.user]
 * @param {function} [params.onSuccess]
 * @param {function} [params.onError]
 * @param {function} [params.onDismiss]
 */
export async function purchaseJourneyProtection({
  bookingId,
  user,
  onSuccess,
  onError,
  onDismiss
}) {
  if (!bookingId) {
    toast.error('Booking reference is required.');
    if (onError) onError(new Error('Missing bookingId'));
    return;
  }

  const toastId = toast.loading('Initializing Journey Protection...');

  try {
    // 1. Ensure Razorpay checkout script is loaded
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.dismiss(toastId);
      toast.error('Unable to load payment gateway. Please check your network connection.');
      if (onError) onError(new Error('Razorpay SDK failed to load'));
      return;
    }

    // 2. Initialize Order on Backend (server-authoritative ₹0.50 / 50 paise)
    const { data: orderRes } = await axios.post('/protection/create-order', {
      booking_id: bookingId,
      terms_accepted: true
    });

    toast.dismiss(toastId);

    if (!orderRes || !orderRes.success || !orderRes.razorpay) {
      throw new Error(orderRes?.message || 'Unable to initialize Journey Protection order.');
    }

    const { protection, razorpay } = orderRes;

    // 3. Launch Razorpay Standard Checkout
    const options = {
      key: razorpay.key_id,
      amount: razorpay.amount, // Exactly 50 paise
      currency: razorpay.currency || 'INR',
      name: 'OneCoolie',
      description: `Journey Protection (Pre-Launch) #${protection.protection_id}`,
      image: oneCoolieLogo,
      order_id: razorpay.order_id,
      handler: async function (response) {
        const verifyToastId = toast.loading('Verifying protection payment...');
        try {
          // 4. Server-Side Cryptographic Signature & Amount Verification
          const { data: verifyRes } = await axios.post('/protection/verify-payment', {
            protection_id: protection.protection_id,
            booking_id: bookingId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });

          toast.dismiss(verifyToastId);

          if (verifyRes && verifyRes.success) {
            toast.success(`Journey Protection Activated! ID: ${verifyRes.protection?.protection_id || protection.protection_id}`);
            if (onSuccess) onSuccess(verifyRes.protection);
          } else {
            throw new Error(verifyRes?.message || 'Protection could not be activated.');
          }
        } catch (vErr) {
          toast.dismiss(verifyToastId);
          console.error('[PROTECTION] Verification failed:', vErr);
          const msg = vErr.response?.data?.message || 'Protection payment could not be completed.';
          toast.error(msg);
          if (onError) onError(vErr);
        }
      },
      prefill: {
        name: user?.name || user?.full_name || '',
        email: user?.email || '',
        contact: user?.phone || user?.phoneNumber || ''
      },
      theme: {
        color: '#1463FF'
      },
      modal: {
        ondismiss: function () {
          if (onDismiss) onDismiss();
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (resp) {
      toast.error(`Protection payment could not be completed: ${resp?.error?.description || 'Cancelled'}`);
      if (onError) onError(new Error(resp?.error?.description || 'Payment failed'));
    });
    rzp.open();

  } catch (err) {
    toast.dismiss(toastId);
    console.error('[PROTECTION] Purchase error:', err);
    const msg = err.response?.data?.message || err.message || 'Unable to add Journey Protection. Please try again.';
    toast.error(msg);
    if (onError) onError(err);
  }
}

/**
 * Confirms cash collection for an authorized collector/admin.
 * @param {string} bookingId
 * @returns {Promise<object>}
 */
export async function confirmProtectionCashCollection(bookingId) {
  if (!bookingId) throw new Error('Booking ID is required.');
  const res = await axios.post(`/protection/${bookingId}/cash-collect`);
  return res.data;
}

