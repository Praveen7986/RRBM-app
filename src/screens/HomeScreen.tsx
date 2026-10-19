// src/screens/HomeScreen.tsx
// Home Dashboard matching RRBM Revival Fast 2026 Specification
// "Welcome to RRBM", Three-Day Fasting Prayer with "D3" watermark & Social Media Channels

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  MapPin, 
  Clock, 
  Sparkles,
  Ticket,
  ExternalLink
} from 'lucide-react';
import { TabType } from '../types/navigation';
import { realtimeStore } from '../services/realtimeStore';

interface HomeScreenProps {
  onNavigate?: (tab: TabType) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [activeAlert, setActiveAlert] = useState(() => realtimeStore.getActiveAlert());

  useEffect(() => {
    const unsubscribe = realtimeStore.subscribe(() => {
      setActiveAlert(realtimeStore.getActiveAlert());
    });
    return unsubscribe;
  }, []);

  const openSocialLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Dynamic Real-Time Date Calculation for Festival Days:
  // 20 as D1, 21 as D2, 22 as D3
  const now = new Date();
  const targetYear = 2026;
  const festivalDay1 = new Date(targetYear, 9, 20); // Oct 20 (D1)
  const festivalDay2 = new Date(targetYear, 9, 21); // Oct 21 (D2)
  const festivalDay3 = new Date(targetYear, 9, 22); // Oct 22 (D3)

  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let watermark = 'D1';
  let badgeText = 'Starts in 4 days';
  let badgeColor = '#FBBF24';
  let badgeBg = 'rgba(245, 158, 11, 0.15)';
  let badgeBorder = 'rgba(245, 158, 11, 0.35)';

