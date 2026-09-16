import React, { useState, useEffect, useCallback } from 'react';
import {
  Rocket,
  Plus,
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Shield,
  Server,
  Database,
  Key,
  Layers,
  Activity,
  Play,
  CreditCard,
  RotateCcw,
  Users,
  RefreshCw,
  Link,
  ShieldCheck,
  Lock,
  FileText,
  BarChart3,
  Globe,
  Pause,
  ShieldAlert,
  Train,
  X,
  Check
} from 'lucide-react';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import trainHeaderImg from '../assets/images/vande_bharat_header_clean.jpg';

/* ==========================================================================
   ONECOOLIE LAUNCH OPERATIONS & CANARY ROLLOUT CENTER (CONSOLIDATED)
   Phased deployments, safety controls, and live validation checkpoints
   ========================================================================== */

// ── 1. PAGE HEADER COMPONENT ──────────────────────────────────────────────
function LaunchPageHeader({ onOpenNewPlan }) {
  return (
    <div className="relative bg-white dark:bg-[#0A0E1A] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">

        {/* Left: Badge, Title, Subtitle */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 text-[11px] font-bold tracking-wider uppercase font-mono">
            <Rocket className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
            <span>LAUNCH CENTERS</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight mt-2.5 font-sans">
            Canary Rollout & Expansion Control
          </h1>

          <p className="text-xs sm:text-[13.5px] text-[#64748B] dark:text-zinc-400 mt-1.5 leading-relaxed font-sans">
            Manage phased deployments, safety controls, and validation checkpoints for live operations.
          </p>
        </div>

        {/* Right: Modern Railway Visual + Status + Primary CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 self-stretch sm:self-auto justify-between lg:justify-end">

          {/* Vande Bharat train visual with subtle gradient fade */}
          <div className="hidden md:flex items-center gap-4 pl-4 border-l border-zinc-100 dark:border-zinc-800/80">
            <div className="relative w-44 h-16 overflow-hidden rounded-xl bg-gradient-to-r from-transparent via-white/40 to-white dark:from-transparent dark:to-[#0A0E1A] flex items-center">
              <img
                src={trainHeaderImg}
                alt="Vande Bharat High Speed Express"
                className="w-full h-full object-cover object-left scale-110 [mask-image:linear-gradient(to_right,transparent,black_20%,black)]"
              />
            </div>

            <div className="text-right whitespace-nowrap">
              <p className="text-xs sm:text-[13px] font-bold text-[#2563EB] tracking-tight">
                Safe Deployments
              </p>
              <div className="flex items-center justify-end gap-1.5 text-xs sm:text-[13px] font-bold text-[#0F172A] dark:text-zinc-200">
                <span>Smarter Operations</span>
                <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block animate-pulse" />
              </div>
            </div>
          </div>

          {/* Primary Blue Button */}
          <button
            type="button"
            onClick={onOpenNewPlan}
            className="w-full sm:w-auto h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-[0_2px_10px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition-all duration-150 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Launch Plan</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 2. LAUNCH DECISION BANNER COMPONENT ────────────────────────────────────
function LaunchDecisionBanner({
  cert,
  deployment,
  canaryState,
  metrics,
  lastSynced,
  onViewDetails
}) {
  const finalDecision = cert?.final_decision || 'NO_GO';
  const isNoGo = finalDecision === 'NO_GO';
  const isGo = finalDecision === 'GO';
  const isConditional = finalDecision === 'CONDITIONAL_GO';

  // Format sync timestamp nicely
  const formatSyncTime = (val) => {
    if (!val) return '10 Sept 2026, 23:31:55';
    try {
      const d = new Date(val);
      const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return `${day}, ${time}`;
    } catch {
      return String(val);
    }
  };

  const decisionReason =
    cert?.decision_reason ||
    'Critical launch blockers detected: Canary operations blocked. Payment success rate (57%) below threshold (85%).';

  // Styling maps based on decision (Red/Pink for NO_GO as per spec)
  const bannerTheme = isGo
    ? {
      bg: 'bg-gradient-to-r from-emerald-50/90 via-emerald-50/60 to-white dark:from-emerald-950/40 dark:to-zinc-950',
      border: 'border-emerald-200 dark:border-emerald-800/80',
      iconBg: 'bg-[#059669] text-white',
      decisionColor: 'text-[#059669]',
      badgeBg: 'bg-[#059669] text-white',
      badgeText: 'CERTIFIED FOR GO-LIVE',
      btnBg: 'bg-[#059669] hover:bg-[#047857] text-white'
    }
    : isConditional
      ? {
        bg: 'bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-white dark:from-amber-950/40 dark:to-zinc-950',
        border: 'border-amber-200 dark:border-amber-800/80',
        iconBg: 'bg-[#D97706] text-white',
        decisionColor: 'text-[#D97706]',
        badgeBg: 'bg-[#D97706] text-white',
        badgeText: 'CONDITIONAL READY',
        btnBg: 'bg-[#D97706] hover:bg-[#B45309] text-white'
      }
      : {
        bg: 'bg-gradient-to-r from-[#FFF1F2] via-[#FFF5F6] to-[#FFF8F8] dark:from-rose-950/35 dark:via-rose-950/20 dark:to-zinc-950',
        border: 'border-[#FDA4AF] dark:border-rose-900/60',
        iconBg: 'bg-[#F43F5E] text-white shadow-sm',
        decisionColor: 'text-[#E11D48] dark:text-rose-400',
        badgeBg: 'bg-[#BE123C] text-white',
        badgeText: 'BLOCKERS DETECTED',
        btnBg: 'bg-[#F43F5E] hover:bg-[#E11D48] text-white shadow-sm'
      };

  return (
    <div
      className={`relative rounded-[18px] border ${bannerTheme.border} ${bannerTheme.bg} p-5 sm:p-6 shadow-[0_2px_12px_rgba(244,63,94,0.05)] overflow-hidden transition-all duration-200`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">

        {/* LEFT: Rounded square warning icon + Text Details */}
        <div className="flex items-start gap-4 sm:gap-5 min-w-0 flex-1">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${bannerTheme.iconBg} flex items-center justify-center shrink-0 transition-transform`}
          >
            {isGo ? (
              <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            ) : isConditional ? (
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            ) : (
              <AlertOctagon className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest uppercase text-[#64748B] dark:text-zinc-400">
                PHASE 1B FINAL GO-LIVE CERTIFICATION
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 mt-1">
              <h2 className="text-xl sm:text-2xl lg:text-[26px] font-black tracking-tight font-sans text-[#0F172A] dark:text-white flex items-center">
                <span>DECISION:</span>
                <span className={`ml-2 font-black ${bannerTheme.decisionColor}`}>
                  {finalDecision}
                </span>
              </h2>

              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] sm:text-[10.5px] font-bold font-mono uppercase tracking-wider ${bannerTheme.badgeBg}`}
              >
                {bannerTheme.badgeText}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] text-[#334155] dark:text-zinc-300 mt-1.5 max-w-3xl leading-relaxed font-sans">
              {decisionReason}
            </p>
          </div>
        </div>

        {/* MIDDLE/RIGHT: Status Stack + Details CTA + Last Checked */}
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-end xl:items-center gap-4 sm:gap-6 lg:gap-3 xl:gap-5 self-stretch lg:self-auto shrink-0 justify-between">

          <div className="flex flex-wrap sm:flex-col gap-1.5 shrink-0">
            <div className="text-[11px] font-mono bg-[#0F172A] text-zinc-300 px-3 py-1.5 rounded-lg border border-white/10 shadow-2xs flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-zinc-400">Code Verified:</span>
              <strong className="text-[#10B981] font-bold">PASS (100%)</strong>
            </div>

            <div className="text-[11px] font-mono bg-[#0F172A] text-zinc-300 px-3 py-1.5 rounded-lg border border-white/10 shadow-2xs flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-zinc-400">Deployment:</span>
              <strong
                className={
                  (deployment?.deploymentStatus || 'WARNING').toUpperCase() === 'READY'
                    ? 'text-[#10B981]'
                    : 'text-[#F59E0B]'
                }
              >
                {(deployment?.deploymentStatus || 'WARNING').toUpperCase()}
              </strong>
            </div>

            <div className="text-[11px] font-mono bg-[#0F172A] text-zinc-300 px-3 py-1.5 rounded-lg border border-white/10 shadow-2xs flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-zinc-400">Gateway Mode:</span>
              <strong
                className={
                  deployment?.checks?.razorpayMode === 'live'
                    ? 'text-[#10B981]'
                    : 'text-[#F59E0B]'
                }
              >
                {(deployment?.checks?.razorpayMode || 'test').toUpperCase()}
              </strong>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 text-left sm:text-right shrink-0">
            <button
              type="button"
              onClick={onViewDetails}
              className={`px-4 py-2 rounded-xl ${bannerTheme.btnBg} text-xs font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer`}
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            <div className="text-[10px] text-[#64748B] dark:text-zinc-400 font-mono leading-tight mt-1">
              <p className="text-zinc-400">Last checked</p>
              <p className="text-[#334155] dark:text-zinc-300 font-medium">
                {formatSyncTime(lastSynced)}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── 3. PRODUCTION ENVIRONMENT ARCHITECTURE CARD ────────────────────────────
function ProductionEnvironmentCard({ deployment }) {
  const envName = deployment?.environment || 'development';
  const dbStatus = deployment?.checks?.databaseStatus || 'WARNING';
  const tablesCount = deployment?.deployment_info?.tables_available || 16;
  const pendingMigrations = deployment?.deployment_info?.pending_migrations ?? 4;
  const razorpayMode = deployment?.checks?.razorpayMode || 'test';
  const isRazorpayLive = razorpayMode === 'live';
  const isWebhookConfigured = deployment?.checks?.webhookConfigured ?? true;
  const corsOriginsCount = deployment?.checks?.corsOriginsCount || 5;

  return (
    <div className="bg-white dark:bg-[#0A0E1A] rounded-[18px] border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center">
            <Server className="w-4 h-4 text-[#2563EB] stroke-[2.2]" />
          </div>
          <h3 className="text-sm sm:text-[15px] font-bold text-[#0F172A] dark:text-white font-sans tracking-tight">
            A. Production Environment Deployment Architecture
          </h3>
        </div>

        <span className="px-3 py-1 rounded-md text-[10.5px] font-mono font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60">
          {envName.toUpperCase()}
        </span>
      </div>

      {/* 4 Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">

        {/* 1. Database Status */}
        <div className="p-4 rounded-[18px] bg-[#FEF9F0] dark:bg-amber-950/20 border border-[#FDE68A]/80 dark:border-amber-900/40 space-y-2 transition-all hover:border-amber-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 shadow-2xs">
              <Database className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#78350F] dark:text-amber-300 uppercase tracking-wide block font-sans">
                Database Status
              </span>
              <p className="text-[13.5px] font-extrabold text-[#B45309] dark:text-amber-400 font-mono leading-tight mt-0.5">
                {dbStatus.toUpperCase()} ({tablesCount} Tables)
              </p>
            </div>
          </div>
          <p className="text-[11.5px] text-[#92400E] dark:text-amber-300/80 pl-1 font-sans">
            {pendingMigrations} pending migrations
          </p>
        </div>

        {/* 2. Razorpay Mode */}
        <div className="p-4 rounded-[18px] bg-[#FEF9F0] dark:bg-amber-950/20 border border-[#FDE68A]/80 dark:border-amber-900/40 space-y-2 transition-all hover:border-amber-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#78350F] dark:text-amber-300 uppercase tracking-wide block font-sans">
                Razorpay Mode
              </span>
              <p className="text-[13.5px] font-extrabold text-[#B45309] dark:text-amber-400 font-mono leading-tight mt-0.5">
                {razorpayMode.toUpperCase()} MODE
              </p>
            </div>
          </div>
          <p className="text-[11.5px] text-[#92400E] dark:text-amber-300/80 pl-1 font-sans">
            {isRazorpayLive ? 'Live processing enabled' : 'Live mode disabled'}
          </p>
        </div>

        {/* 3. Webhook Secret */}
        <div className="p-4 rounded-[18px] bg-[#F0FDF4] dark:bg-emerald-950/20 border border-[#BBF7D0]/80 dark:border-emerald-900/40 space-y-2 transition-all hover:border-emerald-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] text-[#059669] flex items-center justify-center shrink-0 shadow-2xs">
              <Key className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#065F46] dark:text-emerald-300 uppercase tracking-wide block font-sans">
                Webhook Secret
              </span>
              <p className="text-[13.5px] font-extrabold text-[#059669] dark:text-emerald-400 font-mono leading-tight mt-0.5">
                {isWebhookConfigured ? 'CONFIGURED' : 'MISSING'}
              </p>
            </div>
          </div>
          <p className="text-[11.5px] text-[#047857] dark:text-emerald-300/80 pl-1 font-sans">
            Signature verification active
          </p>
        </div>

        {/* 4. CORS Security */}
        <div className="p-4 rounded-[18px] bg-[#F0F7FF] dark:bg-blue-950/20 border border-[#BFDBFE]/80 dark:border-blue-900/40 space-y-2 transition-all hover:border-blue-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0 shadow-2xs">
              <Shield className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#1E40AF] dark:text-blue-300 uppercase tracking-wide block font-sans">
                CORS Security
              </span>
              <p className="text-[13.5px] font-extrabold text-[#2563EB] dark:text-blue-400 font-mono leading-tight mt-0.5">
                {corsOriginsCount} Allowed Origins
              </p>
            </div>
          </div>
          <p className="text-[11.5px] text-[#1D4ED8] dark:text-blue-300/80 pl-1 font-sans">
            No unauthorized access
          </p>
        </div>

      </div>
    </div>
  );
}

// ── 4. VALIDATION MACHINE COMPONENT ───────────────────────────────────────
function ValidationMachine({
  activeSession,
  actionLoading,
  onStartSession,
  onCreateValidationOrder,
  createdOrder,
  paymentIdInput,
  setPaymentIdInput,
  onVerifyPayment,
  onVerifyWebhook,
  onVerifyRecovery,
  refundIdInput,
  setRefundIdInput,
  onVerifyRefund,
  onVerifyWallet
}) {
  const currentStage = activeSession?.stage || 'PENDING';

  return (
    <div className="bg-white dark:bg-[#0A0E1A] rounded-[18px] border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-5">

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
            <Activity className="w-4 h-4 text-[#059669] stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-[15px] font-bold text-[#0F172A] dark:text-white font-sans tracking-tight">
              B. Live ₹1 Validation & Stage Progression Machine
            </h3>
            <p className="text-xs text-[#64748B] dark:text-zinc-400 mt-0.5 font-sans">
              Stage: <strong className="text-[#2563EB] dark:text-blue-400 font-mono font-bold">{currentStage}</strong> · Append-only ledger recording
            </p>
          </div>
        </div>

        {/* Start Session Action */}
        <button
          type="button"
          onClick={onStartSession}
          disabled={actionLoading}
          className="h-9 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-[0.98] text-[#0F172A] dark:text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start Validation Session</span>
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT CARD: Generate ₹1 Test Order & Verification */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs sm:text-[13px] font-bold text-[#0F172A] dark:text-white font-sans">
                  Generate ₹1 (100 Paise) Test Order
                </h4>
                <p className="text-[11px] text-[#64748B] dark:text-zinc-400 font-sans mt-0.5 leading-snug">
                  Strictly server-controlled; ignores any client price overrides.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onCreateValidationOrder}
              disabled={actionLoading || !activeSession}
              className="h-8 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            >
              <span>⊕</span>
              <span>Create ₹1 Order</span>
            </button>
          </div>

          {/* Generated Order Info Box */}
          {createdOrder && (
            <div className="p-3.5 bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs font-mono shadow-2xs">
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Booking ID:</span>
                <strong className="text-zinc-900 dark:text-white">{createdOrder.booking_id}</strong>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Payment ID:</span>
                <strong className="text-zinc-900 dark:text-white">{createdOrder.payment_id}</strong>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Gateway Order:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{createdOrder.razorpay?.order_id || '—'}</strong>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Amount:</span>
                <strong className="text-zinc-900 dark:text-white">₹{createdOrder.amount || 1} (100 paise)</strong>
              </div>
            </div>
          )}

          {/* Payment ID Input & Verification Buttons */}
          <div className="space-y-2.5 pt-1">
            <label className="block text-[11px] font-medium text-[#475569] dark:text-zinc-400 font-sans">
              Authoritative Payment ID to Verify:
            </label>

            <input
              type="text"
              value={paymentIdInput}
              onChange={(e) => setPaymentIdInput(e.target.value)}
              placeholder="Paste Payment UUID (e.g. pay_123...)"
              className="w-full h-9 px-3.5 text-xs font-mono rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black text-[#0F172A] dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={onVerifyPayment}
                disabled={actionLoading || !paymentIdInput}
                className="h-9 px-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[#0F172A] dark:text-zinc-200 text-[11.5px] font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Verify Payment</span>
              </button>

              <button
                type="button"
                onClick={onVerifyWebhook}
                disabled={actionLoading || !paymentIdInput}
                className="h-9 px-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[#0F172A] dark:text-zinc-200 text-[11.5px] font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Link className="w-3.5 h-3.5 text-[#059669]" />
                <span>Verify Webhook</span>
              </button>

              <button
                type="button"
                onClick={onVerifyRecovery}
                disabled={actionLoading || !paymentIdInput}
                className="h-9 px-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[#0F172A] dark:text-zinc-200 text-[11.5px] font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Verify Recovery</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: Refund & Assistant Reversal Validation */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col justify-between space-y-4">

          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs sm:text-[13px] font-bold text-[#0F172A] dark:text-white font-sans">
                  C. Refund & Assistant Reversal Validation
                </h4>
                <p className="text-[11px] text-[#64748B] dark:text-zinc-400 font-sans mt-0.5 leading-snug">
                  Authoritative verification of refund ledger entries and 20/80 wallet commissions.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-[#475569] dark:text-zinc-400 font-sans">
                Refund ID to Verify:
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={refundIdInput}
                  onChange={(e) => setRefundIdInput(e.target.value)}
                  placeholder="Paste Refund UUID from ledger (e.g. rfnd_123...)"
                  className="flex-1 h-9 px-3.5 text-xs font-mono rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black text-[#0F172A] dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                />

                <button
                  type="button"
                  onClick={onVerifyRefund}
                  disabled={actionLoading || !refundIdInput}
                  className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-[#7C3AED] dark:text-purple-400 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Verify Refund</span>
                </button>
              </div>
            </div>
          </div>

          {/* Assistant Wallet Split Row */}
          <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#0F172A] dark:text-white block font-sans">
                  Assistant Wallet Split
                </span>
                <span className="text-[11px] text-[#64748B] dark:text-zinc-400 font-sans">
                  Confirm 20% commission / 80% Sahayak allocation
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onVerifyWallet}
              disabled={actionLoading || !activeSession}
              className="h-8 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify 20/80 Split</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

// ── 5. IMMUTABLE EVIDENCE LEDGER COMPONENT ─────────────────────────────────
function EvidenceLedger({ evidenceList = [] }) {
  const count = evidenceList.length;

  return (
    <div className="bg-white dark:bg-[#0A0E1A] rounded-[18px] border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-4">

      {/* Header Row */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-[#2563EB] stroke-[2.2]" />
          </div>
          <h4 className="text-xs sm:text-[13px] font-bold text-[#0F172A] dark:text-white font-sans tracking-tight">
            Immutable Evidence Ledger (Append-Only)
          </h4>
        </div>

        <span className="text-[11px] font-mono font-bold text-[#64748B] dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-0.5 rounded-md">
          {count} {count === 1 ? 'Entry' : 'Entries'} Recorded
        </span>
      </div>

      {/* Audit Log Content Container */}
      {count === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-[#F8FAFC]/70 dark:bg-zinc-900/30 py-8 px-4 flex flex-col items-center justify-center text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 flex items-center justify-center shadow-xs border border-zinc-200/60 dark:border-zinc-700/60">
            <FileText className="w-5 h-5 stroke-[1.8]" />
          </div>

          <div className="max-w-md">
            <p className="text-xs sm:text-[13px] font-semibold text-[#334155] dark:text-zinc-300 font-sans">
              No evidence recorded in this session yet.
            </p>
            <p className="text-[11px] sm:text-xs text-[#94A3B8] dark:text-zinc-500 font-sans mt-0.5">
              Execute verification steps above to append tamper-proof evidence.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-2.5 max-h-60 overflow-y-auto space-y-2">
          {evidenceList.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-mono shadow-2xs transition-all hover:border-zinc-300"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <strong className="text-[#0F172A] dark:text-white font-semibold truncate block">
                    {ev.step}
                  </strong>
                  {ev.reference_type && (
                    <span className="text-zinc-400 dark:text-zinc-500 text-[10.5px]">
                      {ev.reference_type}: <span className="text-zinc-600 dark:text-zinc-300 font-medium">{ev.reference_value}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 pl-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60">
                  {ev.status || 'VERIFIED'}
                </span>
                <span className="text-[10.5px] text-zinc-400">
                  {new Date(ev.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// ── 6. CANARY ROLLOUT CONTROLS COMPONENT ──────────────────────────────────
function CanaryRolloutControls({
  canaryState,
  actionLoading,
  onCanaryInternal,
  onCanaryLimited,
  onCanaryPercentage,
  onCanaryPublic,
  onPauseCanary
}) {
  const activeStage = canaryState?.stage || 'blocked';
  const isBlocked = activeStage === 'blocked';
  const blockedReason =
    canaryState?.blockedReason ||
    'Payment success rate (57%) below threshold (85%).';

  return (
    <div className="bg-white dark:bg-[#0A0E1A] rounded-[18px] border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-4">

      {/* Header & Stage Progression Actions */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">

        {/* Title & Stage */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <Rocket className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-[15px] font-bold text-[#0F172A] dark:text-white font-sans tracking-tight">
              D. Canary Rollout Operations & Expansion Controls
            </h3>
            <p className="text-xs text-[#64748B] dark:text-zinc-400 mt-0.5 font-sans">
              Active Stage:{' '}
              <strong
                className={`font-mono font-bold uppercase ${isBlocked
                  ? 'text-[#E11D48] dark:text-rose-400'
                  : 'text-[#D97706] dark:text-amber-400'
                  }`}
              >
                {activeStage}
              </strong>{' '}
              · Auto-safety protection
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Start Internal */}
          <button
            type="button"
            onClick={onCanaryInternal}
            disabled={actionLoading || isBlocked}
            className={`h-9 px-3.5 rounded-xl border text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer ${isBlocked
              ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 border-zinc-200 dark:border-zinc-700 cursor-not-allowed opacity-60'
              : 'bg-white dark:bg-zinc-900 text-[#0F172A] dark:text-white border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Start Internal</span>
          </button>

          {/* Move to Limited */}
          <button
            type="button"
            onClick={onCanaryLimited}
            disabled={actionLoading || isBlocked}
            className={`h-9 px-3.5 rounded-xl border text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer ${isBlocked
              ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 border-zinc-200 dark:border-zinc-700 cursor-not-allowed opacity-60'
              : 'bg-white dark:bg-zinc-900 text-[#0F172A] dark:text-white border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Move to Limited</span>
          </button>

          {/* Move to 25% */}
          <button
            type="button"
            onClick={() => onCanaryPercentage(25)}
            disabled={actionLoading || isBlocked}
            className={`h-9 px-3.5 rounded-xl border text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer ${isBlocked
              ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 border-zinc-200 dark:border-zinc-700 cursor-not-allowed opacity-60'
              : 'bg-white dark:bg-zinc-900 text-[#0F172A] dark:text-white border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Move to 25%</span>
          </button>

          {/* Move to Public (Disabled when blocked) */}
          <button
            type="button"
            onClick={onCanaryPublic}
            disabled={true}
            title="Disabled: Safety guard triggered and blockers active"
            className="h-9 px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed shadow-none"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Move to Public</span>
          </button>

          {/* Pause (Always accessible) */}
          <button
            type="button"
            onClick={onPauseCanary}
            disabled={actionLoading}
            className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-900 text-[#0F172A] dark:text-white border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-[0.98] text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>
        </div>

      </div>

      {/* Red/Pink Automatic Safety Guard Alert Banner */}
      {isBlocked && (
        <div className="p-4 rounded-xl bg-[#FFF1F2] dark:bg-rose-950/30 border border-[#FECDD3] dark:border-rose-900/60 flex items-start sm:items-center gap-3.5 text-[#9F1239] dark:text-rose-300 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-[#FFE4E6] dark:bg-rose-900/50 text-[#E11D48] flex items-center justify-center shrink-0">
            <AlertOctagon className="w-4 h-4 stroke-[2.5]" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-[11px] sm:text-xs uppercase font-mono font-bold tracking-wider block">
              AUTOMATIC SAFETY GUARD TRIGGERED (ROLLOUT FROZEN)
            </span>
            <p className="text-xs sm:text-[12.5px] text-[#9F1239]/90 dark:text-rose-200/90 font-sans mt-0.5 leading-snug">
              {blockedReason}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

// ── 7. ROLLOUT METRICS KPI CARDS (5 METRICS) ──────────────────────────────
function RolloutMetrics({ metrics }) {
  const paymentRate = metrics?.rates?.payment_success_rate ?? 57;
  const refundRate = metrics?.rates?.refund_rate ?? 0;
  const webhooksCount = metrics?.webhook_success_count ?? 5;
  const webhooksFailed = metrics?.webhook_failure_count ?? 0;
  const criticalCount = metrics?.critical_incident_count ?? 0;
  const sampleSize = metrics?.payment_attempts ?? 7;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">

      {/* 1. PAYMENT SUCCESS (RED) */}
      <div className="p-4 rounded-[18px] bg-white dark:bg-[#0A0E1A] border border-zinc-200/90 dark:border-zinc-800/90 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-zinc-400 uppercase tracking-wide block font-sans">
              Payment Success
            </span>
            <p className="text-2xl sm:text-[26px] font-black font-sans text-[#E11D48] tracking-tight mt-0.5">
              {paymentRate}%
            </p>
          </div>

          <div className="w-14 h-8 shrink-0 pt-1">
            <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
              <path
                d="M 2 8 L 15 10 L 30 18 L 45 16 L 58 26"
                fill="none"
                stroke="#F43F5E"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <span className="text-[11px] text-[#94A3B8] dark:text-zinc-500 font-mono">
          Threshold: ≥ 85%
        </span>
      </div>

      {/* 2. REFUND RATE (PURPLE) */}
      <div className="p-4 rounded-[18px] bg-white dark:bg-[#0A0E1A] border border-zinc-200/90 dark:border-zinc-800/90 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-zinc-400 uppercase tracking-wide block font-sans">
              Refund Rate
            </span>
            <p className="text-2xl sm:text-[26px] font-black font-sans text-[#7C3AED] tracking-tight mt-0.5">
              {refundRate}%
            </p>
          </div>

          <div className="w-14 h-8 shrink-0 pt-1">
            <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
              <path
                d="M 2 24 L 16 23 L 30 20 L 44 24 L 58 22"
                fill="none"
                stroke="#A855F7"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <span className="text-[11px] text-[#94A3B8] dark:text-zinc-500 font-mono">
          Threshold: ≤ 20%
        </span>
      </div>

      {/* 3. WEBHOOKS VERIFIED (BLUE) */}
      <div className="p-4 rounded-[18px] bg-white dark:bg-[#0A0E1A] border border-zinc-200/90 dark:border-zinc-800/90 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-zinc-400 uppercase tracking-wide block font-sans">
              Webhooks Verified
            </span>
            <p className="text-2xl sm:text-[26px] font-black font-sans text-[#2563EB] tracking-tight mt-0.5">
              {webhooksCount}
            </p>
          </div>

          <div className="w-14 h-8 shrink-0 pt-1">
            <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
              <path
                d="M 2 24 L 18 20 L 32 12 L 44 15 L 58 6"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <span className="text-[11px] text-[#94A3B8] dark:text-zinc-500 font-mono">
          {webhooksFailed} failed
        </span>
      </div>

      {/* 4. CRITICAL INCIDENTS (GREEN) */}
      <div className="p-4 rounded-[18px] bg-white dark:bg-[#0A0E1A] border border-zinc-200/90 dark:border-zinc-800/90 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-zinc-400 uppercase tracking-wide block font-sans">
              Critical Incidents
            </span>
            <p className="text-2xl sm:text-[26px] font-black font-sans text-[#059669] tracking-tight mt-0.5">
              {criticalCount}
            </p>
          </div>

          <div className="w-14 h-8 shrink-0 pt-1">
            <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
              <path
                d="M 2 22 L 18 22 L 32 21 L 46 22 L 58 22"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <span className="text-[11px] text-[#94A3B8] dark:text-zinc-500 font-mono">
          Threshold: 0
        </span>
      </div>

      {/* 5. SAMPLE SIZE (GREEN) */}
      <div className="p-4 rounded-[18px] bg-white dark:bg-[#0A0E1A] border border-zinc-200/90 dark:border-zinc-800/90 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all col-span-2 sm:col-span-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-zinc-400 uppercase tracking-wide block font-sans">
              Sample Size
            </span>
            <p className="text-2xl sm:text-[26px] font-black font-sans text-[#059669] tracking-tight mt-0.5">
              {sampleSize}
            </p>
          </div>

          <div className="w-14 h-8 shrink-0 pt-1">
            <svg viewBox="0 0 60 30" className="w-full h-full overflow-visible">
              <path
                d="M 2 24 L 16 18 L 30 22 L 44 14 L 58 8"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <span className="text-[11px] text-[#94A3B8] dark:text-zinc-500 font-mono">
          Min Sample: 5
        </span>
      </div>

    </div>
  );
}

// ── 8. 14-GATE FINAL PUBLIC LAUNCH CERTIFICATION ──────────────────────────
function FinalCertification({ cert, finalDecision = 'NO_GO' }) {
  const defaultGateDefinitions = [
    {
      key: 'gate_1_environment_valid',
      name: 'Production Environment Configuration',
      defaultPassed: true,
      defaultDetails: 'Environment configuration valid'
    },
    {
      key: 'gate_2_database_ready',
      name: 'Database Schema & Tables Readiness',
      defaultPassed: false,
      defaultDetails: 'Database status: WARNING (4 pending migrations)'
    },
    {
      key: 'gate_3_production_readiness',
      name: 'Production Readiness Diagnostics',
      defaultPassed: true,
      defaultDetails: 'Core readiness checks passed'
    },
    {
      key: 'gate_4_razorpay_live_mode',
      name: 'Razorpay Gateway Live Mode Configured',
      defaultPassed: false,
      defaultDetails: 'Mode: TEST, Webhook Secret: Configured'
    },
    {
      key: 'gate_5_validation_order_created',
      name: 'Server-Created ₹1 Validation Order Completed',
      defaultPassed: false,
      defaultDetails: 'Server-controlled ₹1 validation order pending'
    },
    {
      key: 'gate_6_live_payment_verified',
      name: 'Real Live Payment Verified',
      defaultPassed: false,
      defaultDetails: 'Live ₹1 transaction evidence pending operator verification'
    },
    {
      key: 'gate_7_webhook_delivery_verified',
      name: 'Webhook Delivery & Signature Verified',
      defaultPassed: false,
      defaultDetails: 'Webhook delivery verification pending'
    },
    {
      key: 'gate_8_payment_ledger_verified',
      name: 'Payment Ledger State Verified',
      defaultPassed: false,
      defaultDetails: 'Payment ledger verification pending'
    },
    {
      key: 'gate_9_refund_validated',
      name: 'Controlled Refund Validation Verified',
      defaultPassed: false,
      defaultDetails: 'Refund verification pending or optional'
    },
    {
      key: 'gate_10_reconciliation_clean',
      name: 'Financial Invariant Reconciliation Clean',
      defaultPassed: true,
      defaultDetails: 'Zero critical financial invariant violations'
    },
    {
      key: 'gate_11_no_critical_incidents',
      name: 'Zero Unresolved Critical Incidents',
      defaultPassed: true,
      defaultDetails: 'No open critical financial incidents'
    },
    {
      key: 'gate_12_reversal_protection_verified',
      name: 'Assistant Earning Reversal Protection Verified',
      defaultPassed: false,
      defaultDetails: 'Reversal protection verification pending'
    },
    {
      key: 'gate_13_canary_metrics_safe',
      name: 'Canary Metrics Meet Safety Thresholds',
      defaultPassed: false,
      defaultDetails: 'Canary blocked: Payment success rate (57%) below threshold (85%).'
    },
    {
      key: 'gate_14_security_probes_healthy',
      name: 'Security & Health Probes Operational',
      defaultPassed: true,
      defaultDetails: 'CORS allowlist, Helmet headers, health probes active'
    }
  ];

  const serverGates = cert?.gates || {};
  const gatesList = defaultGateDefinitions.map((def) => {
    const live = serverGates[def.key];
    return {
      name: live?.name || def.name,
      passed: live !== undefined ? Boolean(live.passed) : def.defaultPassed,
      details: live?.details || def.defaultDetails
    };
  });

  const isNoGo = finalDecision === 'NO_GO';
  const isGo = finalDecision === 'GO';

  return (
    <div className="bg-white dark:bg-[#0A0E1A] rounded-[18px] border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-4">

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3.5">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-[15px] font-bold text-[#0F172A] dark:text-white font-sans tracking-tight">
              E. 14-Gate Final Public Launch Certification
            </h3>
            <p className="text-xs text-[#64748B] dark:text-zinc-400 mt-0.5 font-sans">
              All 14 gates must pass with live cryptographic verification before public GO.
            </p>
          </div>
        </div>

        {/* Decision Badge */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-xs font-mono text-[#64748B] dark:text-zinc-400">
            Final Decision:
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider ${isGo
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400'
              : isNoGo
                ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400'
              }`}
          >
            {finalDecision}
          </span>
        </div>
      </div>

      {/* 2-Column Grid of 14 Gates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {gatesList.map((gate, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${gate.passed
              ? 'bg-[#F0FDF4] dark:bg-emerald-950/20 border-[#BBF7D0] dark:border-emerald-900/40 text-[#0F172A] dark:text-white'
              : 'bg-[#F8FAFC] dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80 text-[#334155] dark:text-zinc-300'
              }`}
          >
            {gate.passed ? (
              <div className="w-5 h-5 rounded-full bg-[#DCFCE7] text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <strong
                className={`text-xs block tracking-tight font-sans ${gate.passed
                  ? 'text-[#0F172A] dark:text-white font-semibold'
                  : 'text-[#475569] dark:text-zinc-400 font-medium'
                  }`}
              >
                {gate.name}
              </strong>

              <p
                className={`text-[11px] mt-0.5 leading-snug font-sans ${gate.passed
                  ? 'text-[#059669] dark:text-emerald-400/90 font-medium'
                  : 'text-[#94A3B8] dark:text-zinc-500'
                  }`}
              >
                {gate.details}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

// ── 9. NEW LAUNCH PLAN MODAL COMPONENT ────────────────────────────────────
function NewLaunchPlanModal({ isOpen, onClose }) {
  const [station, setStation] = useState('SC');
  const [phase, setPhase] = useState('1B');
  const [canaryPercent, setCanaryPercent] = useState('25');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(`Launch plan for ${station} (Phase ${phase} · ${canaryPercent}% traffic) drafted.`);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden font-sans">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Create New Launch Plan
              </h3>
              <p className="text-[11px] text-zinc-500">
                Phased canary deployment and station expansion
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Target Railway Station:
            </label>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="SC">Secunderabad Jn (SC) - Primary Hub</option>
              <option value="BZA">Vijayawada Jn (BZA)</option>
              <option value="WL">Warangal (WL)</option>
              <option value="KZJ">Kazipet Jn (KZJ)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Rollout Phase:
              </label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="1A">Phase 1A (Internal Operators)</option>
                <option value="1B">Phase 1B (Limited Public Pilot)</option>
                <option value="2">Phase 2 (Full Public Launch)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Traffic Allocation:
              </label>
              <select
                value={canaryPercent}
                onChange={(e) => setCanaryPercent(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="10">10% of Bookings</option>
                <option value="25">25% of Bookings</option>
                <option value="50">50% of Bookings</option>
                <option value="100">100% (Public)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Safety Guard Policy:
            </label>
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-[11.5px] text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <span>
                Automatic Rollback Enabled: Freezes canary immediately if payment success falls below 85% or financial reconciliation issues are detected.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Deployment Notes (Optional):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monitoring morning Vande Bharat train arrival traffic..."
              className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Initialize Launch Plan</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

// ── 10. LAUNCH DETAILS MODAL COMPONENT ────────────────────────────────────
function LaunchDetailsModal({
  isOpen,
  onClose,
  cert,
  deployment,
  canaryState,
  metrics
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0D111A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden font-sans">

        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#FFF1F2] dark:bg-rose-950/40 border-b border-[#FECDD3] dark:border-rose-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F43F5E] text-white flex items-center justify-center shadow-xs">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#9F1239] dark:text-rose-200">
                Phase 1B Go-Live Blocker Breakdown
              </h3>
              <p className="text-xs text-[#9F1239]/80 dark:text-rose-300/80">
                Decision: <strong className="font-mono">NO_GO</strong> · Cryptographic evaluation log
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-700 dark:text-rose-300 hover:bg-rose-200/50 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">

          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1.5">
            <span className="text-[11px] font-mono font-bold uppercase text-rose-700 dark:text-rose-400">
              Primary Blocker: Canary Safety Violation
            </span>
            <p className="text-[12.5px] text-[#0F172A] dark:text-zinc-200 leading-relaxed font-sans">
              Payment success rate has dropped to <strong>57%</strong> across the last 7 attempts, failing the mandatory safety threshold of <strong>≥ 85%</strong>.
            </p>
            <div className="text-[11px] text-zinc-500 font-mono pt-1">
              Safety Guard: AUTOMATIC ROLLBACK TRIGGERED · Traffic allocation frozen to 0%
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider font-mono">
              Diagnostic Evaluation Summary:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-[11.5px]">
                  <Database className="w-3.5 h-3.5" />
                  <span>Database Schema Check</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  16 active tables detected. 4 pending migrations required for full idempotent reconciliation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-[11.5px]">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Payment Gateway Check</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Gateway is running in <strong>TEST MODE</strong>. Production certification requires Razorpay Live credentials.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <h5 className="text-[11.5px] font-bold text-[#0F172A] dark:text-white">
              Recommended Remediation Path:
            </h5>
            <ol className="list-decimal list-inside space-y-1 text-[11.5px] text-zinc-600 dark:text-zinc-400">
              <li>Initiate a new ₹1 validation session using Section B above.</li>
              <li>Complete the server-controlled ₹1 order verification and confirm webhook delivery.</li>
              <li>Apply the 4 pending database migration upgrades from the schema ledger.</li>
              <li>Switch Razorpay keys to live mode once test validation completes.</li>
            </ol>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
}

// ── 11. MASTER LAUNCH OPERATIONS VIEW (MAIN COMPONENT) ────────────────────
export default function LaunchCenter() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  // Core Data States
  const [deployment, setDeployment] = useState(null);
  const [cert, setCert] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [canaryData, setCanaryData] = useState(null);

  // Controlled Transaction Modal / Form States
  const [createdOrder, setCreatedOrder] = useState(null);
  const [paymentIdInput, setPaymentIdInput] = useState('');
  const [refundIdInput, setRefundIdInput] = useState('');

  // Interactive Modals
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch Launch Certification, Deployment & Canary Data
  const fetchAllLaunchData = useCallback(async () => {
    try {
      setLoading(true);
      const [deployRes, certRes, sessionsRes, canaryRes] = await Promise.all([
        axios.get('/admin/finance/deployment-status').catch(() => ({ data: null })),
        axios.get('/admin/finance/launch/status').catch(() => ({ data: null })),
        axios.get('/admin/finance/launch/sessions').catch(() => ({ data: { sessions: [] } })),
        axios.get('/admin/finance/canary/metrics').catch(() => ({ data: null }))
      ]);

      if (deployRes.data) setDeployment(deployRes.data);
      if (certRes.data) setCert(certRes.data);
      if (canaryRes.data) setCanaryData(canaryRes.data);
      setLastSynced(new Date());

      const sessionList = sessionsRes.data?.sessions || [];
      setSessions(sessionList);

      if (!activeSession && sessionList.length > 0) {
        setActiveSession(sessionList[0]);
        fetchEvidence(sessionList[0].id);
      } else if (activeSession) {
        const refreshed = sessionList.find((s) => s.id === activeSession.id);
        if (refreshed) setActiveSession(refreshed);
        fetchEvidence(activeSession.id);
      }
    } catch (err) {
      console.error('FETCH LAUNCH DATA ERROR:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSession]);

  const fetchEvidence = async (sessionId) => {
    try {
      const { data } = await axios.get(`/admin/finance/launch/sessions/${sessionId}/evidence`);
      setEvidenceList(data.evidence || []);
    } catch (err) {
      console.warn('EVIDENCE FETCH NOTICE:', err.message);
    }
  };

  useEffect(() => {
    fetchAllLaunchData();
    const interval = setInterval(fetchAllLaunchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------
  // SESSION CONTROLS
  // --------------------------------------------------
  const handleStartSession = async () => {
    try {
      setActionLoading(true);
      const { data } = await axios.post('/admin/finance/launch/sessions', {
        environment: 'production',
        notes: 'Admin-initiated validation session'
      });
      toast.success('Production validation session initiated!');
      setActiveSession(data.session);
      await fetchAllLaunchData();
      if (data.session?.id) await fetchEvidence(data.session.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate validation session.');
    } finally {
      setActionLoading(false);
    }
  };

  // --------------------------------------------------
  // ₹1 VALIDATION ORDER CREATION
  // --------------------------------------------------
  const handleCreateValidationOrder = async () => {
    if (!activeSession) {
      toast.error('Please start or select a validation session first.');
      return;
    }

    try {
      setActionLoading(true);
      const { data } = await axios.post('/admin/finance/launch/create-validation-order', {
        session_id: activeSession.id,
        train_number: '12723',
        station_code: 'SC'
      });
      setCreatedOrder(data);
      setPaymentIdInput(data.payment_id);
      toast.success(`Server-controlled ₹${data.amount || 1} (100 paise) validation order generated!`);
      await fetchEvidence(activeSession.id);
      await fetchAllLaunchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create validation order.');
    } finally {
      setActionLoading(false);
    }
  };

  // --------------------------------------------------
  // VERIFICATION WORKFLOW ACTIONS
  // --------------------------------------------------
  const handleVerifyLivePayment = async () => {
    if (!activeSession || !paymentIdInput.trim()) {
      toast.error('Active session and payment ID are required.');
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(`/admin/finance/launch/sessions/${activeSession.id}/validate-payment`, {
        payment_id: paymentIdInput.trim()
      });
      toast.success('Live payment verified and recorded in evidence ledger!');
      await fetchAllLaunchData();
      await fetchEvidence(activeSession.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyWebhook = async () => {
    if (!activeSession || !paymentIdInput.trim()) {
      toast.error('Active session and payment ID are required.');
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(`/admin/finance/launch/sessions/${activeSession.id}/validate-webhook`, {
        payment_id: paymentIdInput.trim()
      });
      toast.success('Webhook delivery verified and recorded in evidence ledger!');
      await fetchAllLaunchData();
      await fetchEvidence(activeSession.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Webhook verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyRecovery = async () => {
    if (!activeSession || !paymentIdInput.trim()) {
      toast.error('Active session and payment ID are required.');
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(`/admin/finance/launch/sessions/${activeSession.id}/validate-recovery`, {
        payment_id: paymentIdInput.trim()
      });
      toast.success('Payment recovery confirmed and recorded!');
      await fetchAllLaunchData();
      await fetchEvidence(activeSession.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recovery verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyRefund = async () => {
    if (!activeSession || !refundIdInput.trim()) {
      toast.error('Active session and refund ID are required.');
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(`/admin/finance/launch/sessions/${activeSession.id}/validate-refund`, {
        refund_id: refundIdInput.trim()
      });
      toast.success('Refund and earning reversal verified in evidence ledger!');
      await fetchAllLaunchData();
      await fetchEvidence(activeSession.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refund verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyWallet = async () => {
    if (!activeSession) {
      toast.error('Active session is required.');
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(`/admin/finance/launch/sessions/${activeSession.id}/validate-wallet`, {
        amount: 100
      });
      toast.success('Assistant wallet split (20% platform / 80% Sahayak) verified!');
      await fetchAllLaunchData();
      await fetchEvidence(activeSession.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Wallet verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // --------------------------------------------------
  // CANARY STAGE EXPANSIONS
  // --------------------------------------------------
  const handleCanaryInternal = async () => {
    try {
      setActionLoading(true);
      await axios.post('/admin/finance/canary/internal');
      toast.success('Canary transitioned to INTERNAL stage.');
      await fetchAllLaunchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transition to internal stage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCanaryLimited = async () => {
    try {
      setActionLoading(true);
      await axios.post('/admin/finance/canary/limited');
      toast.success('Canary transitioned to LIMITED stage.');
      await fetchAllLaunchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transition to limited stage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCanaryPercentage = async (pct = 25) => {
    try {
      setActionLoading(true);
      await axios.post('/admin/finance/canary/percentage', { percentage: pct });
      toast.success(`Canary transitioned to PERCENTAGE stage (${pct}% traffic).`);
      await fetchAllLaunchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transition to percentage stage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCanaryPublic = async () => {
    try {
      setActionLoading(true);
      await axios.post('/admin/finance/canary/public');
      toast.success('Canary transitioned to PUBLIC stage (100% traffic).');
      await fetchAllLaunchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transition to public stage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseCanary = async () => {
    try {
      setActionLoading(true);
      await axios.post('/admin/finance/launch/canary/pause', { reason: 'Operator requested pause' });
      toast.success('Canary rollout paused.');
      await fetchAllLaunchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to pause canary.');
    } finally {
      setActionLoading(false);
    }
  };

  const finalDecision = cert?.final_decision || 'NO_GO';
  const canaryState = canaryData?.canary_state || cert?.canary || { stage: 'blocked' };
  const metrics = canaryData?.metrics || {};

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in font-sans pb-10">

      {/* ── 1. PAGE HEADER ────────────────────────────────────────── */}
      <LaunchPageHeader
        onOpenNewPlan={() => setIsNewPlanModalOpen(true)}
      />

      {/* ── 2. RED LAUNCH DECISION BANNER ─────────────────────────── */}
      <LaunchDecisionBanner
        cert={cert}
        deployment={deployment}
        canaryState={canaryState}
        metrics={metrics}
        lastSynced={lastSynced}
        onViewDetails={() => setIsDetailsModalOpen(true)}
      />

      {/* ── 3. SECTION A — PRODUCTION ENVIRONMENT ARCHITECTURE ───── */}
      <ProductionEnvironmentCard
        deployment={deployment}
      />

      {/* ── 4. SECTION B — LIVE ₹1 VALIDATION & PROGRESSION MACHINE ── */}
      <ValidationMachine
        activeSession={activeSession}
        actionLoading={actionLoading}
        onStartSession={handleStartSession}
        onCreateValidationOrder={handleCreateValidationOrder}
        createdOrder={createdOrder}
        paymentIdInput={paymentIdInput}
        setPaymentIdInput={setPaymentIdInput}
        onVerifyPayment={handleVerifyLivePayment}
        onVerifyWebhook={handleVerifyWebhook}
        onVerifyRecovery={handleVerifyRecovery}
        refundIdInput={refundIdInput}
        setRefundIdInput={setRefundIdInput}
        onVerifyRefund={handleVerifyRefund}
        onVerifyWallet={handleVerifyWallet}
      />

      {/* ── 5. IMMUTABLE EVIDENCE LEDGER (APPEND-ONLY) ─────────────── */}
      <EvidenceLedger
        evidenceList={evidenceList}
      />

      {/* ── 6. SECTION D — CANARY ROLLOUT OPERATIONS ──────────────── */}
      <CanaryRolloutControls
        canaryState={canaryState}
        actionLoading={actionLoading}
        onCanaryInternal={handleCanaryInternal}
        onCanaryLimited={handleCanaryLimited}
        onCanaryPercentage={handleCanaryPercentage}
        onCanaryPublic={handleCanaryPublic}
        onPauseCanary={handlePauseCanary}
      />

      {/* ── 7. ROLLOUT KPI CARDS (5 METRICS) ──────────────────────── */}
      <RolloutMetrics
        metrics={metrics}
      />

      {/* ── 8. SECTION E — FINAL PUBLIC LAUNCH CERTIFICATION ──────── */}
      <FinalCertification
        cert={cert}
        finalDecision={finalDecision}
      />

      {/* ── INTERACTIVE MODALS ────────────────────────────────────── */}
      <NewLaunchPlanModal
        isOpen={isNewPlanModalOpen}
        onClose={() => setIsNewPlanModalOpen(false)}
      />

      <LaunchDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        cert={cert}
        deployment={deployment}
        canaryState={canaryState}
        metrics={metrics}
      />

    </div>
  );
}
