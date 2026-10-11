// src/screens/BlessingsScreen.tsx
// Authoritative Blessings & Offerings Screen with Integrated 3D Money Jar, Live Realtime Balance, Luke 6:38, and Manager Desk Access

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Sparkles, Heart, Shield, RefreshCw, Lock } from 'lucide-react';
import moneyJarImg from '../assets/money_jar_3d.png';
import { realtimeStore } from '../services/realtimeStore';
import { ManagerModal } from '../components/ManagerModal';

export const BlessingsScreen: React.FC = () => {
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
    <div className="blessings-screen flex flex-col items-center w-full space-y-3 pb-2">
      {/* 1. Header Section */}
      <div className="w-full text-center pt-0.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-1" style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <Sparkles size={13} className="text-amber-400 animate-pulse" />
          <span className="text-[11px] font-bold text-amber-300">
            Fasting & Blessing Offerings 2026
          </span>
        </div>
      </div>

      {/* 2. Centered 3D Money Jar Feature (Responsive & Borderless) */}
      <div className="w-full flex flex-col items-center justify-center relative py-1">
        <div className="relative flex items-center justify-center">
          {/* Subtle Ambient Radial Glow */}
          <div 
            className="absolute w-44 h-44 rounded-full pointer-events-none" 
            style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, rgba(56, 189, 248, 0.1) 50%, transparent 70%)' }} 
          />
          
          <img
            src={moneyJarImg}
            alt="RRBM 3D Blessings Jar"
            className="w-40 h-40 sm:w-48 sm:h-48 object-contain select-none pointer-events-none transition-transform duration-300"
            style={{ filter: 'drop-shadow(0 14px 24px rgba(0,0,0,0.65))' }}
          />
        </div>

        {/* 3. Offering Balance Box with Eye Toggle Button */}
        <div className="mt-3 w-full max-w-xs clean-card p-3 flex items-center justify-between" style={{ background: 'rgba(14, 23, 44, 0.9)', border: '1px solid rgba(245, 158, 11, 0.3)', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Offering
            </span>
            <span className="text-lg font-black text-amber-400 font-mono tracking-wider">
              {showBalance ? formattedBalance : '₹ ••••••'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowBalance((prev) => !prev)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
            style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)' }}
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? (
              <>
                <EyeOff size={14} />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye size={14} />
                <span>Reveal</span>
              </>
            )}
          </button>
        </div>

        <span className="text-[9.5px] text-slate-400 mt-1.5">
          Live synchronized with festival desk
        </span>
      </div>

      {/* 4. Scripture Verse: Luke 6:38 in English & Telugu */}
      <div className="w-full clean-card p-3.5 text-center flex flex-col items-center space-y-1.5" style={{ background: 'linear-gradient(180deg, #0E1A38 0%, #081022 100%)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
            Luke 6:38
          </span>
        </div>

        {/* English Verse */}
        <p className="text-sm font-bold text-white tracking-wide italic leading-snug">
          “Give, and it will be given to you.”
        </p>

        {/* Telugu Verse */}
        <p className="text-xs font-semibold text-sky-200 leading-normal">
          “ఇయ్యుడి, అప్పుడు మీకియ్యబడును.”
        </p>
      </div>

      {/* 5. Festival Manager Desk Trigger */}
      <div className="w-full flex justify-center pt-1">
        <button
          type="button"
          onClick={() => setIsManagerOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-colors"
          style={{ background: 'rgba(14, 23, 44, 0.5)', border: '1px solid rgba(56, 189, 248, 0.1)' }}
        >
          <Lock size={12} className="text-amber-400" />
          <span>Management Desk (PIN 7986)</span>
        </button>
      </div>

      {/* Manager PIN Modal */}
      {isManagerOpen && (
        <ManagerModal isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
      )}
    </div>
  );
};

export default BlessingsScreen;
