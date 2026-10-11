// src/components/UpdateModal.tsx
// High-End RRBM Branded APK Update Dialog (Optional Updates, Mandatory Force Updates, Download Progress & Verification)

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  FileCode, 
  Cpu, 
  Calendar,
  ExternalLink
} from 'lucide-react';
import { appUpdateManager } from '../services/appUpdateManager';
import { UpdateInfo } from '../types/update';
import { APP_VERSION } from '../config/appVersion';

export const UpdateModal: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>(() => appUpdateManager.getUpdateInfo());

  useEffect(() => {
    const unsubscribe = appUpdateManager.subscribe(() => {
      setUpdateInfo(appUpdateManager.getUpdateInfo());
    });
    return unsubscribe;
  }, []);

  const { state, manifest, progress, errorMessage, isMandatory, isManualCheck } = updateInfo;

  // Render nothing if IDLE or background check with no update
  if (state === 'IDLE') return null;
  if (state === 'NO_UPDATE' && !isManualCheck) return null;

  const formatMB = (bytes: number) => {
    if (!bytes) return '0.0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none"
      onClick={(e) => {
        // Only allow clicking backdrop to dismiss if optional and in non-downloading state
        if (!isMandatory && state !== 'DOWNLOADING' && state !== 'VERIFYING' && e.target === e.currentTarget) {
          appUpdateManager.dismissOptionalUpdate();
        }
      }}
    >
      <div className="w-full max-w-sm bg-[#101c36] border border-sky-500/35 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-left animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-[#0c152a] border-b border-sky-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isMandatory
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
            }`}>
              {isMandatory ? <AlertTriangle size={18} /> : <Sparkles size={18} className="text-amber-400" />}
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                {isMandatory ? 'Mandatory App Update' : 'RRBM App Update'}
              </h3>
              <p className="text-[10px] text-sky-300/80 font-bold">
                Private Server Distribution
              </p>
            </div>
          </div>

          {!isMandatory && state !== 'DOWNLOADING' && state !== 'VERIFYING' && (
            <button
              type="button"
              onClick={() => appUpdateManager.dismissOptionalUpdate()}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Body Content Based on State */}
        <div className="p-5 space-y-4">
          {/* 1. CHECKING STATE (Manual trigger) */}
          {state === 'CHECKING' && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw size={32} className="text-sky-400 animate-spin" />
              <p className="text-xs font-bold text-white">
                Checking for newer RRBM Android releases...
              </p>
              <span className="text-[10px] text-slate-400 font-mono">
                Current: v{APP_VERSION.versionName} (Build {APP_VERSION.versionCode})
              </span>
            </div>
          )}

          {/* 2. NO UPDATE AVAILABLE (Manual trigger) */}
          {state === 'NO_UPDATE' && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  You Are on the Latest Version
                </h4>
                <p className="text-xs text-sky-200 mt-0.5">
                  RRBM Android v{APP_VERSION.versionName} (Build {APP_VERSION.versionCode})
                </p>
              </div>
              <p className="text-[10.5px] text-slate-400">
                Your application has all the latest worship tracks, alert capabilities, and security fixes.
              </p>

              <button
                type="button"
                onClick={() => appUpdateManager.resetState()}
                className="w-full py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer transition-all mt-2"
              >
                GOT IT
              </button>
            </div>
          )}

          {/* 3. UPDATE AVAILABLE & FORCE UPDATE */}
          {(state === 'UPDATE_AVAILABLE' || state === 'FORCE_UPDATE') && manifest && (
            <div className="space-y-3">
              {/* Version pill */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0c152a] border border-sky-500/25">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    New Version Available
                  </span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    v{manifest.latestVersionName} <span className="text-xs text-sky-300">(Build {manifest.latestVersionCode})</span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Package Size
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {formatMB(manifest.apkSize)}
                  </span>
                </div>
              </div>

              {/* Release Date */}
              {manifest.releaseDate && (
                <div className="flex items-center gap-1.5 text-[10.5px] text-sky-300 font-medium">
                  <Calendar size={12} className="text-sky-400" />
                  <span>Release Date: {manifest.releaseDate}</span>
                </div>
              )}

              {/* What's New Release Notes */}
              {manifest.releaseNotes && manifest.releaseNotes.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#0c152a] border border-sky-500/20 space-y-1.5">
                  <span className="text-[10.5px] font-black uppercase text-sky-300 tracking-wider block">
                    What's New in this Release:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-200">
                    {manifest.releaseNotes.map((note, index) => (
                      <li key={index} className="flex items-start gap-1.5 text-[11px] leading-tight">
                        <span className="text-amber-400 font-black">&bull;</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Security Checksum Note */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <ShieldCheck size={13} className="text-emerald-400 flex-shrink-0" />
                <span>SHA-256 verified from official RRBM private server</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => appUpdateManager.startDownloadAndInstall()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Download size={15} />
                  <span>UPDATE NOW</span>
                </button>

                {!isMandatory && (
                  <button
                    type="button"
                    onClick={() => appUpdateManager.dismissOptionalUpdate()}
                    className="w-full py-2.5 rounded-2xl bg-[#0c152a] hover:bg-[#152342] text-slate-300 hover:text-white font-bold text-xs uppercase transition-all cursor-pointer"
                  >
                    LATER
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4. DOWNLOADING STATE (Live Progress Bar) */}
          {state === 'DOWNLOADING' && (
            <div className="py-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Download size={14} className="text-sky-400 animate-bounce" />
                  Downloading Update...
                </span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {progress.percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-[#0c152a] border border-sky-500/30 overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-400 shadow-[0_0_10px_#38bdf8] transition-all duration-150"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              {/* Byte Counters & Speed */}
              <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
                <span>{formatMB(progress.loadedBytes)} / {formatMB(progress.totalBytes)}</span>
                {progress.speedFormatted && (
                  <span className="text-sky-300 font-semibold">{progress.speedFormatted}</span>
                )}
              </div>

              <p className="text-[10.5px] text-slate-400 text-center italic">
                Please keep the application open during download.
              </p>

              {!isMandatory && (
                <button
                  type="button"
                  onClick={() => appUpdateManager.cancelDownload()}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer transition-all mt-1"
                >
                  CANCEL
                </button>
              )}
            </div>
          )}

          {/* 5. VERIFYING STATE */}
          {state === 'VERIFYING' && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw size={28} className="text-amber-400 animate-spin" />
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wide">
                  Verifying APK Integrity...
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Computing SHA-256 cryptographic checksum against private server manifest.
                </p>
              </div>
            </div>
          )}

          {/* 6. READY TO INSTALL / INSTALLING */}
          {(state === 'READY_TO_INSTALL' || state === 'INSTALLING') && (
            <div className="py-3 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shadow-lg">
                <ShieldCheck size={26} className="text-sky-300" />
              </div>

              <div>
                <h4 className="text-sm font-black text-white">
                  Update Downloaded & Verified!
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Launching the Android package installer.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#0c152a] border border-amber-500/25 text-[11px] text-amber-200/90 text-left space-y-1">
                <span className="font-bold text-amber-300 block">Android Installation Note:</span>
                <p>If prompted by your device, tap <strong>Settings</strong> and allow <em>"Install unknown apps"</em> to complete the upgrade.</p>
              </div>

              <button
                type="button"
                onClick={() => appUpdateManager.startDownloadAndInstall()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>OPEN INSTALLER</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* 7. FAILED STATE */}
          {state === 'FAILED' && (
            <div className="py-2 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg">
                <AlertTriangle size={24} />
              </div>

              <div>
                <h4 className="text-sm font-black text-white">
                  Update Issue
                </h4>
                <p className="text-xs text-rose-300 mt-1 font-medium max-w-xs">
                  {errorMessage || 'Unable to complete update download or integrity check.'}
                </p>
              </div>

              <div className="w-full pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => appUpdateManager.checkForUpdates(true)}
                  className="w-full py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={14} />
                  <span>RETRY UPDATE</span>
                </button>

                {!isMandatory && (
                  <button
                    type="button"
                    onClick={() => appUpdateManager.resetState()}
                    className="w-full py-2 rounded-xl bg-[#0c152a] hover:bg-[#152342] text-slate-300 font-bold text-xs uppercase transition-all cursor-pointer"
                  >
                    DISMISS
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
