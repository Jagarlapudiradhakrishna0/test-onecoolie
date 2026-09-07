import React from 'react';
import {
  Check,
  Circle,
  Train,
  MapPin,
  Armchair,
  Luggage,
  Calendar,
  ChevronUp,
  CreditCard
} from 'lucide-react';
import { STATIONS } from '../../utils/services';

/**
 * JourneyProgressSidebar Component
 * Provides a clean 6-step progress indicator synchronized with Station & Train selection,
 * alongside the live journey summary at-a-glance.
 */
export default function JourneyProgressSidebar({
  station = 'KZJ',
  selectedTrain = null,
  journeyDate = '',
  journeyTime = '',
  coach = '',
  seatNumber = '',
  berthType = 'Lower',
  actionType = 'load_to_seat',
  bookingStep = 1,
  onStepClick,
  services = {},
  calculateTotal = () => 0,
  getLuggageTotalCount = () => 0,
  getLuggageSummaryLabel = () => '',
  getLuggageTotalCost = () => 0,
  serviceMeta = []
}) {
  const currentStationObj = STATIONS.find((s) => s.code === station) || {
    code: station,
    name: station === 'KZJ' ? 'Kazipet Jn' : station
  };

  // Derive granular status for the 6 journey steps
  // 1. Boarding Station: Always selected
  // 2. Select Train: Complete when train is selected
  // 3. Journey Date: Complete when train & date selected
  // 4. Passenger Details: Complete when coach & seat valid or past step 2
  // 5. Add Services: Active on step 3, complete on step 4
  // 6. Review & Pay: Active on step 4
  const isStationSelected = Boolean(station);
  const isTrainSelected = Boolean(isStationSelected && selectedTrain);
  const isDateSelected = Boolean(isTrainSelected && journeyDate);
  const isSeatProvided = Boolean(coach.trim() && seatNumber.trim());
  const isSeatCompleted = bookingStep > 2 || (bookingStep === 2 && isSeatProvided);
  const isServicesCompleted = bookingStep > 3;

  const progressSteps = [
    {
      id: 'station',
      label: 'Boarding Station',
      detail: isStationSelected ? currentStationObj.code : null,
      state: isStationSelected ? 'completed' : 'current',
      stepNum: 1
    },
    {
      id: 'train',
      label: 'Select Train',
      detail: selectedTrain ? `${selectedTrain.train_no}` : null,
      state: !isStationSelected ? 'future' : isTrainSelected ? 'completed' : 'current',
      stepNum: 1
    },
    {
      id: 'date',
      label: 'Journey Date',
      detail: isDateSelected ? journeyDate : null,
      state: !isTrainSelected ? 'future' : isDateSelected ? 'completed' : 'current',
      stepNum: 1
    },
    {
      id: 'passenger',
      label: 'Passenger Details',
      detail: isSeatProvided ? `Coach ${coach} · Seat ${seatNumber}` : null,
      state:
        bookingStep === 2
          ? 'current'
          : isSeatCompleted
          ? 'completed'
          : 'future',
      stepNum: 2
    },
    {
      id: 'services',
      label: 'Add Services',
      detail: isServicesCompleted ? 'Assistance selected' : null,
      state:
        bookingStep === 3
          ? 'current'
          : isServicesCompleted
          ? 'completed'
          : 'future',
      stepNum: 3
    },
    {
      id: 'review',
      label: 'Review & Pay',
      detail: null,
      state: bookingStep === 4 ? 'current' : 'future',
      stepNum: 4
    }
  ];

  return (
    <aside className="space-y-4 w-full max-w-full min-w-0">
      {/* ── CARD 1: JOURNEY PROGRESS STEPS ───────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 space-y-4 w-full min-w-0">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
              Journey Progress
            </h3>
            <p className="text-[11px] text-zinc-400">Live booking synchronization</p>
          </div>
          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
            Step {bookingStep} of 4
          </span>
        </div>

        <div className="space-y-2.5">
          {progressSteps.map((step) => {
            const isDone = step.state === 'completed';
            const isCurrent = step.state === 'current';

            return (
              <div
                key={step.id}
                onClick={() => {
                  if (isDone && onStepClick && step.stepNum <= bookingStep) {
                    onStepClick(step.stepNum);
                  }
                }}
                className={`flex items-start gap-2.5 text-xs py-1 px-1.5 rounded-xl transition-all ${
                  isDone && onStepClick ? 'cursor-pointer hover:bg-slate-50' : ''
                }`}
              >
                {/* Step Circle Indicator */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-3 ring-blue-600/15'
                      : 'border border-slate-200 text-slate-300 bg-white'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  ) : (
                    <Circle className="w-2.5 h-2.5 stroke-[1.5]" />
                  )}
                </div>

                {/* Step Label & Optional Sub-Detail */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <p
                      className={`font-bold truncate ${
                        isCurrent
                          ? 'text-blue-700 font-extrabold'
                          : isDone
                          ? 'text-zinc-900'
                          : 'text-zinc-400 font-normal'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.detail && (
                      <span className="font-mono text-[10px] text-zinc-500 font-semibold truncate shrink-0 max-w-[110px]">
                        {step.detail}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CARD 2: JOURNEY SUMMARY AT-A-GLANCE ───────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 space-y-4.5 w-full min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 min-w-0">
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-zinc-900">
              Booking Summary
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Your journey at a glance</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/90 border border-slate-200/60 text-[11px] font-medium text-slate-600 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>In Progress</span>
          </span>
        </div>

        {/* Station Route Timeline */}
        <div className="space-y-4 relative pl-5 border-l-2 border-dashed border-blue-200 py-1 my-1">
          <div className="relative">
            <span className="absolute -left-[27px] top-0.5 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white flex items-center justify-center text-white shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-black text-sm text-zinc-900 tracking-tight">
                  {station || 'Select Station'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {station ? currentStationObj.name : 'Choose station above'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-xs text-zinc-900">
                  {journeyDate || 'Date TBD'}
                </p>
                <p className="font-mono text-[11px] text-slate-400">{journeyTime || '--:--'}</p>
              </div>
            </div>
          </div>

          <div className="relative pt-1">
            <span className="absolute -left-[27px] top-1.5 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white flex items-center justify-center text-white shadow-xs">
              <MapPin className="w-2.5 h-2.5 text-white" />
            </span>
            <div>
              <p className="font-black text-sm text-zinc-900 tracking-tight">
                {selectedTrain?.to?.code ||
                  (selectedTrain?.to?.name
                    ? selectedTrain.to.name.slice(0, 10).toUpperCase()
                    : '--')}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {selectedTrain?.to?.name || 'Select Train'}
              </p>
            </div>
          </div>
        </div>

        {/* Train Card Quick Look */}
        <div
          onClick={() => onStepClick && onStepClick(1)}
          className="w-full text-left p-3 rounded-2xl bg-blue-50/70 border border-blue-100/90 flex items-center justify-between gap-2 text-xs transition-colors hover:bg-blue-50 cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Train className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-zinc-900 truncate">
                {selectedTrain ? `${selectedTrain.train_no} · ${selectedTrain.train_name}` : 'Select Train'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {selectedTrain ? `Platform ${selectedTrain.platform || '1'}` : 'Click to choose train'}
              </p>
            </div>
          </div>
          {selectedTrain ? (
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider shrink-0">
              Selected
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-white text-slate-500 border border-slate-200 text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-2xs">
              Required
            </span>
          )}
        </div>

        {/* Coach / Seat / Mission type preview */}
        <div className="space-y-3 text-xs text-zinc-600 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-slate-100 text-zinc-600 flex items-center justify-center shrink-0">
              <Armchair className="w-4 h-4" />
            </span>
            <div>
              <span className="font-bold text-zinc-900">
                {coach || seatNumber
                  ? `Coach ${coach || '--'} · Seat ${seatNumber || '--'}`
                  : 'Coach & Seat Not Entered'}
              </span>
              <p className="text-[11px] text-slate-400">
                {coach || seatNumber ? `${berthType} Berth` : 'Specified in Step 2'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-slate-100 text-zinc-600 flex items-center justify-center shrink-0">
              <Luggage className="w-4 h-4" />
            </span>
            <div>
              <span className="font-bold text-zinc-900">
                {actionType === 'collect_from_seat'
                  ? 'De-boarding: Collect from Seat'
                  : 'Boarding: Load to Seat'}
              </span>
              <p className="text-[11px] text-slate-400">
                {actionType === 'collect_from_seat'
                  ? 'Meet at coach door'
                  : 'Meet at station gate / entrance'}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing / Charges Breakdown */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-zinc-900">
            <span>Service Charges</span>
            <span className="font-mono font-black text-sm text-blue-600">
              ₹{calculateTotal()}
            </span>
          </div>

          {serviceMeta.filter((s) => (s.key === 'luggage' ? getLuggageTotalCount() > 0 : s.qty ? services[s.key] > 0 : services[s.key])).length > 0 && (
            <div className="space-y-1.5 pt-1 text-zinc-600">
              {serviceMeta
                .filter((s) => (s.key === 'luggage' ? getLuggageTotalCount() > 0 : s.qty ? services[s.key] > 0 : services[s.key]))
                .map((s) => (
                  <div key={s.key} className="flex justify-between">
                    <span>
                      {s.label}{' '}
                      {s.key === 'luggage'
                        ? `(${getLuggageSummaryLabel()})`
                        : s.qty && services[s.key] > 1
                        ? `(${services[s.key]}x)`
                        : ''}
                    </span>
                    <span className="font-mono font-bold text-zinc-900">
                      ₹{s.key === 'luggage' ? getLuggageTotalCost() : s.qty ? s.price * services[s.key] : s.price}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* GST Included line */}
          <div className="flex justify-between text-zinc-600 pt-1 border-t border-slate-100">
            <span>GST (Included)</span>
            <span className="font-mono font-bold text-zinc-900">₹0</span>
          </div>
        </div>

        {/* Total Payable Soft Blue Highlight Box */}
        <div className="p-4 rounded-2xl bg-[#EFF6FF] border border-blue-100/80 text-blue-600 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-600 block">Total Payable</span>
            <span className="text-[10px] text-slate-400 font-medium">All platform taxes included</span>
          </div>
          <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-blue-600">
            ₹{calculateTotal()}
          </span>
        </div>

        {/* Security Row with Razorpay & UPI/Mastercard Icons */}
        <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 border-t border-slate-100/80">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium text-slate-500 truncate">
              Secured Payments with <strong className="font-extrabold text-[#0C2340]">Razorpay</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-6 px-2 rounded-md bg-white border border-slate-200/90 shadow-2xs flex items-center gap-1 shrink-0" title="UPI">
              <span className="text-[10px] font-black italic tracking-tighter text-[#2E3192] leading-none font-sans">UPI</span>
            </div>
            <div className="h-6 px-2 rounded-md bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0" title="Card">
              <CreditCard className="w-3.5 h-3.5 text-zinc-600" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
