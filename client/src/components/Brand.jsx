import { Link } from 'react-router-dom';

/* ============================================================
   BRAND COMPONENT — Swiss Minimal Identity (Black, White, Blue)
   ============================================================ */

export default function Brand({ sub, dark = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-3 group select-none">
      {/* Geometric Swiss Monogram */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-transform duration-200 group-hover:scale-105 ${
          dark ? 'bg-white text-black' : 'bg-blue-600 text-white'
        }`}
      >
        OC
      </div>

      {/* Typography Wordmark */}
      <div className="flex items-center gap-2">
        <span
          className={`text-lg font-bold tracking-tight ${dark ? 'text-white' : 'text-black'}`}
        >
          OneCoolie
        </span>

        {sub && (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              dark
                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}
          >
            {sub}
          </span>
        )}
      </div>
    </Link>
  );
}