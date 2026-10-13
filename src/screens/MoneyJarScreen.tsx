// src/screens/MoneyJarScreen.tsx
// Blessings & Festival Money Jar Screen
// Displays Real-time Balance at the top and Spent Money (Expenditures) List

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, BookOpen, Calendar, Receipt, TrendingDown } from 'lucide-react';
import { realtimeStore } from '../services/realtimeStore';
import { ManagerModal } from '../components/ManagerModal';
import { Expenditure } from '../types/volunteer';

export const MoneyJarScreen: React.FC = () => {
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [offeringBalance, setOfferingBalance] = useState(() => realtimeStore.getOfferingBalance());
  const [expenditures, setExpenditures] = useState<Expenditure[]>(() => realtimeStore.getExpenditures());
  const [isManagerOpen, setIsManagerOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = realtimeStore.subscribe(() => {
      setOfferingBalance(realtimeStore.getOfferingBalance());
      setExpenditures(realtimeStore.getExpenditures());
    });
    return unsubscribe;
  }, []);

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(offeringBalance.amount);

  const totalSpent = expenditures.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const formattedTotalSpent = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(totalSpent);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="money-jar-screen flex flex-col w-full space-y-4 pb-6 select-none max-w-3xl mx-auto">
      {/* 1. Header with Title & Manager View Pill */}
      <div className="w-full flex items-start justify-between pt-1">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-sky-400 tracking-wider uppercase">
            Blessings & Offerings
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Money Jar
          </h1>
        </div>

        {/* Manager View Access Button */}
        <button
          type="button"
          onClick={() => setIsManagerOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(30, 64, 175, 0.3))',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#38BDF8'
          }}
          aria-label="Manager view"
        >
          <Lock size={12} className="text-sky-400" />
          <span>Manager view</span>
        </button>
      </div>

      {/* 2. Current Balance Card at the top */}
      <div 
        className="w-full rounded-2xl p-5 flex flex-col space-y-3.5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0e1726 0%, #0b1120 100%)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Current Available Balance
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowBalance((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer transition-colors px-2.5 py-1 rounded-lg bg-sky-950/40 border border-sky-800/40"
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
          >
            {showBalance ? (
              <>
                <EyeOff size={13} />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye size={13} />
                <span>Show</span>
              </>
            )}
          </button>
        </div>

        {/* Currency Display */}
        <div className="flex items-baseline gap-2 py-1">
          <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 font-mono tracking-tight">
            {showBalance ? formattedBalance : '₹ •••••••'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
          <span>Updated by {offeringBalance.updatedBy || 'Finance Desk'}</span>
          <span className="text-rose-400 font-medium flex items-center gap-1">
            <TrendingDown size={12} />
            Total Spent: {formattedTotalSpent}
          </span>
        </div>
      </div>

      {/* 3. Spent Money List */}
      <div 
        className="w-full rounded-2xl p-4 sm:p-5 flex flex-col space-y-3.5"
        style={{
          background: '#0d1322',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Receipt size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Spent Money List
              </h2>
              <p className="text-[11px] text-slate-400">
                Festival and church expenses log
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60">
            {expenditures.length} {expenditures.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {expenditures.length === 0 ? (
          <div className="w-full py-8 text-center flex flex-col items-center justify-center text-slate-400 space-y-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
            <Receipt size={28} className="text-slate-600" />
            <p className="text-xs">No expenditure records added yet.</p>
            <p className="text-[10px] text-slate-500">Expenses can be recorded via the Management Desk.</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-2.5">
            {expenditures.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl transition-all"
                style={{
                  background: 'rgba(17, 24, 39, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div className="flex flex-col space-y-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded-md">
                      <Calendar size={10} />
                      {formatDate(item.date)}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-100 truncate">
                    {item.purpose}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm sm:text-base font-bold font-mono text-rose-400 flex items-center justify-end">
                    - ₹{Number(item.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spent Money Total Row */}
        {expenditures.length > 0 && (
          <div 
            className="flex items-center justify-between p-3 rounded-xl mt-1"
            style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.2)'
            }}
          >
            <span className="text-xs font-semibold text-slate-300">Total Money Spent</span>
            <span className="text-sm font-bold font-mono text-rose-300">
              {formattedTotalSpent}
            </span>
          </div>
        )}
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
