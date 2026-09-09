import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api/axios';
import { getTickets, subscribeToSupportUpdates, addTicketMessage, updateTicketStatus } from '../../utils/supportStore';
import { Search, Filter, Clock, CheckCircle, MessageSquare, Train, User, Phone, Send, MoreVertical, ShieldAlert, RefreshCw, AlertCircle, Briefcase, MapPin } from 'lucide-react';

export default function SupportInbox({ initialTickets = null, selectedTicketIdProp = null }) {
  const [tickets, setTickets] = useState(initialTickets || []);
  const [selectedTicketId, setSelectedTicketId] = useState(selectedTicketIdProp || null);
  const [filter, setFilter] = useState('all'); // all, open, passenger, assistant, resolved
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (initialTickets && Array.isArray(initialTickets) && initialTickets.length > 0) {
      setTickets(initialTickets);
    }
  }, [initialTickets]);

  useEffect(() => {
    if (selectedTicketIdProp) {
      setSelectedTicketId(selectedTicketIdProp);
      // Ensure filter doesn't hide it
      setFilter('all');
    }
  }, [selectedTicketIdProp]);

  const fetchTickets = async () => {
    try {
      setIsRefreshing(true);
      // Try backend admin endpoint first, falling back to public support endpoint
      const res = await axios.get('/admin/support-tickets').catch(() => axios.get('/support/tickets')).catch(() => null);
      const incoming = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.tickets) ? res.data.tickets : null);
      if (incoming !== null) {
        setTickets(incoming);
        return;
      }
    } catch (e) {
      console.warn('SupportInbox backend fetch deferred, reading local store:', e);
    } finally {
      setIsRefreshing(false);
    }
    // Fallback to local store
    setTickets(getTickets());
  };

  useEffect(() => {
    fetchTickets();
    const unsubscribe = subscribeToSupportUpdates(fetchTickets);
    const interval = setInterval(fetchTickets, 5000); // 5-second live refresh for real-time responsiveness

    // Socket.IO real-time listeners — fires when assistant raises a ticket or updates one
    const handleSocketEvent = () => fetchTickets();
    if (window.socket) {
      window.socket.on('new_support_ticket', handleSocketEvent);
      window.socket.on('ticket_status_updated', handleSocketEvent);
      window.socket.on('ticket_message', handleSocketEvent);
    }

    return () => {
      unsubscribe();
      clearInterval(interval);
      if (window.socket) {
        window.socket.off('new_support_ticket', handleSocketEvent);
        window.socket.off('ticket_status_updated', handleSocketEvent);
        window.socket.off('ticket_message', handleSocketEvent);
      }
    };
  }, []);

  // Default selection to first ticket if none selected
  useEffect(() => {
    if (!selectedTicketId && tickets.length > 0) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const selectedTicket = tickets.find(
    (t) => String(t.id).toLowerCase().replace('#', '') === String(selectedTicketId || '').toLowerCase().replace('#', '')
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.conversation]);

  const filteredTickets = tickets.filter((t) => {
    const s = (t.status || '').toLowerCase();
    const isResolved = ['resolved', 'closed', 'resolved by station master'].includes(s);
    const isOpen = !isResolved;

    if (filter === 'open' && !isOpen) return false;
    if (filter === 'resolved' && !isResolved) return false;
    if (filter === 'passenger' && t.type !== 'passenger') return false;
    if (filter === 'assistant' && t.type === 'passenger') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.passengerName && t.passengerName.toLowerCase().includes(q)) ||
        (t.assistant_name && t.assistant_name.toLowerCase().includes(q)) ||
        (t.pnr && t.pnr.toLowerCase().includes(q)) ||
        (t.desc && t.desc.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return true;
  });

  const handleReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !selectedTicket || isSending) return;

    setIsSending(true);
    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'support',
      name: 'Station Desk Support',
      text: replyText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // 1. Optimistic UI update
    const updatedConv = [...(selectedTicket.conversation || []), newMsg];
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicket.id ? { ...t, conversation: updatedConv, status: 'in_progress' } : t))
    );
    setReplyText('');

    // 2. Sync to local supportStore
    addTicketMessage(selectedTicket.id, newMsg);

    // 3. Sync to backend API
    try {
      await axios.post(`/support/tickets/${selectedTicket.id}/messages`, newMsg);
    } catch (err) {
      console.warn('Backend message sync error:', err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;

    // 1. Optimistic UI update
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
    );

    // 2. Sync to local store
    updateTicketStatus(selectedTicket.id, newStatus);

    // 3. Sync to backend API
    try {
      await axios.patch(`/admin/support-tickets/${selectedTicket.id}`, { status: newStatus }).catch(async () => {
        await axios.patch(`/support/tickets/${selectedTicket.id}/status`, { status: newStatus });
      });
    } catch (err) {
      console.warn('Backend status update error:', err.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[750px] max-h-[85vh] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm font-sans">
      
      {/* 1. Sidebar List */}
      <div className="w-full md:w-84 border-r border-slate-200 dark:border-zinc-800 flex flex-col bg-slate-50 dark:bg-zinc-950 shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Live Support Desk</span>
            </h2>
            <button
              type="button"
              onClick={fetchTickets}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search passenger, PNR, issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-black dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl text-[11px] font-bold gap-0.5 overflow-x-auto">
            <button 
              onClick={() => setFilter('all')}
              className={`flex-1 py-1 px-2 rounded-lg transition-colors whitespace-nowrap text-center ${filter === 'all' ? 'bg-white dark:bg-zinc-700 shadow-2xs text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'}`}
            >
              All ({tickets.length})
            </button>
            <button 
              onClick={() => setFilter('open')}
              className={`flex-1 py-1 px-2 rounded-lg transition-colors whitespace-nowrap text-center ${filter === 'open' ? 'bg-white dark:bg-zinc-700 shadow-2xs text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setFilter('passenger')}
              className={`flex-1 py-1 px-2 rounded-lg transition-colors whitespace-nowrap text-center ${filter === 'passenger' ? 'bg-white dark:bg-zinc-700 shadow-2xs text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'}`}
            >
              Passenger
            </button>
            <button 
              onClick={() => setFilter('assistant')}
              className={`flex-1 py-1 px-2 rounded-lg transition-colors whitespace-nowrap text-center ${filter === 'assistant' ? 'bg-white dark:bg-zinc-700 shadow-2xs text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'}`}
            >
              Sahayak
            </button>
            <button 
              onClick={() => setFilter('resolved')}
              className={`flex-1 py-1 px-2 rounded-lg transition-colors whitespace-nowrap text-center ${filter === 'resolved' ? 'bg-white dark:bg-zinc-700 shadow-2xs text-emerald-600' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'}`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTickets.map((ticket) => {
            const isSelected = String(ticket.id).toLowerCase().replace('#', '') === String(selectedTicketId || '').toLowerCase().replace('#', '');
            const isResolved = ['resolved', 'closed', 'resolved by station master'].includes((ticket.status || '').toLowerCase());
            const isAssistant = ticket.type === 'assistant' || Boolean(ticket.assistant_name && !ticket.passengerName);

            return (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-xs' 
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex justify-between items-start gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold font-mono text-slate-500 dark:text-zinc-400">
                      #{ticket.id}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                      isAssistant ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                    }`}>
                      {isAssistant ? 'Sahayak' : 'Passenger'}
                    </span>
                  </div>

                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    isResolved ? 'bg-emerald-500' : 
                    ticket.priority === 'urgent' || ticket.priority === 'high' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                  }`} />
                </div>

                <h4 className={`font-bold text-xs truncate pr-1 ${isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-slate-900 dark:text-white'}`}>
                  {ticket.subject || ticket.category || 'Support Inquiry'}
                </h4>

                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="truncate">
                    {ticket.passengerName || ticket.assistant_name || 'Passenger'}
                  </span>
                  {ticket.station && (
                    <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                      {ticket.station}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {filteredTickets.length === 0 && (
            <div className="text-center p-8 text-slate-400 dark:text-zinc-500 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-zinc-700 opacity-60" />
              <p className="font-semibold">No tickets found</p>
              <p className="text-[10px] mt-0.5">Tickets created by passengers or assistants will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Active Thread View */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 min-w-0">
        {selectedTicket ? (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900 shadow-2xs z-10">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {selectedTicket.subject || selectedTicket.category}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                    ['resolved', 'closed', 'resolved by station master'].includes((selectedTicket.status || '').toLowerCase())
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                  }`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                  Ticket #{selectedTicket.id} · Station: {selectedTicket.station || 'KZJ'} · Created: {new Date(selectedTicket.created_at || selectedTicket.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {['resolved', 'closed', 'resolved by station master'].includes((selectedTicket.status || '').toLowerCase()) ? (
                  <button 
                    type="button"
                    onClick={() => handleStatusChange('open')}
                    className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-xs rounded-xl transition-colors border border-amber-200 dark:border-amber-800 cursor-pointer"
                  >
                    Reopen Ticket
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => handleStatusChange('Resolved by Station Master')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                )}
              </div>
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-zinc-950 space-y-4">
              {/* Ticket description card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  <span>Initial Issue Report:</span>
                  <span className="font-mono text-[10px]">{selectedTicket.category || selectedTicket.issueType}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 leading-relaxed">
                  {selectedTicket.description || selectedTicket.desc}
                </p>
              </div>

              {selectedTicket.aiSummary && (
                <div className="bg-[#0A0A0A] rounded-2xl p-4 text-white shadow-md border border-zinc-800">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <h4 className="font-bold text-xs text-rose-400 uppercase tracking-wider">AI Escalation Summary</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">{selectedTicket.aiSummary}</p>
                </div>
              )}

              {/* Chat messages */}
              {selectedTicket.conversation?.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'support' ? 'items-end' : 'items-start'}`}>
                  {msg.sender === 'system' ? (
                    <div className="w-full flex justify-center my-1.5">
                      <span className="bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                        {msg.text}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl ${
                        msg.sender === 'support' 
                          ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs' 
                          : msg.sender === 'bot'
                            ? 'bg-slate-800 text-white rounded-tl-xs'
                            : msg.sender === 'assistant'
                              ? 'bg-emerald-700 text-white rounded-tl-xs shadow-xs'
                              : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white rounded-tl-xs shadow-xs'
                      }`}>
                        <div className={`text-[10px] font-bold uppercase mb-1 flex items-center gap-1 ${
                          msg.sender === 'support' ? 'text-blue-200' : msg.sender === 'assistant' ? 'text-emerald-200' : msg.sender === 'bot' ? 'text-slate-400' : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {msg.name}
                        </div>
                        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 px-1">{msg.timestamp}</span>
                    </>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Form */}
            <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <form onSubmit={handleReply} className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to the ticket..."
                  disabled={isSending}
                  className="flex-1 bg-slate-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-2.5 text-xs sm:text-sm text-black dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button 
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>{isSending ? 'Sending...' : 'Reply'}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
            <MessageSquare className="w-12 h-12 mb-3 text-slate-300 dark:text-zinc-700" />
            <p className="font-semibold text-sm">Select a ticket from the left to view details</p>
          </div>
        )}
      </div>

      {/* 3. Context Panel */}
      {selectedTicket && (
        <div className="hidden lg:block w-72 border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto shrink-0">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider text-xs">
            {selectedTicket.type === 'assistant' ? 'Sahayak Context' : 'Trip Context'}
          </h3>
          
          {selectedTicket.trip ? (
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-zinc-800/70 rounded-xl p-3.5 border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1.5">
                  <Train className="w-4 h-4" />
                  <span className="font-bold text-xs">Train {selectedTicket.trip.trainNo}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{selectedTicket.trip.trainName}</p>
                {selectedTicket.trip.route && (
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{selectedTicket.trip.route}</p>
                )}
                
                {(selectedTicket.trip.coach || selectedTicket.trip.seat) && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-zinc-700 flex justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                    <span>Coach: {selectedTicket.trip.coach || '—'}</span>
                    <span>Seat: {selectedTicket.trip.seat || '—'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 p-3 bg-slate-50 dark:bg-zinc-800/70 rounded-xl border border-slate-100 dark:border-zinc-800">
                <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Passenger Details</h4>
                <p className="font-bold text-xs text-slate-900 dark:text-white">{selectedTicket.passengerName || 'Passenger'}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">{selectedTicket.passengerPhone || '—'}</p>
                {selectedTicket.passengerEmail && (
                  <p className="text-[11px] text-slate-400 truncate">{selectedTicket.passengerEmail}</p>
                )}
              </div>
            </div>
          ) : selectedTicket.type === 'assistant' ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3.5 border border-emerald-100 dark:border-emerald-900">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 mb-1.5">
                  <Briefcase className="w-4 h-4" />
                  <span className="font-bold text-xs">Platform Sahayak</span>
                </div>
                <p className="font-bold text-xs text-slate-900 dark:text-white">{selectedTicket.assistant_name || 'Sahayak'}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">{selectedTicket.assistant_phone || '—'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-800/70 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Station:</span>
                  <span className="font-bold font-mono text-black dark:text-white">{selectedTicket.station}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">PNR Ref:</span>
                  <span className="font-mono text-black dark:text-white">{selectedTicket.pnr || '—'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-zinc-800/70 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-xs">{selectedTicket.passengerName || 'Passenger'}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">{selectedTicket.passengerPhone || 'N/A'}</p>
                {selectedTicket.passengerEmail && (
                  <p className="text-[11px] text-slate-400 truncate">{selectedTicket.passengerEmail}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
