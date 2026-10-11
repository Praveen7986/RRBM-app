import React from 'react';
import { Sparkles } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = "RRBM",
  subtitle = "Revival for Re-Built Ministries"
}) => {
  return (
    <header className="flex items-center justify-between w-full pt-2 pb-3 select-none">
      {/* Brand & Subtitle */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-black tracking-tight text-white font-sans">
            {title}
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
        </div>
        <p className="text-[11px] font-bold text-sky-200/80 tracking-wide mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Action Notification Pill (Sky Blue Element on Navy) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 shadow-sm text-sky-300 font-bold text-xs">
          <Sparkles size={12} className="text-amber-400" />
          <span>Festival 2026</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
