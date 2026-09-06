import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import ProfileMenu from '../context/ProfileMenu';
import { activeServices } from '../utils/services';
import AssistantJobCard from '../components/AssistantJobCard';
import Brand from '../components/Brand';
import TrainLoader from '../components/TrainLoader';
import AssistantNotifications from '../components/AssistantNotifications';

/* ============================================================
   ASSISTANT DASHBOARD — Swiss Operations Dispatch
   Strictly Black (#000000), White (#FFFFFF), and OneCoolie Blue (#2563EB)
   ============================================================ */

const STATIONS = [
  { code: 'KZJ', name: 'Kazipet Junction' },
  { code: 'WL', name: 'Warangal' },
  { code: 'BZA', name: 'Vijayawada Junction' },
  { code: 'SC', name: 'Secunderabad Junction' },
];

export default function AssistantDashboard() {
  const [profile, setProfile] = useState(null);
  const [station, setStation] = useState('KZJ');
  const [requests, setRequests] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [tab, setTab] = useState('live'); // 'live' | 'jobs' | 'history' | 'wallet'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  /* ── Wallet & Payouts State (Phase 3B) ─────────────────────── */
  const [wallet, setWallet] = useState({
    available_balance: 0,
    pending_balance: 0,
    held_balance: 0,
    paid_out_total: 0,
    total_earnings: 0,
  });
  const [payouts, setPayouts] = useState([]);
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer');
  const [payoutLoading, setPayoutLoading] = useState(false);

  /* ── Load Profile ───────────────────────────────────────── */
  const loadProfile = useCallback(async () => {
    try {
      const response = await axios.get('/assistants/me');
      setProfile(response.data);
      if (response.data?.station_code) setStation(response.data.station_code);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please sign in again.');
      } else {
        setError('Unable to retrieve assistant profile.');
      }
    }
  }, []);

  /* ── Load Wallet & Payouts (Phase 3B) ─────────────────────── */
  const loadWallet = useCallback(async () => {
    try {
      const [wRes, pRes, eRes] = await Promise.all([
        axios.get('/assistant-wallet').catch(() => ({ data: {} })),
        axios.get('/assistant-payouts').catch(() => ({ data: { payouts: [] } })),
        axios.get('/assistant-wallet/earnings').catch(() => ({ data: { earnings: [] } })),
      ]);
      if (wRes.data?.wallet) setWallet(wRes.data.wallet);
      if (pRes.data?.payouts) setPayouts(pRes.data.payouts);
      if (eRes.data?.earnings) setEarningsHistory(eRes.data.earnings);
    } catch (err) {
      console.error('Unable to load wallet data:', err);
    }
  }, []);

  /* ── Load Dashboard ─────────────────────────────────────── */
  const loadDashboard = useCallback(async () => {
    try {
      const [availableResponse, jobsResponse] = await Promise.all([
        axios.get('/assistants/available'),
        axios.get('/assistants/my-jobs'),
      ]);
      setRequests(
        Array.isArray(availableResponse.data) ? availableResponse.data : []
      );
      setMyJobs(Array.isArray(jobsResponse.data) ? jobsResponse.data : []);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please sign in again.');
      } else {
        setError('Unable to sync live dispatch board.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Initial Load & Auto Refresh ────────────────────────── */
  useEffect(() => {
    loadProfile();
    loadDashboard();
    loadWallet();
  }, [loadProfile, loadDashboard, loadWallet]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard();
      loadWallet();
    }, 8000);
    return () => clearInterval(interval);
  }, [loadDashboard, loadWallet]);

  /* ── Real-Time Dispatch & Wallet Sync (Phase 7) ─────────── */
  useEffect(() => {
    if (!window.socket) return;

    if (profile?.id) {
      window.socket.emit('join_assistant', profile.id);
    }

    const handleNewBooking = () => {
      loadDashboard();
    };

    const handleBookingCancelled = () => {
      loadDashboard();
    };

    const handleWalletUpdated = () => {
      loadWallet();
    };

    window.socket.on('new_booking', handleNewBooking);
    window.socket.on('booking_cancelled', handleBookingCancelled);
    window.socket.on('wallet_updated', handleWalletUpdated);

    return () => {
      window.socket.off('new_booking', handleNewBooking);
      window.socket.off('booking_cancelled', handleBookingCancelled);
      window.socket.off('wallet_updated', handleWalletUpdated);
    };
  }, [profile?.id, loadDashboard, loadWallet]);

  /* ── Online Status ──────────────────────────────────────── */
  const online = Boolean(profile?.is_online);

  const toggleDuty = async () => {
    if (!profile || actionLoading) return;
    const nextStatus = !online;
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await axios.post('/assistants/availability', {
        is_online: nextStatus,
        station_code: station,
      });
      setProfile(response.data);
      setMessage(
        nextStatus
          ? `You are now on duty at ${station}.`
          : 'You are now off duty.'
      );
      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to update availability.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Accept Request ─────────────────────────────────────── */
  const acceptJob = async (requestId) => {
    if (actionLoading) return;
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      await axios.post(`/assistants/${requestId}/accept`);
      setMessage('Request accepted. Proceed to platform.');
      await loadDashboard();
      setTab('jobs');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Request is no longer available.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Payout Request Handler (Phase 3B) ──────────────────── */
  const handleRequestPayout = async (e) => {
    e?.preventDefault();
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid payout amount.');
      return;
    }
    if (amt < 100) {
      setError('Minimum withdrawal threshold is ₹100.');
      return;
    }
    if (amt > (wallet.available_balance || 0)) {
      setError(`Requested amount (₹${amt}) exceeds your available balance (₹${wallet.available_balance || 0}).`);
      return;
    }

    setPayoutLoading(true);
    setError('');
    setMessage('');
    try {
      await axios.post('/assistant-payouts/request', {
        amount: amt,
        payout_method: payoutMethod,
      });
      setMessage('Payout request submitted successfully. Awaiting administrative review.');
      setPayoutModalOpen(false);
      setPayoutAmount('');
      await loadWallet();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit payout request.');
    } finally {
      setPayoutLoading(false);
    }
  };

  /* ── Cancel Payout Handler (Phase 3B) ───────────────────── */
  const handleCancelPayout = async (payoutId) => {
    if (!window.confirm('Cancel this pending payout request and release earnings back to your available balance?')) {
      return;
    }
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      await axios.post(`/assistant-payouts/${payoutId}/cancel`);
      setMessage('Payout request cancelled.');
      await loadWallet();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to cancel payout request.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Job Update Callback ────────────────────────────────── */
  const handleJobUpdate = useCallback(
    async (updatedJob) => {
      if (!updatedJob) {
        await loadDashboard();
        return;
      }
      const normalizedJob = updatedJob.booking || updatedJob;
      setMyJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === normalizedJob.id ? { ...job, ...normalizedJob } : job
        )
      );
      await loadDashboard();
    },
    [loadDashboard]
  );

  /* ── Computed Metrics ───────────────────────────────────── */
  const activeJobs = myJobs.filter(
    (j) =>
      j.booking_status !== 'completed' && j.booking_status !== 'cancelled'
  );
  const completedJobs = myJobs.filter((j) => j.booking_status === 'completed');
  // Phase 1: Assistant earns 80% net share of completed tariffs (20% platform commission)
  const totalEarnings = Number(wallet.total_earnings || 0);
  const ratedJobs = completedJobs.filter((j) => j.rating);
  const averageRating =
    ratedJobs.length > 0
      ? (
        ratedJobs.reduce((t, j) => t + Number(j.rating), 0) /
        ratedJobs.length
      ).toFixed(1)
      : '—';

  if (loading) {
    return (
      <TrainLoader
        text="Loading Dispatch Board..."
        subtext="Synchronizing live platform assignments & assistant fleet..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-black dark:text-white">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Brand sub="Assistant Duty" />

            {/* Duty Toggle Pill */}
            <button
              type="button"
              onClick={toggleDuty}
              disabled={actionLoading}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${online
                  ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'
                  }`}
              />
              <span>{online ? 'On Duty (Active)' : 'Off Duty'}</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <AssistantNotifications
              requests={requests}
              activeJobs={activeJobs}
              ratedJobs={ratedJobs}
              online={online}
              station={station}
              stationName={STATIONS.find((item) => item.code === station)?.name || station}
              onNavigate={setTab}
            />
            <ProfileMenu role="assistant" onNavigate={(t) => setTab(t)} helpPath="/help" />
          </div>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 sm:py-10 space-y-8">
        {/* Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-black dark:text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-black dark:text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* ── Operations Metrics Grid ─────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Station Requests',
              value: requests.length,
              sub: 'Available at ' + station,
            },
            {
              label: 'Active Jobs',
              value: activeJobs.length,
              sub: 'In progress',
            },
            {
              label: 'My Earnings (80%)',
              value: '₹' + totalEarnings,
              sub: `${completedJobs.length} completed (net of 20% platform fee)`,
            },
            {
              label: 'Service Rating',
              value: averageRating !== '—' ? `${averageRating} ★` : '—',
              sub: `${ratedJobs.length} passenger reviews`,
            },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm"
            >
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-1">
                {m.label}
              </span>
              <p className="text-3xl font-bold font-mono text-black dark:text-white">
                {m.value}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {m.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Segmented Tab Switcher ──────────────────────────── */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700">
            {[
              {
                id: 'live',
                label: 'Available Requests',
                badge: requests.length,
              },
              {
                id: 'jobs',
                label: 'My Assigned Jobs',
                badge: activeJobs.length,
              },
              {
                id: 'history',
                label: 'Trip History',
                badge: completedJobs.length,
              },
              {
                id: 'wallet',
                label: 'Wallet & Payouts',
                badge: payouts.filter((p) => p.status === 'requested').length,
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${tab === t.id
                    ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-black dark:hover:text-white'
                  }`}
              >
                <span>{t.label}</span>
                {t.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-mono">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Station Selector */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Hub:</span>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="input-base text-xs py-1.5 px-3 w-auto font-mono font-bold"
            >
              {STATIONS.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Tab Content ─────────────────────────────────────── */}
        {tab === 'live' && (
          <div className="space-y-4 animate-fade-in">
            {!online ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center max-w-md mx-auto">
                <p className="font-bold text-base mb-1">You are currently Off Duty</p>
                <p className="text-xs text-zinc-500 mb-6">
                  Turn on duty status to receive live passenger assistance dispatches at {station}.
                </p>
                <button
                  type="button"
                  onClick={toggleDuty}
                  className="btn-primary py-2.5 px-6 text-xs"
                >
                  Go On Duty Now →
                </button>
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center max-w-md mx-auto">
                <span className="badge-blue mb-3">Live Dispatch Active</span>
                <p className="font-bold text-base mb-1">No incoming requests</p>
                <p className="text-xs text-zinc-500">
                  Waiting for passenger bookings at {station}. The board refreshes automatically.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="badge-blue font-mono">
                          Train {req.train_no}
                        </span>
                        <span className="text-xl font-bold font-mono text-black dark:text-white">
                          ₹{req.total_price}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-black dark:text-white mb-1">
                        {req.train_name || 'Station Assistance'}
                      </h3>
                      <p className="text-xs font-mono text-zinc-500 mb-4">
                        {req.journey_date} · Passenger: {req.passenger?.name || 'Traveller'}
                      </p>

                      {/* Services List */}
                      <div className="space-y-1.5 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                        {activeServices(req.services || []).map((s) => (
                          <div
                            key={s.key}
                            className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400"
                          >
                            <span>{s.label}</span>
                            <span className="font-mono font-bold text-black dark:text-white">
                              {s.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => acceptJob(req.id)}
                      disabled={actionLoading}
                      className="btn-primary w-full py-2.5 text-xs"
                    >
                      Accept Request →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'jobs' && (
          <div className="space-y-6 animate-fade-in">
            {activeJobs.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center max-w-md mx-auto">
                <p className="font-bold text-base mb-1">No active assigned jobs</p>
                <p className="text-xs text-zinc-500 mb-6">
                  Accept incoming requests from the Live Board to begin platform escorting.
                </p>
                <button
                  type="button"
                  onClick={() => setTab('live')}
                  className="btn-primary py-2.5 px-6 text-xs"
                >
                  View Available Requests →
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {activeJobs.map((job) => (
                  <AssistantJobCard
                    key={job.id}
                    job={job}
                    onUpdate={handleJobUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden animate-fade-in">
            {completedJobs.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-400">
                No completed jobs recorded yet.
              </div>
            ) : (
              completedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-black dark:text-white">
                        Train {job.train_no} · {job.train_name}
                      </span>
                      <span className="badge-neutral text-[10px]">
                        Completed
                      </span>
                    </div>
                    <p className="text-xs font-mono text-zinc-400">
                      {job.journey_date} · Passenger: {job.passenger?.name} · ID: {job.booking_id || job.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {job.rating && (
                      <span className="text-xs font-bold font-mono text-black dark:text-white">
                        {job.rating} ★
                      </span>
                    )}
                    <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                      ₹{job.total_price}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'wallet' && (
          <div className="space-y-8 animate-fade-in">
            {/* ── Wallet Overview Header ────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                  <span>Sahayak Operations Wallet</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-mono font-bold">
                    AUTHORITATIVE
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Automated settlement ledger: 80% Sahayak earnings share after completed dispatches.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPayoutModalOpen(true)}
                disabled={(wallet.available_balance || 0) < 100}
                className="btn-primary py-2.5 px-5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>Request Payout</span>
                <span className="text-[10px] font-mono font-normal">
                  (Min ₹100)
                </span>
              </button>
            </div>

            {/* ── 4 Wallet Stat Cards ──────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono block mb-1">
                  Available to Withdraw
                </span>
                <p className="text-3xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  ₹{wallet.available_balance || 0}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Ready for immediate payout
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-1">
                  Pending Settlement
                </span>
                <p className="text-3xl font-bold font-mono text-black dark:text-white">
                  ₹{wallet.pending_balance || 0}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Maturing after service hold
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-1">
                  Held in Request
                </span>
                <p className="text-3xl font-bold font-mono text-black dark:text-white">
                  ₹{wallet.held_balance || 0}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  In review / processing
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-1">
                  Total Paid Out
                </span>
                <p className="text-3xl font-bold font-mono text-black dark:text-white">
                  ₹{wallet.paid_out_total || 0}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Lifetime disbursed
                </p>
              </div>
            </div>

            {/* ── Payout Requests History ─────────────────────── */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-black dark:text-white uppercase tracking-wider font-mono">
                  Payout Withdrawal Requests
                </h4>
                <span className="text-xs font-mono text-zinc-400">
                  {payouts.length} record{payouts.length === 1 ? '' : 's'}
                </span>
              </div>

              {payouts.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">
                  No withdrawal requests submitted yet. When your available balance reaches ₹100, click "Request Payout".
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-mono">
                        <th className="py-2.5 px-3">Request ID</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Requested Date</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                      {payouts.map((p) => {
                        const statusColors = {
                          requested: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
                          approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
                          processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
                          paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
                          rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
                          failed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
                          cancelled: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
                        };

                        return (
                          <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                              {p.id.slice(0, 8)}...
                            </td>
                            <td className="py-3 px-3 font-bold text-black dark:text-white">
                              ₹{p.amount}
                            </td>
                            <td className="py-3 px-3 capitalize text-zinc-400">
                              {p.payout_method?.replace('_', ' ') || 'Bank Transfer'}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[p.status] || 'bg-zinc-100'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-zinc-400 text-[11px]">
                              {new Date(p.requested_at || p.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {p.status === 'requested' && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelPayout(p.id)}
                                  disabled={actionLoading}
                                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline"
                                >
                                  Cancel Request
                                </button>
                              )}
                              {p.status === 'paid' && (
                                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                                  <span className="font-bold">✓ Settled</span>
                                  {p.payout_reference && (
                                    <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
                                      Ref: {p.payout_reference}
                                    </span>
                                  )}
                                  {p.settlement_date && (
                                    <span className="block text-[9px] text-zinc-400">
                                      {new Date(p.settlement_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              )}
                              {p.status === 'failed' && (
                                <span className="text-[10px] text-rose-500">
                                  {p.failure_reason || 'Disbursement error'}
                                </span>
                              )}
                              {p.status === 'rejected' && (
                                <span className="text-[10px] text-zinc-400">
                                  {p.failure_reason || 'Rejected by Admin'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Recent Earnings Ledger ───────────────────────── */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-black dark:text-white uppercase tracking-wider font-mono">
                  Earnings Breakdown (80% Tariffs)
                </h4>
                <span className="text-xs font-mono text-zinc-400">
                  {earningsHistory.length} trip{earningsHistory.length === 1 ? '' : 's'}
                </span>
              </div>

              {earningsHistory.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">
                  No earnings recorded yet. Complete customer service requests to earn 80% net tariffs.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-mono">
                        <th className="py-2.5 px-3">Trip ID</th>
                        <th className="py-2.5 px-3">Gross Fare</th>
                        <th className="py-2.5 px-3">Platform Fee (20%)</th>
                        <th className="py-2.5 px-3">Sahayak Share (80%)</th>
                        <th className="py-2.5 px-3">Settlement Status</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                      {earningsHistory.map((e) => {
                        const statusBadge = {
                          available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
                          pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
                          held: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
                          paid_out: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
                          reversed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
                        };

                        return (
                          <tr key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                              {e.booking?.booking_id || e.booking_id?.slice(0, 8)}
                            </td>
                            <td className="py-3 px-3 text-zinc-400">
                              ₹{e.gross_amount}
                            </td>
                            <td className="py-3 px-3 text-zinc-400">
                              -₹{e.platform_commission_amount}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                              +₹{e.assistant_amount}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge[e.status] || 'bg-zinc-100'}`}>
                                {e.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-zinc-400 text-[11px]">
                              {new Date(e.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Request Payout Modal ────────────────────────────── */}
        {payoutModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-in">
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  Request Payout Withdrawal
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Authoritative Available Balance: <strong className="font-mono text-emerald-600 dark:text-emerald-400">₹{wallet.available_balance || 0}</strong>
                </p>
              </div>

              <form onSubmit={handleRequestPayout} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Withdrawal Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max={wallet.available_balance || 0}
                    step="1"
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 500)"
                    className="input-base text-sm font-mono w-full"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                    Minimum withdrawal threshold: ₹100
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Payout Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="input-base text-xs font-mono w-full"
                  >
                    <option value="bank_transfer">Direct Bank Transfer (NEFT/IMPS)</option>
                    <option value="upi">UPI Transfer</option>
                  </select>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Payouts are verified and disbursed by the ONECOOLIE administrative treasury team.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutModalOpen(false);
                      setPayoutAmount('');
                    }}
                    disabled={payoutLoading}
                    className="btn-secondary py-2 px-4 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payoutLoading || !payoutAmount || Number(payoutAmount) < 100}
                    className="btn-primary py-2 px-5 text-xs font-bold disabled:opacity-50"
                  >
                    {payoutLoading ? 'Submitting...' : 'Submit Withdrawal →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}