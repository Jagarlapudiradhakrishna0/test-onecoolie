/**
 * chatSync.js
 *
 * Robust, multi-tier chat synchronization and persistence utility:
 * 1. Instant local display & cross-tab sync via localStorage + BroadcastChannel
 * 2. Authoritative backend persistence via /service/:booking_id/chat REST API
 * 3. Automatic recovery on page refresh or browser restarts across all devices
 */

import axios from '../api/axios';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

/**
 * Get cached chat messages from localStorage immediately (synchronous)
 */
export function getLocalChat(bookingId, bookingCode) {
  try {
    if (bookingId) {
      const raw = localStorage.getItem(`oc_chat_${bookingId}`);
      if (raw) return JSON.parse(raw);
    }
    if (bookingCode) {
      const raw = localStorage.getItem(`oc_chat_${bookingCode}`);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  return [];
}

/**
 * Save chat messages to localStorage under all booking identifiers
 */
export function saveLocalChat(bookingId, bookingCode, messages) {
  try {
    const raw = JSON.stringify(messages);
    if (bookingId) localStorage.setItem(`oc_chat_${bookingId}`, raw);
    if (bookingCode && bookingCode !== bookingId) {
      localStorage.setItem(`oc_chat_${bookingCode}`, raw);
    }
  } catch (e) {}
}

/**
 * Remove chat messages from localStorage once a booking is completed
 */
export function clearLocalChat(bookingId, bookingCode) {
  try {
    if (bookingId) localStorage.removeItem(`oc_chat_${bookingId}`);
    if (bookingCode) localStorage.removeItem(`oc_chat_${bookingCode}`);
  } catch (e) {}
}

/**
 * Broadcast message across tabs in the same browser
 */
export function broadcastChatTab(bookingId, bookingCode, message) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('onecoolie_chat_channel');
      bc.postMessage({ bookingId, bookingCode, message });
      bc.close();
    }
  } catch (e) {}
}

/**
 * Merge two chat arrays without duplicates based on unique IDs, clientMessageId,
 * or content + timestamp window reconciliation
 */
export function mergeChatMessages(existing = [], incoming = []) {
  const merged = [...existing];
  let changed = false;

  incoming.forEach((inMsg) => {
    if (!inMsg || !inMsg.text) return;
    const inId = inMsg.id || inMsg.clientMessageId;
    const inTime = inMsg.timestamp ? new Date(inMsg.timestamp).getTime() : 0;
    const inText = String(inMsg.text).trim();

    // Find if already present
    const existingIndex = merged.findIndex((m) => {
      // 1. Match by unique canonical ID or clientMessageId
      if (inId && (m.id === inId || m.clientMessageId === inId)) {
        return true;
      }
      if (m.clientMessageId && inMsg.clientMessageId && m.clientMessageId === inMsg.clientMessageId) {
        return true;
      }
      // 2. Fallback match: same text + sender role + timestamp within 8 seconds
      if (String(m.text).trim() === inText) {
        const mSender = m.from || m.senderRole;
        const inSender = inMsg.from || inMsg.senderRole;
        const sameSender = !mSender || !inSender || mSender === inSender;
        const mTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
        if (sameSender && inTime > 0 && mTime > 0 && Math.abs(mTime - inTime) < 8000) {
          return true;
        }
      }
      return false;
    });

    if (existingIndex !== -1) {
      // Reconcile optimistic message with canonical server message if needed
      const cur = merged[existingIndex];
      const needsIdUpdate = (!cur.id || cur.id.startsWith('temp-') || cur.id.startsWith('client-')) && inMsg.id;
      if (needsIdUpdate || (cur.status === 'sending' && inMsg.status !== 'sending')) {
        merged[existingIndex] = {
          ...cur,
          ...inMsg,
          id: inMsg.id || cur.id,
          status: 'delivered',
        };
        changed = true;
      }
    } else {
      merged.push({
        ...inMsg,
        id: inMsg.id || inMsg.clientMessageId || `client-${Date.now()}-${Math.random()}`,
        status: inMsg.status || 'delivered',
      });
      changed = true;
    }
  });

  return { merged, changed };
}

/**
 * Fetch remote chat history from backend /service/:id/chat
 */
export async function fetchRemoteChat(bookingId, bookingCode) {
  const ref = bookingId || bookingCode;
  if (!ref) return [];

  try {
    const res = await axios.get(`/service/${ref}/chat`);
    if (res.data && Array.isArray(res.data.messages)) {
      return res.data.messages;
    }
  } catch (backendErr) {
    console.warn('Fetch remote chat notice:', backendErr.response?.data?.message || backendErr.message);
  }
  return [];
}

/**
 * Persist a new message into backend /service/:id/chat
 */
export async function persistRemoteChat(bookingId, bookingCode, message) {
  const ref = bookingId || bookingCode;
  if (!ref || !message) return;

  try {
    await axios.post(`/service/${ref}/chat`, {
      text: message.text || message.message,
      clientMessageId: message.clientMessageId || message.id || message.message_id,
      timestamp: message.timestamp || message.created_at,
    });
  } catch (backendErr) {
    console.warn('Persist remote chat notice:', backendErr.response?.data?.message || backendErr.message);
  }
}
