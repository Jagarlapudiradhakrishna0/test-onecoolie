import React from 'react';
import { ShieldCheck, Check, Clock, XCircle, AlertCircle } from 'lucide-react';

/* ============================================================
   JOURNEY PROTECTION STATUS BADGE
   • Displays ACTIVE, PENDING, CANCELLED, or EXPIRED status
   • Minimal, clean, Swiss-inspired design
   ============================================================ */

export default function JourneyProtectionStatusBadge({ status = 'active', protectionId = null, onClick }) {
  const norm = String(status || '').toLowerCase();

  let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
  let label = 'Protection Pending';
  let Icon = Clock;

  if (norm === 'active') {
    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Protection Active';
    Icon = ShieldCheck;
  } else if (norm === 'cancelled' || norm === 'refunded') {
    badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
    label = 'Protection Cancelled';
    Icon = XCircle;
  } else if (norm === 'expired') {
    badgeClass = 'bg-zinc-100 text-zinc-600 border-zinc-200';
    label = 'Protection Expired';
    Icon = Clock;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${badgeClass} ${
        onClick ? 'cursor-pointer hover:shadow-2xs' : 'cursor-default'
      }`}
      title={protectionId ? `Protection ID: ${protectionId}` : 'Journey Protection'}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {protectionId && (
        <span className="font-mono text-[10px] opacity-80 border-l border-current/20 pl-1.5 ml-0.5">
          {protectionId}
        </span>
      )}
    </button>
  );
}
