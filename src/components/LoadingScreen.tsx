import React, { useEffect, useState } from 'react';
import rrbLogo from '../assets/rrb_logo.png';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [isFading, setIsFading] = useState<boolean>(false);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 1200; // 1.2s snappy load

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const calculated = Math.min(100, Math.floor((elapsed / duration) * 100));
      
      setProgress(calculated);

      if (calculated >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFading(true);
          setTimeout(() => {
            onComplete();
          }, 300);
        }, 150);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div 
      className={`loading-screen fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300 ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundColor: '#060B19',
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >
      {/* Brand Container with Official Logo */}
      <div className="flex flex-col items-center relative z-10 px-6 py-8 rounded-3xl clean-card max-w-xs w-full text-center mx-4" style={{ background: 'linear-gradient(180deg, #0E1A38 0%, #081022 100%)', border: '1px solid rgba(245, 158, 11, 0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
        {/* Official RRBM Logo Badge */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-3 p-1 overflow-hidden" style={{ background: 'rgba(6, 11, 25, 0.7)', border: '1px solid rgba(245, 158, 11, 0.35)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
          <img 
            src={rrbLogo} 
            alt="RRBM Logo" 
            className="w-full h-full object-contain rounded-xl"
          />
        </div>

        {/* Clean Modern Title */}
        <h1 className="text-2xl font-black text-white tracking-tight">
          RRBM
        </h1>

        <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mt-0.5 mb-5">
          Revival for Re-Built Ministries
        </p>

        {/* Sky Blue Loading Bar */}
        <div className="w-full h-2 bg-[#0c152a] rounded-full overflow-hidden relative border border-sky-500/30">
          <div 
            className="h-full bg-sky-400 rounded-full transition-all duration-75 ease-out shadow-[0_0_10px_#38bdf8]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status Text */}
        <div className="w-full flex items-center justify-between mt-3 text-[11px] font-bold text-slate-400">
          <span>Fasting Prayers 2026</span>
          <span className="font-black text-sky-400">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
