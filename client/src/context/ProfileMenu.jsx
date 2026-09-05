import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/* ============================================================
   PROFILE MENU — Apple-Style Minimal Dropdown & Settings
   Strictly Black, White, and OneCoolie Blue (#2563EB)
   ============================================================ */

export default function ProfileMenu({ role, onNavigate }) {
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
          { label: t('myJobs') || 'My Jobs', act: () => onNavigate?.('jobs') },
          { label: t('earnings') || 'Earnings', act: () => onNavigate?.('history') },
          { label: t('safety') || 'Safety', act: () => setModal('safety') },
          { label: t('help') || 'Help', act: () => setModal('help') },
          { label: t('settings') || 'Settings', act: () => setModal('settings') },
        ]
      : [
          { label: t('myTrips') || 'My Trips', act: () => onNavigate?.('trips') },
          { label: t('safety') || 'Safety', act: () => setModal('safety') },
          { label: t('help') || 'Help', act: () => setModal('help') },
          { label: t('settings') || 'Settings', act: () => setModal('settings') },
        ];

  return (
    <div className="relative" ref={ref}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-all border border-zinc-200 dark:border-zinc-700"
      >
        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="text-xs font-semibold text-black dark:text-white hidden sm:inline-block">
          {user?.name || 'Account'}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Flyout Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in">
          {/* User Info Header */}
          <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
            <p className="font-bold text-sm text-black dark:text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate mt-0.5">
              {user?.email}
            </p>
          </div>

          {/* Links */}
          <div className="p-1.5 space-y-0.5">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.act();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
              >
                <span>{item.label}</span>
                <span className="text-zinc-400">&rarr;</span>
              </button>
            ))}
          </div>

          {/* Sign Out */}
          <div className="p-1.5 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="w-full px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-colors text-left"
            >
              {t('logout') || 'Sign Out'}
            </button>
          </div>
        </div>
      )}

      {/* Settings / Help Modals */}
      {modal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 sm:p-8 max-h-[85vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-scale-in text-black dark:text-white"
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
                          className={`py-2 text-xs font-bold rounded-lg transition-all ${
                            theme === item.id
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
                          className={`py-2 text-xs font-bold rounded-lg transition-all ${
                            lang === item.id
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
        </div>
      )}
    </div>
  );
}