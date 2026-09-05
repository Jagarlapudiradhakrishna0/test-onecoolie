import { Heart } from 'lucide-react';
import oneCoolieLogo from '../assets/onecoolie-logo.png';

/* ============================================================
   ONECOOLIE GLOBAL FOOTER
   Clean corporate footer with Movesphere Technologies attribution
   ============================================================ */

export default function Footer({ className = '' }) {
    return (
        <footer className={`w-full bg-white border-t border-slate-200/80 py-4 sm:py-4.5 px-4 sm:px-8 lg:px-12 mt-auto z-10 transition-all ${className}`}>

            {/* ── MOBILE VIEW (< md): Clean App-Style Card Layout ── */}
            <div className="flex md:hidden flex-col items-center text-center space-y-2.5 w-full">
                {/* Top Row: Brand Logo on Left, Made with India Pill on Right */}
                <div className="flex items-center justify-between w-full pb-2.5 border-b border-slate-100">
                    <img src={oneCoolieLogo} alt="OneCoolie" className="h-6.5 w-auto object-contain" />
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/70">
                        <span>Made with</span>
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                        <span>in India</span>
                    </div>
                </div>

                {/* Corporate Attribution & Links */}
                <div className="flex flex-col items-center gap-1 text-[11px] text-zinc-500 pt-0.5">
                    <p className="font-medium text-zinc-600">
                        Under <strong className="font-bold text-zinc-800">Movesphere Technologies</strong>
                    </p>
                    <div className="flex items-center gap-2 text-zinc-500 font-medium">
                        <span>© 2026 OneCoolie. All rights reserved.</span>
                        <span className="text-slate-300">•</span>
                        <a
                            href="https://www.movesphere.in"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                        >
                            movesphere.in
                        </a>
                    </div>
                </div>
            </div>

            {/* ── DESKTOP VIEW (>= md): Full-Width 3-Column Layout ── */}
            <div className="hidden md:flex w-full items-center justify-between gap-4 text-xs text-zinc-500">
                {/* Left Corner: Brand Logo */}
                <div className="flex items-center justify-start shrink-0">
                    <img src={oneCoolieLogo} alt="OneCoolie" className="h-7 sm:h-8 w-auto object-contain" />
                </div>

                {/* Center: Copyright & Legal Attribution */}
                <div className="flex-1 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-zinc-500 text-xs text-center font-medium">
                    <span>© 2026 OneCoolie. All rights reserved.</span>
                    <span className="text-slate-300">|</span>
                    <span>Under Movesphere Technologies</span>
                    <span className="text-slate-300">|</span>
                    <a
                        href="https://www.movesphere.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline font-semibold transition-colors"
                    >
                        www.movesphere.in
                    </a>
                </div>

                {/* Right Corner: Made with Heart in India */}
                <div className="flex items-center justify-end gap-1.5 text-xs text-zinc-500 font-medium shrink-0">
                    <span>Made with</span>
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span>in India</span>
                </div>
            </div>

        </footer>
    );
}
