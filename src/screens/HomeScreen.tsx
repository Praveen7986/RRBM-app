// src/screens/HomeScreen.tsx
// RRBM Revival for Re-Built Ministries — 3-Day Fasting Prayers 2026 Official Home Page

import React from 'react';
import { Sparkles, Calendar, Heart, Flame, RefreshCw, Radio, Music, Gift, Shield } from 'lucide-react';
import rrbLogo from '../assets/rrb_logo.png';
import joshuaImg from '../assets/pastors/joshua_nayomi.png';
import satyaImg from '../assets/pastors/rev_satya_shekar.png';
import { appUpdateManager } from '../services/appUpdateManager';

interface HomeScreenProps {
  onNavigate?: (tab: 'home' | 'alert' | 'songs' | 'blessings') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const handleCheckUpdates = () => {
    appUpdateManager.checkForUpdates(true);
  };

  return (
    <div className="home-screen flex flex-col items-center w-full space-y-3 pb-2">
      {/* 1. Hero Event Banner Card */}
      <div className="w-full clean-card p-4 flex flex-col items-center text-center relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0E1A38 0%, #091224 100%)' }}>
        {/* Ambient Top Glow */}
        <div className="absolute -top-10 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)' }} />

        {/* Official RRBM Application Logo */}
        <div className="relative z-10 w-20 h-20 mb-2.5 rounded-2xl flex items-center justify-center p-1 overflow-hidden" style={{ background: 'rgba(6, 11, 25, 0.7)', border: '1px solid rgba(245, 158, 11, 0.3)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
          <img 
            src={rrbLogo} 
            alt="RRBM Official Logo" 
            className="w-full h-full object-contain rounded-xl"
          />
        </div>

        {/* Title & Ministry Identity */}
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-xl font-black text-white tracking-tight leading-tight">
            Revival for Re-Built Ministries
          </h1>
          <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mt-0.5">
            Reviving Lives Through Christ
          </p>
        </div>

        {/* Event Dates Badge */}
        <div className="relative z-10 mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full" style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <Calendar size={13} className="text-sky-400" />
          <span className="text-xs font-bold text-sky-200">
            3-Day Fasting Prayers &bull; Oct 20–22, 2026
          </span>
        </div>
      </div>

      {/* 2. Quick Action Cards (Alert, Songs, Blessings) */}
      <div className="w-full grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('alert')}
          className="clean-card p-2.5 flex flex-col items-center text-center cursor-pointer transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(14, 23, 44, 0.9) 100%)', border: '1px solid rgba(244, 63, 94, 0.3)' }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5" style={{ background: 'rgba(244, 63, 94, 0.2)' }}>
            <Radio size={16} className="text-rose-400 animate-pulse" />
          </div>
          <span className="text-[11px] font-bold text-white">Leader Alert</span>
          <span className="text-[9px] text-slate-400">Live Call</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('songs')}
          className="clean-card p-2.5 flex flex-col items-center text-center cursor-pointer transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(14, 23, 44, 0.9) 100%)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5" style={{ background: 'rgba(56, 189, 248, 0.2)' }}>
            <Music size={16} className="text-sky-400" />
          </div>
          <span className="text-[11px] font-bold text-white">Praise Songs</span>
          <span className="text-[9px] text-slate-400">3-Day Lyrics</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('blessings')}
          className="clean-card p-2.5 flex flex-col items-center text-center cursor-pointer transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(14, 23, 44, 0.9) 100%)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
            <Gift size={16} className="text-amber-400" />
          </div>
          <span className="text-[11px] font-bold text-white">Blessings</span>
          <span className="text-[9px] text-slate-400">Money Jar</span>
        </button>
      </div>

      {/* 3. Fasting Program Schedule Card */}
      <div className="w-full clean-card p-3.5 flex flex-col space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: 'rgba(56, 189, 248, 0.12)' }}>
          <div className="flex items-center gap-1.5">
            <Flame size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              3-Day Schedule &bull; 2026
            </span>
          </div>
          <span className="text-[10px] font-bold text-sky-300 px-2 py-0.5 rounded-full" style={{ background: 'rgba(56, 189, 248, 0.12)' }}>
            Morning & Evening
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {/* Day 1 */}
          <div className="p-2 rounded-xl flex items-center justify-between" style={{ background: 'rgba(6, 11, 25, 0.5)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
            <div>
              <span className="font-bold text-sky-300 block text-[11px]">DAY 1 &bull; Oct 20 (Tuesday)</span>
              <span className="text-[10px] text-slate-300">Consecration & Altar Foundation</span>
            </div>
            <span className="text-[9.5px] font-mono text-sky-200 px-1.5 py-0.5 rounded" style={{ background: 'rgba(56, 189, 248, 0.18)' }}>
              09:00 AM
            </span>
          </div>

          {/* Day 2 */}
          <div className="p-2 rounded-xl flex items-center justify-between" style={{ background: 'rgba(6, 11, 25, 0.5)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
            <div>
              <span className="font-bold text-amber-300 block text-[11px]">DAY 2 &bull; Oct 21 (Wednesday)</span>
              <span className="text-[10px] text-slate-300">Holy Spirit Anointing & Youth Impartation</span>
            </div>
            <span className="text-[9.5px] font-mono text-amber-200 px-1.5 py-0.5 rounded" style={{ background: 'rgba(245, 158, 11, 0.18)' }}>
              09:00 AM
            </span>
          </div>

          {/* Day 3 */}
          <div className="p-2 rounded-xl flex items-center justify-between" style={{ background: 'rgba(6, 11, 25, 0.5)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
            <div>
              <span className="font-bold text-emerald-400 block text-[11px]">DAY 3 &bull; Oct 22 (Thursday)</span>
              <span className="text-[10px] text-slate-300">Blessing Release & Revival Sending</span>
            </div>
            <span className="text-[9.5px] font-mono text-emerald-200 px-1.5 py-0.5 rounded" style={{ background: 'rgba(16, 185, 129, 0.18)' }}>
              09:00 AM
            </span>
          </div>
        </div>
      </div>

      {/* 4. Leadership & Speakers Card */}
      <div className="w-full clean-card p-3.5 flex flex-col space-y-2">
        <div className="flex items-center gap-1.5 pb-1 border-b" style={{ borderColor: 'rgba(56, 189, 248, 0.12)' }}>
          <Heart size={14} className="text-rose-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Ministry Leadership
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Pastor Satya Shekar */}
          <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(6, 11, 25, 0.5)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
            <img 
              src={satyaImg} 
              alt="Rev. Satya Shekar" 
              className="w-10 h-10 rounded-full object-cover border border-amber-400/40"
            />
            <div className="flex flex-col overflow-hidden">
              <span className="text-[11px] font-bold text-white truncate">Rev. Satya Shekar</span>
              <span className="text-[9px] text-amber-400">Founder & Pastor</span>
            </div>
          </div>

          {/* Joshua & Nayomi */}
          <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(6, 11, 25, 0.5)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
            <img 
              src={joshuaImg} 
              alt="Joshua & Nayomi" 
              className="w-10 h-10 rounded-full object-cover border border-sky-400/40"
            />
            <div className="flex flex-col overflow-hidden">
              <span className="text-[11px] font-bold text-white truncate">Joshua & Nayomi</span>
              <span className="text-[9px] text-sky-400">Youth Pastors</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. App Version & Update Check Trigger */}
      <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(14, 23, 44, 0.6)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
        <div className="flex items-center gap-1.5">
          <Shield size={13} className="text-sky-400" />
          <span className="text-[10px] text-slate-400">RRBM Mobile v1.0.0</span>
        </div>

        <button
          type="button"
          onClick={handleCheckUpdates}
          className="flex items-center gap-1 text-[10.5px] font-bold text-sky-300 hover:text-white cursor-pointer"
        >
          <RefreshCw size={11} />
          <span>Check Updates</span>
        </button>
      </div>
    </div>
  );
};

export default HomeScreen;
