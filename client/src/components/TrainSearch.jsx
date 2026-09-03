import { useState, useEffect, useRef, useCallback } from 'react';
import axios from '../api/axios';

/* ============================================================
   TRAIN SEARCH COMPONENT — Real-Time Indian Railway Feed
   • Dynamic live train resolution from IRCTC telemetry
   • Automatic live platform & delay telemetry injection
   ============================================================ */

export default function TrainSearch({ onSelect, station }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimeout = useRef(null);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real-time trains for current station or search query
  const searchTrains = useCallback(async (searchQuery = '') => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/trains/search', {
        params: {
          query: searchQuery,
          station: station || undefined
        }
      });
      setResults(data || []);
      setIsOpen((data || []).length > 0);
    } catch (err) {
      console.error('Error querying trains:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [station]);

  // Query on user input
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (query.trim().length === 0) {
      // If user clears input, show all real-time trains at this station
      if (station) {
        searchTrains('');
      } else {
        setResults([]);
        setIsOpen(false);
      }
      return;
    }

    debounceTimeout.current = setTimeout(() => {
      searchTrains(query.trim());
    }, 300);

    return () => clearTimeout(debounceTimeout.current);
  }, [query, station, searchTrains]);

  const handleSelect = (train) => {
    setQuery(`${train.train_no} · ${train.train_name}`);
    setIsOpen(false);
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
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Train Number or Name (Real-Time SCR Feed)
        </label>
        {station && (
          <button
            type="button"
            onClick={() => searchTrains('')}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>Show Live {station} Trains</span>
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => {
            if (results.length === 0 && station) searchTrains(query);
            else if (results.length > 0) setIsOpen(true);
          }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Type train no/name or click to view live trains at ${station || 'station'}...`}
          className="input-base pr-10 text-sm font-medium"
        />

        {isLoading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-scale-in">
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>⚡ Live Telemetry &amp; 📅 Advance Pre-Booking ({results.length} trains)</span>
            <span>Hub: {station || 'All'}</span>
          </div>

          <ul className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {results.map((train) => {
              const isLive = train.is_live;
              const hasDelay = train.delay_minutes > 5;

              return (
                <li
                  key={`${train.train_no}-${train.expected_arrival || train.scheduled_arrival || ''}`}
                  onClick={() => handleSelect(train)}
                  className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                          {train.train_no}
                        </span>
                        <p className="font-bold text-sm text-black dark:text-white truncate">
                          {train.train_name}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                        <span>{train.from?.name || 'Origin'}</span>
                        <span>&rarr;</span>
                        <span>{train.to?.name || 'Destination'}</span>
                        {train.platform && train.platform !== 'TBD' && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              Platform {train.platform}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      {isLive ? (
                        <div className="flex flex-col items-end">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                              hasDelay
                                ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Today · {train.status || 'On Time'}
                          </span>
                          {(train.expected_arrival || train.scheduled_arrival) && (
                            <p className="text-xs font-mono font-bold text-black dark:text-white mt-1">
                              Live Arr: {train.expected_arrival || train.scheduled_arrival}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            📅 Advance Schedule
                          </span>
                          {train.scheduled_arrival && (
                            <p className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 mt-1">
                              Sch: {train.scheduled_arrival}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}