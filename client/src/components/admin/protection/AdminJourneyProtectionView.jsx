import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import { ShieldCheck, RefreshCw, AlertCircle, FileText, Check, Clock, Search, ExternalLink, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import JourneyProtectionTermsModal from '../../protection/JourneyProtectionTermsModal';

/* ============================================================
   ADMIN JOURNEY PROTECTION VIEW (PRE-LAUNCH AUDIT CONSOLE)
   • Strict compliance: No fake insurers, no fake claims, no fake payouts
   • Prominent demonstration disclaimer
   • Supports CASH / COD and Online payment tracking & authoritative confirmation
   ============================================================ */

export default function AdminJourneyProtectionView() {
  const [protections, setProtections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTermsProtection, setSelectedTermsProtection] = useState(null);

  const fetchProtections = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/protection/admin/list');
      setProtections(res.data?.protections || []);
    } catch (err) {
      console.error('[ADMIN] Error fetching protections:', err);
      toast.error('Unable to load Journey Protection records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProtections();
  }, []);

  const handleConfirmCash = async (protection) => {
    const bookingId = protection.booking_id;
    if (!bookingId) return;
    const confirmPrompt = window.confirm(
      `Confirm cash collection for booking ${protection.bookings?.booking_id || bookingId} and activate Journey Protection?`
    );
    if (!confirmPrompt) return;

    try {
      await axios.post(`/protection/${bookingId}/cash-collect`);
      toast.success('Cash collection recorded and protection activated.');
      fetchProtections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record cash collection.');
    }
  };

  const filtered = protections.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || String(p.status).toUpperCase() === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      p.protection_id?.toLowerCase().includes(term) ||
      p.bookings?.booking_id?.toLowerCase().includes(term) ||
      p.users?.name?.toLowerCase().includes(term) ||
      p.users?.email?.toLowerCase().includes(term) ||
      p.gateway_order_id?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 1. HEADER & PRE-LAUNCH ADVISORY BANNER ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200">
                PRE-LAUNCH AUDIT
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                DEMONSTRATION ONLY
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              Journey Protection Ledger
            </h1>
            <p className="text-xs text-zinc-500 font-medium">
              Server-authoritative records for the ₹0.50 Journey Protection optional pre-launch feature.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchProtections}
            disabled={loading}
            className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Regulatory & Concept Advisory */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block text-amber-950">Administrative Notice:</strong>
            ONECOOLIE Journey Protection is currently a demonstration and product-design concept. ONECOOLIE is not acting as an insurance company. Do not represent these records as active legally binding insurance contracts, certificates of insurance, or IRDAI policies. Actual coverage requires concluding legitimate underwriting partner arrangements.
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase text-zinc-400 font-mono">Total Requests</span>
            <div className="text-2xl font-black text-zinc-900 mt-0.5">{protections.length}</div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase text-emerald-700 font-mono">Active Protections</span>
            <div className="text-2xl font-black text-emerald-800 mt-0.5">
              {protections.filter((p) => p.status === 'active').length}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
            <span className="text-[10px] font-bold uppercase text-amber-700 font-mono">Pending Cash</span>
            <div className="text-2xl font-black text-amber-800 mt-0.5">
              {protections.filter((p) => p.status === 'pending_payment').length}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase text-zinc-400 font-mono">Pre-Launch Tariff</span>
            <div className="text-2xl font-black text-zinc-900 mt-0.5">₹0.50</div>
          </div>
        </div>
      </div>

      {/* ── 2. SEARCH & FILTER CONTROLS ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Protection ID, Booking, Passenger..."
            className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-black focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'ACTIVE', 'PENDING_PAYMENT', 'CANCELLED', 'EXPIRED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                statusFilter === st
                  ? 'bg-black text-white'
                  : 'bg-slate-100 text-zinc-600 hover:text-black'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. LEDGER TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
            <span>Loading Journey Protection ledger...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-xs">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <span>No Journey Protection records match your filter.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Protection ID</th>
                  <th className="py-3.5 px-4">Booking Ref</th>
                  <th className="py-3.5 px-4">Passenger</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Proposed Tier</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Terms Version</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isActive = p.status === 'active';
                  const isCash = ['cash', 'cod', 'pay_on_arrival', 'pay_on_delivery'].includes(
                    String(p.payment_method || p.bookings?.payment_method).toLowerCase()
                  );
                  const isPending = p.status === 'pending_payment';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 select-all">
                        {p.protection_id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-800">
                        {p.bookings?.booking_id || p.booking_id?.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 truncate max-w-[140px]">
                          {p.users?.name || 'Passenger'}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                          {p.users?.email || p.users?.phone || ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ACTIVE
                          </span>
                        ) : isPending ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            PENDING PAYMENT
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-zinc-600 border border-slate-200">
                            {p.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-700">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isCash ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {isCash ? 'CASH / COD' : 'ONLINE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-800 text-[11px]">
                        {p.proposed_protection_limit != null ? (
                          <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            Up to ₹{Number(p.proposed_protection_limit).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Baseline (₹2,500)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                        {p.price != null && !isNaN(Number(p.price)) ? `₹${Number(p.price).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500 font-mono text-[10px] truncate max-w-[120px]" title={p.terms_version}>
                        {p.terms_version || 'v2'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {isPending && isCash && (
                          <button
                            type="button"
                            onClick={() => handleConfirmCash(p)}
                            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Confirm Cash</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedTermsProtection(p)}
                          className="text-blue-600 hover:text-blue-800 font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Terms</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. TERMS INSPECTION MODAL ── */}
      {selectedTermsProtection && (
        <JourneyProtectionTermsModal
          open={Boolean(selectedTermsProtection)}
          onClose={() => setSelectedTermsProtection(null)}
          protectionId={selectedTermsProtection.protection_id}
          bookingRef={selectedTermsProtection.bookings?.booking_id}
          acceptedAt={selectedTermsProtection.terms_accepted_at || selectedTermsProtection.activated_at}
          hasAccepted={true}
        />
      )}
    </div>
  );
}
