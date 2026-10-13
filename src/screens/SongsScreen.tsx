// src/screens/SongsScreen.tsx
// Screen 3: Worship Song Lyrics Book & Festival Hymnal
// Designed for reading and singing along during RRBM 3-Day Fasting Prayers 2026
// Features: Day Filtering, Category Filter, Search, Font Size Zoom, Language Toggle (English/Telugu) & Full Lyrics View

import React, { useState } from 'react';
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
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import { SONGS_DATA, SongItem } from '../data/songsData';

export const SongsScreen: React.FC = () => {
  const [activeDay, setActiveDay] = useState<'all' | 'day1' | 'day2' | 'day3'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);
  
  // Lyrics Reader State
  const [lyricsLanguage, setLyricsLanguage] = useState<'english' | 'telugu'>('english');
  const [fontSize, setFontSize] = useState<number>(15);
  const [copied, setCopied] = useState<boolean>(false);

  // Collect all songs across all days
  const allSongsList: SongItem[] = [
    ...SONGS_DATA.day1,
    ...SONGS_DATA.day2,
    ...SONGS_DATA.day3
  ];

  // Unique categories
  const categories = ['All', 'Opening Praise', 'Deep Worship', 'Holy Spirit', 'Consecration', 'Thanksgiving'];

  // Current day filtered songs
  const daySongs = activeDay === 'all' ? allSongsList : (SONGS_DATA[activeDay] || []);

  // Search and category filtered songs
  const filteredSongs = daySongs.filter((song) => {
    // Category filter
    if (selectedCategory !== 'All' && !song.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false;
    }

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      song.sub.toLowerCase().includes(q) ||
      song.key.toLowerCase().includes(q) ||
      song.category.toLowerCase().includes(q) ||
      (song.lyrics && song.lyrics.toLowerCase().includes(q)) ||
      (song.teluguLyrics && song.teluguLyrics.toLowerCase().includes(q))
    );
  });

  const handleCopyLyrics = (song: SongItem) => {
    const textToCopy = (lyricsLanguage === 'telugu' && song.teluguLyrics) ? song.teluguLyrics : song.lyrics;
    navigator.clipboard.writeText(`${song.title}\nScale: ${song.key}\n\n${textToCopy}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };

  // -------------------------------------------------------------
  // Full-Screen Lyrics Reader Overlay
  // -------------------------------------------------------------
  if (selectedSong) {
    const hasTelugu = Boolean(selectedSong.teluguLyrics && selectedSong.teluguLyrics.trim());
    const currentLyrics = (lyricsLanguage === 'telugu' && hasTelugu) 
      ? selectedSong.teluguLyrics! 
      : selectedSong.lyrics;

    return (
      <div className="fixed inset-0 z-50 bg-[#070D1D] flex flex-col overflow-hidden select-text text-white">
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
                disabled={fontSize <= 12}
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
                disabled={fontSize >= 24}
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
        <div className="flex-1 overflow-y-auto px-4 py-5 max-w-3xl mx-auto w-full space-y-4">
          {/* Song Header Info Card */}
          <div 
            className="p-5 rounded-2xl flex flex-col space-y-3"
            style={{
              background: '#101726',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block mb-1">
                  {selectedSong.category} &bull; {selectedSong.day.toUpperCase()}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {selectedSong.title}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedSong.sub}
                </p>
              </div>

              <div className="flex flex-col items-end shrink-0 gap-1.5">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {selectedSong.key}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedSong.tempo}
                </span>
              </div>
            </div>

            {/* Theme Verse */}
            {selectedSong.themeVerse && (
              <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/20 text-xs text-sky-200/90 italic flex items-center gap-2">
                <Bookmark size={14} className="text-sky-400 shrink-0" />
                <span>{selectedSong.themeVerse}</span>
              </div>
            )}

            {/* Language Selector if Telugu Available */}
            {hasTelugu && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">Language:</span>
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setLyricsLanguage('english')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      lyricsLanguage === 'english'
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLyricsLanguage('telugu')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      lyricsLanguage === 'telugu'
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    తెలుగు (Telugu)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Formatted Lyrics Verses Card */}
          <div 
            className="p-6 rounded-2xl space-y-4"
            style={{
              background: '#101726',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div 
              className="leading-relaxed font-normal whitespace-pre-wrap select-text text-slate-200"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
            >
              {currentLyrics}
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
    <div className="songs-screen flex flex-col w-full space-y-4 pb-6 select-none max-w-4xl mx-auto">
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
            Complete lyrics and musical scales for all festival worship sessions
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
          placeholder="Search by song title, lyric words, or scale key (e.g. G Major)..."
          className="w-full py-2.5 pl-10 pr-9 rounded-2xl text-xs text-white placeholder-slate-500 outline-none transition-all shadow-md"
          style={{ background: '#101726', border: '1px solid rgba(56, 189, 248, 0.25)' }}
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
          All Songs ({allSongsList.length})
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

      {/* 4. Category Filter Pills */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-700 text-sky-300 border border-sky-400/40 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 5. Songs List */}
      <div className="w-full space-y-2.5 pt-1">
        {filteredSongs.length === 0 ? (
          <div 
            className="p-8 rounded-2xl text-center space-y-2"
            style={{ background: '#101726', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <BookOpen size={28} className="text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">No songs found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Try adjusting your search query or switching to All Songs.
            </p>
          </div>
        ) : (
          filteredSongs.map((song, index) => (
            <div
              key={song.id}
              onClick={() => {
                setSelectedSong(song);
                setLyricsLanguage('english');
              }}
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
                    <span className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors truncate">
                      {song.title}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 truncate mt-0.5">
                    {song.sub}
                  </span>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                      {song.key}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                      {song.category}
                    </span>
                    {song.teluguLyrics && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-sky-500/15 text-sky-300">
                        తెలుగు
                      </span>
                    )}
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
