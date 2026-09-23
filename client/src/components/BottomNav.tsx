import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutGrid, CalendarCheck, ClipboardCheck, Menu, LucideIcon } from 'lucide-react';
import { slide } from '../motion';

const TABS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/dashboard', label: 'Home', icon: LayoutGrid },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
];
const TABS_RIGHT: { to: string; label: string; icon: LucideIcon }[] = [{ to: '/inspections', label: 'Inspections', icon: ClipboardCheck }];

/** Phone-only tab bar, app style. SOS sits in the middle where a thumb finds it without looking. */
export const BottomNav: React.FC<{ onOpenSos: () => void; onOpenMore: () => void }> = ({ onOpenSos, onOpenMore }) => {
  const tab = ({ to, label, icon: Icon }: (typeof TABS)[number]) => (
    <NavLink key={to} to={to} className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full">
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="bottom-nav-active" transition={slide} className="absolute top-0 h-0.5 w-8 rounded-full bg-zinc-100" />}
          <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-zinc-100' : 'text-zinc-500'}`} />
          <span className={`text-[10px] transition-colors ${isActive ? 'text-zinc-100' : 'text-zinc-500'}`}>{label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <nav className="lg:hidden shrink-0 border-t border-white/[0.06] bg-zinc-950 pb-[env(safe-area-inset-bottom)]" aria-label="Main">
      <div className="h-16 flex items-stretch">
        {TABS.map(tab)}
        <div className="flex-1 flex items-center justify-center">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onOpenSos}
            aria-label="Send SOS"
            className="w-14 h-14 -mt-6 rounded-full bg-red-600 text-white text-xs font-bold tracking-wider shadow-[0_8px_24px_-6px_rgba(220,38,38,0.6)] ring-4 ring-zinc-950"
          >
            SOS
          </motion.button>
        </div>
        {TABS_RIGHT.map(tab)}
        <button onClick={onOpenMore} className="flex-1 flex flex-col items-center justify-center gap-1 text-zinc-500 active:text-zinc-200">
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">More</span>
        </button>
      </div>
    </nav>
  );
};
