// src/components/SongLyricsModal.tsx
// Interactive Full-Screen Worship Lyrics Reader with Zoom, Copy, and English/Telugu Transliteration

import React, { useState } from 'react';
import { X, Copy, Check, ZoomIn, ZoomOut, BookOpen, Music, Sparkles } from 'lucide-react';
import { SongItem } from '../data/songsData';

interface SongLyricsModalProps {
  song: SongItem | null;
  onClose: () => void;
}

export const SongLyricsModal: React.FC<SongLyricsModalProps> = ({ song, onClose }) => {
  const [fontSize, setFontSize] = useState<number>(14);
  const [activeLanguage, setActiveLanguage] = useState<'english' | 'telugu'>('english');
  const [copied, setCopied] = useState<boolean>(false);

  if (!song) return null;

  const handleCopy = () => {
    const textToCopy = `${song.title}\n${song.sub}\nKey: ${song.key} | Tempo: ${song.tempo}\n\n${
      activeLanguage === 'english' ? song.lyrics : song.teluguLyrics || song.lyrics
    }`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 select-none">
      <div className="w-full max-w-md bg-[#0c152a] border border-sky-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[#101c36] border-b border-sky-500/20 flex items-start justify-between">
          <div className="flex items-start gap-2.5 text-left pr-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Music size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                {song.category} &bull; {song.time}
              </span>
              <h3 
                className="text-base font-black text-white leading-tight mt-1 font-nats"
                style={{ fontFamily: "'NATS', 'Nats', 'Noto Sans Telugu', sans-serif" }}
              >
                {song.title}
              </h3>
              <p className="text-[11px] text-sky-200/80 font-medium">
                {song.sub}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Worship Controls Bar */}
        <div className="px-4 py-2 bg-[#09101f] border-b border-sky-500/15 flex items-center justify-between text-xs">
          {/* Key & Tempo Badges */}
          <div className="flex items-center gap-1.5 text-[10.5px] font-mono font-bold text-sky-300">
            <span className="bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-500/25">Key: {song.key}</span>
            <span className="bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-500/25">{song.tempo}</span>
          </div>

          {/* Zoom & Copy Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFontSize(prev => Math.max(12, prev - 1))}
              className="p-1.5 rounded-lg bg-[#101c36] hover:bg-[#152447] text-slate-300 border border-sky-500/20"
              title="Decrease Font Size"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={() => setFontSize(prev => Math.min(22, prev + 1))}
              className="p-1.5 rounded-lg bg-[#101c36] hover:bg-[#152447] text-slate-300 border border-sky-500/20"
              title="Increase Font Size"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-[#101c36] hover:bg-sky-500 text-slate-300 hover:text-slate-950 border border-sky-500/20 transition-all cursor-pointer flex items-center gap-1 font-bold text-[10px]"
              title="Copy Lyrics"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
        </div>

        {/* Language Switcher if Telugu Available */}
        {song.teluguLyrics && (
          <div className="p-2 bg-[#0c152a] flex items-center justify-center gap-2 border-b border-sky-500/10">
            <button
              type="button"
              onClick={() => setActiveLanguage('english')}
              className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition-all cursor-pointer ${
                activeLanguage === 'english'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'bg-[#101c36] text-slate-400 hover:text-white'
              }`}
            >
              English Lyrics
            </button>
            <button
              type="button"
              onClick={() => setActiveLanguage('telugu')}
              className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition-all cursor-pointer ${
                activeLanguage === 'telugu'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-[#101c36] text-slate-400 hover:text-white'
              }`}
            >
              తెలుగు కీర్తన (Telugu)
            </button>
          </div>
        )}

        {/* Scrollable Lyrics View */}
        <div className="p-4 flex-1 overflow-y-auto text-left space-y-4">
          {/* Scripture Quote */}
          {song.themeVerse && (
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-200/90 italic flex items-start gap-1.5">
              <Sparkles size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{song.themeVerse}</span>
            </div>
          )}

          {/* Formatted Lyrics Text */}
          <div
            className="whitespace-pre-wrap leading-relaxed text-slate-100 font-nats font-medium select-text"
            style={{ 
              fontSize: `${fontSize}px`,
              fontFamily: "'NATS', 'Nats', 'Noto Sans Telugu', sans-serif",
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.8
            }}
          >
            {activeLanguage === 'english' ? song.lyrics : (song.teluguLyrics || song.lyrics)}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#101c36] border-t border-sky-500/20 text-center">
          <span className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
            <BookOpen size={11} className="text-sky-400" />
            <span>RRBM Fasting Worship &bull; October 20, 21, 22, 2026</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SongLyricsModal;
