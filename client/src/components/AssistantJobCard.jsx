import { useEffect, useState } from 'react';
import axios from '../api/axios';
import { activeServices } from '../utils/services';

/* ============================================================
   ASSISTANT JOB CARD — Swiss Minimalist Duty Task Card
   Progression: accepted → arriving → in_service → completed
   Strictly Black (#000000), White (#FFFFFF), and OneCoolie Blue (#2563EB)
   ============================================================ */

export default function AssistantJobCard({ job, onUpdate }) {
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [chatMsgs, setChatMsgs] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [loading, setLoading] = useState(false);

  const paid = job.payment_status === 'paid';
  const status =
    job.booking_status || job.assistant_status || 'accepted';

  /* ── Socket.IO Real-Time Chat ───────────────────────────── */
  useEffect(() => {
    if (!window.socket || !job?.id) return;
    window.socket.emit('join_booking', job.id);

    const handleStatus = (booking) => {
      if (booking?.id === job.id) onUpdate(booking);
    };

    const handleChat = (message) => {
      if (!message?.bookingId || message.bookingId === job.id) {
        setChatMsgs((prev) => [...prev, message]);
      }
    };

    window.socket.on('status_update', handleStatus);
    window.socket.on('chat_message', handleChat);

    return () => {
      window.socket.off('status_update', handleStatus);
      window.socket.off('chat_message', handleChat);
    };
  }, [job?.id, onUpdate]);

  /* ── Status Progression Actions ─────────────────────────── */
  const goArriving = async () => {
    if (loading) return;
    setLoading(true);
    setOtpError('');
    try {
      const { data } = await axios.patch(`/service/${job.id}/status`, {
        status: 'arriving',
      });
      onUpdate(data);
    } catch (error) {
      setOtpError(
        error.response?.data?.message || 'Unable to update arrival status.'
      );
    } finally {
      setLoading(false);
    }
  };

  const startService = async () => {
    if (loading) return;
    if (!otpInput || otpInput.trim().length !== 6) {
      setOtpError('Please enter the exact 6-digit passenger OTP.');
      return;
    }
    setLoading(true);
    setOtpError('');
    try {
      const { data } = await axios.post(`/service/${job.id}/confirm-otp`, {
        otp: otpInput.trim(),
      });
      onUpdate(data);
      setOtpInput('');
    } catch (error) {
      setOtpError(
        error.response?.data?.message ||
        'Invalid OTP. Ask passenger to view the 6-digit code on their screen.'
      );
    } finally {
      setLoading(false);
    }
  };

  const collectPayment = async (method) => {
    if (loading || paid) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`/service/${job.id}/pay`, { method });
      onUpdate(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to record payment.');
    } finally {
      setLoading(false);
    }
  };

  const completeService = async () => {
    if (loading) return;
    if (!paid) {
      alert('Please collect or verify payment before completing the job.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(`/assistants/${job.id}/complete`);
      onUpdate(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to complete service.');
    } finally {
      setLoading(false);
    }
  };

  const cancelJob = async () => {
    if (loading) return;
    const confirmed = window.confirm(
      'Cancel this job assignment? It will return to the live station request pool.'
    );
    if (!confirmed) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`/assistants/${job.id}/cancel`);
      onUpdate(data?.booking || data);
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to cancel job.');
    } finally {
      setLoading(false);
    }
  };

  const sendChat = () => {
    const text = msgInput.trim();
    if (!text || !window.socket) return;
    const msg = {
      bookingId: job.id,
      from: 'assistant',
      text,
      timestamp: new Date().toISOString(),
    };
    window.socket.emit('chat_message', msg);
    setChatMsgs((prev) => [...prev, msg]);
    setMsgInput('');
  };

  const services = activeServices(job.services || []);

  return (
    <article className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-blue font-mono">
                Train {job.train_no || '—'}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Hub: {job.station_code}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white">
              {job.train_name || 'Passenger Assistance'}
            </h3>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
              Date: {job.journey_date || '—'} {job.journey_time ? `at ${job.journey_time}` : ''} · ID: {job.booking_id || job.id}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block">
              Payable Amount
            </span>
            <p className="text-3xl font-bold font-mono text-black dark:text-white">
              ₹{job.total_price || 0}
            </p>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 font-mono ${paid
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white'
                  : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                }`}
            >
              {paid ? 'Paid · Succeeded' : 'Payment Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Details Grid ──────────────────────────────────────── */}
      <div className="p-6 sm:p-8 grid md:grid-cols-2 gap-8 border-b border-zinc-100 dark:border-zinc-800">
        {/* Passenger & Services */}
        <div className="space-y-4">
          {/* Coach & Seat Mission Target Box */}
          {(job.coach || job.seat_number || job.services?.coach || job.services?.seat_number) && (
            <div className="p-4 rounded-xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 font-mono block">
                🎯 Platform Coach &amp; Seat Target
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 bg-blue-600 text-white font-mono font-black text-sm rounded-lg shadow-sm">
                  Coach {job.coach || job.services?.coach}
                </span>
                <span className="px-3 py-1 bg-white dark:bg-zinc-800 text-black dark:text-white font-mono font-black text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  Seat / Berth {job.seat_number || job.services?.seat_number}
                  {(job.berth_type || job.services?.berth_type) && ` (${job.berth_type || job.services?.berth_type})`}
                </span>
                {(job.pnr || job.services?.pnr) && (
                  <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-xs rounded-lg">
                    PNR: {job.pnr || job.services?.pnr}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                {job.action_type === 'collect_from_seat' || job.services?.action_type === 'collect_from_seat'
                  ? '🚪 De-boarding: Meet at coach door & collect luggage from passenger seat.'
                  : '🚶 Boarding: Escort passenger & load luggage directly into their coach and berth.'}
              </p>
            </div>
          )}

          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-1">
              Passenger Information
            </span>
            <p className="font-bold text-sm text-black dark:text-white">
              {job.passenger?.name || 'Passenger'}
            </p>
            <p className="text-xs font-mono text-zinc-400">
              {job.passenger?.email || ''}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-2">
              Requested Services
            </span>
            <div className="space-y-1.5">
              {services.map((s) => (
                <div
                  key={s.key}
                  className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300"
                >
                  <span>{s.label}</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── NEXT ACTION (Primary Visual Focal Point) ─────────── */}
        <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono block mb-1">
              Next Action Required
            </span>

            {/* State 1: Accepted */}
            {status === 'accepted' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-black dark:text-white">
                  Head to Station Platform
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Proceed to the coach platform and mark yourself as arriving to alert the passenger.
                </p>
                <button
                  type="button"
                  onClick={goArriving}
                  disabled={loading}
                  className="btn-primary w-full py-3 text-xs"
                >
                  {loading ? 'Updating...' : 'I Have Arrived at Platform →'}
                </button>
              </div>
            )}

            {/* State 2: Arriving -> OTP Verification */}
            {status === 'arriving' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-black dark:text-white">
                  Verify Passenger 6-Digit OTP
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Ask the passenger to present the OTP on their mobile screen to unlock the job.
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="input-base text-center font-mono text-xl font-bold tracking-widest"
                  />

                  {otpError && (
                    <p className="text-xs text-black dark:text-white font-medium">
                      {otpError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={startService}
                    disabled={loading || otpInput.length !== 6}
                    className="btn-primary w-full py-3 text-xs"
                  >
                    {loading ? 'Verifying OTP...' : 'Verify & Start Service →'}
                  </button>
                </div>
              </div>
            )}

            {/* State 3: In Service -> Payment Collection & Completion */}
            {status === 'in_service' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-black dark:text-white">
                  In Service · Payment & Completion
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Escort the passenger to their seat or exit gate. Collect payment before finishing.
                </p>

                {!paid && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => collectPayment('cash')}
                      disabled={loading}
                      className="btn-secondary py-2.5 text-xs font-bold"
                    >
                      Collect Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => collectPayment('upi')}
                      disabled={loading}
                      className="btn-secondary py-2.5 text-xs font-bold"
                    >
                      Collect UPI
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={completeService}
                  disabled={loading || !paid}
                  className="btn-primary w-full py-3 text-xs"
                >
                  {loading ? 'Finalizing...' : 'Complete Service →'}
                </button>
              </div>
            )}

            {/* State 4: Completed */}
            {status === 'completed' && (
              <div className="space-y-2 py-4 text-center">
                <p className="text-sm font-bold text-black dark:text-white">
                  ✓ Service Successfully Completed
                </p>
                <p className="text-xs text-zinc-500 font-mono">
                  Earnings of ₹{job.total_price} credited to your station account.
                </p>
              </div>
            )}
          </div>

          {/* Cancellation link */}
          {status !== 'completed' && (
            <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-700 text-right">
              <button
                type="button"
                onClick={cancelJob}
                disabled={loading}
                className="text-[11px] font-semibold text-zinc-400 hover:text-black dark:hover:text-white"
              >
                Cancel Assignment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Real-Time Chat Drawer ────────────────────────────── */}
      <div className="p-6 sm:p-8 bg-zinc-50/50 dark:bg-zinc-950/50">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-black dark:text-white">
            Passenger Live Messaging
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            ID: #{job.id?.slice(-6).toUpperCase()}
          </span>
        </div>

        <div className="space-y-2.5 min-h-[100px] max-h-48 overflow-y-auto pr-2 mb-3">
          {chatMsgs.length === 0 ? (
            <p className="text-xs text-zinc-400 font-mono py-4 text-center">
              No messages from passenger yet.
            </p>
          ) : (
            chatMsgs.map((m, i) => {
              const isAssistant = m.from === 'assistant';
              return (
                <div
                  key={i}
                  className={`flex flex-col ${isAssistant ? 'items-end' : 'items-start'
                    }`}
                >
                  <div
                    className={`max-w-xs px-3.5 py-2 rounded-xl text-xs ${isAssistant
                        ? 'bg-black text-white dark:bg-white dark:text-black rounded-br-none font-medium'
                        : 'bg-white dark:bg-zinc-800 text-black dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-bl-none font-medium'
                      }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                    {isAssistant ? 'You' : 'Passenger'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            placeholder="Type message to passenger..."
            className="input-base text-xs py-2"
          />
          <button
            type="button"
            onClick={sendChat}
            className="btn-primary py-2 px-4 text-xs shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </article>
  );
}