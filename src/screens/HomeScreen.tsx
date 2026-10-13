// src/screens/HomeScreen.tsx
// Home Dashboard matching Figma Redesign Specification
// "Welcome to RRBM", Three-Day Fasting Prayer with "D3" watermark, 3 Quick Actions, Volunteer Alert & Worship Songs

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  MapPin, 
  ChevronRight, 
  Music, 
  Coins, 
  Clock, 
  Radio, 
  Megaphone,
  CheckCircle2,
  XCircle,
  Play,
  Volume2,
  Sparkles,
  Ticket
} from 'lucide-react';
import { TabType } from '../types/navigation';
import rrbLogo from '../assets/rrb_logo.png';
import { realtimeStore } from '../services/realtimeStore';
import { SONGS_DATA, SongItem } from '../data/songsData';

interface HomeScreenProps {
  onNavigate?: (tab: TabType) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [activeAlert, setActiveAlert] = useState(() => realtimeStore.getActiveAlert());
  const [currentVolunteer, setCurrentVolunteer] = useState(() => realtimeStore.getCurrentVolunteer());
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = realtimeStore.subscribe(() => {
      setActiveAlert(realtimeStore.getActiveAlert());
      setCurrentVolunteer(realtimeStore.getCurrentVolunteer());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (activeAlert && currentVolunteer) {
      if (activeAlert.responses?.coming?.includes(currentVolunteer.id)) {
        setSelectedResponse('coming');
      } else if (activeAlert.responses?.coming_late?.includes(currentVolunteer.id)) {
        setSelectedResponse('coming_late');
      } else if (activeAlert.responses?.not_coming?.includes(currentVolunteer.id)) {
        setSelectedResponse('not_coming');
      } else {
        setSelectedResponse(null);
      }
    } else {
      setSelectedResponse(null);
    }
  }, [activeAlert, currentVolunteer]);

  const handleQuickResponse = async (type: 'coming' | 'coming_late' | 'not_coming') => {
    setSelectedResponse(type);
    try {
      await realtimeStore.sendQuickResponse(type);
    } catch {
      // Ignore
    }
  };

  // Preview songs for the dashboard widget
  const previewSongs = SONGS_DATA.day2.slice(0, 3);

  return (
    <div className="home-screen flex flex-col w-full space-y-5 pb-6 select-none max-w-6xl mx-auto">
      {/* 1. Top Greeting Header (Figma Design) */}
      <div className="w-full flex items-start justify-between pt-1">
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-sky-400 uppercase tracking-widest mb-1">
            <Sparkles size={12} className="text-sky-400" />
            <span>October 20–22, 2026 &bull; Three-Day Festival</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
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
          className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95"
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

      {/* 2. Hero Event Card: Three-Day Fasting Prayer with "D3" Watermark */}
      <div 
        className="w-full rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col justify-between relative overflow-hidden space-y-4"
        style={{
          background: 'linear-gradient(135deg, #0F1F42 0%, #081124 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)'
        }}
      >
        {/* Ambient Top Glow */}
        <div 
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none" 
          style={{ background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%)' }} 
        />

        {/* "D3" Watermark matching Figma */}
        <div 
          className="absolute top-4 right-6 font-black font-mono text-5xl sm:text-6xl lg:text-7xl pointer-events-none select-none text-sky-400/10 tracking-tighter"
          aria-hidden="true"
        >
          D3
        </div>

        {/* Top Badges */}
        <div className="flex items-center gap-2 relative z-10">
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#FBBF24'
            }}
          >
            <Clock size={12} />
            <span>Starts in 14 days</span>
          </div>

          <div 
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
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
        <div className="relative z-10 space-y-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            Three-Day Fasting Prayer
          </h2>
          <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-2xl">
            Reviving lives through Christ Jesus with three days of dedicated fasting, worship and prayer. Join with believers across Vijayawada and worldwide.
          </p>
        </div>

