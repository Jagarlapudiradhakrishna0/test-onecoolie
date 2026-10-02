const fs = require('fs');
const path = require('path');
const supabase = require('../config/db');

const TICKETS_FILE = path.join(__dirname, '..', 'data', 'support_tickets.json');

let ioInstance = null;

// Allow injecting Socket.IO instance for real-time ticket alerts
exports.setIO = (io) => {
  ioInstance = io;
};

// Helper to load tickets safely
function loadTickets() {
  try {
    if (!fs.existsSync(TICKETS_FILE)) {
      saveTickets([]);
      return [];
    }
    const raw = fs.readFileSync(TICKETS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading support tickets:', err);
    return [];
  }
}

// Helper to save tickets safely
function saveTickets(tickets) {
  try {
    const dir = path.dirname(TICKETS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving support tickets:', err);
    return false;
  }
}

// Helper to format a Supabase row into a standardized ticket object
function formatDbTicket(row) {
  if (!row) return null;
  const ctx = row.context || {};
  return {
    id: row.ticket_number,
    ticket_number: row.ticket_number,
    created_by: row.created_by,
    passenger_id: row.passenger_id || row.created_by,
    assistant_id: row.assistant_id || null,
    booking_id: row.booking_id || null,
    type: ctx.type || 'passenger',
    subject: row.subject || 'Passenger Assistance Query',
    category: row.category || 'General',
    issueType: row.category || 'General',
    desc: row.description || '',
    description: row.description || '',
    priority: row.priority || 'medium',
    status: row.status || 'open',
    station: ctx.station || 'KZJ',
    pnr: ctx.pnr || 'N/A',
    passengerName: ctx.passengerName || 'Passenger',
    passengerPhone: ctx.passengerPhone || '',
    passengerEmail: ctx.passengerEmail || '',
    trip: ctx.trip || null,
    aiSummary: row.ai_summary || ctx.aiSummary || '',
    conversation: Array.isArray(ctx.conversation) && ctx.conversation.length > 0 ? ctx.conversation : [
      {
        id: `msg-${row.ticket_number}`,
        sender: 'passenger',
        name: ctx.passengerName || 'Passenger',
        text: row.description || row.subject || 'Support ticket raised',
        timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    resolution_notes: ctx.resolution_notes || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Asynchronously persist ticket to Supabase support_tickets table
async function syncTicketToDB(ticket, userId) {
  if (!supabase) return;
  try {
    const creatorId = ticket.created_by || userId;
    if (!creatorId) return;

    const rawPriority = (ticket.priority || '').toLowerCase();
    const validPriority = ['low', 'medium', 'high', 'urgent'].includes(rawPriority)
      ? rawPriority
      : 'medium';

    const rawStatus = (ticket.status || '').toLowerCase();
    const validStatus = ['open', 'in_progress', 'waiting_passenger', 'waiting_assistant', 'resolved', 'closed'].includes(rawStatus)
      ? rawStatus
      : (rawStatus.includes('resolved') ? 'resolved' : 'open');

    await supabase.from('support_tickets').upsert(
      {
        ticket_number: ticket.id,
        created_by: creatorId,
        passenger_id: ticket.passenger_id || creatorId,
        assistant_id: ticket.assistant_id || null,
        booking_id: ticket.booking_id || ticket.trip?.id || ticket.trip?.bookingId || null,
        subject: ticket.subject || 'Passenger Assistance Query',
        description: ticket.description || ticket.desc || 'Support Ticket',
        category: ticket.category || 'General',
        priority: validPriority,
        status: validStatus,
        context: {
          type: ticket.type,
          passengerName: ticket.passengerName,
          passengerPhone: ticket.passengerPhone,
          passengerEmail: ticket.passengerEmail,
          station: ticket.station,
          pnr: ticket.pnr,
          trip: ticket.trip,
          aiSummary: ticket.aiSummary,
          conversation: ticket.conversation || [],
          resolution_notes: ticket.resolution_notes || '',
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ticket_number' }
    );
  } catch (err) {
    console.warn('[SUPPORT DB SYNC] Notice:', err.message);
  }
}

// Rehydrate tickets from Supabase on server boot
async function hydrateTicketsFromDB() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .not('ticket_number', 'ilike', 'OC-TEST-%')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) return;

    const cleanList = data.map(formatDbTicket).filter(Boolean);
    saveTickets(cleanList);
    console.log(`[SUPPORT HYDRATION] Hydrated ${cleanList.length} real tickets from Supabase.`);
  } catch (e) {
    console.warn('[SUPPORT HYDRATION NOTICE]:', e.message);
  }
}
setTimeout(hydrateTicketsFromDB, 1500);

// ----------------------------------------------------
// CREATE TICKET (POST /api/support/tickets or /api/assistants/support-tickets)
// Handles BOTH Passenger Support Tickets and Assistant Operational Dispatches
// ----------------------------------------------------
exports.createTicket = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required to create a support ticket.' });
    }

    const body = req.body || {};
    const isPassenger = user.role === 'passenger';

    const ticketDesc = (body.description || body.desc || body.subject || '').trim();
    if (!ticketDesc) {
      return res.status(400).json({ error: 'Issue description or subject is required.' });
    }

    const stn = (
      body.station ||
      body.trip?.fromCode ||
      body.trip?.station_code ||
      user.station_code ||
      'KZJ'
    ).toUpperCase();

    // Unique production ticket ID generation (Never OC-TEST)
    const existingTickets = loadTickets();
    let ticketNumber = null;
    for (let attempts = 0; attempts < 10; attempts++) {
      const candNum = isPassenger ? `OC-${Math.floor(10000 + Math.random() * 90000)}` : `${stn}-SUP-${Math.floor(1000 + Math.random() * 9000)}`;
      if (!existingTickets.some(t => t.id === candNum)) {
        ticketNumber = candNum;
        break;
      }
    }
    if (!ticketNumber) {
      ticketNumber = isPassenger ? `OC-${Date.now().toString().slice(-5)}` : `${stn}-SUP-${Date.now().toString().slice(-4)}`;
    }

    const initialConversation = Array.isArray(body.conversation) && body.conversation.length > 0
      ? body.conversation
      : Array.isArray(body.initialMessages) && body.initialMessages.length > 0
        ? body.initialMessages
        : [
            {
              id: `msg-${Date.now()}`,
              sender: isPassenger ? 'passenger' : 'assistant',
              name: user.name || body.passengerName || 'Passenger',
              text: ticketDesc,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          ];

    const rawPriority = (body.priority || 'medium').toLowerCase();
    const validPriority = ['low', 'medium', 'high', 'urgent'].includes(rawPriority)
      ? rawPriority
      : 'medium';

    const newTicket = {
      id: ticketNumber,
      ticket_number: ticketNumber,
      type: isPassenger ? 'passenger' : 'assistant',
      subject: body.subject || (isPassenger ? 'Passenger Assistance Query' : 'Station Operational Concern'),
      category: body.category || body.issueType || (isPassenger ? 'Passenger Help' : 'Other Station Concern'),
      issueType: body.issueType || body.category || 'General',
      desc: ticketDesc,
      description: ticketDesc,
      priority: validPriority,
      status: 'open',
      station: stn,
      pnr: body.pnr && body.pnr !== 'N/A' ? String(body.pnr).trim() : (body.trip?.pnr || 'N/A'),

      // AUTHENTICATED PASSENGER ISOLATION:
      // Always derive creator and passenger ownership strictly from authenticated user
      created_by: user.id,
      passenger_id: isPassenger ? user.id : (body.passenger_id || null),
      passengerName: user.name || body.passengerName || 'Passenger',
      passengerPhone: user.phone || body.passengerPhone || '',
      passengerEmail: user.email || body.passengerEmail || '',

      trip: body.trip || null,
      aiSummary: body.aiSummary || '',
      conversation: initialConversation,

      // Assistant Details
      assistant_id: isPassenger ? null : (user.id || body.assistant_id || null),
      assistant_name: isPassenger ? null : (user.name || body.assistant_name || 'On-Duty Assistant'),
      assistant_phone: isPassenger ? null : (user.phone || body.assistant_phone || 'N/A'),
      resolution_notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert directly into real Supabase database table
    if (supabase) {
      try {
        const { error: dbErr } = await supabase.from('support_tickets').insert({
          ticket_number: ticketNumber,
          created_by: user.id,
          passenger_id: isPassenger ? user.id : (body.passenger_id || null),
          assistant_id: isPassenger ? null : (user.id || body.assistant_id || null),
          booking_id: body.booking_id || body.trip?.id || body.trip?.bookingId || null,
          category: newTicket.category,
          subject: newTicket.subject,
          description: ticketDesc,
          priority: validPriority,
          status: 'open',
          context: {
            type: newTicket.type,
            passengerName: newTicket.passengerName,
            passengerPhone: newTicket.passengerPhone,
            passengerEmail: newTicket.passengerEmail,
            station: stn,
            pnr: newTicket.pnr,
            trip: newTicket.trip,
            aiSummary: newTicket.aiSummary,
            conversation: newTicket.conversation,
            resolution_notes: ''
          }
        });
        if (dbErr) {
          console.warn('[SUPPORT DB INSERT NOTICE]:', dbErr.message);
        }
      } catch (insertErr) {
        console.warn('[SUPPORT DB INSERT ERROR]:', insertErr.message);
      }
    }

    // Prepend to local file backup
    const tickets = loadTickets();
    tickets.unshift(newTicket);
    saveTickets(tickets);

    // Socket.io real-time alerts
    if (ioInstance) {
      try {
        ioInstance.to('admin_room').emit('new_support_ticket', newTicket);
        ioInstance.to(`passenger_${user.id}`).emit('new_support_ticket', newTicket);
      } catch (ioErr) {
        console.warn('Socket broadcast warning:', ioErr.message);
      }
    }

    console.log(`[SUPPORT TICKET] New ticket #${ticketNumber} created by user ${user.id} (${user.role})`);
    return res.status(201).json(newTicket);
  } catch (err) {
    console.error('Create ticket error:', err);
    return res.status(500).json({ error: 'Failed to create support ticket.' });
  }
};

// ----------------------------------------------------
// GET ASSISTANT TICKETS (GET /api/assistants/support-tickets)
// ----------------------------------------------------
exports.getAssistantTickets = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    let tickets = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .or(`assistant_id.eq.${user.id},created_by.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          tickets = data.map(formatDbTicket).filter(Boolean);
          return res.json(tickets);
        }
      } catch (dbErr) {
        console.warn('Assistant tickets DB fetch notice:', dbErr.message);
      }
    }

    tickets = loadTickets().filter(
      (t) => t.type === 'assistant' && (t.assistant_id === user.id || t.created_by === user.id)
    );
    return res.json(tickets);
  } catch (err) {
    console.error('Get assistant tickets error:', err);
    return res.status(500).json({ error: 'Failed to retrieve support tickets.' });
  }
};

// ----------------------------------------------------
// GET ALL TICKETS (GET /api/admin/support-tickets or /api/support/tickets)
// Strictly enforces authenticated passenger isolation
// ----------------------------------------------------
exports.getAllTickets = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { station, status, priority, type, q } = req.query;

    // 1. Query Supabase directly
    let dbTickets = null;
    if (supabase) {
      try {
        let query = supabase.from('support_tickets').select('*').not('ticket_number', 'ilike', 'OC-TEST-%').order('created_at', { ascending: false });

        if (user.role === 'passenger') {
          // PASSENGER ISOLATION:
          // Must only retrieve tickets created by or assigned to this passenger
          query = query.or(`created_by.eq.${user.id},passenger_id.eq.${user.id}`);
        } else if (user.role === 'assistant') {
          query = query.or(`assistant_id.eq.${user.id},created_by.eq.${user.id}`);
        }
        // Admin gets all tickets without user filter

        if (status && status !== 'ALL') {
          query = query.ilike('status', status);
        }
        if (priority && priority !== 'ALL') {
          query = query.ilike('priority', priority);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          dbTickets = data.map(formatDbTicket).filter(Boolean);
        }
      } catch (dbErr) {
        console.warn('Supabase query error in getAllTickets:', dbErr.message);
      }
    }

    // 2. Use dbTickets or file backup filtered strictly by user role
    let tickets = dbTickets !== null ? dbTickets : loadTickets();

    if (dbTickets === null) {
      if (user.role === 'passenger') {
        tickets = tickets.filter((t) => t.created_by === user.id || t.passenger_id === user.id);
      } else if (user.role === 'assistant') {
        tickets = tickets.filter((t) => t.assistant_id === user.id || t.created_by === user.id);
      }
    }

    // Filter out any lingering test tickets
    tickets = tickets.filter((t) => !String(t.id || t.ticket_number || '').includes('TEST'));

    // Additional query filters (station, type, q)
    if (type && type !== 'ALL') {
      tickets = tickets.filter((t) => t.type === type);
    }
    if (station && station !== 'ALL') {
      tickets = tickets.filter((t) => (t.station || '').toUpperCase() === station.toUpperCase());
    }
    if (q) {
      const queryStr = q.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          (t.id && t.id.toLowerCase().includes(queryStr)) ||
          (t.subject && t.subject.toLowerCase().includes(queryStr)) ||
          (t.pnr && t.pnr.toLowerCase().includes(queryStr)) ||
          (t.passengerName && t.passengerName.toLowerCase().includes(queryStr)) ||
          (t.desc && t.desc.toLowerCase().includes(queryStr)) ||
          (t.description && t.description.toLowerCase().includes(queryStr)) ||
          (t.category && t.category.toLowerCase().includes(queryStr))
      );
    }

    return res.json(tickets);
  } catch (err) {
    console.error('Get all tickets error:', err);
    return res.status(500).json({ error: 'Failed to retrieve support tickets.' });
  }
};

// ----------------------------------------------------
// GET TICKET BY ID (GET /api/support/tickets/:id)
// Validates ownership for passengers and assistants
// ----------------------------------------------------
exports.getTicketById = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { id } = req.params;
    const cleanId = String(id).trim().toLowerCase().replace('#', '');

    let ticket = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .ilike('ticket_number', cleanId)
          .maybeSingle();

        if (!error && data) {
          ticket = formatDbTicket(data);
        }
      } catch (dbErr) {
        console.warn('Supabase getTicketById notice:', dbErr.message);
      }
    }

    if (!ticket) {
      const tickets = loadTickets();
      ticket = tickets.find((t) => String(t.id).toLowerCase().replace('#', '') === cleanId);
    }

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    // STRICT AUTHORIZATION CHECK:
    // Only admins or the authenticated creator/passenger/assigned assistant can access
    if (user.role !== 'admin') {
      const isOwner =
        ticket.created_by === user.id ||
        ticket.passenger_id === user.id ||
        (user.role === 'assistant' && ticket.assistant_id === user.id);

      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to view this ticket.' });
      }
    }

    return res.json(ticket);
  } catch (err) {
    console.error('Get ticket error:', err);
    return res.status(500).json({ error: 'Failed to retrieve ticket.' });
  }
};

// ----------------------------------------------------
// ADD MESSAGE TO TICKET (POST /api/support/tickets/:id/messages)
// ----------------------------------------------------
exports.addMessageToTicket = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { id } = req.params;
    const { text, sender, name, id: clientMsgId, clientMessageId } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const cleanText = String(text).trim().slice(0, 2000);
    const cleanId = String(id).trim().toLowerCase().replace('#', '');

    // 1. Fetch current ticket from DB or fallback
    let ticket = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .ilike('ticket_number', cleanId)
          .maybeSingle();
        if (!error && data) {
          ticket = formatDbTicket(data);
        }
      } catch (dbErr) {
        console.warn('Supabase fetch ticket error in addMessage:', dbErr.message);
      }
    }

    if (!ticket) {
      const tickets = loadTickets();
      ticket = tickets.find((t) => String(t.id).toLowerCase().replace('#', '') === cleanId);
    }

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    // STRICT AUTHORIZATION CHECK:
    if (user.role !== 'admin') {
      const isOwner =
        ticket.created_by === user.id ||
        ticket.passenger_id === user.id ||
        (user.role === 'assistant' && ticket.assistant_id === user.id);

      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied: You cannot post messages to this ticket.' });
      }
    }

    // Determine authoritative sender from authenticated user
    const authorSender = user.role === 'admin'
      ? 'support'
      : (user.role === 'assistant' ? 'assistant' : 'passenger');
    const authorName = user.name || name || (authorSender === 'support' ? 'Support Desk' : 'Passenger');

    const effectiveId = clientMessageId || clientMsgId || `msg-${Date.now()}`;

    if (!Array.isArray(ticket.conversation)) {
      ticket.conversation = [];
    }

    // Strict idempotency: prevent duplicate message insertion
    const alreadyExists = ticket.conversation.some((m) => {
      if (m.id && (m.id === effectiveId || m.clientMessageId === effectiveId)) {
        return true;
      }
      if (m.sender === authorSender && m.text === cleanText) {
        const mTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
        return mTime > 0 && Math.abs(Date.now() - mTime) < 5000;
      }
      return false;
    });

    if (alreadyExists) {
      return res.json(ticket);
    }

    const newMsg = {
      id: effectiveId,
      clientMessageId: effectiveId,
      sender: authorSender,
      name: authorName,
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    ticket.conversation.push(newMsg);
    ticket.updated_at = new Date().toISOString();
    ticket.updatedAt = new Date().toISOString();

    // Auto-advance open ticket to in_progress upon support agent response
    if (newMsg.sender === 'support' && (ticket.status === 'open' || ticket.status === 'Dispatched to Station Supervisor')) {
      ticket.status = 'in_progress';
    }

    // Save in file backup
    const tickets = loadTickets();
    const idx = tickets.findIndex((t) => String(t.id).toLowerCase().replace('#', '') === cleanId);
    if (idx !== -1) {
      tickets[idx] = ticket;
    } else {
      tickets.unshift(ticket);
    }
    saveTickets(tickets);

    // Save in Supabase
    if (supabase) {
      try {
        await supabase
          .from('support_tickets')
          .update({
            status: ticket.status,
            context: {
              type: ticket.type,
              passengerName: ticket.passengerName,
              passengerPhone: ticket.passengerPhone,
              passengerEmail: ticket.passengerEmail,
              station: ticket.station,
              pnr: ticket.pnr,
              trip: ticket.trip,
              aiSummary: ticket.aiSummary,
              conversation: ticket.conversation,
              resolution_notes: ticket.resolution_notes || ''
            },
            updated_at: ticket.updated_at
          })
          .ilike('ticket_number', cleanId);
      } catch (dbUpErr) {
        console.warn('Supabase update notice in addMessage:', dbUpErr.message);
      }
    }

    if (ioInstance) {
      try {
        ioInstance.emit('ticket_message', { ticketId: ticket.id, message: newMsg });
        if (ticket.passenger_id) {
          ioInstance.to(`passenger_${ticket.passenger_id}`).emit('ticket_message', { ticketId: ticket.id, message: newMsg });
        }
      } catch (ioErr) {
        console.warn('Socket broadcast warning:', ioErr.message);
      }
    }

    return res.json(ticket);
  } catch (err) {
    console.error('Add ticket message error:', err);
    return res.status(500).json({ error: 'Failed to add message to ticket conversation.' });
  }
};

// ----------------------------------------------------
// UPDATE TICKET STATUS (PATCH /api/admin/support-tickets/:id or /api/support/tickets/:id/status)
// ----------------------------------------------------
exports.updateTicketStatus = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { id } = req.params;
    const { status, resolution_notes, resolutionNotes } = req.body;
    const cleanId = String(id).trim().toLowerCase().replace('#', '');

    const tickets = loadTickets();
    const index = tickets.findIndex((t) => String(t.id).toLowerCase().replace('#', '') === cleanId);

    if (index === -1) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    // AUTHORIZATION ENFORCEMENT:
    // Non-admin can only resolve or close their own ticket
    if (user.role !== 'admin') {
      const isOwner =
        tickets[index].created_by === user.id ||
        tickets[index].passenger_id === user.id;

      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to update this ticket.' });
      }

      if (status && !['resolved', 'closed'].includes(status.toLowerCase())) {
        return res.status(403).json({ error: 'Passengers can only mark tickets as resolved or closed.' });
      }
    }

    const previousStatus = tickets[index].status;
    if (status) {
      tickets[index].status = status;
    }
    const notes = resolution_notes !== undefined ? resolution_notes : resolutionNotes;
    if (notes !== undefined) {
      tickets[index].resolution_notes = notes;
    }
    tickets[index].updated_at = new Date().toISOString();
    tickets[index].updatedAt = new Date().toISOString();

    // Append system note to conversation
    if (!Array.isArray(tickets[index].conversation)) {
      tickets[index].conversation = [];
    }
    tickets[index].conversation.push({
      id: `sys-${Date.now()}`,
      sender: 'system',
      name: 'System',
      text: `Ticket status updated to "${tickets[index].status}".${notes ? ` Note: ${notes}` : ''}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    saveTickets(tickets);

    // Sync to Supabase
    if (supabase) {
      try {
        await supabase
          .from('support_tickets')
          .update({
            status: tickets[index].status,
            context: {
              type: tickets[index].type,
              passengerName: tickets[index].passengerName,
              passengerPhone: tickets[index].passengerPhone,
              passengerEmail: tickets[index].passengerEmail,
              station: tickets[index].station,
              pnr: tickets[index].pnr,
              trip: tickets[index].trip,
              aiSummary: tickets[index].aiSummary,
              conversation: tickets[index].conversation,
              resolution_notes: notes || tickets[index].resolution_notes || ''
            },
            resolved_at: ['resolved', 'closed'].includes(tickets[index].status) ? new Date().toISOString() : null,
            resolved_by: ['resolved', 'closed'].includes(tickets[index].status) ? user.id : null,
            updated_at: tickets[index].updated_at
          })
          .ilike('ticket_number', cleanId);
      } catch (dbErr) {
        console.warn('Supabase status update notice:', dbErr.message);
      }
    }

    if (user.role === 'admin') {
      try {
        const { logAdminAction } = require('../services/adminAuditService');
        await logAdminAction({
          req,
          action: 'support_ticket_status_updated',
          resource_type: 'support_ticket',
          resource_id: tickets[index].id,
          result: 'success',
          metadata: {
            before: { status: previousStatus },
            after: { status: tickets[index].status },
            resolution_notes: notes || null
          }
        });
      } catch (auditErr) {
        console.warn('Audit logging notice in supportController:', auditErr.message);
      }
    }

    if (ioInstance) {
      try {
        ioInstance.emit('ticket_status_updated', {
          ticketId: tickets[index].id,
          status: tickets[index].status,
          ticket: tickets[index]
        });
        if (tickets[index].passenger_id) {
          ioInstance.to(`passenger_${tickets[index].passenger_id}`).emit('ticket_status_updated', {
            ticketId: tickets[index].id,
            status: tickets[index].status,
            ticket: tickets[index]
          });
        }
      } catch (ioErr) {
        console.warn('Socket broadcast warning:', ioErr.message);
      }
    }

    console.log(`[SUPPORT TICKET] Ticket #${tickets[index].id} status updated to "${tickets[index].status}".`);
    return res.json(tickets[index]);
  } catch (err) {
    console.error('Update ticket error:', err);
    return res.status(500).json({ error: 'Failed to update ticket status.' });
  }
};
