/**
 * supportStore.js
 *
 * Centralized store & synchronization layer for OneCoolie Help & Support:
 * - Ticket management (CRUD, status, priorities)
 * - Chat conversations & AI summaries
 * - Cross-tab real-time sync via BroadcastChannel ('onecoolie_support_sync')
 * - Local storage persistence with initial seeds directly matching reference design
 */

import axios from '../api/axios';

const STORAGE_KEY = 'onecoolie_passenger_tickets_real';
const CHANNEL_NAME = 'onecoolie_support_sync';

// BroadcastChannel for instant cross-tab sync between Passenger and Admin
let channel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported:', e);
}

// Real support tickets only - zero initial demo or mock tickets
export const INITIAL_TICKETS = [];

/**
 * Get all support tickets from localStorage
 */
export function getTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strip any legacy demo tickets if user had them cached in browser localStorage
        return parsed.filter(t => 
          !String(t.id || '').includes('TEST') && 
          t.id !== 'OC-10482' && 
          t.id !== 'OC-10471' && 
          t.id !== 'OC-10468' && 
          t.id !== 'OC-10421' && 
          t.id !== 'OC-10377'
        );
      }
    }
  } catch (e) {
    console.error('Error reading support tickets:', e);
  }
  return [];
}

/**
 * Save tickets to localStorage and broadcast to other tabs
 */
export function saveTickets(tickets) {
  try {
    const clean = Array.isArray(tickets) ? tickets.filter(t => 
      !String(t.id || '').includes('TEST') && 
      t.id !== 'OC-10482' && 
      t.id !== 'OC-10471' && 
      t.id !== 'OC-10468' && 
      t.id !== 'OC-10421' && 
      t.id !== 'OC-10377'
    ) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    if (channel) {
      channel.postMessage({ type: 'TICKETS_UPDATED', timestamp: Date.now() });
    }
  } catch (e) {
    console.error('Error saving support tickets:', e);
  }
}

/**
 * Get single ticket by ID
 */
export function getTicketById(id) {
  const tickets = getTickets();
  return tickets.find((t) => t.id.toLowerCase() === String(id).toLowerCase().replace('#', '')) || null;
}

/**
 * Create a new support ticket backed by the real database
 */
export async function createTicket({
  subject,
  passengerName,
  passengerPhone,
  passengerEmail,
  priority = 'high',
  trip = null,
  aiSummary = '',
  initialMessages = [],
  issueType = 'General',
  description = '',
  station = 'KZJ',
  pnr = 'N/A'
}) {
  const desc = description || subject || 'Passenger Assistance Query';

  const payload = {
    subject: subject || "Passenger Assistance Query",
    category: issueType || 'Passenger Help',
    issueType: issueType || 'General',
    description: desc,
    desc,
    priority,
    trip: trip || null,
    booking_id: trip?.id || trip?.bookingId || null,
    station: station || trip?.station_code || trip?.fromCode || 'KZJ',
    pnr: pnr || trip?.pnr || 'N/A',
    aiSummary: aiSummary || `${issueType}: ${desc}`,
    initialMessages,
    passengerName,
    passengerPhone,
    passengerEmail
  };

  try {
    const res = await axios.post('/support/tickets', payload);
    const createdTicket = res.data;

    const tickets = getTickets();
    const updated = [createdTicket, ...tickets.filter(t => t.id !== createdTicket.id)];
    saveTickets(updated);

    return createdTicket;
  } catch (err) {
    console.error('Failed to create ticket on server:', err);
    throw err;
  }
}

/**
 * Add a message to an existing ticket conversation
 */