        {/* Metadata Footer */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 text-xs sm:text-sm text-slate-300 border-t border-slate-700/50 relative z-10">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-sky-400 shrink-0" />
            <span className="font-semibold">Oct 20–22, 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-sky-400 shrink-0" />
            <span className="font-semibold">RRBM Main Hall, Vijayawada</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions Section (3 Cards in Grid) */}
      <div className="w-full flex flex-col space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Quick Actions
            </h3>
            <span className="text-[11px] text-slate-500">
              Immediate access to essential ministry tools
            </span>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {/* Action 1: Alerts */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('alert')}
            className="rounded-2xl p-4 flex items-center justify-between text-left cursor-pointer transition-all active:scale-[0.98] hover:border-sky-400/40"
            style={{
              background: '#101726',
              border: activeAlert ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div className="flex items-center gap-3.5">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: activeAlert ? 'rgba(244, 63, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  border: activeAlert ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(56, 189, 248, 0.28)',
                  color: activeAlert ? '#FB7185' : '#38BDF8'
                }}
              >
                <Radio size={20} className={activeAlert ? 'animate-pulse' : ''} />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Alerts</span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{
                      background: activeAlert ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.12)',
                      color: activeAlert ? '#FB7185' : '#38BDF8'
                    }}
                  >
                    {activeAlert ? '1 active' : 'Standby'}
                  </span>
                </div>
                <span className="text-xs text-slate-400 mt-0.5">
                  Send an urgent call
                </span>
              </div>
            </div>

            <ChevronRight size={18} className="text-slate-400" />
          </button>

          {/* Action 2: Songs */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('songs')}
            className="rounded-2xl p-4 flex items-center justify-between text-left cursor-pointer transition-all active:scale-[0.98] hover:border-sky-400/40"
            style={{
              background: '#101726',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div className="flex items-center gap-3.5">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.28)',
                  color: '#38BDF8'
                }}
              >
                <Music size={20} />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Songs</span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: '#38BDF8'
                    }}
                  >
                    18 songs
                  </span>
                </div>
                <span className="text-xs text-slate-400 mt-0.5">
                  Praise & worship list
                </span>
              </div>
            </div>

            <ChevronRight size={18} className="text-slate-400" />
          </button>

          {/* Action 3: Money Jar */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('money')}
            className="rounded-2xl p-4 flex items-center justify-between text-left cursor-pointer transition-all active:scale-[0.98] hover:border-sky-400/40"
            style={{
              background: '#101726',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div className="flex items-center gap-3.5">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                  color: '#FBBF24'
                }}
              >
                <Coins size={20} />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Money Jar</span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#FBBF24'
                    }}
                  >
                    Offering
                  </span>
                </div>
                <span className="text-xs text-slate-400 mt-0.5">
                  Offering balance
                </span>
              </div>
            </div>

            <ChevronRight size={18} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* 4. Lower Dashboard Grid: Volunteer Alert + Worship Songs */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Volunteer Alert Card */}
        <div 
          className="lg:col-span-5 rounded-2xl p-5 flex flex-col justify-between space-y-4"
          style={{
            background: '#101726',
            border: activeAlert ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-sky-400" />
              <span className="text-sm font-bold text-white">Volunteer Alert</span>
            </div>

            <span 
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: activeAlert ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                color: activeAlert ? '#FB7185' : '#38BDF8',
                border: activeAlert ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)'
              }}
            >
              {activeAlert ? 'Active' : 'Standby'}
            </span>
          </div>

          {/* Central Concentric Circular Alert Trigger */}
          <div className="flex flex-col items-center text-center py-2">
            <div className="relative flex items-center justify-center my-1">
              <div 
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{ border: '1px solid rgba(56, 189, 248, 0.15)' }}
              >
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ 
                    border: '1px solid rgba(56, 189, 248, 0.25)', 
                    background: 'rgba(56, 189, 248, 0.04)' 
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('alert')}
                    className="w-16 h-16 rounded-full flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-90"
                    style={{
                      background: '#090F1E',
                      border: '2px solid #38BDF8',
                      boxShadow: '0 0 18px rgba(56, 189, 248, 0.35)'
                    }}
                    aria-label="Open Alert"
                  >
                    <Megaphone size={18} className="text-sky-400 mb-0.5" />
                    <span className="text-[10px] font-bold text-sky-400">
                      Alert
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
              Tap to send a push notification to all available volunteers in your ministry group.
            </p>
          </div>

          {/* If Alert Active: 3 Quick Responses */}
          {activeAlert && (
            <div 
              className="p-3 rounded-xl flex flex-col space-y-2"
              style={{
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)'
              }}
            >
              <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                Quick Response
              </span>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickResponse('coming')}
                  className={`py-1.5 text-center rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    selectedResponse === 'coming'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  <CheckCircle2 size={12} className="mx-auto mb-0.5" />
                  <span>I'm Coming</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickResponse('coming_late')}
                  className={`py-1.5 text-center rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    selectedResponse === 'coming_late'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <Clock size={12} className="mx-auto mb-0.5" />
                  <span>Coming Late</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickResponse('not_coming')}
                  className={`py-1.5 text-center rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    selectedResponse === 'not_coming'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <XCircle size={12} className="mx-auto mb-0.5" />
                  <span>Can't Come</span>
                </button>
              </div>
            </div>
          )}

          {/* Console Action Button */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('alert')}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-sky-400 hover:text-white cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.2)'
            }}
          >
            <span>Open Alert Console</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Right Column: Worship Songs Preview Card */}
        <div 
          className="lg:col-span-7 rounded-2xl p-5 flex flex-col justify-between space-y-3"
          style={{
            background: '#101726',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music size={16} className="text-sky-400" />
              <span className="text-sm font-bold text-white">Worship Songs</span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('songs')}
              className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View all</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Selected praise songs for Day 2 (Consecration & Intercession)
          </p>

          {/* Songs List */}
          <div className="space-y-2 pt-1 flex-1">
            {previewSongs.map((song, idx) => (
              <div
                key={song.id}
                onClick={() => onNavigate && onNavigate('songs')}
                className="p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-slate-800/60 active:scale-[0.99]"
                style={{
                  background: 'rgba(6, 11, 24, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.04)'
                }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8' }}
                  >
                    <Play size={13} className="ml-0.5" />
                  </div>

                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-bold text-white truncate">
                      {song.title}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate mt-0.5">
                      {song.sub} &bull; {song.key}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10.5px] font-mono text-slate-400">
                    {song.time}
                  </span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: '#CBD5E1'
                    }}
                  >
                    {song.category}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Action */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('songs')}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-sky-400 hover:text-white cursor-pointer transition-colors flex items-center justify-center gap-1.5 pt-2"
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.2)'
            }}
          >
            <span>Open Praise Songs Player</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
