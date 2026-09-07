import React, { useState } from 'react';
import { Building2, Check, ArrowRight, X, MapPin } from 'lucide-react';
import { STATIONS } from '../../utils/services';

const FULL_STATION_NAMES = {
  KZJ: 'Kazipet Junction',
  WL: 'Warangal',
  BZA: 'Vijayawada Junction',
  SC: 'Secunderabad Junction'
};

/**
 * Clean Boarding Station Card
 * Displays station selector when not selected, and a clean selected summary card when chosen.
 * Includes "Change Station →" action to re-open the picker without locks.
 */
export default function StationSelectionCard({
  station = '',
  onStationChange,
  disabled = false,
  inlineMessage = null
}) {
  const [isChanging, setIsChanging] = useState(false);

  const isSelected = Boolean(station);
  const showPicker = !isSelected || isChanging;

  const currentStation = isSelected
    ? STATIONS.find((s) => s.code === station) || {
        code: station,
        name: FULL_STATION_NAMES[station] || station,
        division: 'Secunderabad'
      }
    : null;

  const currentFullName = currentStation
    ? FULL_STATION_NAMES[currentStation.code] || currentStation.name
    : '';

  const handleSelectStation = (newCode) => {
    setIsChanging(false);
    if (newCode !== station && onStationChange) {
      onStationChange(newCode);
    }
  };

  return (
    <div className="space-y-3 w-full min-w-0">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Boarding Station</span>
        </label>

        {isSelected && !isChanging && (
          <button
            type="button"
            onClick={() => setIsChanging(true)}
            disabled={disabled}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 py-0.5 px-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 group"
          >
            <span>Change Station</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* When station is selected and not in change mode: show the clean card */}
      {!showPicker ? (
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Station Code Badge */}
            <div className="w-12 h-12 rounded-xl bg-blue-50/90 border border-blue-100 flex items-center justify-center font-mono font-black text-sm text-blue-600 shrink-0 shadow-2xs">
              {currentStation.code}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 truncate">
                  {currentFullName}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Boarding station for this journey · {currentStation.division} Division</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Selected</span>
            </span>
          </div>
        </div>
      ) : (
        /* Station Selector Grid (Shown initially or when user clicks Change Station) */
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 space-y-3.5 animate-fade-in shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-900">
                {isSelected ? 'Change Boarding Station' : 'Select Boarding Station'}
              </p>
              <p className="text-[11px] text-zinc-500">
                Choose your departure station to view available live trains &amp; timetable
              </p>
            </div>
            {isSelected && (
              <button
                type="button"
                onClick={() => setIsChanging(false)}
                className="text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                title="Cancel change"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-w-0">
            {STATIONS.map((st) => {
              const isCurrent = station === st.code;
              const fullName = FULL_STATION_NAMES[st.code] || st.name;

              return (
                <button
                  key={st.code}
                  type="button"
                  onClick={() => handleSelectStation(st.code)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer min-w-0 flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                      : 'bg-[#fafbfc] border-slate-200/90 hover:border-blue-400 hover:bg-white hover:shadow-xs text-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 min-w-0">
                    <span
                      className={`font-mono font-black text-xs px-2 py-0.5 rounded-md ${
                        isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-zinc-800'
                      }`}
                    >
                      {st.code}
                    </span>
                    {isCurrent && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </div>
                  <p className={`font-bold text-xs truncate ${isCurrent ? 'text-white' : 'text-zinc-900'}`}>
                    {fullName}
                  </p>
                  <p
                    className={`text-[10px] font-medium truncate mt-0.5 ${
                      isCurrent ? 'text-blue-100' : 'text-zinc-400'
                    }`}
                  >
                    {st.division} Div
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline Feedback Banner (e.g. When train was validated or invalidated) */}
      {inlineMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 animate-fade-in border ${
            inlineMessage.type === 'error' || inlineMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200/90'
              : 'bg-blue-50 text-blue-900 border-blue-200/80'
          }`}
        >
          <span>{inlineMessage.text}</span>
          {inlineMessage.onDismiss && (
            <button
              type="button"
              onClick={inlineMessage.onDismiss}
              className="text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
