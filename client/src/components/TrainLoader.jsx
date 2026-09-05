import React from 'react';

/**
 * TrainLoader
 *
 * A luxury-grade, app-style loading card centered in the screen middle.
 * Features a calm, unhurried black high-speed train cruising smoothly along
 * a metallic rail with ambient lighting and Apple/Uber-style floating aesthetics.
 *
 * @param {string} text - Title text to display (e.g. 'Loading OneCoolie...')
 * @param {string} subtext - Subtitle status hint
 * @param {boolean} fullScreen - Centers in viewport middle or container
 * @param {string} className - Additional custom container classes
 */
export default function TrainLoader({
  text = 'Loading OneCoolie...',
  subtext = 'Connecting to station dispatch...',
  fullScreen = true,
  className = '',
}) {
  const containerClasses = fullScreen
    ? `min-h-screen w-full flex items-center justify-center p-4 bg-slate-50/70 dark:bg-black/80 backdrop-blur-xs select-none ${className}`
    : `w-full py-8 flex items-center justify-center select-none ${className}`;

  return (
    <div className={containerClasses} role="status" aria-label={text}>
      {/* Centered Floating Luxury Loading Island */}
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col items-center max-w-[270px] w-full animate-fade-in">
        
        {/* ── Motion Track Capsule ── */}
        <div className="relative w-52 h-13 overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50/90 via-slate-100/50 to-slate-100/90 dark:from-zinc-800/40 dark:to-zinc-800/80 border border-slate-200/75 dark:border-zinc-700/60 flex flex-col justify-end pb-1.5 shadow-2xs">
          
          {/* Edge Fade Gradients for Velvety In/Out Transitions */}
          <div className="absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-slate-100/95 dark:from-zinc-800 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-slate-100/95 dark:from-zinc-800 to-transparent z-10 pointer-events-none" />

          {/* Calm Gliding Black Express Train (Unrushed 3.8s cruise) */}
          <div className="animate-train-glide-premium z-0 flex items-end">
            <div className="animate-train-float">
              <svg
                width="68"
                height="24"
                viewBox="0 0 68 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="overflow-visible"
              >
                <defs>
                  {/* Soft Radiant Headlight Glow */}
                  <linearGradient id="headlightSoftBeam" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
                    <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
                  </linearGradient>

                  {/* Piano Black Gloss Body */}
                  <linearGradient id="pianoBlackBody" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#27272a" />
                    <stop offset="35%" stopColor="#18181b" />
                    <stop offset="100%" stopColor="#09090b" />
                  </linearGradient>
                </defs>

                {/* Ambient Headlight Projection on Track */}
                <polygon points="60,12 86,6 86,18" fill="url(#headlightSoftBeam)" className="animate-headlight-soft" />

                {/* Sleek Aerodynamic Train Body */}
                <path
                  d="M 2 8
                     L 48 8
                     Q 58 8 62 13
                     L 63 16
                     Q 63 18 60 18
                     L 2 18
                     Z"
                  fill="url(#pianoBlackBody)"
                  stroke="#09090b"
                  strokeWidth="1.2"
                />

                {/* OneCoolie Signature Royal Blue Stripe */}
                <path d="M 2 13 L 60 13 Q 61 14 60 15 L 2 15 Z" fill="#2563eb" />

                {/* Aerodynamic Cockpit Windshield */}
                <path
                  d="M 50 9.5
                     L 57 9.5
                     Q 60 10.5 61 13
                     L 50 13
                     Z"
                  fill="#e0f2fe"
                  stroke="#0f172a"
                  strokeWidth="0.8"
                />

                {/* Passenger Windows */}
                <rect x="10" y="9.5" width="6.5" height="3" rx="0.8" fill="#e0f2fe" />
                <rect x="20" y="9.5" width="6.5" height="3" rx="0.8" fill="#e0f2fe" />
                <rect x="30" y="9.5" width="6.5" height="3" rx="0.8" fill="#e0f2fe" />
                <rect x="41" y="9.5" width="5.5" height="3" rx="0.8" fill="#e0f2fe" />

                {/* Front Headlight Crystal */}
                <circle cx="61.5" cy="13.5" r="1.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.6" />

                {/* Wheels with Relaxed, Calibrated Rotation */}
                <g className="animate-wheel-spin-calm" style={{ transformOrigin: '12px 19px' }}>
                  <circle cx="12" cy="19" r="3" fill="#09090b" stroke="#71717a" strokeWidth="1" />
                  <circle cx="12" cy="19" r="1" fill="#cbd5e1" />
                </g>
                <g className="animate-wheel-spin-calm" style={{ transformOrigin: '27px 19px' }}>
                  <circle cx="27" cy="19" r="3" fill="#09090b" stroke="#71717a" strokeWidth="1" />
                  <circle cx="27" cy="19" r="1" fill="#cbd5e1" />
                </g>
                <g className="animate-wheel-spin-calm" style={{ transformOrigin: '44px 19px' }}>
                  <circle cx="44" cy="19" r="3" fill="#09090b" stroke="#71717a" strokeWidth="1" />
                  <circle cx="44" cy="19" r="1" fill="#cbd5e1" />
                </g>
                <g className="animate-wheel-spin-calm" style={{ transformOrigin: '56px 19px' }}>
                  <circle cx="56" cy="19" r="3" fill="#09090b" stroke="#71717a" strokeWidth="1" />
                  <circle cx="56" cy="19" r="1" fill="#cbd5e1" />
                </g>
              </svg>
            </div>
          </div>

          {/* Precision Metallic Rail with Sleeper Dashes */}
          <div className="w-full h-[1.5px] bg-zinc-300 dark:bg-zinc-600 relative z-0">
            <div className="absolute inset-0 border-b border-dashed border-zinc-400/80 dark:border-zinc-500/80" />
          </div>
        </div>

        {/* ── Status Typography & Live Dispatch Tag ── */}
        <div className="text-center mt-4 space-y-1">
          <p className="text-xs font-black text-zinc-900 dark:text-white tracking-tight">
            {text}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>{subtext || 'Connecting to station dispatch...'}</span>
          </div>
        </div>

        {/* ── Smooth Railway Progress Flow ── */}
        <div className="w-32 h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3.5 relative">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-blue-600 to-transparent rounded-full animate-progress-flow" />
        </div>
      </div>
    </div>
  );
}
