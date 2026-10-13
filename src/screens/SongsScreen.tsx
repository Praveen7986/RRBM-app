// src/screens/SongsScreen.tsx
// Screen 3: Praise & Worship Songs Matching Reference Image
// 3-Day Tabs, Category Metadata, Independent Scrolling & Docked Now Playing Panel

import React, { useState } from 'react';
import { 
  Music, 
  Search, 
  X, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Volume2,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { SONGS_DATA, SongItem } from '../data/songsData';

export const SongsScreen: React.FC = () => {
  const [activeDay, setActiveDay] = useState<'day1' | 'day2' | 'day3'>('day2');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);

  // Playback state
  const [nowPlayingSong, setNowPlayingSong] = useState<SongItem | null>(() => {
    const d2 = SONGS_DATA.day2;
    return d2.find(s => s.title.includes('Holy Spirit') || s.id === 's3') || d2[0] || SONGS_DATA.day1[0];
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const currentDaySongs = SONGS_DATA[activeDay] || [];
  const filteredSongs = currentDaySongs.filter((song) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      song.sub.toLowerCase().includes(q) ||
      song.category.toLowerCase().includes(q) ||
      (song.lyrics && song.lyrics.toLowerCase().includes(q))
    );
  });

  const handlePlayToggle = (song?: SongItem) => {
    if (song) {
      if (nowPlayingSong?.id === song.id) {
        setIsPlaying(!isPlaying);
      } else {
        setNowPlayingSong(song);
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNextSong = () => {
    if (!nowPlayingSong) return;
    const currentIndex = currentDaySongs.findIndex(s => s.id === nowPlayingSong.id);
    if (currentIndex !== -1 && currentIndex < currentDaySongs.length - 1) {
      setNowPlayingSong(currentDaySongs[currentIndex + 1]);
      setIsPlaying(true);
    } else if (currentDaySongs.length > 0) {
      setNowPlayingSong(currentDaySongs[0]);
      setIsPlaying(true);
    }
  };

  const handlePrevSong = () => {
    if (!nowPlayingSong) return;
    const currentIndex = currentDaySongs.findIndex(s => s.id === nowPlayingSong.id);
    if (currentIndex > 0) {
      setNowPlayingSong(currentDaySongs[currentIndex - 1]);
      setIsPlaying(true);
    } else if (currentDaySongs.length > 0) {
      setNowPlayingSong(currentDaySongs[currentDaySongs.length - 1]);
      setIsPlaying(true);
    }
  };

  const handleShuffle = () => {
    if (currentDaySongs.length > 0) {
      const randomIndex = Math.floor(Math.random() * currentDaySongs.length);
      setNowPlayingSong(currentDaySongs[randomIndex]);
      setIsPlaying(true);
    }
  };

  const getDayLabel = () => {
    switch (activeDay) {
      case 'day1': return 'Day 1 - Tuesday, Oct 20';
      case 'day2': return 'Day 2 - Wednesday, Oct 21';
      case 'day3': return 'Day 3 - Thursday, Oct 22';
    }
  };

  return (
    <div className="songs-screen flex flex-col w-full space-y-3 pb-24 select-none relative max-w-4xl mx-auto">
      {/* 1. Header with Screen Title & Search Icon */}
      <div className="w-full flex items-center justify-between pt-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            Praise & Worship - Revival Fast 2026
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Songs
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
          aria-label="Search songs"
        >
          <Search size={15} />
        </button>
      </div>

      {/* Search Input Bar (Expandable) */}
      {showSearch && (
        <div className="w-full relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, lyrics, key or category..."
            className="w-full py-2 pl-8 pr-8 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
            style={{ background: '#0D1527', border: '1px solid rgba(56, 189, 248, 0.25)' }}
            autoFocus
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* 2. 3-Day Selection Tabs Matching Reference Screen */}
      <div className="w-full grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveDay('day1')}
          className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
            activeDay === 'day1'
              ? 'border border-sky-400/80 bg-[#101B33]'
              : 'border border-white/5 bg-[#101726] text-slate-400'
          }`}
        >
          <span className={`text-xs font-bold ${activeDay === 'day1' ? 'text-white' : 'text-slate-300'}`}>
            Day 1
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            Oct 20
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDay('day2')}
          className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
            activeDay === 'day2'
              ? 'border border-sky-400/80 bg-[#101B33]'
              : 'border border-white/5 bg-[#101726] text-slate-400'
          }`}
        >
          <span className={`text-xs font-bold ${activeDay === 'day2' ? 'text-white' : 'text-slate-300'}`}>
            Day 2
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            Oct 21
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDay('day3')}
          className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
            activeDay === 'day3'
              ? 'border border-sky-400/80 bg-[#101B33]'
              : 'border border-white/5 bg-[#101726] text-slate-400'
          }`}
        >
          <span className={`text-xs font-bold ${activeDay === 'day3' ? 'text-white' : 'text-slate-300'}`}>
            Day 3
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            Oct 22
          </span>
        </button>
      </div>

      {/* 3. Section Subheader with Category, Total Count and Shuffle */}
      <div className="w-full flex items-end justify-between pt-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
            {activeDay === 'day2' ? 'INTERCESSION' : activeDay === 'day1' ? 'CONSECRATION' : 'REVIVAL RELEASE'}
          </span>
          <span className="text-xs font-bold text-white mt-0.5">
            {getDayLabel()}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            {filteredSongs.length} songs &bull; 30:58 total
          </span>
        </div>

        <button
          type="button"
          onClick={handleShuffle}
          className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer pb-0.5"
        >
          <Shuffle size={13} />
          <span>Shuffle</span>
        </button>
      </div>

      {/* 4. Scrollable Song List Items */}
      <div className="w-full flex flex-col space-y-2 pt-1">
        {filteredSongs.map((song) => {
          const isThisPlaying = nowPlayingSong?.id === song.id && isPlaying;

          return (
            <div
              key={song.id}
              onClick={() => handlePlayToggle(song)}
              className="w-full rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
              style={{
                background: '#101726',
                border: nowPlayingSong?.id === song.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
              }}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: nowPlayingSong?.id === song.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: nowPlayingSong?.id === song.id ? '#38BDF8' : '#94A3B8'
                  }}
                >
                  <Music size={16} />
                </div>

                <div className="flex flex-col overflow-hidden">
                  <span className={`text-xs font-bold truncate ${nowPlayingSong?.id === song.id ? 'text-sky-400' : 'text-white'}`}>
                    {song.title}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate mt-0.5">
                    {song.sub} &bull; {song.key}
                  </span>
                </div>
              </div>

              {/* Right: Duration & Category Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-slate-400">
                  {song.time.includes('AM') || song.time.includes('PM') ? '5:12' : song.time}
                </span>

                <span 
                  className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: '#CBD5E1',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {song.category.split(' ')[0]}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSong(song);
                  }}
                  className="p-1 text-slate-500 hover:text-white"
                  title="View lyrics"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Docked Bottom "NOW PLAYING" Panel (Matching Reference Screen 3) */}
      {nowPlayingSong && (
        <div 
          className="fixed bottom-16 md:bottom-5 left-0 right-0 z-30 max-w-md md:max-w-2xl mx-auto p-2"
        >
          <div 
            className="w-full rounded-2xl p-3 flex items-center justify-between shadow-2xl"
            style={{
              background: '#0D1629',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)'
            }}
          >
            <div 
              className="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer"
              onClick={() => setSelectedSong(nowPlayingSong)}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}
              >
                <Volume2 size={16} className={isPlaying ? 'animate-pulse' : ''} />
              </div>

              <div className="flex flex-col overflow-hidden">
                <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider">
                  Now Playing
                </span>
                <span className="text-xs font-bold text-white truncate leading-tight">
                  {nowPlayingSong.title}
                </span>
                <span className="text-[9.5px] text-slate-400 truncate leading-none mt-0.5">
                  {nowPlayingSong.sub} &bull; {nowPlayingSong.key}
                </span>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                type="button"
                onClick={handlePrevSong}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer active:scale-95"
                aria-label="Previous song"
              >
                <SkipBack size={16} />
              </button>

              <button
                type="button"
                onClick={() => handlePlayToggle()}
                className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                style={{
                  background: '#0284C7',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 10px rgba(2, 132, 199, 0.5)'
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleNextSong}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer active:scale-95"
                aria-label="Next song"
              >
                <SkipForward size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Full Lyrics Modal */}
      {selectedSong && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" 
          style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div 
            className="w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col p-4 space-y-3 overflow-hidden" 
            style={{ 
              background: '#0E172C', 
              border: '1px solid rgba(56, 189, 248, 0.25)', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)' 
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
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
                className="p-1.5 rounded-full text-slate-400 hover:text-white cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Lyrics Content */}
            <div className="flex-1 overflow-y-auto pr-1 text-xs leading-relaxed text-slate-200 whitespace-pre-line select-text">
              {selectedSong.lyrics || selectedSong.teluguLyrics || "Lyrics for this praise song will be displayed here during live worship."}
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
