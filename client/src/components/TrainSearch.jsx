import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Zap, Train, X, Building2 } from 'lucide-react';
import axios from '../api/axios';
import { STATIONS } from '../utils/services';
import TrainList from './journey/TrainList';

const FULL_STATION_NAMES = {
  KZJ: 'Kazipet Junction',
  WL: 'Warangal',
  BZA: 'Vijayawada Junction',
  SC: 'Secunderabad Junction'
};

/**
 * TrainSearch Component
 * Real-time Indian Railway station-dependent train finder.
 * Shows available trains filtered by the selected station with pagination and live search.
 */
export default function TrainSearch({
  onSelect,
  station = '',
  selectedTrain = null
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const debounceTimeout = useRef(null);
  const inputRef = useRef(null);

  const currentStation = station ? STATIONS.find((s) => s.code === station) || {
    code: station,
    name: FULL_STATION_NAMES[station] || station
  } : null;

  const currentStationName = currentStation
    ? FULL_STATION_NAMES[currentStation.code] || currentStation.name
    : '';

  // Reset pagination on query or station changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, station]);

  // Fetch trains available at current station or search query
  const searchTrains = useCallback(
    async (searchQuery = '') => {
      if (!station) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data } = await axios.get('/trains/search', {
          params: {
            query: searchQuery,
            station: station
          }
        });
        setResults(data || []);
      } catch (err) {
        console.error('Error querying trains:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [station]
  );

  // Load trains when station changes or on mount (only if station is chosen)
  useEffect(() => {
    if (!station) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (query.trim().length === 0) {
      searchTrains('');
      return;
    }

    debounceTimeout.current = setTimeout(() => {
      searchTrains(query.trim());
    }, 280);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [query, station, searchTrains]);

  const handleSelectTrain = (train) => {
    if (onSelect) {
      onSelect({
        train_no: train.train_no,
        train_name: train.train_name,
        from: train.from,
        to: train.to,
        stops: train.stops || [{ code: station }],
        platform: train.platform,
        expected_arrival: train.expected_arrival,
        expected_departure: train.expected_departure,
        scheduled_arrival: train.scheduled_arrival,
        scheduled_departure: train.scheduled_departure,
        delay_minutes: train.delay_minutes,
        status: train.status,
        is_live: train.is_live
      });
    }
  };

  return (
    <div className="space-y-3.5 w-full max-w-full min-w-0" id="train-selection-container">
      {/* ── Section Header Row ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 min-w-0">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Train className="w-3.5 h-3.5 text-blue-600" />
            <span>Train</span>
          </label>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            {station ? (
              <>
                Showing trains available at <strong className="text-zinc-800">{currentStationName} ({currentStation.code})</strong>
              </>
            ) : (
              'Select a boarding station above to view available trains'
            )}
          </p>
        </div>

        {/* Live Refresh / Rescan Action (Only when station is selected) */}
        {station && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              searchTrains('');
            }}
            className="bg-blue-50 hover:bg-blue-100/80 text-blue-600 font-bold px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 border border-blue-100/80 cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
            title="Refresh real-time train board"
          >
            <Zap className="w-3 h-3 text-blue-600 fill-blue-600" />
            <span>Live Trains</span>
          </button>
        )}
      </div>

      {!station ? (
        /* Prompt to choose station first */
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2.5 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs border border-blue-100">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-sm text-zinc-800">Choose a Boarding Station First</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Please select your boarding station above to see all live arrivals, platforms, and advance train schedules.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Search Input Box ──────────────────────────────────────── */}
          <div className="relative w-full min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search train number or name (e.g. 12760, Charminar Express...)"
              className="w-full pl-10.5 pr-10 py-3 bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 rounded-2xl text-xs sm:text-sm font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 shadow-2xs"
            />

            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  searchTrains('');
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : isLoading ? (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : null}
          </div>

          {/* ── Paginated Train List ──────────────────────────────────── */}
          <TrainList
            trains={results}
            station={station}
            isLoading={isLoading}
            onSelectTrain={handleSelectTrain}
            selectedTrain={selectedTrain}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            query={query}
          />
        </>
      )}
    </div>
  );
}