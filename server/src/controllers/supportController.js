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
      const initialTickets = [
        {
          id: 'KZJ-SUP-9102',
          type: 'assistant',
          subject: 'Luggage Assistance Dispute',
          category: 'Luggage Assistance Dispute',
          assistant_id: 'sample-assistant-id',
          assistant_name: 'Sai Coolie',
          assistant_phone: '+91 98480 22338',
          station: 'KZJ',
          pnr: '2489012431',
          desc: 'Passenger luggage exceeded 45kg; guidance provided for excess baggage tariff.',
          description: 'Passenger luggage exceeded 45kg; guidance provided for excess baggage tariff.',
          priority: 'normal',
          status: 'Resolved by Station Master',
          resolution_notes: 'Station Master issued excess luggage receipt to passenger.',
          created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          conversation: [
            {
              id: 'msg-seed-1',
              sender: 'assistant',
              name: 'Sai Coolie',
              text: 'Passenger luggage exceeded 45kg; guidance provided for excess baggage tariff.',
              timestamp: '02:30 PM'
            },
            {
              id: 'msg-seed-2',
              sender: 'support',
              name: 'Station Supervisor',
              text: 'Station Master issued excess luggage receipt to passenger.',
              timestamp: '03:15 PM'
            }
          ]
        }
      ];
      saveTickets(initialTickets);
      return initialTickets;
    }
    const raw = fs.readFileSync(TICKETS_FILE, 'utf8');
    return JSON.parse(raw);
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