  const diffTime = festivalDay1.getTime() - todayDateOnly.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    watermark = 'D1';
    badgeText = diffDays === 1 ? 'Starts tomorrow' : `Starts in ${diffDays} days`;
  } else if (todayDateOnly.getTime() === festivalDay1.getTime()) {
    watermark = 'D1';
    badgeText = 'Live Now • Day 1 (D1)';
    badgeColor = '#34D399';
    badgeBg = 'rgba(16, 185, 129, 0.15)';
    badgeBorder = 'rgba(16, 185, 129, 0.35)';
  } else if (todayDateOnly.getTime() === festivalDay2.getTime()) {
    watermark = 'D2';
    badgeText = 'Live Now • Day 2 (D2)';
    badgeColor = '#38BDF8';
    badgeBg = 'rgba(56, 189, 248, 0.15)';
    badgeBorder = 'rgba(56, 189, 248, 0.35)';
  } else if (todayDateOnly.getTime() === festivalDay3.getTime()) {
    watermark = 'D3';
    badgeText = 'Live Now • Day 3 (D3)';
    badgeColor = '#FBBF24';
    badgeBg = 'rgba(245, 158, 11, 0.15)';
    badgeBorder = 'rgba(245, 158, 11, 0.35)';
  } else if (todayDateOnly.getTime() > festivalDay3.getTime()) {
    watermark = 'D3';
    badgeText = 'Festival Concluded';
    badgeColor = '#94A3B8';
    badgeBg = 'rgba(148, 163, 184, 0.15)';
    badgeBorder = 'rgba(148, 163, 184, 0.35)';
  }

  return (
    <div className="home-screen flex flex-col w-full space-y-5 pb-6 select-none max-w-4xl mx-auto">
      {/* 1. Top Greeting Header */}
      <div className="w-full flex items-start justify-between pt-1">
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-sky-400 uppercase tracking-widest mb-1">
            <Sparkles size={13} className="text-sky-400" />
            <span>October 20, 21, 22, 2026 &bull; Three-Day Festival</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Welcome to RRBM
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            A place of grace, restoration & faith &bull; Revival for Re-Built Ministries
          </p>
        </div>

        {/* Right: Notification / Alert Bell Button */}
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('alert')}
          className="relative w-11 h-11 rounded-2xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95 shrink-0"
          style={{
            background: '#101726',
            border: activeAlert ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)'
          }}
          aria-label="Alerts Console"
          title="Alerts Console"
        >
          <Bell size={18} className={activeAlert ? 'text-rose-400 animate-pulse' : 'text-slate-300'} />
          {activeAlert && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>
      </div>

      {/* 2. Hero Event Card: Dynamic Festival Day Watermark (D1 on 20, D2 on 21, D3 on 22) */}
      <div className="hero-event-card p-5 sm:p-6 p-7 flex flex-col justify-between space-y-4">
        {/* Ambient Top Glow */}
        <div 
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none" 
          style={{ background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%)' }} 
        />

        {/* Real-time D1/D2/D3 Watermark */}
        <div className="hero-watermark" aria-hidden="true">
          {watermark}
        </div>

        {/* Top Badges */}
        <div className="flex items-center gap-2 relative z-10 flex-wrap">
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{
              background: badgeBg,
              border: `1px solid ${badgeBorder}`,
              color: badgeColor
            }}
          >
            <Clock size={12} />
            <span>{badgeText}</span>
          </div>

          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              color: '#38BDF8'
            }}
          >
            <Ticket size={12} />
            <span>Revival Fast 2026</span>
          </div>
        </div>

        {/* Title and Description */}
        <div className="relative z-10 space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Three-Day Fasting Prayer
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Reviving lives through Christ Jesus with three days of dedicated fasting, worship and prayer. Join with believers across K.Nayakampalli and worldwide.
          </p>
        </div>

        {/* Metadata Footer */}
        <div 
          className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 text-xs sm:text-sm text-slate-300 border-t relative z-10"
          style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-sky-400 shrink-0" />
            <span className="font-semibold">Oct 20, 21, 22, 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-sky-400 shrink-0" />
            <span className="font-semibold">Immanuel Prardhana Mandhiram, K.Nayakampalli</span>
          </div>
        </div>
      </div>

      {/* 3. Official Media & Ministry Channels Section */}
      <div className="w-full flex flex-col space-y-3.5 pt-1">
        <div className="flex items-baseline justify-between px-0.5">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Official Media & Ministry Channels
            </h3>
            <span className="text-[11px] text-slate-500">
              Watch live fasting prayer sessions, sermons, and ministry updates
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Channel 1: YouTube - Joshua Chetla */}
          <div
            onClick={() => openSocialLink('https://youtube.com/@joshuachetla8512?si=z1YW1beGfjx2fhOy')}
            className="p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-lg"
            style={{
              background: '#101726',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div className="flex items-center gap-3.5">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.3) 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}
              >
                {/* YouTube SVG Icon */}
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-red-500">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-red-400 transition-colors">
                    Joshua Chetla
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                    YouTube
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                  @joshuachetla8512
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Live prayers, fasting sermons & teachings
                </span>
              </div>
            </div>

            <ExternalLink size={16} className="text-slate-400 group-hover:text-red-400 transition-colors shrink-0 mr-1" />
          </div>

          {/* Channel 2: YouTube - R.R-B Edits */}
          <div
            onClick={() => openSocialLink('https://youtube.com/@r.r-bedits2160?si=gGV1nyHdHomPfg_B')}
            className="p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-lg"
            style={{
              background: '#101726',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div className="flex items-center gap-3.5">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.3) 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}
              >
                {/* YouTube SVG Icon */}
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-red-500">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-red-400 transition-colors">
                    R.R-B Edits
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                    YouTube
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                  @r.r-bedits2160
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Worship songs, devotionals & festival edits
                </span>
              </div>
            </div>

            <ExternalLink size={16} className="text-slate-400 group-hover:text-red-400 transition-colors shrink-0 mr-1" />
          </div>

          {/* Channel 3: Facebook - Joshua Chetla */}
          <div
            onClick={() => openSocialLink('https://www.facebook.com/Joshua7722')}
            className="p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-lg"
            style={{
              background: '#101726',
              border: '1px solid rgba(24, 119, 242, 0.25)',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div className="flex items-center gap-3.5">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, rgba(24, 119, 242, 0.25) 0%, rgba(29, 78, 216, 0.3) 100%)',
                  border: '1px solid rgba(24, 119, 242, 0.4)'
                }}
              >
                {/* Facebook SVG Icon */}
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#1877F2]">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                    Joshua Chetla
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Facebook
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                  facebook.com/Joshua7722
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Ministry updates, community & live broadcast
                </span>
              </div>
            </div>

            <ExternalLink size={16} className="text-slate-400 group-hover:text-blue-400 transition-colors shrink-0 mr-1" />
          </div>

          {/* Channel 4: Instagram - @joshuachetla */}
          <div
            onClick={() => openSocialLink('https://www.instagram.com/joshuachetla?igsh=ZHozc3Riam12d3Yw')}
            className="p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-lg"
            style={{
              background: '#101726',
              border: '1px solid rgba(225, 48, 108, 0.25)',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div className="flex items-center gap-3.5">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.25) 0%, rgba(131, 58, 180, 0.3) 100%)',
                  border: '1px solid rgba(225, 48, 108, 0.4)'
                }}
              >
                {/* Instagram SVG Icon */}
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#E1306C]">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-pink-400 transition-colors">
                    Joshua Chetla
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-pink-500/15 text-pink-400 border border-pink-500/30">
                    Instagram
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                  @joshuachetla
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Short sermon reels, scriptures & daily stories
                </span>
              </div>
            </div>

            <ExternalLink size={16} className="text-slate-400 group-hover:text-pink-400 transition-colors shrink-0 mr-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
