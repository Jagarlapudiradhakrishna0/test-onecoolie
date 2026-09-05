import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import ProfileMenu from '../context/ProfileMenu';
import { activeServices } from '../utils/services';
import AssistantJobCard from '../components/AssistantJobCard';
import Brand from '../components/Brand';
import TrainLoader from '../components/TrainLoader';

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
  const [tab, setTab] = useState('live'); // 'live' | 'jobs' | 'history'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
  }, [loadProfile, loadDashboard]);

  useEffect(() => {
    const interval = setInterval(() => loadDashboard(), 8000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

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
  const totalEarnings = completedJobs.reduce(
    (t, j) => t + Number(j.total_price || 0),
    0
  );
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
            <ProfileMenu role="assistant" onNavigate={(t) => setTab(t)} />
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
              label: 'Total Earnings',
              value: '₹' + totalEarnings,
              sub: `${completedJobs.length} jobs completed`,
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
      </main>
    </div>
  );
}