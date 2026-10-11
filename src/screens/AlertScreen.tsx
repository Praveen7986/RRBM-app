// src/screens/AlertScreen.tsx
// Critical Leader Alert, One-Tap Broadcast, Quick Responses & Live Coordination Chat
// Supports Free Cloud Synchronization (Internet-Wide Firebase) and Direct Server Architecture

import React, { useState, useEffect, useRef } from 'react';
import { realtimeStore } from '../services/realtimeStore';
import { Volunteer, ChatMessage, AlertEvent, ConnectionStatus } from '../types/volunteer';
import { requestNotificationPermission } from '../services/audioNotification';
import { getServerBaseUrl, resetCustomServerUrl } from '../services/api';
import { 
  getActiveFirebaseConfig, 
  saveCustomFirebaseConfig, 
  clearCustomFirebaseConfig, 
  isFirebaseConfigured 
} from '../config/firebase';
import { 
  Radio, 
  Send, 
  User, 
  LogOut, 
  AlertTriangle,
  MessageSquare,
  Server,
  Cloud,
  WifiOff,
  RefreshCw,
  Settings,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

export const AlertScreen: React.FC = () => {
  const [currentVolunteer, setCurrentVolunteer] = useState<Volunteer | null>(() => realtimeStore.getCurrentVolunteer());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => realtimeStore.getChatMessages());
  const [activeAlert, setActiveAlert] = useState<AlertEvent | null>(() => realtimeStore.getActiveAlert());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => realtimeStore.getConnectionStatus());

  const [volunteerIdInput, setVolunteerIdInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [isAlertBroadcasting, setIsAlertBroadcasting] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [userSelectedResponse, setUserSelectedResponse] = useState<string | null>(null);

  // Status feedback toast
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cloud & Server Settings Modal State
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(() => getServerBaseUrl());
  const [syncModeTab, setSyncModeTab] = useState<'cloud' | 'server'>(() => isFirebaseConfigured() ? 'cloud' : 'server');
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // Firebase Inputs
  const [fbApiKey, setFbApiKey] = useState<string>(() => getActiveFirebaseConfig().apiKey || '');
  const [fbProjectId, setFbProjectId] = useState<string>(() => getActiveFirebaseConfig().projectId || '');
  const [fbAppId, setFbAppId] = useState<string>(() => getActiveFirebaseConfig().appId || '');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setStatusFeedback({ type, message });
    setTimeout(() => {
      setStatusFeedback(null);
    }, 4000);
  };

  useEffect(() => {
    const unsubscribe = realtimeStore.subscribe(() => {
      setCurrentVolunteer(realtimeStore.getCurrentVolunteer());
      setChatMessages(realtimeStore.getChatMessages());
      setActiveAlert(realtimeStore.getActiveAlert());
      setConnectionStatus(realtimeStore.getConnectionStatus());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeAlert]);

  // Check volunteer response
  useEffect(() => {
    if (activeAlert && currentVolunteer) {
      if (activeAlert.responses?.coming?.includes(currentVolunteer.id)) {
        setUserSelectedResponse('coming');
      } else if (activeAlert.responses?.coming_late?.includes(currentVolunteer.id)) {
        setUserSelectedResponse('coming_late');
      } else if (activeAlert.responses?.not_coming?.includes(currentVolunteer.id)) {
        setUserSelectedResponse('not_coming');
      } else {
        setUserSelectedResponse(null);
      }
    } else {
      setUserSelectedResponse(null);
    }
  }, [activeAlert, currentVolunteer]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = volunteerIdInput.trim();
    const pwd = passwordInput.trim();
    if (!id || !pwd || isSigningIn) return;

    setIsSigningIn(true);
    setLoginError('');
    setStatusFeedback(null);
    await requestNotificationPermission();
    try {
      await realtimeStore.signInVolunteer(id, pwd);
      setVolunteerIdInput('');
      setPasswordInput('');
      showToast('success', 'Signed in successfully! Welcome to RRBM Coordination.');
    } catch (err: any) {
      const msg = err.message || 'Invalid Volunteer ID or password.';
      setLoginError(msg);
      showToast('error', msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleOneTapAlert = async () => {
    if (isAlertBroadcasting) return;
    setIsAlertBroadcasting(true);
    setStatusFeedback(null);

    try {
      await realtimeStore.triggerImmediateAlert();
      showToast('success', '🚨 Alert broadcasted to all registered volunteers!');
    } catch (err: any) {
      showToast('error', err.message || 'Alert failed to reach server. Please check connection.');
    } finally {
      setTimeout(() => {
        setIsAlertBroadcasting(false);
      }, 3000);
    }
  };

  const handleQuickResponse = async (type: 'coming' | 'coming_late' | 'not_coming') => {
    setUserSelectedResponse(type);
    try {
      await realtimeStore.sendQuickResponse(type);
    } catch (err: any) {
      showToast('error', err.message || 'Could not send response. Retrying...');
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingMessage) return;

    const text = chatInput.trim();
    setIsSendingMessage(true);
    try {
      await realtimeStore.sendChatMessage(text);
      setChatInput('');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send message. Check internet connection.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSaveFirebaseConfig = async () => {
    if (!fbProjectId.trim() || !fbApiKey.trim()) {
      showToast('error', 'Project ID and API Key are required for Cloud Firebase.');
      return;
    }

    setIsReconnecting(true);
    try {
      saveCustomFirebaseConfig({
        projectId: fbProjectId.trim(),
        apiKey: fbApiKey.trim(),
        appId: fbAppId.trim() || '1:123456789:android:app',
        authDomain: `${fbProjectId.trim()}.firebaseapp.com`,
        messagingSenderId: '123456789'
      });
      realtimeStore.reconnectWithServer();
      showToast('success', 'Connected to Free Cloud Firebase!');
      setTimeout(() => {
        setIsReconnecting(false);
        setShowServerModal(false);
      }, 1000);
    } catch {
      setIsReconnecting(false);
    }
  };

  const isUsingCloud = realtimeStore.isUsingCloud();

  // Volunteer Sign-In View if not registered
  if (!currentVolunteer) {
    return (
      <div className="alert-screen flex flex-col items-center justify-center w-full space-y-4 py-8">
        {/* Status Toast */}
        {statusFeedback && (
          <div className={`w-full p-2.5 rounded-xl text-xs flex items-center gap-2 ${
            statusFeedback.type === 'success' 
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
          }`}>
            {statusFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusFeedback.message}</span>
          </div>
        )}

        <div className="w-full clean-card p-5 text-center flex flex-col items-center space-y-3.5" style={{ background: 'linear-gradient(180deg, #0E1A38 0%, #081022 100%)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <ShieldCheck size={28} className="text-sky-400" />
          </div>

          <div>
            <h2 className="text-lg font-black text-white tracking-wide">Volunteer Sign-In</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xs">
              Enter your assigned Volunteer ID & password to access leader alerts and live coordination chat
            </p>
          </div>

          {loginError && (
            <div className="w-full p-2.5 rounded-xl text-xs flex items-center gap-2 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-left">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="w-full space-y-3 pt-1">
            <div className="relative flex items-center">
              <div className="absolute left-3 text-sky-400 pointer-events-none">
                <User size={15} />
              </div>
              <input
                type="text"
                value={volunteerIdInput}
                onChange={(e) => {
                  setVolunteerIdInput(e.target.value);
                  if (loginError) setLoginError('');
                }}
                placeholder="Volunteer ID (e.g. 001, 002, 261)"
                className="w-full py-2.5 pl-9 pr-3.5 rounded-xl text-xs text-white placeholder-slate-400 outline-none font-mono"
                style={{ background: 'rgba(6, 11, 25, 0.7)', border: '1px solid rgba(56, 189, 248, 0.25)' }}
                autoCapitalize="none"
                required
              />
            </div>

            <div className="relative flex items-center">
              <div className="absolute left-3 text-sky-400 pointer-events-none">
                <Lock size={15} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (loginError) setLoginError('');
                }}
                placeholder="Password"
                className="w-full py-2.5 pl-9 pr-10 rounded-xl text-xs text-white placeholder-slate-400 outline-none"
                style={{ background: 'rgba(6, 11, 25, 0.7)', border: '1px solid rgba(56, 189, 248, 0.25)' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-white cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSigningIn}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)' }}
            >
              {isSigningIn ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In as Volunteer</span>
              )}
            </button>
          </form>

          <p className="text-[10px] text-slate-400 leading-tight pt-1">
            Accounts are provisioned by Festival Coordinators. Contact the desk if you need credentials.
          </p>

          {/* Cloud & Server Config Button in Check-In Screen */}
          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            className="flex items-center gap-1.5 text-[11px] text-sky-400 hover:text-sky-300 pt-1 cursor-pointer"
          >
            {isUsingCloud ? <Cloud size={12} /> : <Server size={12} />}
            <span>
              {isUsingCloud 
                ? 'Cloud Sync: Active (Internet-Wide)' 
                : connectionStatus === 'connected' 
                ? 'Server: Connected' 
                : 'Configure Cloud / Server'}
            </span>
          </button>
        </div>

        {/* Server Modal */}
        {showServerModal && renderServerModal()}
      </div>
    );
  }

  function renderServerModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.85)' }}>
        <div className="w-full max-w-sm clean-card p-4 space-y-3" style={{ background: '#0D162C', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Cloud size={18} className="text-sky-400" />
              <h3 className="text-sm font-bold text-white">Free Internet-Wide Sync</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowServerModal(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
            >
              ✕
            </button>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center justify-between text-xs p-2 rounded-xl" style={{ background: 'rgba(6, 11, 25, 0.7)' }}>
            <span className="text-slate-400">Status:</span>
            <span className={`font-bold flex items-center gap-1.5 ${
              connectionStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`} />
              {isUsingCloud 
                ? 'Connected (Cloud Firebase)' 
                : connectionStatus === 'connected' 
                ? 'Connected (Server)' 
                : 'Connecting...'}
            </span>
          </div>

          {/* Sync Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#070D1D]">
            <button
              type="button"
              onClick={() => setSyncModeTab('cloud')}
              className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                syncModeTab === 'cloud' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              ☁️ Free Cloud (No Laptop)
            </button>
            <button
              type="button"
              onClick={() => setSyncModeTab('server')}
              className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                syncModeTab === 'server' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌐 Server URL / LAN
            </button>
          </div>

          {/* Tab 1: Free Cloud Firebase */}
          {syncModeTab === 'cloud' && (
            <div className="space-y-2 pt-1">
              <span className="text-[10.5px] text-slate-300 block leading-tight">
                Connects all volunteer phones across mobile data (4G/5G) and any Wi-Fi globally via Google Firebase (100% Free).
              </span>

              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block">Firebase Project ID</label>
                  <input
                    type="text"
                    value={fbProjectId}
                    onChange={(e) => setFbProjectId(e.target.value)}
                    placeholder="e.g. rrbm-festivals-2026"
                    className="w-full py-1.5 px-2.5 rounded-lg text-xs text-white placeholder-slate-600 font-mono outline-none"
                    style={{ background: '#070D1D', border: '1px solid rgba(56, 189, 248, 0.2)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block">Web API Key</label>
                  <input
                    type="text"
                    value={fbApiKey}
                    onChange={(e) => setFbApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full py-1.5 px-2.5 rounded-lg text-xs text-white placeholder-slate-600 font-mono outline-none"
                    style={{ background: '#070D1D', border: '1px solid rgba(56, 189, 248, 0.2)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block">App ID</label>
                  <input
                    type="text"
                    value={fbAppId}
                    onChange={(e) => setFbAppId(e.target.value)}
                    placeholder="1:123456789:android:..."
                    className="w-full py-1.5 px-2.5 rounded-lg text-xs text-white placeholder-slate-600 font-mono outline-none"
                    style={{ background: '#070D1D', border: '1px solid rgba(56, 189, 248, 0.2)' }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isReconnecting}
                  onClick={handleSaveFirebaseConfig}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}
                >
                  <RefreshCw size={12} className={isReconnecting ? 'animate-spin' : ''} />
                  <span>{isReconnecting ? 'Connecting...' : 'Connect to Free Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearCustomFirebaseConfig();
                    setFbProjectId('');
                    setFbApiKey('');
                    setFbAppId('');
                    realtimeStore.reconnectWithServer();
                  }}
                  className="py-2 px-3 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                  style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Server URL / LAN */}
          {syncModeTab === 'server' && (
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Backend Server Address
              </label>
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="http://192.168.55.102:3000"
                className="w-full py-2 px-3 rounded-xl text-xs text-white placeholder-slate-500 font-mono outline-none"
                style={{ background: '#070D1D', border: '1px solid rgba(56, 189, 248, 0.25)' }}
              />
              <span className="text-[10px] text-slate-400 block leading-tight">
                Connects directly to your Node.js server or cloud-deployed URL (Render/Railway).
              </span>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isReconnecting}
                  onClick={async () => {
                    setIsReconnecting(true);
                    clearCustomFirebaseConfig();
                    try {
                      realtimeStore.reconnectWithServer(serverUrlInput.trim());
                      setTimeout(() => {
                        setIsReconnecting(false);
                        setShowServerModal(false);
                      }, 1200);
                    } catch {
                      setIsReconnecting(false);
                    }
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}
                >
                  <RefreshCw size={12} className={isReconnecting ? 'animate-spin' : ''} />
                  <span>{isReconnecting ? 'Reconnecting...' : 'Save & Reconnect'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetCustomServerUrl();
                    setServerUrlInput(getServerBaseUrl());
                    realtimeStore.reconnectWithServer();
                  }}
                  className="py-2 px-3 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                  style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="alert-screen flex flex-col w-full space-y-2.5 pb-2">
      {/* 1. Header & Volunteer Identity Pill */}
      <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(14, 23, 44, 0.7)', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
            {currentVolunteer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white leading-tight">{currentVolunteer.name}</span>
            <span className="text-[9px] text-amber-400 font-mono">ID: {currentVolunteer.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Server Connection Badge (Clickable for Server Setup) */}
          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition-all active:scale-95"
            style={{
              background: connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: connectionStatus === 'connected' ? '#34D399' : '#F87171'
            }}
            title="Configure Server / Cloud Connection"
          >
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isUsingCloud ? '☁️ Cloud Live' : 'Sync Live'}</span>
              </>
            ) : (
              <>
                <WifiOff size={10} />
                <span>{connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}</span>
              </>
            )}
            <Settings size={9} className="opacity-70 ml-0.5" />
          </button>

          <button
            type="button"
            onClick={() => realtimeStore.signOutVolunteer()}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-400 cursor-pointer px-1.5 py-1"
          >
            <LogOut size={12} />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusFeedback && (
        <div className={`w-full p-2.5 rounded-xl text-xs flex items-center gap-2 ${
          statusFeedback.type === 'success' 
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
        }`}>
          {statusFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusFeedback.message}</span>
        </div>
      )}

      {/* 2. Primary 1-Tap Leader Alert Broadcast Button */}
      <div className="w-full clean-card p-3.5 flex flex-col items-center text-center space-y-2" style={{ background: 'linear-gradient(180deg, #121A30 0%, #0B1020 100%)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
        <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">
          Leader Global Broadcast Call
        </span>

        <button
          type="button"
          onClick={handleOneTapAlert}
          disabled={isAlertBroadcasting}
          className="relative group flex items-center justify-center cursor-pointer transition-all active:scale-95"
          style={{ outline: 'none' }}
        >
          {/* Pulsing ring */}
          <div 
            className="w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center shadow-lg transition-transform"
            style={{ 
              background: 'linear-gradient(135deg, #E11D48 0%, #9F1239 100%)',
              boxShadow: isAlertBroadcasting ? '0 0 25px rgba(225, 29, 72, 0.8)' : '0 4px 16px rgba(225, 29, 72, 0.4)'
            }}
          >
            <Radio size={32} className={`text-white ${isAlertBroadcasting ? 'animate-spin' : ''}`} />
          </div>
        </button>

        <span className="text-[10.5px] font-bold text-white">
          {isAlertBroadcasting ? 'Broadcasting Alert across All Phones...' : 'Tap to Trigger Volunteer Alert'}
        </span>
      </div>

      {/* 3. Active Alert Banner & Quick Response Buttons (When Alert Active) */}
      {activeAlert && (
        <div className="w-full clean-card p-3 flex flex-col space-y-2.5" style={{ background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.15) 0%, rgba(14, 23, 44, 0.95) 100%)', border: '1px solid rgba(225, 29, 72, 0.4)' }}>
          <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: 'rgba(225, 29, 72, 0.2)' }}>
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-rose-400 animate-pulse" />
              <span className="text-xs font-black text-rose-300 uppercase">
                Active Prayer Alert
              </span>
            </div>
            <span className="text-[9.5px] font-mono text-slate-300">
              {activeAlert.timeFormatted}
            </span>
          </div>

          <p className="text-xs font-bold text-white leading-snug">
            {activeAlert.message}
          </p>

          {/* Quick Response Buttons */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleQuickResponse('coming')}
              className={`py-1.5 px-1 rounded-xl text-center cursor-pointer transition-all active:scale-95 ${
                userSelectedResponse === 'coming' ? 'ring-2 ring-emerald-400' : ''
              }`}
              style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34D399' }}
            >
              <span className="text-[10px] font-extrabold block">I'M COMING</span>
              <span className="text-[9px] opacity-80 block">{activeAlert.responses?.coming?.length || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickResponse('coming_late')}
              className={`py-1.5 px-1 rounded-xl text-center cursor-pointer transition-all active:scale-95 ${
                userSelectedResponse === 'coming_late' ? 'ring-2 ring-amber-400' : ''
              }`}
              style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#FBBF24' }}
            >
              <span className="text-[10px] font-extrabold block">COMING LATE</span>
              <span className="text-[9px] opacity-80 block">{activeAlert.responses?.coming_late?.length || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickResponse('not_coming')}
              className={`py-1.5 px-1 rounded-xl text-center cursor-pointer transition-all active:scale-95 ${
                userSelectedResponse === 'not_coming' ? 'ring-2 ring-rose-400' : ''
              }`}
              style={{ background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#FB7185' }}
            >
              <span className="text-[10px] font-extrabold block">CAN'T COME</span>
              <span className="text-[9px] opacity-80 block">{activeAlert.responses?.not_coming?.length || 0}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Live Volunteer Chat Section with Independent Scroll */}
      <div className="w-full clean-card flex flex-col p-3 space-y-2" style={{ background: 'rgba(14, 23, 44, 0.85)', minHeight: '220px' }}>
        <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'rgba(56, 189, 248, 0.12)' }}>
          <div className="flex items-center gap-1.5">
            <MessageSquare size={13} className="text-sky-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Live Volunteer Coordination
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            className="text-[9.5px] text-emerald-400 flex items-center gap-1 cursor-pointer hover:underline"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isUsingCloud ? '☁️ Cloud Sync' : 'Live Sync'}
          </button>
        </div>

        {/* Message Stream */}
        <div className="chat-scroll-area flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-52 select-text">
          {chatMessages.map((msg) => {
            const isMe = currentVolunteer && msg.volunteerId === currentVolunteer.id;
            const isSystem = msg.type === 'alert' || msg.type === 'quick_response';

            return (
              <div
                key={msg.id}
                className={`p-2 rounded-xl text-xs ${
                  isSystem
                    ? 'bg-rose-500/15 border border-rose-500/25 text-rose-200'
                    : isMe
                    ? 'ml-auto bg-sky-500/20 border border-sky-500/30 text-white max-w-[85%]'
                    : 'mr-auto bg-[#081022] border border-sky-500/15 text-slate-200 max-w-[85%]'
                }`}
              >
                {!isSystem && (
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-amber-400">{msg.senderName}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{msg.time}</span>
                  </div>
                )}
                <p className="leading-snug">{msg.text}</p>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Message Input Composer */}
        <form onSubmit={handleSendChatMessage} className="flex items-center gap-1.5 pt-1.5 border-t" style={{ borderColor: 'rgba(56, 189, 248, 0.12)' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type live volunteer update..."
            className="flex-1 py-2 px-3 rounded-xl text-xs text-white placeholder-slate-400 outline-none"
            style={{ background: 'rgba(6, 11, 25, 0.7)', border: '1px solid rgba(56, 189, 248, 0.2)' }}
          />

          <button
            type="submit"
            disabled={!chatInput.trim() || isSendingMessage}
            className="p-2 rounded-xl text-white cursor-pointer transition-all active:scale-95 shrink-0"
            style={{ background: chatInput.trim() ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : 'rgba(255,255,255,0.1)' }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* Server Modal */}
      {showServerModal && renderServerModal()}
    </div>
  );
};

export default AlertScreen;
