import React from 'react';
import { Train, ChevronRight, Zap, Calendar, Clock } from 'lucide-react';

/**
 * TrainCard Component
 * Individual train item in the station-filtered train list.
 * Clean, easy to scan, with distinct platform, timing, and delay indicators.
 */
export default function TrainCard({
  train,
  station = 'KZJ',
  onSelect,
  isSelected = false
}) {
  const schedTime = train.scheduled_arrival || train.scheduled_departure;
  const expTime = train.expected_arrival || train.expected_departure || schedTime;

  // Real-time 4-hour window check
  const checkWithin4Hours = () => {
    const timeStr = expTime || schedTime;
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
      return Boolean(train.is_live);
    }
    try {
      const istStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const now = new Date(istStr);
      const currentDayMinutes = now.getHours() * 60 + now.getMinutes();

      const [hh, mm] = timeStr.split(':').map(Number);
      if (isNaN(hh) || isNaN(mm)) return Boolean(train.is_live);

      let diff = (hh * 60 + mm) - currentDayMinutes;
      if (diff < -720) diff += 1440;
      if (diff > 720) diff -= 1440;
      return diff >= -30 && diff <= 240;
    } catch {
      return Boolean(train.is_live);
    }
  };

  const isWithin4Hours = checkWithin4Hours();
  const isLive = Boolean(train.is_live) || isWithin4Hours;
  const delayMinutes = Number(train.delay_minutes) || 0;
  const hasDelay = delayMinutes > 5;
  const platform = train.platform && train.platform !== 'null' && train.platform !== 'undefined' ? train.platform : '1';

  return (
    <div
      onClick={() => onSelect(train)}
      className={`bg-white hover:bg-slate-50/90 border rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer shadow-xs hover:shadow-md group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0 ${
        isSelected
          ? 'border-blue-600 ring-2 ring-blue-600/10 bg-blue-50/20'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      {/* Left Column: Train Details */}
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        {/* Train Icon Box */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50/90 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Train className="w-5 h-5" />
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="font-mono text-sm sm:text-base font-black text-zinc-900">
              {train.train_no}
            </span>
            <p className="font-bold text-sm sm:text-base text-zinc-900 truncate">
              {train.train_name}
            </p>
          </div>

          <p className="text-xs text-zinc-500 font-medium truncate flex items-center gap-1">
            <span>{train.from?.name || 'Origin'}</span>
            <span className="text-slate-400">→</span>
            <span>{train.to?.name || 'Destination'}</span>
          </p>

          {/* Status Badges Row */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {isWithin4Hours ? (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${
                  hasDelay
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${hasDelay ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                {hasDelay ? `Delayed ${delayMinutes}m` : (train.status && train.status !== 'Advance Schedule' ? train.status : 'On Time')}
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-purple-50 text-purple-700 border-purple-200/90 inline-flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-600" />
                <span>Advance Schedule</span>
              </span>
            )}

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                isWithin4Hours
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                  : 'bg-slate-100 text-zinc-600 border border-slate-200'
              }`}
            >
              {isWithin4Hours ? (
                <>
                  <Zap className="w-3 h-3 text-blue-600 fill-blue-600 animate-pulse" />
                  <span>Live</span>
                </>
              ) : (
                <span>Regular</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Platform & Timings (Scheduled vs Expected like WIMT) */}
      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        <div className="text-left sm:text-right space-y-1">
          <div className="flex items-center sm:justify-end gap-1.5">
            <span className="text-xs text-zinc-500 font-medium">Platform</span>
            <span
              className={`px-2 py-0.5 rounded-md font-black font-mono text-xs inline-flex items-center justify-center border shadow-2xs ${
                isWithin4Hours
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-zinc-600 border-slate-200'
              }`}
            >
              {platform}
            </span>
          </div>

          {/* Timings: Shows Scheduled and Expected with Delay Badge */}
          {hasDelay ? (
            <div className="space-y-0.5">
              <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-start sm:justify-end gap-1">
                <span>Sched:</span>
                <span className="line-through">{schedTime}</span>
              </div>
              <div className="flex items-center justify-start sm:justify-end gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Exp:</span>
                <span className="text-sm sm:text-base font-black font-mono text-rose-600">
                  {expTime}
                </span>
              </div>
              <p className="text-[10px] font-bold text-rose-600 sm:text-right">
                {delayMinutes}m late
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-[11px] text-zinc-400 font-medium">
                {isWithin4Hours ? `Expected at ${station}` : `Timing at ${station}`}
              </p>
              <p className="text-sm sm:text-base font-black font-mono text-zinc-900">
                {expTime || schedTime || '--:--'}
              </p>
              {isWithin4Hours && (
                <p className="text-[10px] font-bold text-emerald-600 sm:text-right">
                  Right Time
                </p>
              )}
            </div>
          )}
        </div>

        <div className="w-8 h-8 rounded-full bg-slate-50 text-zinc-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0 border border-slate-200 group-hover:border-blue-600">
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
}
