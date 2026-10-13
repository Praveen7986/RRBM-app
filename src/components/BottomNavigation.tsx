// src/components/BottomNavigation.tsx
// Fixed 4-Item Mobile & Tablet Navigation: Home, Alert, Songs, Money Jar
// Matches Figma & Reference Design: Deep Charcoal Background, Sky Blue (#38BDF8) Active Glow & Top Accent

import React from 'react';
import { TabType } from '../types/navigation';
import { Home, Bell, Music, Coins, Radio } from 'lucide-react';
import { realtimeStore } from '../services/realtimeStore';

interface BottomNavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange
}) => {
  const activeAlert = realtimeStore.getActiveAlert();

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'alert', label: 'Alert', icon: activeAlert ? Radio : Bell },
    { id: 'songs', label: 'Songs', icon: Music },
    { id: 'money', label: 'Money Jar', icon: Coins }
  ];

  return (
    <nav 
      className="bottom-nav-bar"
      aria-label="Mobile Navigation"
      role="navigation"
    >
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`bottom-nav-item ${isActive ? 'is-active' : ''}`}
            aria-selected={isActive}
            aria-label={item.label}
          >
            <div className="relative flex items-center justify-center">
              <IconComponent 
                size={21} 
                className={
                  isActive 
                    ? 'text-sky-400' 
                    : item.id === 'alert' && activeAlert 
                    ? 'text-rose-400 animate-pulse' 
                    : 'text-slate-400'
                } 
              />
              {item.id === 'alert' && activeAlert && (
                <span 
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" 
                />
              )}
            </div>

            <span className="bottom-nav-label">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
