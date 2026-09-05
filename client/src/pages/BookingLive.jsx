import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axios';
import ActiveBooking from '../components/ActiveBooking';
import Brand from '../components/Brand';

/* ============================================================
   BOOKING LIVE — Real-Time Tracking & Ledger Page
   Strictly Black (#000000), White (#FFFFFF), and Blue (#2563EB)
   ============================================================ */

const SERVICE_LABELS = {
  luggage: 'Luggage Assistance',
  escort: 'Seat & Coach Escorting',
  language: 'Multilingual Guide',
  wheelchair: 'Wheelchair & Priority',
  snacks: 'Berth Refreshments',
  transport: 'Exit Gate Transfer',
};

export default function BookingLive() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [distance, setDistance] = useState(500);

  const fetchBooking = useCallback(async () => {
    try {
      const { data } = await axios.get(`/bookings/${id}`);
      setBooking(data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
    const interval = setInterval(fetchBooking, 6000);
    return () => clearInterval(interval);
  }, [fetchBooking]);

  useEffect(() => {
    if (booking?.booking_status === 'arriving') {
      const interval = setInterval(() => {
        setDistance((d) => Math.max(0, d - Math.floor(Math.random() * 40)));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [booking?.booking_status]);

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-black dark:text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="font-mono text-xs text-zinc-400">
            CONNECTING TELEMETRY...
          </p>
        </div>
      </div>
    );
  }

  const status = booking.booking_status || 'pending';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-black dark:text-white">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
            >
              &larr; Dashboard
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Brand sub="Live Tracking" />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400 hidden sm:inline-block">
              ID: #{booking.id?.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* ── Content Layout ────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 sm:py-10">
        {status === 'cancelled' ? (
          <div className="max-w-md mx-auto p-8 rounded-2xl text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <h2 className="text-xl font-bold tracking-tight mb-2">
              Assistance Cancelled
            </h2>
            <p className="text-xs text-zinc-500 mb-6">
              This request was cancelled. You may schedule a new booking anytime.
            </p>
            <Link to="/dashboard" className="btn-primary py-2.5 px-6 text-xs">
              &larr; Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Main Column: Active Booking Component (8 cols) */}
            <div className="lg:col-span-8">
              <ActiveBooking
                booking={booking}
                distance={distance}
                onUpdate={(b) => setBooking(b)}
              />
            </div>

            {/* Sidebar: Details & Payment Ledger (4 cols) */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Journey Details */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-2">
                  Trip Credentials
                </span>
                <h3 className="text-lg font-bold tracking-tight mb-4">
                  Train & Station Info
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Train Number</span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {booking.train_no}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Train Name</span>
                    <span className="font-bold text-black dark:text-white truncate max-w-[170px]">
                      {booking.train_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Station Hub</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {booking.station_code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Journey Date</span>
                    <span className="font-mono text-black dark:text-white">
                      {booking.journey_date}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono block mb-2">
                  Payment Ledger
                </span>
                <h3 className="text-lg font-bold tracking-tight mb-4">
                  Settlement
                </h3>

                <div className="space-y-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  {Object.entries(booking.services || {})
                    .filter(([, v]) => (typeof v === 'number' ? v > 0 : v))
                    .map(([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between items-center text-xs"
                      >
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {SERVICE_LABELS[k] || k}
                        </span>
                        <span className="font-mono font-semibold text-black dark:text-white">
                          {typeof v === 'number' ? `${v} item(s)` : 'Yes'}
                        </span>
                      </div>
                    ))}
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Total Amount
                  </span>
                  <span className="text-2xl font-bold font-mono text-black dark:text-white">
                    ₹{booking.total_price}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Payment Status</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">
                    {booking.payment_status || 'Pending'}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}