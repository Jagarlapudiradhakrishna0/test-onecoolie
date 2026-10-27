import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

export default function CashCollectionsSection({ onInspectBooking }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [actionModal, setActionModal] = useState(null); // { type: 'confirm'|'dispute'|'reimburse'|'audit', item }
  const [actionNotes, setActionNotes] = useState('');
  const [actionAmount, setActionAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const limit = 20;

  const fetchCashCollections = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        status: statusFilter,
        search: search.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const res = await api.get('/admin/finance/cash-collections', { params });
      if (res.data?.success) {
        setCollections(res.data.data || []);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load cash collections:', err);
      toast.error('Unable to fetch cash collections report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashCollections();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCashCollections();
  };

  const handleExportCsv = async () => {
    try {
      toast.loading('Generating Cash Collections CSV...', { id: 'csv-export' });
      const res = await api.get('/admin/finance/cash-collections', {
        params: {
          export: true,
          status: statusFilter,
          search: search.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });

      if (!res.data?.success || !res.data?.data) {
        throw new Error('No data available for export');
      }

      const rows = res.data.data;
      const headers = [
        'Booking ID',
        'Booking Ref',
        'Passenger Name',
        'Passenger Phone',
        'Assistant Name',
        'Expected Cash (INR)',
        'Collected Cash (INR)',
        'Collection Status',
        'Confirmed By Role',
        'Confirmed By User',
        'Collected Timestamp',
        'Dispute Reason',
        'Reimbursement Reason',
        'Created Date'
      ];

      const csvContent = [
        headers.join(','),
        ...rows.map((c) =>
          [
            `"${c.booking_id || ''}"`,
            `"${c.booking_reference || ''}"`,
            `"${c.passenger?.name || ''}"`,
            `"${c.passenger?.phone || ''}"`,
            `"${c.assistant?.name || 'Unassigned'}"`,
            c.expected_amount || 0,
            c.collected_amount || 0,
            `"${c.status || ''}"`,
            `"${c.confirmed_by_role || ''}"`,
            `"${c.confirmed_by_user_id || ''}"`,
            `"${c.collected_at ? new Date(c.collected_at).toISOString() : ''}"`,
            `"${c.dispute_reason || ''}"`,
            `"${c.reimbursement_reason || ''}"`,
            `"${new Date(c.created_at).toISOString()}"`
          ].join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `onecoolie_cash_collections_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Cash collections export downloaded', { id: 'csv-export' });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed: ' + (err.message || 'Unknown error'), { id: 'csv-export' });
    }
  };

  const handleActionSubmit = async () => {
    if (!actionModal) return;
    const { type, item } = actionModal;
    setIsSubmitting(true);

    try {
      if (type === 'confirm') {
        const payload = {
          amount: actionAmount ? Number(actionAmount) : item.expected_amount,
          notes: actionNotes || 'Admin confirmed cash collection'
        };
        await api.post(`/admin/finance/cash-collections/${item.booking_id}/confirm`, payload);
        toast.success(`Cash collection confirmed for booking #${item.booking_reference?.slice(0, 8)}`);
      } else if (type === 'dispute') {
        if (!actionNotes.trim()) {
          toast.error('Please specify a dispute reason');
          setIsSubmitting(false);
          return;
        }
        await api.post(`/admin/finance/cash-collections/${item.booking_id}/dispute`, {
          reason: actionNotes.trim()
        });
        toast.success(`Dispute recorded for booking #${item.booking_reference?.slice(0, 8)}`);
      } else if (type === 'reimburse') {
        const payload = {
          amount: actionAmount ? Number(actionAmount) : item.collected_amount || item.expected_amount,
          notes: actionNotes || 'Admin confirmed physical cash reimbursement to passenger'
        };
        await api.post(`/admin/finance/cash-collections/${item.booking_id}/reimburse`, payload);
        toast.success(`Cash reimbursement processed for booking #${item.booking_reference?.slice(0, 8)}`);
      }

      setActionModal(null);
      setActionNotes('');
      setActionAmount('');
      fetchCashCollections();
    } catch (err) {
      console.error('Action failed:', err);
      toast.error(err.response?.data?.message || 'Failed to complete action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'collected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Collected
        </span>
      );
    }
    if (s === 'awaiting_collection') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Awaiting Handover
        </span>
      );
    }
    if (s === 'disputed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          Disputed
        </span>
      );
    }
    if (s === 'reversed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Reimbursed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
        {status || 'Cancelled'}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header Strip */}
      <div className="bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Offline Cash Collections Ledger
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Zero Gateway Exposure
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Hand-to-hand passenger cash payments to Sahayaks with audit trails and independent reimbursement workflows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={fetchCashCollections}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Booking ID, Passenger, Sahayak..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-20 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Collection Statuses</option>
              <option value="awaiting_collection">Awaiting Collection</option>
              <option value="collected">Collected Cash</option>
              <option value="disputed">Disputed Handover</option>
              <option value="reversed">Reimbursed Cash</option>
              <option value="cancelled">Cancelled (No Handover)</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 text-[11px] text-zinc-800 dark:text-zinc-200"
              title="Start Date"
            />
            <span className="text-zinc-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 text-[11px] text-zinc-800 dark:text-zinc-200"
              title="End Date"
            />
          </div>
        </div>
      </div>

      {/* Cash Collections Table */}
      <div className="bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/70 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="py-3.5 px-4 font-semibold">Booking Ref</th>
                <th className="py-3.5 px-4 font-semibold">Passenger</th>
                <th className="py-3.5 px-4 font-semibold">Collecting Sahayak</th>
                <th className="py-3.5 px-4 font-semibold">Expected Cash</th>
                <th className="py-3.5 px-4 font-semibold">Collection Status</th>
                <th className="py-3.5 px-4 font-semibold">Confirmation Info</th>
                <th className="py-3.5 px-4 font-semibold text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {loading && collections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading offline cash collections...
                  </td>
                </tr>
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <Banknote className="w-8 h-8 mx-auto mb-2 text-zinc-400 opacity-60" />
                    No offline cash collection records match your filters.
                  </td>
                </tr>
              ) : (
                collections.map((c) => (
                  <tr
                    key={c.id || c.booking_id}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Booking Reference */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => onInspectBooking && onInspectBooking(c.booking_id)}
                          className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {c.booking_reference?.slice(0, 16)}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          Station: {c.station_code}
                        </span>
                        <div className="text-[10px] text-zinc-400">
                          {new Date(c.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    </td>

                    {/* Passenger */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-medium text-zinc-900 dark:text-white">
                          {c.passenger?.name || 'Passenger'}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {c.passenger?.phone || 'No phone'}
                        </div>
                      </div>
                    </td>

                    {/* Collecting Sahayak */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-medium text-zinc-900 dark:text-white">
                          {c.assistant?.name || <span className="text-zinc-400 italic">Unassigned</span>}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {c.assistant?.phone ? `+91 ${c.assistant.phone}` : ''}
                        </div>
                      </div>
                    </td>

                    {/* Expected Cash */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                          ₹{c.expected_amount.toFixed(2)}
                        </span>
                        {c.status === 'collected' && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            Collected: ₹{c.collected_amount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Collection Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(c.status)}
                    </td>

                    {/* Confirmation Info */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        {c.collected_at ? (
                          <>
                            <div className="text-zinc-700 dark:text-zinc-300 font-medium">
                              {new Date(c.collected_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              By: {c.confirmed_by_role} ({String(c.confirmed_by_user_id).slice(0, 8)})
                            </div>
                          </>
                        ) : (
                          <span className="text-zinc-400 italic">Not yet confirmed</span>
                        )}
                        {c.dispute_reason && (
                          <div className="text-rose-600 dark:text-rose-400 text-[10px] font-semibold">
                            Dispute: {c.dispute_reason}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Admin Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                        {c.status === 'awaiting_collection' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionModal({ type: 'confirm', item: c });
                              setActionAmount(String(c.expected_amount));
                            }}
                            className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 cursor-pointer"
                          >
                            Confirm Cash
                          </button>
                        )}

                        {c.status !== 'disputed' && c.status !== 'reversed' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionModal({ type: 'dispute', item: c });
                            }}
                            className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold hover:bg-rose-100 cursor-pointer"
                          >
                            Dispute
                          </button>
                        )}

                        {c.status === 'collected' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionModal({ type: 'reimburse', item: c });
                              setActionAmount(String(c.collected_amount || c.expected_amount));
                            }}
                            className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold hover:bg-indigo-100 cursor-pointer"
                          >
                            Reimburse
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setActionModal({ type: 'audit', item: c })}
                          className="p-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          title="View Audit Trail"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            Showing <span className="font-semibold text-zinc-900 dark:text-white">{collections.length}</span> of{' '}
            <span className="font-semibold text-zinc-900 dark:text-white">{totalCount}</span> offline cash records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Dialog Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  actionModal.type === 'confirm' ? 'bg-emerald-50 text-emerald-600' :
                  actionModal.type === 'dispute' ? 'bg-rose-50 text-rose-600' :
                  actionModal.type === 'reimburse' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-mono uppercase">
                    {actionModal.type === 'confirm' && 'Confirm Cash Collection'}
                    {actionModal.type === 'dispute' && 'Record Cash Dispute'}
                    {actionModal.type === 'reimburse' && 'Process Cash Reimbursement'}
                    {actionModal.type === 'audit' && 'Cash Collection Audit History'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Booking #{actionModal.item.booking_reference?.slice(0, 16)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {actionModal.type === 'audit' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                    <div className="font-bold text-zinc-900 dark:text-white">Status: {actionModal.item.status}</div>
                    <div className="text-zinc-500">Expected: ₹{actionModal.item.expected_amount} | Collected: ₹{actionModal.item.collected_amount}</div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">Append-Only Audit History</span>
                    {(actionModal.item.audit_trail || []).length === 0 ? (
                      <p className="text-zinc-400 italic">No historical audit mutations recorded yet.</p>
                    ) : (
                      actionModal.item.audit_trail.map((entry, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                          <div className="flex items-center justify-between font-mono font-bold text-[11px] text-zinc-800 dark:text-zinc-200">
                            <span>{entry.action}</span>
                            <span className="text-[10px] text-zinc-400">{new Date(entry.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            Actor: {entry.actor_role} ({String(entry.actor_id || entry.user_id).slice(0, 8)})
                          </div>
                          {entry.notes && <div className="text-[10px] text-zinc-500 italic">"{entry.notes}"</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {(actionModal.type === 'confirm' || actionModal.type === 'reimburse') && (
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Amount (₹ INR)
                      </label>
                      <input
                        type="number"
                        value={actionAmount}
                        onChange={(e) => setActionAmount(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono"
                        placeholder="Amount in Rupees"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      {actionModal.type === 'dispute' ? 'Dispute Reason (Required)' : 'Audit Notes / Reason'}
                    </label>
                    <textarea
                      rows="3"
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                      placeholder={actionModal.type === 'dispute' ? 'Describe the discrepancy or physical handover issue...' : 'Optional notes for financial audit trail...'}
                    />
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Fintech Isolation Invariant:</strong> This action records a physical cash ledger mutation. It will never invoke Razorpay gateway APIs or create Razorpay refund records.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              {actionModal.type !== 'audit' && (
                <button
                  type="button"
                  onClick={handleActionSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Action'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
