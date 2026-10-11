// src/components/BottomNavigation.tsx
// Compact 4-Item Android Navigation with Controlled 3D Squircle Icon Assets

import React from 'react';
import { TabType } from '../types/navigation';
import { Home, Bell, Music, Gift } from 'lucide-react';

interface BottomNavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon3D: string;
  fallbackIcon: React.ComponentType<{ size: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon3D: '/icons/home.png', fallbackIcon: Home },
  { id: 'alert', label: 'Alert', icon3D: '/icons/alert.png', fallbackIcon: Bell },
  { id: 'songs', label: 'Songs', icon3D: '/icons/songs.png', fallbackIcon: Music },
  { id: 'blessings', label: 'Blessings', icon3D: '/icons/money_jar.png', fallbackIcon: Gift }
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange
}) => {
  return (
    <nav 
      className="bottom-nav-bar" 
      aria-label="Main Application Navigation"
      role="navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = currentTab === item.id;
        const FallbackComponent = item.fallbackIcon;

        return (
          <button
            key={item.id}
            id={`nav-btn-${item.id}`}
            type="button"
            className={`bottom-nav-item ${isActive ? 'is-active' : ''}`}
            onClick={() => onTabChange(item.id)}
            aria-selected={isActive}
            aria-label={item.label}
          >
            <div className="nav-icon-wrapper">
              <img
                src={item.icon3D}
                alt={item.label}
                onError={(e) => {
                  const target = e.currentTarget;
                  const svgPath = item.icon3D.replace('.png', '.svg');
                  if (target.src !== svgPath) {
                    target.src = svgPath;
                  }
                }}
              />
            </div>

            <span className="bottom-nav-label">
              {item.label}
            </span>

            {isActive && <div className="nav-active-dot" aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
