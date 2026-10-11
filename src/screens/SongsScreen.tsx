// src/screens/SongsScreen.tsx
// Complete RRBM Fasting & Blessing Festival Praise & Worship Songs (Days 1, 2, 3)

import React, { useState } from 'react';
import { Music, Search, X, Play, BookOpen, Sparkles, ChevronRight } from 'lucide-react';
import { SONGS_DATA, SongItem } from '../data/songsData';

export const SongsScreen: React.FC = () => {
  const [activeDay, setActiveDay] = useState<'day1' | 'day2' | 'day3'>('day1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);

  // Filter songs by active day and search query
  const currentDaySongs = SONGS_DATA[activeDay] || [];
  const filteredSongs = currentDaySongs.filter((song) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      song.sub.toLowerCase().includes(q) ||
      (song.lyrics && song.lyrics.toLowerCase().includes(q))
    );
  });

  return (
    <div className="songs-screen flex flex-col w-full space-y-2.5 pb-2">
      {/* 1. Top Header */}
      <div className="w-full text-center pt-0.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <Music size={13} className="text-sky-400" />
          <span className="text-[11px] font-bold text-sky-300">
            3-Day Praise & Worship Songs
          </span>
        </div>
      </div>

      {/* 2. 3-Day Tabs */}
      <div className="w-full grid grid-cols-3 gap-1.5 p-1 rounded-2xl" style={{ background: 'rgba(14, 23, 44, 0.8)', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
        <button
          type="button"
          onClick={() => setActiveDay('day1')}
          className={`py-2 px-1 rounded-xl text-center cursor-pointer transition-all ${
            activeDay === 'day1'
              ? 'text-white font-extrabold shadow-md'
              : 'text-slate-400 font-semibold hover:text-slate-200'
          }`}
          style={activeDay === 'day1' ? { background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)' } : {}}
        >
          <span className="text-xs block">Day 1</span>
          <span className="text-[9px] opacity-80 block">Oct 20</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDay('day2')}
          className={`py-2 px-1 rounded-xl text-center cursor-pointer transition-all ${
            activeDay === 'day2'
              ? 'text-white font-extrabold shadow-md'
              : 'text-slate-400 font-semibold hover:text-slate-200'
          }`}
          style={activeDay === 'day2' ? { background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)' } : {}}
        >
          <span className="text-xs block">Day 2</span>
          <span className="text-[9px] opacity-80 block">Oct 21</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDay('day3')}
          className={`py-2 px-1 rounded-xl text-center cursor-pointer transition-all ${
            activeDay === 'day3'
              ? 'text-white font-extrabold shadow-md'
              : 'text-slate-400 font-semibold hover:text-slate-200'
          }`}
          style={activeDay === 'day3' ? { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)' } : {}}
        >
          <span className="text-xs block">Day 3</span>
          <span className="text-[9px] opacity-80 block">Oct 22</span>
        </button>
      </div>

      {/* 3. Search Bar */}
      <div className="w-full relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by song name or lyrics..."
          className="w-full py-2 pl-8 pr-8 rounded-xl text-xs text-white placeholder-slate-400 outline-none"
          style={{ background: 'rgba(14, 23, 44, 0.6)', border: '1px solid rgba(56, 189, 248, 0.18)' }}
        />
        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 4. Songs List */}
      <div className="w-full flex flex-col space-y-2">
        {filteredSongs.length === 0 ? (
          <div className="w-full p-6 text-center text-slate-400 text-xs clean-card">
            No songs found matching "{searchQuery}"
          </div>
        ) : (
          filteredSongs.map((song, idx) => (
            <div
              key={song.id}
              onClick={() => setSelectedSong(song)}
              className="clean-card p-3 flex items-center justify-between cursor-pointer transition-all active:scale-98"
              style={{ background: 'rgba(14, 23, 44, 0.75)', border: '1px solid rgba(56, 189, 248, 0.12)' }}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold shrink-0" 
                  style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.25)' }}
                >
                  {idx + 1}
                </div>

                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-white truncate">
                    {song.title}
                  </span>
                  <span className="text-[10px] text-amber-400/90 truncate">
                    {song.sub}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400 font-mono">
                    <span>{song.time}</span>
                    <span>&bull;</span>
                    <span>{song.key}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-sky-300 px-2 py-0.5 rounded-full" style={{ background: 'rgba(56, 189, 248, 0.1)' }}>
                  Lyrics
                </span>
                <ChevronRight size={14} className="text-slate-400" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Full Lyrics Modal */}
      {selectedSong && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(4, 7, 16, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div 
            className="w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col p-4 space-y-3 overflow-hidden" 
            style={{ background: '#0E172C', border: '1px solid rgba(56, 189, 248, 0.25)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'rgba(56, 189, 248, 0.15)' }}>
              <div className="flex flex-col">
                <h3 className="text-sm font-black text-white">{selectedSong.title}</h3>
                <span className="text-xs font-bold text-amber-400">{selectedSong.sub}</span>
                {selectedSong.themeVerse && (
                  <span className="text-[10px] text-sky-300/80 italic mt-0.5">{selectedSong.themeVerse}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedSong(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Lyrics Content */}
            <div className="flex-1 overflow-y-auto pr-1 text-xs leading-relaxed text-slate-200 whitespace-pre-line select-text">
              {selectedSong.lyrics || "Lyrics for this praise song will be displayed here during live worship."}
            </div>

            {/* Modal Footer */}
            <button
              type="button"
              onClick={() => setSelectedSong(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}
            >
              Close Song
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SongsScreen;
