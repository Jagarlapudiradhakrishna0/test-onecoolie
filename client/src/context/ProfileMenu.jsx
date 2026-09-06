import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LogOut, ShieldCheck, HelpCircle, Sliders, Luggage, Briefcase, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/* ============================================================
   PROFILE MENU — Apple-Style Minimal Dropdown & Settings
   Strictly Black, White, and OneCoolie Blue (#2563EB)
   ============================================================ */

export default function ProfileMenu({ role, onNavigate, helpPath }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lang, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems =
    role === 'assistant'
      ? [
        {
          key: 'jobs',
          label: t('myJobs') || 'My Jobs',
          sub: 'View active dispatches and duty history',
          act: () => onNavigate?.('jobs'),
          icon: Briefcase,
          highlight: true,
        },
        {
          key: 'earnings',
          label: t('earnings') || 'Earnings',
          sub: 'Track payouts and daily earnings',
          act: () => onNavigate?.('history'),
          icon: Sliders,
        },
        {
          key: 'safety',
          label: t('safety') || 'Safety',
          sub: 'Operational safety and duty protocols',
          act: () => setModal('safety'),
          icon: ShieldCheck,
        },
        {
          key: 'help',
          label: t('help') || 'Help & Support',
          sub: 'Get assistance anytime',
          act: () => (helpPath ? navigate(helpPath) : setModal('help')),
          icon: HelpCircle,
        },
        {
          key: 'settings',
          label: t('settings') || 'Settings',
          sub: 'Manage your account preferences',
          act: () => setModal('settings'),
          icon: Sliders,
        },
      ]
      : [
        {
          key: 'trips',
          label: t('myTrips') || 'My Trips',
          sub: 'View and manage your bookings',
          act: () => onNavigate?.('trips'),
          icon: Luggage,
          highlight: true,
        },
        {
          key: 'safety',
          label: t('safety') || 'Safety',
          sub: 'Travel tips and safety guidelines',
          act: () => setModal('safety'),
          icon: ShieldCheck,
        },
        {
          key: 'help',
          label: t('help') || 'Help & Support',
          sub: 'Get assistance anytime',
          act: () => (helpPath ? navigate(helpPath) : setModal('help')),
          icon: HelpCircle,
        },
        {
          key: 'settings',
          label: t('settings') || 'Settings',
          sub: 'Manage your account preferences',
          act: () => setModal('settings'),
          icon: Sliders,
        },
      ];

  return (
    <div className="relative" ref={ref}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 bg-slate-100/90 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-all border border-slate-200/50 cursor-pointer"
      >
        <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-black shadow-xs">
          {user?.name?.charAt(0).toUpperCase() || 'V'}
        </div>
        <span className="text-xs font-bold text-zinc-900 hidden sm:inline-block">
          {user?.name || 'Vikas'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Flyout Menu (Pixel-Perfect Match to Mockup Image) */}
      {open && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-84 bg-white border border-slate-200/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] p-4 sm:p-5 z-50 animate-scale-in text-zinc-900">
          {/* User Info Header */}
          <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100 mb-2">
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-xl font-black shrink-0 shadow-xs">
              {user?.name?.charAt(0).toUpperCase() || 'V'}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-base text-zinc-900 truncate leading-snug">
                Welcome, {user?.name || 'vikas'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium truncate mt-0.5">
                <span className="truncate">{user?.email || 'globalxvikas@gmail.com'}</span>
                <CheckCircle2 className="w-3.5 h-3.5 fill-black text-white shrink-0" />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const ItemIcon = item.icon;
              const isHighlight = item.highlight;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    item.act();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all text-left group cursor-pointer ${isHighlight
                      ? 'bg-blue-50/80 hover:bg-blue-100/80'
                      : 'hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${isHighlight
                          ? 'bg-blue-100/80 text-blue-600 border-blue-200/60'
                          : 'bg-slate-50 text-zinc-700 border-slate-200/60 group-hover:bg-white group-hover:border-slate-300'
                        }`}
                    >
                      {ItemIcon && <ItemIcon className="w-4.5 h-4.5" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-zinc-900 truncate">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                        {item.sub}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${isHighlight ? 'text-blue-600' : 'text-zinc-400 group-hover:text-zinc-700'
                      }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Logout Section */}
          <div className="pt-2 mt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
                navigate('/');
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-rose-50/70 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                  <LogOut className="w-4.5 h-4.5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-rose-600 truncate">
                    {t('logout') || 'Logout'}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                    See you again soon!
                  </p>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-zinc-900 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Settings / Help Modals Portaled directly to document.body for exact viewport centering */}
      {modal && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 sm:p-8 max-h-[85vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-scale-in text-black dark:text-white my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {modal === 'safety' && (
              <>
                <h3 className="text-xl font-bold tracking-tight mb-2">
                  Safety & Security
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                  Verified assistance standards across the OneCoolie network
                </p>

                <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
                    <p className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                      KYC Verification
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Every station assistant undergoes government ID validation and background clearance before duty approval.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
                    <p className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                      OTP Handshake
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Services strictly start only when you share your secret 6-digit OTP in person on the platform.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
                    <p className="font-bold text-xs uppercase tracking-wider text-black dark:text-white mb-1">
                      Emergency Helplines
                    </p>
                    <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                      National: 112 · Railway Police: 139
                    </p>
                  </div>
                </div>
              </>
            )}

            {modal === 'help' && (
              <>
                <h3 className="text-xl font-bold tracking-tight mb-2">
                  Help & Support
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                  Quick answers to common questions
                </p>

                <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wider text-zinc-500 mb-1">
                      Booking Steps
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Select your station, train number, and required assistance services. Settle payment via instant UPI or cash.
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-xs uppercase tracking-wider text-zinc-500 mb-1">
                      Contact Operations
                    </p>
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400">
                      ops@OneCoolie.in · 24/7 Platform Dispatch
                    </p>
                  </div>
                </div>
              </>
            )}

            {modal === 'settings' && (
              <>
                <h3 className="text-xl font-bold tracking-tight mb-2">
                  Preferences
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                  Manage display and regional language
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Appearance
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                      {[
                        { id: 'light', label: 'Light' },
                        { id: 'dark', label: 'Dark' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTheme(item.id)}
                          className={`py-2 text-xs font-bold rounded-lg transition-all ${theme === item.id
                              ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm'
                              : 'text-zinc-500 hover:text-black dark:hover:text-white'
                            }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Language
                    </label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                      {[
                        { id: 'en', label: 'English' },
                        { id: 'te', label: 'తెలుగు' },
                        { id: 'hi', label: 'हिन्दी' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setLanguage(item.id)}
                          className={`py-2 text-xs font-bold rounded-lg transition-all ${lang === item.id
                              ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm'
                              : 'text-zinc-500 hover:text-black dark:hover:text-white'
                            }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="btn-black w-full py-3 text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}