import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import { ShieldCheck, RefreshCw, AlertCircle, FileText, Check, Clock, Search, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import JourneyProtectionTermsModal from '../../protection/JourneyProtectionTermsModal';

/* ============================================================
   ADMIN JOURNEY PROTECTION VIEW (PRE-LAUNCH AUDIT CONSOLE)
   • Strict compliance: No fake insurers, no fake claims, no fake payouts
   • Prominent demonstration disclaimer
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
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[10px] font-bold uppercase text-blue-700 font-mono">Protection Fee</span>
            <div className="text-2xl font-black text-blue-800 mt-0.5">₹0.50</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase text-zinc-400 font-mono">Terms Version</span>
            <div className="text-xs font-mono font-bold text-zinc-900 mt-2 truncate">PRELAUNCH-v1</div>
          </div>
        </div>
      </div>

      {/* ── 2. FILTER & SEARCH TOOLBAR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ID, booking, passenger..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'ACTIVE', 'PENDING_PAYMENT', 'CANCELLED'].map((st) => (
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
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Payment Order ID</th>
                  <th className="py-3.5 px-4">Activated At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isActive = p.status === 'active';
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
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-zinc-600 border border-slate-200">
                            {p.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                        ₹{Number(p.price || 0.5).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                        {p.gateway_order_id || '--'}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600 text-[11px]">
                        {p.activated_at ? new Date(p.activated_at).toLocaleString() : '--'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
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

      {/* Terms Modal */}
      {selectedTermsProtection && (
        <JourneyProtectionTermsModal
          open={Boolean(selectedTermsProtection)}
          onClose={() => setSelectedTermsProtection(null)}
          protectionId={selectedTermsProtection.protection_id}
          bookingRef={selectedTermsProtection.bookings?.booking_id || selectedTermsProtection.booking_id}
          acceptedAt={selectedTermsProtection.activated_at || selectedTermsProtection.terms_accepted_at}
          hasAccepted={true}
        />
      )}
    </div>
  );
}
