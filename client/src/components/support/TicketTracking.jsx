import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Clock, CheckCircle, Search, 
  Train, ChevronRight, FileText, ArrowRight 
} from 'lucide-react';
import oneCoolieLogo from '../../assets/onecoolie-logo.png';
import { getTickets, saveTickets, subscribeToSupportUpdates } from '../../utils/supportStore';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';

export default function TicketTracking({ onNavigate, user }) {
  const navigate = useNavigate();
  const { user: authUser, authLoading } = useAuth();
  const currentUser = user || authUser;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  const fetchUserTickets = useCallback(async (isManual = false) => {
    // Abort previous in-flight request to eliminate race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const reqId = ++requestIdRef.current;

    if (isManual) {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await axios.get('/support/tickets', {
        signal: controller.signal
      });

      // Ignore stale requests if a newer request was dispatched
      if (reqId !== requestIdRef.current) return;

      const list = Array.isArray(res.data) ? res.data : [];
      setTickets(list);
      saveTickets(list);
      setError(null);
      setLoading(false);
    } catch (e) {
      // Silently ignore aborted requests
      if (axios.isCancel(e) || e.name === 'CanceledError' || e.name === 'AbortError') {
        return;
      }

      // Ignore if a newer request has taken over
      if (reqId !== requestIdRef.current) return;

      console.error('Backend ticket fetch error:', e);
      setError('Unable to load your support tickets.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait until authentication is resolved before requesting tickets
    if (authLoading) return;

    // Single initial fetch
    fetchUserTickets(true);

    // Cross-tab broadcast sync (reads latest local store without refetch storm)
    const unsubscribeBroadcast = subscribeToSupportUpdates(() => {
      const current = getTickets();
      if (Array.isArray(current)) {
        setTickets(current);
      }
    });

    // Real-time socket event handlers for live ticket creation/status updates
    const handleNewTicket = (newTicket) => {
      if (!newTicket || !newTicket.id) return;
      setTickets((prev) => {
        if (prev.some((t) => String(t.id) === String(newTicket.id))) return prev;
        const updated = [newTicket, ...prev];
        saveTickets(updated);
        return updated;
      });
    };

    const handleStatusUpdate = (payload) => {
      const ticketId = payload?.ticketId || payload?.ticket?.id;
      const newStatus = payload?.status || payload?.ticket?.status;
      if (!ticketId) return;

      setTickets((prev) => {
        const updated = prev.map((t) =>
          String(t.id).toLowerCase() === String(ticketId).toLowerCase()
            ? { ...t, status: newStatus || t.status }
            : t
        );
        saveTickets(updated);
        return updated;
      });
    };

    if (typeof window !== 'undefined' && window.socket) {
      window.socket.on('new_support_ticket', handleNewTicket);
      window.socket.on('ticket_status_updated', handleStatusUpdate);
    }

    return () => {
      unsubscribeBroadcast();
      if (typeof window !== 'undefined' && window.socket) {
        window.socket.off('new_support_ticket', handleNewTicket);
        window.socket.off('ticket_status_updated', handleStatusUpdate);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [authLoading, fetchUserTickets]);

  const inProgressCount = tickets.filter(t => ['open', 'in_progress', 'bot_escalated'].includes(t.status)).length;
  const resolvedCount = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;

  const filteredTickets = tickets.filter(t => {
    if (filter === 'open') return ['open', 'in_progress', 'bot_escalated'].includes(t.status);
    if (filter === 'resolved') return ['resolved', 'closed'].includes(t.status);
    return true;
  });

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (['resolved', 'closed'].includes(s)) {
      return (
        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-md border border-emerald-200 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Resolved
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-md border border-amber-200 flex items-center gap-1">
        <Clock className="w-3 h-3" /> In Progress
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#1463FF] selection:text-white">
      
      {/* ── TOP HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => onNavigate('back')}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/60"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </button>
          
          <div>
            <span className="font-black text-slate-950 text-base leading-tight block">
              Support Tickets
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Track your raised issues and conversations
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('raise_ticket')}
          className="bg-black hover:bg-zinc-800 text-white font-bold px-4 py-2 rounded-full text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Raise New Ticket</span>
        </button>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Filter Pills with real counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button 
            type="button"
            onClick={() => setFilter('all')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'all' 
                ? 'bg-black text-white shadow-xs' 
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Tickets ({tickets.length})
          </button>
          
          <button 
            type="button"
            onClick={() => setFilter('open')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'open' 
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs' 
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            In Progress ({inProgressCount})
          </button>

          <button 
            type="button"
            onClick={() => setFilter('resolved')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'resolved' 
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs' 
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Content Area: Loading / Error / Empty / Real Tickets */}
        {loading ? (
          <div className="text-center py-20 px-4 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">Loading your tickets...</h3>
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4 bg-white border border-rose-200 rounded-3xl shadow-2xs space-y-3">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-base">Unable to load your support tickets.</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We encountered a network problem communicating with the support system.
            </p>
            <button
              type="button"
              onClick={() => fetchUserTickets(true)}
              className="bg-black hover:bg-zinc-800 text-white font-bold text-xs px-5 py-2.5 rounded-full inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              Retry
            </button>
          </div>
        ) : tickets.length === 0 ? (
          /* Total Zero Tickets: Clean Real Empty State for New Passenger */
          <div className="text-center py-20 px-4 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-3">
            <div className="w-14 h-14 bg-blue-50 text-[#1463FF] rounded-full flex items-center justify-center mx-auto mb-2 border border-blue-100">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="font-black text-slate-900 text-lg">No support tickets yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Any issues or questions you raise will appear here.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('raise_ticket')}
                className="bg-black hover:bg-zinc-800 text-white font-bold text-xs px-6 py-3 rounded-full inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Raise New Ticket</span>
              </button>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          /* Filter Returned 0 results */
          <div className="text-center py-16 px-4 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-2">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-1 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">No tickets matching this filter</h3>
            <p className="text-xs text-slate-500">Try switching to &quot;All Tickets&quot; to see all your requests.</p>
          </div>
        ) : (
          /* Real Database Tickets List */
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              return (
                <button 
                  key={ticket.id}
                  type="button"
                  onClick={() => onNavigate('ticket_detail', { ticketId: ticket.id })}
                  className="w-full text-left bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-blue-50 group-hover:text-[#1463FF] transition-colors mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-slate-900">
                          #{ticket.id}
                        </span>
                        {ticket.category && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {ticket.category}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                        {ticket.subject}
                      </h3>

                      <p className="text-xs text-slate-500 font-medium">
                        {ticket.trip?.trainNo ? `Train ${ticket.trip.trainNo}${ticket.trip.route ? ` · ${ticket.trip.route}` : ''}` : (ticket.description || 'General Support Inquiry')}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        {ticket.trip?.journeyDate || (ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent')} · Updated {new Date(ticket.updatedAt || ticket.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {getStatusBadge(ticket.status)}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#1463FF] group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

      </main>

    </div>
  );
}
