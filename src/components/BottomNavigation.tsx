// src/components/BottomNavigation.tsx
// Fixed 4-Item Mobile Navigation: Home, Alert, Songs, Money Jar
// Matches Reference Design: #101726 Background, Sky Blue (#38BDF8) Active Glow & Top Accent

import React from 'react';
import { TabType } from '../types/navigation';
import { Home, Bell, Music, Coins } from 'lucide-react';

interface BottomNavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'alert', label: 'Alert', icon: Bell },
  { id: 'songs', label: 'Songs', icon: Music },
  { id: 'money', label: 'Money Jar', icon: Coins }
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange
}) => {
  return (
    <nav 
      className="bottom-nav-bar md:hidden fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto flex items-center justify-around h-16 select-none"
      style={{
        background: '#0B101D',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
      aria-label="Application Navigation"
      role="navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = currentTab === item.id;
        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            id={`nav-btn-${item.id}`}
            type="button"
            onClick={() => onTabChange(item.id)}
            className="flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer transition-colors active:scale-95"
            aria-selected={isActive}
            aria-label={item.label}
          >
            {/* Top blue line accent for active item */}
            {isActive && (
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{
                  background: '#38BDF8',
                  boxShadow: '0 0 8px #38BDF8'
                }}
              />
            )}

            <div className="relative flex items-center justify-center mb-1">
              <IconComponent 
                size={20} 
                className={isActive ? 'text-sky-400' : 'text-slate-400'} 
              />
            </div>

            <span 
              className={`text-[10px] font-semibold tracking-tight transition-colors ${
                isActive ? 'text-sky-400 font-bold' : 'text-slate-400'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
