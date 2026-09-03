import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RailwayCanvas3D from '../components/RailwayCanvas3D';
import Brand from '../components/Brand';

/* ============================================================
   HOMEPAGE — Swiss Typographic & Apple-Style Minimal Landing
   Strict Color System: Black (#000000), White (#FFFFFF), Blue (#2563EB)
   ============================================================ */

const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Safety & KYC', href: '#safety' },
  { label: 'Pilot Stations', href: '#stations' },
];

const SERVICES = [
  {
    code: '01',
    label: 'Luggage Assistance',
    desc: 'Dedicated porter service for baggage handling from station concourse direct to your coach berth.',
    rate: 'From ₹30/item',
  },
  {
    code: '02',
    label: 'Seat & Coach Escorting',
    desc: 'A verified assistant guides you through platforms, foot-over-bridges, and directly to your seat.',
    rate: '₹60/trip',
  },
  {
    code: '03',
    label: 'Wheelchair & Priority Transit',
    desc: 'Dedicated assistance and wheelchair transit for senior citizens and passengers with mobility needs.',
    rate: '₹80/trip',
  },
  {
    code: '04',
    label: 'Multilingual Station Guide',
    desc: 'On-demand communication support in English, Telugu, Hindi, and regional station dialects.',
    rate: '₹30/trip',
  },
  {
    code: '05',
    label: 'Refreshments & Essentials',
    desc: 'Approved platform bottled water, packed snacks, and travel necessities brought to your berth.',
    rate: '₹50/order',
  },
  {
    code: '06',
    label: 'Exit Gate & Taxi Transfer',
    desc: 'End-to-end escorting from your train coach to pre-booked app cabs, auto stands, or station exits.',
    rate: '₹40/trip',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Select Train & Station',
    desc: 'Enter your train number and destination station. Choose the specific assistance services you need.',
  },
  {
    num: '02',
    title: 'Assistant Dispatched',
    desc: 'A verified assistant stationed at your platform receives and accepts your arrival or departure job.',
  },
  {
    num: '03',
    title: 'Secure OTP Handshake',
    desc: 'Meet your assistant on the platform and provide your secret 6-digit OTP to officially begin the service.',
  },
  {
    num: '04',
    title: 'Board Seamlessly',
    desc: 'Your assistant manages luggage, priority escorting, and seating. Complete service with ease.',
  },
];

const STATIONS = [
  { code: 'KZJ', name: 'Kazipet Junction', division: 'Secunderabad' },
  { code: 'WL', name: 'Warangal', division: 'Secunderabad' },
  { code: 'BZA', name: 'Vijayawada Junction', division: 'Vijayawada' },
  { code: 'SC', name: 'Secunderabad Junction', division: 'Secunderabad' },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-600 selection:text-white">
      {/* ── Navigation Bar ──────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-black/90 backdrop-blur-md border-b border-zinc-800 py-3.5'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Brand dark sub="Network" />

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {NAV_LINKS.map((link) =>
              link.isRoute ? (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-blue-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              )
            )}
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              className="btn-primary text-xs py-2.5 px-4"
            >
              Book Assistance
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-600/30 bg-blue-600/10 text-blue-400 text-xs font-bold font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Verified Station Transit Assistance
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.04]">
              Elevating the railway transit{' '}
              <span className="text-blue-500">experience.</span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 max-w-xl leading-relaxed">
              Book verified station assistants for luggage porterage, wheelchair escorting, and coach navigation across South Central railway hubs.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
              <Link
                to="/auth"
                className="btn-primary py-3.5 px-8 text-sm"
              >
                Book Assistance &rarr;
              </Link>
              <Link
                to="/assistant-auth"
                className="btn-secondary py-3.5 px-6 text-sm bg-transparent text-white border-zinc-800 hover:bg-zinc-900"
              >
                Join as Assistant
              </Link>
            </div>

            {/* Quick Pilot Stats */}
            <div className="pt-8 border-t border-zinc-800/80 flex items-center gap-6 text-xs font-mono text-zinc-500">
              <span>ACTIVE HUBS:</span>
              <span className="text-white font-bold">KZJ · WL · BZA · SC</span>
              <span className="hidden sm:inline text-zinc-600">|</span>
              <span className="hidden sm:inline text-blue-400">100% KYC Verified</span>
            </div>
          </div>

          {/* Right 3D Visual */}
          <div className="lg:col-span-5 h-[380px] sm:h-[460px] relative border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl">
            <RailwayCanvas3D />
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/80 backdrop-blur-md border border-zinc-800 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Real-Time Platform Dispatch</span>
              <span className="text-blue-400 font-bold">Online</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Section ────────────────────────────────────── */}
      <section id="services" className="py-24 px-6 border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-500 font-mono block mb-2">
                Services & Rates
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Designed for every journey.
              </h2>
            </div>
            <p className="text-sm text-zinc-400 max-w-md">
              Transparent per-item and per-trip rates. No surge pricing, hidden fees, or haggling on the platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((item) => (
              <div
                key={item.code}
                className="p-7 rounded-2xl border border-zinc-800 bg-black hover:border-zinc-700 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-zinc-500">
                      {item.code}
                    </span>
                    <span className="text-xs font-mono font-semibold text-blue-400">
                      {item.rate}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {item.label}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    {item.desc}
                  </p>
                </div>

                <Link
                  to="/auth"
                  className="text-xs font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1 group"
                >
                  <span>Book this service</span>
                  <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works Section ────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 border-t border-zinc-800 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-500 font-mono block mb-2">
              Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              How OneCoolie works.
            </h2>
            <p className="text-sm text-zinc-400">
              A four-step precision workflow built to ensure total peace of mind at busy railway terminals.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950 relative"
              >
                <div className="text-3xl font-bold font-mono text-blue-500 mb-4">
                  {step.num}
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Safety & Verification ──────────────────────────────── */}
      <section id="safety" className="py-24 px-6 border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-500 font-mono block">
              Trust & Safety
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Safety engineered into every dispatch.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every passenger and assistant interaction is protected by government ID verification, encrypted handshakes, and 24/7 supervisor oversight.
            </p>

            <div className="space-y-4 pt-2">
              {[
                {
                  title: '100% KYC Identity Verification',
                  desc: 'Every assistant undergoes Aadhaar and official background validation before deployment.',
                },
                {
                  title: 'Encrypted In-Person OTP',
                  desc: 'No assistant can start duty without the unique 6-digit code presented by you at your platform.',
                },
                {
                  title: 'Direct Operations SOS Trigger',
                  desc: 'Immediate emergency alert broadcasts live trip telemetry to station controllers.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-xl border border-zinc-800 bg-black flex items-start gap-3.5"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">
                      {item.title}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 border border-zinc-800 rounded-2xl p-8 bg-black">
            <h3 className="text-lg font-bold mb-4">Pilot Hub Stations</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Active operations currently running across South Central Railway division.
            </p>

            <div className="divide-y divide-zinc-800">
              {STATIONS.map((st) => (
                <div key={st.code} className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-white">{st.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{st.division} Division</p>
                  </div>
                  <span className="badge-blue font-mono">{st.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="py-12 px-6 border-t border-zinc-800 bg-black text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <Brand dark sub="Network" />
          <p className="font-mono">
            &copy; {new Date().getFullYear()} OneCoolie Mobility Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/auth" className="hover:text-white transition">
              Passenger Login
            </Link>
            <Link to="/assistant-auth" className="hover:text-white transition">
              Assistant Portal
            </Link>
            <Link to="/admin-auth" className="hover:text-white transition">
              Admin Ops
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}