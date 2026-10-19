// src/screens/SongsScreen.tsx
// Screen 3: Worship Song Lyrics Book & Festival Hymnal
// Designed for reading and singing along during RRBM 3-Day Fasting Prayers 2026
// Visualized in Telugu NATS font, preserving exact lyrics formatting as pasted

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  X, 
  ChevronRight, 
  Copy, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  ArrowLeft,
  Music2,
  Sparkles,
  Bookmark,
  Star
} from 'lucide-react';
import { realtimeStore } from '../services/realtimeStore';
import { Song } from '../types/volunteer';

const DAY_LABELS: Record<'day1' | 'day2' | 'day3', string> = {
  day1: 'Day 1 (Oct 20)',
  day2: 'Day 2 (Oct 21)',
  day3: 'Day 3 (Oct 22)'
};

export const SongsScreen: React.FC = () => {
  const [songsList, setSongsList] = useState<Song[]>(() => realtimeStore.getSongs());
  const [activeDay, setActiveDay] = useState<'all' | 'day1' | 'day2' | 'day3'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  // Lyrics Reader State
  const [fontSize, setFontSize] = useState<number>(18);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const unsub = realtimeStore.subscribe(() => {
      setSongsList(realtimeStore.getSongs());
    });
    return unsub;
  }, []);

  // Search helper
  const matchesSearch = (song: Song, query: string) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      (song.sub && song.sub.toLowerCase().includes(q)) ||
      (song.key && song.key.toLowerCase().includes(q)) ||
      (song.category && song.category.toLowerCase().includes(q)) ||
      (song.lyrics && song.lyrics.toLowerCase().includes(q))
    );
  };

  // Current day filtered songs
  const daySongs = activeDay === 'all' 
    ? songsList 
    : songsList.filter(s => (s.day || 'all') === activeDay || (s.day || 'all') === 'all');

  // Search filtered songs
  const filteredSongs = daySongs.filter(song => matchesSearch(song, searchQuery));

  // Main Highlighted Songs for Day 1, Day 2, Day 3
  const day1Main = songsList.find(s => s.isMainSong && s.mainSongDay === 'day1') || songsList.find(s => s.id === 's1');
  const day2Main = songsList.find(s => s.isMainSong && s.mainSongDay === 'day2') || songsList.find(s => s.id === 's7');
  const day3Main = songsList.find(s => s.isMainSong && s.mainSongDay === 'day3') || songsList.find(s => s.id === 's13');

  // Active day main song (when Day 1, Day 2, or Day 3 is clicked)
  const currentDayMain = activeDay === 'all' 
    ? null 
    : (songsList.find(s => s.isMainSong && (s.mainSongDay === activeDay || s.day === activeDay)) || 
       (activeDay === 'day1' ? day1Main : activeDay === 'day2' ? day2Main : day3Main));

  const handleCopyLyrics = (song: Song) => {
    navigator.clipboard.writeText(`${song.title}\n\n${song.lyrics}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 28));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 13));
  };

  // -------------------------------------------------------------
  // Full-Screen Lyrics Reader Overlay
  // -------------------------------------------------------------
  if (selectedSong) {
    return (
      <div className="fixed inset-0 z-[2000] bg-[#070D1D] flex flex-col overflow-hidden select-text text-white">
        {/* Top Sticky Header */}
        <div 
          className="w-full px-4 py-3 border-b flex items-center justify-between shrink-0"
          style={{
            background: 'rgba(16, 23, 38, 0.95)',
            borderColor: 'rgba(56, 189, 248, 0.2)',
            backdropFilter: 'blur(16px)'
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedSong(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sky-400 text-xs font-bold cursor-pointer transition-all active:scale-95"
          >
            <ArrowLeft size={15} />
            <span>Back to Songs</span>
          </button>

          {/* Controls: Zoom & Copy */}
          <div className="flex items-center gap-2">
            {/* Font Size Adjusters */}
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-700/60 p-0.5">
              <button
                type="button"
                onClick={decreaseFontSize}
                disabled={fontSize <= 13}
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Decrease font size"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-400 px-1 select-none">
                {fontSize}px
              </span>
              <button
                type="button"
                onClick={increaseFontSize}
                disabled={fontSize >= 28}
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Increase font size"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={() => handleCopyLyrics(selectedSong)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-all active:scale-95"
              title="Copy lyrics to clipboard"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Lyrics Body */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-32 max-w-3xl mx-auto w-full space-y-4">
          {/* Song Header Info Card */}
          <div 
            className="p-5 rounded-2xl flex flex-col space-y-2.5"
            style={{
              background: '#101726',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block mb-1">
                  {selectedSong.category || 'Worship'}
                </span>
                <h1 
                  className="text-2xl sm:text-3xl font-black text-white leading-tight font-nats"
                  style={{ fontFamily: "'NATS', 'Noto Sans Telugu', sans-serif" }}
                >
                  {selectedSong.title}
                </h1>
                {selectedSong.sub && (
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedSong.sub}
                  </p>
                )}
              </div>

              {selectedSong.key && (
                <div className="flex flex-col items-end shrink-0 gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {selectedSong.key}
                  </span>
                </div>
              )}
            </div>

            {selectedSong.themeVerse && (
              <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/20 text-xs text-sky-200/90 italic flex items-center gap-2">
                <Bookmark size={14} className="text-sky-400 shrink-0" />
                <span>{selectedSong.themeVerse}</span>
              </div>
            )}
          </div>

          {/* Formatted Lyrics Verses Card with Telugu NATS Font */}
          <div 
            className="p-6 rounded-2xl space-y-4"
            style={{
              background: '#101726',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div 
              className="leading-relaxed whitespace-pre-wrap select-text text-slate-100 font-nats"
              style={{ 
                fontSize: `${fontSize}px`, 
                lineHeight: 1.8,
                fontFamily: "'NATS', 'Nats', 'Noto Sans Telugu', sans-serif",
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {selectedSong.lyrics}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Main Songs Hymnal Screen
  // -------------------------------------------------------------
  return (
    <div className="songs-screen flex flex-col w-full space-y-4 pb-24 select-none max-w-4xl mx-auto">
      {/* 1. Header with Screen Title & Search */}
      <div className="w-full flex items-start justify-between pt-1">
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-sky-400 uppercase tracking-widest mb-1">
            <Sparkles size={13} className="text-sky-400" />
            <span>RRBM 3-Day Fasting Prayers 2026 Hymnal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Worship Songs & Lyrics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Complete worship songs and lyrics in Telugu NATS font
          </p>
        </div>

        <div className="w-10 h-10 rounded-2xl bg-[#101726] border border-white/10 flex items-center justify-center text-sky-400 shrink-0">
          <Music2 size={19} />
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="w-full relative flex items-center">
        <div className="absolute left-3.5 text-sky-400 pointer-events-none">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by song name or lyrics words..."
          className="w-full py-2.5 pl-10 pr-9 rounded-2xl text-xs text-white placeholder-slate-500 outline-none transition-all shadow-md font-nats"
          style={{ 
            background: '#101726', 
            border: '1px solid rgba(56, 189, 248, 0.25)',
            fontFamily: "'NATS', 'Noto Sans Telugu', sans-serif"
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* 3. Day Selector Tabs */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveDay('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeDay === 'all'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'bg-[#101726] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          All Songs ({songsList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveDay('day1')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeDay === 'day1'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'bg-[#101726] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          Day 1 (Oct 20)
        </button>

        <button
          type="button"
          onClick={() => setActiveDay('day2')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeDay === 'day2'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'bg-[#101726] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          Day 2 (Oct 21)
        </button>

        <button
          type="button"
          onClick={() => setActiveDay('day3')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeDay === 'day3'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'bg-[#101726] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          Day 3 (Oct 22)
        </button>
      </div>

      {/* 4. Highlighted Main Song Hero Card (When Date Filter is Selected: Day 1, Day 2, or Day 3) */}
      {activeDay !== 'all' && currentDayMain && matchesSearch(currentDayMain, searchQuery) && (
        <div 
          onClick={() => setSelectedSong(currentDayMain)}
          className="w-full p-4 sm:p-5 rounded-3xl border-2 border-amber-400/70 shadow-[0_0_30px_rgba(251,191,36,0.22)] bg-gradient-to-br from-amber-500/20 via-[#131e3b] to-[#0a1224] transition-all hover:scale-[1.008] active:scale-[0.99] cursor-pointer group space-y-3 relative overflow-hidden"
        >
          {/* Top Glow & Badge Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-[10.5px] uppercase tracking-wider shadow-md">
              <Star size={13} className="fill-slate-950 text-slate-950" />
              <span>{DAY_LABELS[activeDay]} • Main Highlighted Song</span>
            </div>

            <div className="flex items-center gap-1.5">
              {currentDayMain.key && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-sm">
                  {currentDayMain.key}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30">
                {currentDayMain.category || 'Main Hymn'}
              </span>
            </div>
          </div>

          {/* Song Name in Large Telugu NATS Font */}
          <div>
            <h2 
              className="text-2xl sm:text-3xl font-black text-amber-100 group-hover:text-amber-300 transition-colors font-nats tracking-wide leading-tight"
              style={{ fontFamily: "'NATS', 'Noto Sans Telugu', sans-serif" }}
            >
              {currentDayMain.title}
            </h2>
            {currentDayMain.sub && (
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {currentDayMain.sub}
              </p>
            )}
          </div>

          {/* Lyrics Snippet Preview */}
          {currentDayMain.lyrics && (
            <div 
              className="p-3 rounded-2xl bg-black/45 border border-amber-400/25 text-xs sm:text-sm text-slate-200 font-nats leading-relaxed max-h-24 overflow-hidden relative"
              style={{ fontFamily: "'NATS', 'Noto Sans Telugu', sans-serif" }}
            >
              <div className="line-clamp-3 whitespace-pre-line">
                {currentDayMain.lyrics}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
            </div>
          )}

          {/* Call to action bar */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-[10.5px] font-mono text-amber-300/90 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-400" />
              <span>Full Lyrics in Telugu NATS Font</span>
            </span>

            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all group-hover:translate-x-0.5">
              <span>Read Lyrics</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      )}

      {/* 5. Highlighted 3-Day Songs (When "All Songs" Filter is Selected) */}
      {activeDay === 'all' && (
        <div className="w-full space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Star size={13} className="text-amber-400 fill-amber-400" />
              <span>Main Highlighted Songs (Day 1 • Day 2 • Day 3)</span>
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                dayKey: 'day1',
                label: 'Day 1 (Oct 20) • Main Song',
                song: day1Main,
                cardTheme: 'border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.18)] bg-gradient-to-r from-amber-500/15 via-[#131d38] to-[#0c152a]',
                badgeTheme: 'bg-amber-400 text-slate-950 border-amber-300',
                titleColor: 'text-amber-100 group-hover:text-amber-300'
              },
              {
                dayKey: 'day2',
                label: 'Day 2 (Oct 21) • Main Song',
                song: day2Main,
                cardTheme: 'border-sky-400/60 shadow-[0_0_20px_rgba(56,189,248,0.18)] bg-gradient-to-r from-sky-500/15 via-[#131d38] to-[#0c152a]',
                badgeTheme: 'bg-sky-400 text-slate-950 border-sky-300',
                titleColor: 'text-sky-100 group-hover:text-sky-300'
              },
              {
                dayKey: 'day3',
                label: 'Day 3 (Oct 22) • Main Song',
                song: day3Main,
                cardTheme: 'border-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.18)] bg-gradient-to-r from-emerald-500/15 via-[#131d38] to-[#0c152a]',
                badgeTheme: 'bg-emerald-400 text-slate-950 border-emerald-300',
                titleColor: 'text-emerald-100 group-hover:text-emerald-300'
              }
            ].map(({ dayKey, label, song, cardTheme, badgeTheme, titleColor }) => {
              if (!song || !matchesSearch(song, searchQuery)) return null;
              return (
                <div
                  key={dayKey}
                  onClick={() => setSelectedSong(song)}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer group active:scale-[0.99] shadow-md ${cardTheme}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${badgeTheme}`}>
                      ⭐ {label}
                    </span>

                    {song.key && (
                      <span className="text-[10px] font-mono font-bold text-amber-200 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                        {song.key}
                      </span>
                    )}
                  </div>

                  <h3 
                    className={`text-lg sm:text-xl font-black font-nats leading-tight truncate ${titleColor}`}
                    style={{ fontFamily: "'NATS', 'Noto Sans Telugu', sans-serif" }}
                  >
                    {song.title}
                  </h3>

                  {song.lyrics && (
                    <p 
                      className="text-xs text-slate-300/90 line-clamp-2 mt-1 font-nats italic leading-relaxed"
                      style={{ fontFamily: "'NATS', 'Noto Sans Telugu', sans-serif" }}
                    >
                      {song.lyrics.split('\n').filter(l => l.trim() && !l.startsWith('[')).slice(0, 2).join(' • ')}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-white/5 text-[10.5px]">
                    <span className="text-slate-400 font-mono">
                      {song.sub || song.category || 'Festival Hymn'}
                    </span>
                    <span className="text-sky-400 font-bold flex items-center gap-1 group-hover:underline">
                      <span>Read Full Lyrics</span>
                      <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Other Hymnal Songs Section Header */}
      <div className="w-full flex items-center justify-between pt-2 pb-0.5 px-1">
        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen size={13} className="text-sky-400" />
          <span>
            {activeDay === 'all' 
              ? `All Hymnal Songs (${filteredSongs.length})`
              : `Other Songs for ${DAY_LABELS[activeDay]} (${filteredSongs.filter(s => s.id !== currentDayMain?.id).length})`}
          </span>
        </span>
      </div>

      {/* 7. Songs List */}
      <div className="w-full space-y-2.5">
        {filteredSongs.length === 0 ? (
          <div 
            className="p-8 rounded-2xl text-center space-y-2"
            style={{ background: '#101726', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <BookOpen size={28} className="text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">No songs found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Songs added from the Management Desk will appear here in real time.
            </p>
          </div>
        ) : (
          filteredSongs
            .filter(song => activeDay === 'all' || song.id !== currentDayMain?.id)
            .map((song, index) => (
              <div
                key={song.id}
                onClick={() => setSelectedSong(song)}
                className="p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:scale-[1.006] active:scale-[0.99] group shadow-md"
                style={{
                  background: '#101726',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  {/* Song Index Badge */}
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono font-black text-xs"
                    style={{
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.28)',
                      color: '#38BDF8'
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-base font-bold text-white group-hover:text-sky-400 transition-colors truncate font-nats"
                        style={{ fontFamily: "'NATS', 'Noto Sans Telugu', sans-serif" }}
                      >
                        {song.title}
                      </span>
                      {song.isMainSong && song.mainSongDay && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-black uppercase shrink-0">
                          ⭐ {song.mainSongDay}
                        </span>
                      )}
                    </div>

                    {song.sub && (
                      <span className="text-xs text-slate-400 truncate mt-0.5">
                        {song.sub}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {song.key && (
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                          {song.key}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                        {song.category || 'Worship'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Read Lyrics Action Pill */}
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs font-bold text-sky-400 group-hover:underline hidden sm:inline">
                    Lyrics
                  </span>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-sky-400 transition-colors" />
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default SongsScreen;
