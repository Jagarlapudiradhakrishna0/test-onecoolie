import React from 'react';
import { Train, Check, ArrowRight, Clock, Zap, MapPin } from 'lucide-react';

/**
 * SelectedTrainCard Component
 * Displays the currently selected train in an elegant, subtle light-blue card.
 * Provides a clean "Change Train →" action without lock banners or red removal buttons.
 */
export default function SelectedTrainCard({
  selectedTrain,
  station = 'KZJ',
  onChangeTrain
}) {
  if (!selectedTrain) return null;

  const trainTime =
    selectedTrain.expected_arrival ||
    selectedTrain.scheduled_arrival ||
    selectedTrain.expected_departure ||
    selectedTrain.scheduled_departure;

  const platform = selectedTrain.platform || '1';
  const delayMinutes = selectedTrain.delay_minutes || 0;
  const isLive = Boolean(selectedTrain.is_live);
  const hasDelay = isLive && delayMinutes > 5;

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Train className="w-3.5 h-3.5 text-blue-600" />
          <span>Selected Train</span>
        </label>

        <button
          type="button"
          onClick={onChangeTrain}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer py-0.5 px-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 group"
        >
          <span>Change Train</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 shadow-[0_2px_12px_rgba(37,99,235,0.04)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0 animate-fade-in">
        {/* Left Side: Train Details */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Train className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="min-w-0 space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-mono font-black text-sm sm:text-base text-blue-700">
                {selectedTrain.train_no}
              </span>
              <span className="font-bold text-sm sm:text-base text-zinc-900 truncate">
                · {selectedTrain.train_name}
              </span>
            </div>

            <p className="text-xs text-zinc-600 font-medium truncate flex items-center gap-1">
              <span>{selectedTrain.from?.name || 'Origin'}</span>
              <span className="text-slate-400">→</span>
              <span>{selectedTrain.to?.name || 'Destination'}</span>
            </p>

            {/* Timetable & Platform row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {trainTime && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 bg-white/80 border border-blue-200/60 px-2.5 py-0.5 rounded-md">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span>At {station}: <strong>{trainTime}</strong></span>
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 bg-white/80 border border-blue-200/60 px-2.5 py-0.5 rounded-md">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span>Platform <strong>{platform}</strong></span>
              </span>

              {isLive ? (
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  hasDelay
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasDelay ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                  {hasDelay ? `Delayed by ${delayMinutes}m` : 'On Time'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  Scheduled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Selected Pill and Action */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-100/70">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/90 text-blue-800 border border-blue-200 text-xs font-bold shadow-2xs">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Selected</span>
          </span>

          <button
            type="button"
            onClick={onChangeTrain}
            className="sm:hidden text-xs font-bold text-blue-600 hover:text-blue-700 py-1 px-2 cursor-pointer"
          >
            Change →
          </button>
        </div>
      </div>
    </div>
  );
}
