// src/screens/MoneyJarScreen.tsx
// Authoritative Money Jar Screen - Matching Revival Fast 2026 Reference Specification
// Live Realtime Offering Balance, Manager Desk Access, and Luke 6:38 Scripture

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, Lock, Info, BookOpen } from 'lucide-react';
import offeringRainImg from '../assets/offering_rain_hands.jpg';
import { realtimeStore } from '../services/realtimeStore';
import { ManagerModal } from '../components/ManagerModal';

export const MoneyJarScreen: React.FC = () => {
  const [showBalance, setShowBalance] = useState<boolean>(false);
  const [offeringBalance, setOfferingBalance] = useState(() => realtimeStore.getOfferingBalance());
  const [isManagerOpen, setIsManagerOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = realtimeStore.subscribe(() => {
      setOfferingBalance(realtimeStore.getOfferingBalance());
    });
    return unsubscribe;
  }, []);

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(offeringBalance.amount);

  return (
    <div className="money-jar-screen flex flex-col w-full space-y-4 pb-4 select-none max-w-3xl mx-auto">
      {/* 1. Header with Screen Title & Manager View Pill */}
      <div className="w-full flex items-start justify-between pt-1">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
            Fasting offering - Revival Fast 2026
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Money Jar
          </h1>
        </div>

        {/* Manager View Access Button */}
        <button
          type="button"
          onClick={() => setIsManagerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all active:scale-95"
          style={{
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            color: '#38BDF8'
          }}
          aria-label="Manager view"
        >
          <Lock size={12} className="text-sky-400" />
          <span>Manager view</span>
        </button>
      </div>

      {/* 2. Visual Offering Hero Card with Rain Hands Photograph */}
      <div 
        className="w-full rounded-2xl overflow-hidden flex flex-col items-center text-center p-3.5 space-y-3"
        style={{
          background: '#101726',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
        }}
      >
        <div 
          className="w-full rounded-xl overflow-hidden relative shadow-inner"
          style={{ height: '220px', minHeight: '220px', maxHeight: '220px' }}
        >
          <img
            src={offeringRainImg}
            alt="Fasting offering hands"
            className="w-full h-full object-cover select-none pointer-events-none"
            loading="eager"
          />
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{
              background: 'linear-gradient(180deg, transparent 60%, rgba(16, 23, 38, 0.8) 100%)'
            }}
          />
        </div>

        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-slate-200">
            Offering collected so far
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Updated by the finance desk at 6:12 PM
          </span>
        </div>
      </div>

      {/* 3. Current Balance Card with Toggle & Information Callout */}
      <div 
        className="w-full rounded-2xl p-4 flex flex-col space-y-3.5"
        style={{
          background: '#101726',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">
            Current balance
          </span>

          <button
            type="button"
            onClick={() => setShowBalance((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer transition-colors"
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
          >
            {showBalance ? (
              <>
                <EyeOff size={14} />
                <span>Hide balance</span>
              </>
            ) : (
              <>
                <Eye size={14} />
                <span>Show balance</span>
              </>
            )}
          </button>
        </div>

        {/* Currency Display */}
        <div className="flex items-baseline gap-1 py-1">
          <span className="text-3xl font-black text-white font-mono tracking-tight">
            {showBalance ? formattedBalance : '₹ •••••'}
          </span>
        </div>

        <span className="text-[11px] text-slate-400 leading-snug">
          Only authorized managers can view the balance.
        </span>

        {/* Info Callout Box */}
        <div 
          className="w-full p-3 rounded-xl flex items-start gap-2.5"
          style={{
            background: 'rgba(6, 11, 24, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <Info size={15} className="text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Giving is handled at the finance desk. This screen only shows the balance.
          </p>
        </div>
      </div>

      {/* 4. Scripture Verse: Luke 6:38 */}
      <div 
        className="w-full rounded-2xl p-3.5 flex flex-col space-y-1.5"
        style={{
          background: 'rgba(16, 23, 38, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <div className="flex items-center gap-1.5 text-amber-400/90 text-xs font-black tracking-widest uppercase">
          <BookOpen size={13} />
          <span>LUKE 6:38</span>
        </div>

        <p className="text-xs font-semibold text-slate-200 italic leading-relaxed">
          “Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap.”
        </p>

        <p className="text-[11px] font-medium text-sky-200/90 leading-relaxed">
          “ఇయ్యుడి, అప్పుడు మీకియ్యబడును; కుదిలించి, దట్టముగా నింపి పొర్లెడు మంచి పరిమాణమును మనుష్యులు మీ ఒడిలో పోయుదురు.”
        </p>
      </div>

      {/* Manager Access Modal */}
      {isManagerOpen && (
        <ManagerModal isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
      )}
    </div>
  );
};

export default MoneyJarScreen;
