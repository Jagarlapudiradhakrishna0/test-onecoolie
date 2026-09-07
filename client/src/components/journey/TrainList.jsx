import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TrainCard from './TrainCard';
import TrainLoader from '../TrainLoader';

const ITEMS_PER_PAGE = 5;

/**
 * TrainList Component
 * Displays paginated train results with smooth transitions and empty/loading states.
 */
export default function TrainList({
  trains = [],
  station = 'KZJ',
  isLoading = false,
  onSelectTrain,
  selectedTrain = null,
  currentPage = 1,
  onPageChange,
  query = ''
}) {
  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <TrainLoader
          fullScreen={false}
          size="sm"
          text="Scanning Railway Schedule..."
          subtext={`Checking available trains for station ${station}...`}
        />
      </div>
    );
  }

  if (trains.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-1">
        <p className="font-bold text-sm text-zinc-800">No trains found</p>
        <p className="text-xs text-zinc-500">
          {query
            ? `No trains found matching "${query}" at ${station}. Try another train number or name.`
            : `No trains currently listed for station ${station}.`}
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(trains.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTrains = trains.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-3 w-full min-w-0">
      {/* Train Cards */}
      <div className="space-y-2.5 min-w-0">
        {paginatedTrains.map((train) => {
          const isSelected = selectedTrain && selectedTrain.train_no === train.train_no;
          const trainKey = `${train.train_no}-${train.expected_arrival || train.scheduled_arrival || ''}`;

          return (
            <TrainCard
              key={trainKey}
              train={train}
              station={station}
              isSelected={isSelected}
              onSelect={onSelectTrain}
            />
          );
        })}
      </div>

      {/* Pagination Bar (When > 5 trains) */}
      {trains.length > ITEMS_PER_PAGE && (
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs font-medium shadow-2xs">
          <div className="text-zinc-500 font-mono text-[11px] sm:text-xs">
            Showing <span className="font-bold text-zinc-900">{startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, trains.length)}</span> of <span className="font-bold text-zinc-900">{trains.length}</span> trains
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-zinc-800 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <span className="px-2.5 py-1 font-mono font-bold text-xs text-blue-600 bg-blue-50 rounded-lg border border-blue-100">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-zinc-800 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