export function addTicketMessage(ticketId, message) {
  const tickets = getTickets();
  const index = tickets.findIndex((t) => String(t.id).toLowerCase().replace('#', '') === String(ticketId).toLowerCase().replace('#', ''));
  if (index === -1) return null;

  const ticket = tickets[index];
  const newMsg = {
    id: message.id || `msg-${Date.now()}`, // preserve original ID to prevent blink on sync
    sender: message.sender || 'passenger',
    name: message.name || (message.sender === 'support' ? 'Support Executive' : 'Passenger'),
    text: String(message.text || '').trim(),
    timestamp: message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const existingConv = Array.isArray(ticket.conversation) ? ticket.conversation : [];
  const alreadyExists = existingConv.some((m) => {
    if (m.id && (m.id === newMsg.id || m.clientMessageId === newMsg.id)) return true;
    if (m.sender === newMsg.sender && String(m.text).trim() === newMsg.text) {
      return true;
    }
    return false;
  });

  if (alreadyExists) {
    return newMsg;
  }

  ticket.conversation = [...existingConv, newMsg];
  ticket.updatedAt = new Date().toISOString();

  // If support executive replies and status was open or bot_escalated, move to in_progress
  if (message.sender === 'support' && (ticket.status === 'open' || ticket.status === 'bot_escalated')) {
    ticket.status = 'in_progress';
  }

  tickets[index] = { ...ticket };
  saveTickets(tickets);

  // Synchronize message to backend server
  axios.post(`/support/tickets/${ticketId}/messages`, newMsg).catch((err) => {
    console.warn('Backend message sync deferred:', err.message);
  });

  return newMsg;
}

/**
 * Update ticket status
 */
export function updateTicketStatus(ticketId, newStatus) {
  const tickets = getTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return null;

  tickets[index].status = newStatus;
  tickets[index].updatedAt = new Date().toISOString();

  // Add system note
  const statusLabels = {
    open: 'Open',
    in_progress: 'In Progress',
    waiting_passenger: 'Waiting for Passenger',
    waiting_assistant: 'Waiting for Assistant',
    resolved: 'Resolved',
    closed: 'Closed',
  };

  tickets[index].conversation.push({
    id: `msg-${Date.now()}-status`,
    sender: 'system',
    name: 'System',
    text: `Ticket status updated to ${statusLabels[newStatus] || newStatus.toUpperCase()}.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  saveTickets(tickets);

  // Synchronize status to backend server
  axios.patch(`/support/tickets/${ticketId}/status`, { status: newStatus }).catch((err) => {
    console.warn('Backend status sync deferred:', err.message);
  });

  return tickets[index];
}

/**
 * Fetch and synchronize tickets from backend server
 */
export async function fetchServerTickets() {
  try {
    const res = await axios.get('/support/tickets');
    const list = Array.isArray(res.data) ? res.data : [];
    saveTickets(list);
    return {
      success: true,
      tickets: list
    };
  } catch (err) {
    console.warn('Unable to fetch server tickets:', err.message);
    return {
      success: false,
      tickets: [],
      error: err?.response?.data?.message || err?.message || 'Unable to load support tickets'
    };
  }
}

/**
 * Update ticket priority
 */
export function updateTicketPriority(ticketId, newPriority) {
  const tickets = getTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return null;

  tickets[index].priority = newPriority;
  tickets[index].updatedAt = new Date().toISOString();
  saveTickets(tickets);
  return tickets[index];
}

/**
 * Get aggregated statistics for the Admin Support Inbox
 */
export function getSupportStats() {
  const tickets = getTickets();
  return {
    all: tickets.length,
    urgent: tickets.filter((t) => t.priority === 'urgent' || (t.priority === 'high' && t.status !== 'resolved' && t.status !== 'closed')).length,
    open: tickets.filter((t) => t.status === 'open').length,
    botEscalated: tickets.filter((t) => t.isBotEscalated && t.status !== 'resolved' && t.status !== 'closed').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  };
}

/**
 * Subscribe to cross-tab updates
 */
export function subscribeToSupportUpdates(callback) {
  if (!channel) return () => {};
  const handler = (event) => {
    if (event.data?.type === 'TICKETS_UPDATED') {
      callback();
    }
  };
  channel.addEventListener('message', handler);
  return () => {
    channel.removeEventListener('message', handler);
  };
}
