import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  IndianRupee,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck,
  Building,
  User,
  Eye,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

export default function OnlinePaymentsSection({ onInspectBooking }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const limit = 20;

  const fetchOnlinePayments = async () => {
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

      const res = await api.get('/admin/finance/online-payments', { params });
      if (res.data?.success) {
        setPayments(res.data.data || []);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load online payments:', err);
      toast.error('Unable to fetch online payments report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlinePayments();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOnlinePayments();
  };

  const handleExportCsv = async () => {
    try {
      toast.loading('Generating Online Payments CSV...', { id: 'csv-export' });
      const res = await api.get('/admin/finance/online-payments', {
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
        'Razorpay Payment ID',
        'Razorpay Order ID',
        'Booking Ref',
        'Passenger Name',
        'Passenger Phone',
        'Assistant Name',
        'Amount (INR)',
        'Currency',
        'Payment Method',
        'Status',
        'Refund Status',
        'Refund Amount (INR)',
        'Razorpay Refund ID',
        'Date'
      ];

      const csvContent = [
        headers.join(','),
        ...rows.map((p) =>
          [
            `"${p.gateway_payment_id || ''}"`,
            `"${p.gateway_order_id || ''}"`,
            `"${p.booking_reference || p.booking_id || ''}"`,
            `"${p.passenger?.name || ''}"`,
            `"${p.passenger?.phone || ''}"`,
            `"${p.assistant?.name || 'Unassigned'}"`,
            p.amount || 0,
            p.currency || 'INR',
            `"${p.payment_method || 'online'}"`,
            `"${p.payment_status || ''}"`,
            `"${p.refund_status || ''}"`,
            p.refund_amount || 0,
            `"${p.gateway_refund_id || ''}"`,
            `"${new Date(p.created_at).toISOString()}"`
          ].join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `onecoolie_online_payments_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Online payments export downloaded', { id: 'csv-export' });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed: ' + (err.message || 'Unknown error'), { id: 'csv-export' });
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'paid' || s === 'captured') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Captured
        </span>
      );
    }
    if (s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Refunded
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        {status || 'Failed'}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Top Controls Strip */}
      <div className="bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Online Payments Ledger
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  Razorpay Verified
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Server-authoritative digital payments with HMAC signature audit and payment IDs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={fetchOnlinePayments}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
              placeholder="Search by Payment ID, Order ID, Booking ID, Passenger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-20 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
              className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="paid">Captured / Paid</option>
              <option value="pending">Pending Gateway Verification</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
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

      {/* Online Payments Table */}
      <div className="bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/70 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="py-3.5 px-4 font-semibold">Payment / Gateway IDs</th>
                <th className="py-3.5 px-4 font-semibold">Booking Ref</th>
                <th className="py-3.5 px-4 font-semibold">Passenger & Sahayak</th>
                <th className="py-3.5 px-4 font-semibold">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Gateway Status</th>
                <th className="py-3.5 px-4 font-semibold">Refund Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {loading && payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading authoritative online payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-zinc-400 opacity-60" />
                    No genuine online payments match your search criteria.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.payment_id}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Payment / Gateway IDs */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                          <span>{p.gateway_payment_id !== 'N/A' ? p.gateway_payment_id : p.payment_id?.slice(0, 14)}</span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate max-w-[180px]">
                          Order: {p.gateway_order_id}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {new Date(p.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    </td>

                    {/* Booking Reference */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => onInspectBooking && onInspectBooking(p.booking_id)}
                          className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {p.booking_reference?.slice(0, 16)}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          Station: {p.station_code}
                        </span>
                      </div>
                    </td>

                    {/* Passenger & Sahayak */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                          <User className="w-3 h-3 text-zinc-400" />
                          <span className="font-medium">{p.passenger?.name || 'Passenger'}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 pl-4.5">
                          {p.assistant ? `Sahayak: ${p.assistant.name}` : 'Unassigned'}
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                          ₹{p.amount.toFixed(2)}
                        </span>
                        <div className="text-[10px] font-mono text-zinc-400">
                          {p.amount_paise} paise
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(p.payment_status)}
                    </td>

                    {/* Refund Status */}
                    <td className="py-3 px-4">
                      {p.refund_amount > 0 || p.refund_status !== 'none' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            ₹{p.refund_amount.toFixed(2)} ({p.refund_status})
                          </span>
                          {p.gateway_refund_id !== 'N/A' && (
                            <div className="text-[10px] font-mono text-zinc-400 truncate max-w-[130px]">
                              {p.gateway_refund_id}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400">No Refund</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
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
            Showing <span className="font-semibold text-zinc-900 dark:text-white">{payments.length}</span> of{' '}
            <span className="font-semibold text-zinc-900 dark:text-white">{totalCount}</span> genuine online payments
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

      {/* Payment Inspection Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#0D111A] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-mono">
                    Payment #{selectedPayment.gateway_payment_id || selectedPayment.payment_id}
                  </h3>
                  <p className="text-[11px] text-zinc-500">Authoritative Razorpay Transaction</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase">Gross Amount</span>
                  <div className="text-sm font-bold text-zinc-900 dark:text-white">₹{selectedPayment.amount.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase">Amount in Paise</span>
                  <div className="text-sm font-bold text-zinc-900 dark:text-white">{selectedPayment.amount_paise} paise</div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase">Gateway Payment ID</span>
                  <div className="text-zinc-800 dark:text-zinc-200 truncate">{selectedPayment.gateway_payment_id}</div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase">Gateway Order ID</span>
                  <div className="text-zinc-800 dark:text-zinc-200 truncate">{selectedPayment.gateway_order_id}</div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase">Refund ID</span>
                  <div className="text-zinc-800 dark:text-zinc-200">{selectedPayment.gateway_refund_id}</div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase">Refunded Amount</span>
                  <div className="text-zinc-800 dark:text-zinc-200">₹{selectedPayment.refund_amount.toFixed(2)}</div>
                </div>
              </div>

              <pre className="p-3 bg-zinc-900 text-zinc-200 rounded-xl text-[11px] overflow-x-auto leading-relaxed">
                {JSON.stringify(selectedPayment, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
