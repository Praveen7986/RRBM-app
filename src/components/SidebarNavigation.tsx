// src/components/SidebarNavigation.tsx
// Desktop & Tablet Left Sidebar Navigation matching Figma Redesign
// Contains RRBM Branding, 4 Main Tabs, Live Alert Indicators & Integrated Management Desk

import React from 'react';
import { TabType } from '../types/navigation';
import { Home, Bell, Music, Coins, Lock, Radio, ShieldCheck, Wifi } from 'lucide-react';
import rrbLogo from '../assets/rrb_logo.png';
import { realtimeStore } from '../services/realtimeStore';

interface SidebarNavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenManager: () => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  badge?: string;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  currentTab,
  onTabChange,
  onOpenManager
}) => {
  const activeAlert = realtimeStore.getActiveAlert();
  const connectionStatus = realtimeStore.getConnectionStatus();

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { 
      id: 'alert', 
      label: 'Alerts', 
      icon: activeAlert ? Radio : Bell,
      badge: activeAlert ? '1 active' : undefined 
    },
    { id: 'songs', label: 'Songs', icon: Music, badge: '18 songs' },
    { id: 'money', label: 'Money Jar', icon: Coins }
  ];

  return (
    <aside 
      className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 h-screen sticky top-0 z-30 select-none"
      style={{
        background: '#090F1E',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)'
      }}
      aria-label="Desktop Navigation"
    >
      {/* 1. Ministry Brand Header */}
      <div className="p-5 pb-4 flex items-center gap-3 border-b border-slate-800/80">
        <div 
          className="w-11 h-11 rounded-2xl flex items-center justify-center p-1.5 shrink-0"
          style={{
            background: '#101726',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
          }}
        >
          <img 
            src={rrbLogo} 
            alt="RRBM Logo" 
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black text-white tracking-wide leading-tight">
              RRBM
            </span>
            <span 
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}
            >
              2026
            </span>
          </div>
          <span className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
            Revival for Re-Built Ministries
          </span>
        </div>
      </div>

      {/* 2. Navigation Menu Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Main Navigation
        </div>

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                isActive 
                  ? 'text-white font-bold shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium'
              }`}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                    }
                  : {}
              }
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="flex items-center gap-3">
                <IconComponent 
                  size={18} 
                  className={isActive ? 'text-white' : item.id === 'alert' && activeAlert ? 'text-rose-400 animate-pulse' : 'text-slate-400'} 
                />
                <span className="text-xs tracking-wide">
                  {item.label}
                </span>
              </div>

              {item.badge && (
                <span 
                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                    item.id === 'alert' && activeAlert
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                      : isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Bottom Section: Management Desk & Connection Status */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {/* Management Desk Trigger */}
        <button
          type="button"
          onClick={onOpenManager}
          className="w-full p-2.5 rounded-xl flex items-center justify-between text-left cursor-pointer transition-all hover:border-sky-400/30"
          style={{
            background: 'rgba(16, 23, 38, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.15)'
          }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}
            >
              <Lock size={15} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white leading-tight truncate">
                Management Desk
              </span>
              <span className="text-[10px] text-slate-400 truncate mt-0.5">
                PIN 7986 &bull; Coordinators
              </span>
            </div>
          </div>
        </button>

        {/* Live Status Pill */}
        <div 
          className="px-3 py-1.5 rounded-lg flex items-center justify-between text-[10.5px]"
          style={{ background: 'rgba(6, 11, 24, 0.6)' }}
        >
          <span className="text-slate-400">Live Sync</span>
          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{connectionStatus === 'connected' ? 'Connected' : 'Connecting'}</span>
          </span>
        </div>
      </div>
    </aside>
  );
};

export default SidebarNavigation;