// Asynchronously persist ticket to Supabase support_tickets table
async function syncTicketToDB(ticket, userId) {
  if (!supabase) return;
  try {
    let creatorId = userId;
    if (!creatorId) {
      const { data: userRow } = await supabase.from('users').select('id').limit(1);
      creatorId = userRow?.[0]?.id || null;
    }
    if (!creatorId) return;

    const rawPriority = (ticket.priority || '').toLowerCase();
    const validPriority = ['low', 'medium', 'high', 'urgent'].includes(rawPriority)
      ? rawPriority
      : (rawPriority === 'normal' ? 'medium' : 'medium');

    const rawStatus = (ticket.status || '').toLowerCase();
    const validStatus = ['open', 'in_progress', 'waiting_passenger', 'waiting_assistant', 'resolved', 'closed'].includes(rawStatus)
      ? rawStatus
      : (rawStatus.includes('resolved') ? 'resolved' : 'open');

    await supabase.from('support_tickets').upsert(
      {
        ticket_number: ticket.id,
        created_by: creatorId,
        subject: ticket.subject || 'Passenger Assistance',
        description: ticket.description || ticket.desc || 'Support Ticket',
        category: ticket.category || 'Other',
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
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error || !Array.isArray(data) || data.length === 0) return;

    const tickets = loadTickets();
    const ticketMap = new Map();
    tickets.forEach((t) => ticketMap.set(String(t.id).toLowerCase().replace('#', ''), t));

    for (const row of data) {
      const idKey = String(row.ticket_number).toLowerCase().replace('#', '');
      const ctx = row.context || {};
      const hydrated = {
        id: row.ticket_number,
        type: ctx.type || 'passenger',
        subject: row.subject,
        category: row.category,
        issueType: row.category,
        desc: row.description,
        description: row.description,
        priority: row.priority,
        status: row.status,
        station: ctx.station || 'KZJ',
        pnr: ctx.pnr || 'N/A',
        passengerName: ctx.passengerName || 'Passenger',
        passengerPhone: ctx.passengerPhone || '',
        passengerEmail: ctx.passengerEmail || '',
        trip: ctx.trip || null,
        aiSummary: row.ai_summary || ctx.aiSummary || '',
        conversation: Array.isArray(ctx.conversation) ? ctx.conversation : [],
        resolution_notes: ctx.resolution_notes || '',
        created_at: row.created_at,
        updated_at: row.updated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      ticketMap.set(idKey, hydrated);
    }
    const merged = Array.from(ticketMap.values()).sort(
      (a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
    );
    saveTickets(merged);
  } catch (e) {
    console.warn('[SUPPORT HYDRATION NOTICE]:', e.message);
  }
}
setTimeout(hydrateTicketsFromDB, 2000);

// ----------------------------------------------------
// CREATE TICKET (POST /api/support/tickets or /api/assistants/support-tickets)
// Handles BOTH Passenger Support Tickets and Assistant Operational Dispatches
// ----------------------------------------------------
exports.createTicket = async (req, res) => {
  try {
    const body = req.body || {};
    const isPassenger =
      body.type === 'passenger' ||
      Boolean(body.passengerName) ||
      Boolean(body.subject && !body.assistant_name) ||
      req.user?.role === 'passenger';

    const ticketDesc = (body.description || body.desc || body.subject || '').trim();
    if (!ticketDesc) {
      return res.status(400).json({ error: 'Issue description or subject is required.' });
    }

    const stn = (
      body.station ||
      body.trip?.fromCode ||
      body.trip?.station_code ||
      req.user?.station_code ||
      'KZJ'
    ).toUpperCase();

    const idPrefix = isPassenger ? 'OC' : stn;
    const generatedNum = Math.floor(10000 + Math.random() * 90000);
    const id = body.id || (isPassenger ? `OC-${generatedNum}` : `${stn}-SUP-${Math.floor(1000 + Math.random() * 9000)}`);

    const newTicket = {
      id,
      type: isPassenger ? 'passenger' : 'assistant',
      subject: body.subject || body.category || (isPassenger ? 'Passenger Assistance Query' : 'Station Operational Concern'),
      category: body.category || body.issueType || (isPassenger ? 'Passenger Help' : 'Other Station Concern'),
      issueType: body.issueType || body.category || 'General',
      desc: ticketDesc,
      description: ticketDesc,
      priority: body.priority === 'urgent' || body.priority === 'high' ? 'urgent' : (body.priority || 'normal'),
      status: body.status || (isPassenger ? 'open' : 'Dispatched to Station Supervisor'),
      station: stn,
      pnr: body.pnr && body.pnr !== 'N/A' ? String(body.pnr).trim() : (body.trip?.pnr || 'N/A'),

      // Passenger Details
      passenger_id: req.user?.role === 'passenger' ? req.user.id : (body.passenger_id || null),
      passengerName: body.passengerName || (req.user?.role === 'passenger' ? req.user.name : 'Passenger'),
      passengerPhone: body.passengerPhone || (req.user?.role === 'passenger' ? req.user.phone : '+91 98765 43210'),
      passengerEmail: body.passengerEmail || (req.user?.role === 'passenger' ? req.user.email : 'passenger@onecoolie.com'),
      trip: body.trip || null,
      aiSummary: body.aiSummary || '',

      // Conversation Messages Array
      conversation: Array.isArray(body.conversation) && body.conversation.length > 0
        ? body.conversation
        : Array.isArray(body.initialMessages) && body.initialMessages.length > 0
          ? body.initialMessages
          : [
              {
                id: `msg-${Date.now()}`,
                sender: isPassenger ? 'passenger' : 'assistant',
                name: isPassenger ? (body.passengerName || req.user?.name || 'Passenger') : (req.user?.name || 'Assistant'),
                text: ticketDesc,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
            ],

      // Assistant Details (for operational station issues)
      assistant_id: isPassenger ? null : (req.user?.id || body.assistant_id || 'unknown'),
      assistant_name: isPassenger ? null : (req.user?.name || body.assistant_name || 'On-Duty Assistant'),
      assistant_phone: isPassenger ? null : (req.user?.phone || body.assistant_phone || 'N/A'),
      resolution_notes: body.resolution_notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tickets = loadTickets();
    // Prepend new ticket so it appears at top of list
    tickets.unshift(newTicket);
    saveTickets(tickets);

    // Asynchronously sync to Supabase support_tickets table
    syncTicketToDB(newTicket, req.user?.id);

    // Real-time broadcast to Admin room
    if (ioInstance) {
      try {
        ioInstance.to('admin_room').emit('new_support_ticket', newTicket);
      } catch (ioErr) {
        console.warn('Socket broadcast warning:', ioErr.message);
      }
    }

    console.log(`[SUPPORT TICKET] New ticket #${id} (${newTicket.type}) created at station ${stn}`);
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
    const assistantId = req.user?.id;
    const tickets = loadTickets();
    
    // Return tickets created by this assistant, station operational tickets, or sample assistant tickets
    const userTickets = tickets.filter(
      (t) =>
        t.type === 'assistant' &&
        (t.assistant_id === assistantId || t.assistant_id === 'sample-assistant-id' || !t.assistant_id || t.assistant_id === 'unknown')
    );

    return res.json(userTickets);
  } catch (err) {
    console.error('Get assistant tickets error:', err);
    return res.status(500).json({ error: 'Failed to retrieve support tickets.' });
  }
};

// ----------------------------------------------------
// GET ALL TICKETS (GET /api/admin/support-tickets or /api/support/tickets)
// ----------------------------------------------------
exports.getAllTickets = async (req, res) => {
  try {
    const { station, status, priority, type, q } = req.query;
    let tickets = loadTickets();

    if (type && type !== 'ALL') {
      tickets = tickets.filter((t) => t.type === type);
    }
    if (station && station !== 'ALL') {
      tickets = tickets.filter((t) => t.station === station);
    }
    if (status && status !== 'ALL') {
      const s = status.toLowerCase();
      tickets = tickets.filter((t) => (t.status || '').toLowerCase() === s);
    }
    if (priority && priority !== 'ALL') {
      const p = priority.toLowerCase();
      tickets = tickets.filter((t) => (t.priority || '').toLowerCase() === p);
    }
    if (q) {
      const query = q.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          (t.id && t.id.toLowerCase().includes(query)) ||
          (t.subject && t.subject.toLowerCase().includes(query)) ||
          (t.pnr && t.pnr.toLowerCase().includes(query)) ||
          (t.assistant_name && t.assistant_name.toLowerCase().includes(query)) ||
          (t.passengerName && t.passengerName.toLowerCase().includes(query)) ||
          (t.desc && t.desc.toLowerCase().includes(query)) ||
          (t.description && t.description.toLowerCase().includes(query)) ||
          (t.category && t.category.toLowerCase().includes(query))
      );
    }

    return res.json(tickets);
  } catch (err) {
    console.error('Get all tickets error:', err);
    return res.status(500).json({ error: 'Failed to retrieve tickets for Admin.' });
  }
};

// ----------------------------------------------------
// GET TICKET BY ID (GET /api/support/tickets/:id)
// ----------------------------------------------------
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const tickets = loadTickets();
    const cleanId = String(id).trim().toLowerCase().replace('#', '');
    const ticket = tickets.find((t) => String(t.id).toLowerCase().replace('#', '') === cleanId);

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found.' });
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
    const { id } = req.params;
    const { text, sender, name } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const tickets = loadTickets();
    const cleanId = String(id).trim().toLowerCase().replace('#', '');
    const index = tickets.findIndex((t) => String(t.id).toLowerCase().replace('#', '') === cleanId);

    if (index === -1) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    const defaultSender = req.user?.role === 'admin' ? 'support' : (req.user?.role === 'assistant' ? 'assistant' : 'passenger');
    const defaultName = req.user?.name || (defaultSender === 'support' ? 'Support Desk' : 'Passenger');

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: sender || defaultSender,
      name: name || defaultName,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (!Array.isArray(tickets[index].conversation)) {
      tickets[index].conversation = [];
    }

    tickets[index].conversation.push(newMsg);
    tickets[index].updated_at = new Date().toISOString();
    tickets[index].updatedAt = new Date().toISOString();

    // Auto-advance open ticket to in_progress upon support agent response
    if (newMsg.sender === 'support' && (tickets[index].status === 'open' || tickets[index].status === 'Dispatched to Station Supervisor')) {
      tickets[index].status = 'in_progress';
    }

    saveTickets(tickets);

    // Asynchronously sync message update to Supabase support_tickets table
    syncTicketToDB(tickets[index], req.user?.id);

    if (ioInstance) {
      try {
        ioInstance.emit('ticket_message', { ticketId: tickets[index].id, message: newMsg });
      } catch (ioErr) {
        console.warn('Socket broadcast warning:', ioErr.message);
      }
    }

    return res.json(tickets[index]);
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
    const { id } = req.params;
    const { status, resolution_notes, resolutionNotes } = req.body;

    const tickets = loadTickets();
    const cleanId = String(id).trim().toLowerCase().replace('#', '');
    const index = tickets.findIndex((t) => String(t.id).toLowerCase().replace('#', '') === cleanId);

    if (index === -1) {
      return res.status(404).json({ error: 'Support ticket not found.' });
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

    // Append a system note to conversation
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

    // Asynchronously sync status update to Supabase support_tickets table
    syncTicketToDB(tickets[index], req.user?.id);

    if (req.user?.role === 'admin') {
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
