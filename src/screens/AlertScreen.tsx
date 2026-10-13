// src/screens/AlertScreen.tsx
// Screen 2: Dedicated Alerts & Integrated Management Desk Screen
// Concentric Circular Alert Button, Recipients Groups, Live Response Workflow & Management Desk

import React, { useState, useEffect, useRef } from 'react';
import { 
  Megaphone, 
  Bell, 
  Users, 
  ChevronRight, 
  Lock, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Radio, 
  LogOut, 
  Send, 
  MessageSquare, 
  AlertCircle,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { realtimeStore } from '../services/realtimeStore';
import { Volunteer, ChatMessage, AlertEvent, ConnectionStatus } from '../types/volunteer';
import { requestNotificationPermission } from '../services/audioNotification';
import { ManagerModal } from '../components/ManagerModal';

export const AlertScreen: React.FC = () => {
  const [currentVolunteer, setCurrentVolunteer] = useState<Volunteer | null>(() => realtimeStore.getCurrentVolunteer());
  const [activeAlert, setActiveAlert] = useState<AlertEvent | null>(() => realtimeStore.getActiveAlert());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => realtimeStore.getConnectionStatus());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => realtimeStore.getChatMessages());

  // Form & Interaction States
  const [volunteerIdInput, setVolunteerIdInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isAlertBroadcasting, setIsAlertBroadcasting] = useState<boolean>(false);
  const [userSelectedResponse, setUserSelectedResponse] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Management Desk Modal & Live Chat Drawer State
  const [isManagerOpen, setIsManagerOpen] = useState<boolean>(false);
  const [showLiveChat, setShowLiveChat] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

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
      setActiveAlert(realtimeStore.getActiveAlert());
      setConnectionStatus(realtimeStore.getConnectionStatus());
      setChatMessages(realtimeStore.getChatMessages());
    });
    return unsubscribe;
  }, []);

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

  useEffect(() => {
    if (showLiveChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showLiveChat]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = volunteerIdInput.trim();
    const pwd = passwordInput.trim();
    if (!id || !pwd || isSigningIn) return;

    setIsSigningIn(true);
    setLoginError('');
    await requestNotificationPermission();
    try {
      await realtimeStore.signInVolunteer(id, pwd);
      setVolunteerIdInput('');
      setPasswordInput('');
      showToast('success', 'Signed in successfully as volunteer!');
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
    try {
      await realtimeStore.triggerImmediateAlert();
      showToast('success', '🚨 Alert broadcasted to all registered team volunteers!');
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
      showToast('success', 'Your response has been registered.');
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
      showToast('error', err.message || 'Failed to send message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // If user is not signed in as a volunteer, render the login card inside Alerts
  if (!currentVolunteer) {
    return (
      <div className="alert-screen flex flex-col w-full space-y-4 pb-4 select-none max-w-4xl mx-auto">
        {/* Header */}
        <div className="w-full flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              RRBM Team & Coordination
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
              Alert
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsManagerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              color: '#38BDF8'
            }}
          >
            <Lock size={12} className="text-sky-400" />
            <span>Management Desk</span>
          </button>
        </div>

        {/* Status Toast */}
        {statusFeedback && (
          <div 
            className={`w-full p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              statusFeedback.type === 'success' 
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200' 
                : 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
            }`}
          >
            {statusFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusFeedback.message}</span>
          </div>
        )}

        {/* Volunteer Sign-In Card */}
        <div 
          className="w-full rounded-2xl p-5 flex flex-col items-center text-center space-y-3.5"
          style={{
            background: '#101726',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
          }}
        >
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
          >
            <ShieldCheck size={28} className="text-sky-400" />
          </div>

          <div>
            <h2 className="text-base font-black text-white tracking-wide">Volunteer Sign-In</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Enter your assigned Volunteer ID & password to receive alerts and communicate with ministry leads.
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
                onChange={(e) => setVolunteerIdInput(e.target.value)}
                placeholder="Volunteer ID (e.g. 001, 002, 261)"
                className="w-full py-2.5 pl-9 pr-3.5 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono"
                style={{ background: '#070D1D', border: '1px solid rgba(56, 189, 248, 0.25)' }}
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
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                className="w-full py-2.5 pl-9 pr-10 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                style={{ background: '#070D1D', border: '1px solid rgba(56, 189, 248, 0.25)' }}
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
              style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}
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
        </div>

        {/* Manager Modal */}
        {isManagerOpen && (
          <ManagerModal isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
        )}
      </div>
    );
  }

  // Volunteer is signed in: Render authoritative Screen 2
  return (
    <div className="alert-screen flex flex-col w-full space-y-4 pb-4 select-none max-w-4xl mx-auto">
      {/* 1. Top Header with Date, Title & Volunteer Avatar Pill */}
      <div className="w-full flex items-center justify-between pt-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            Thursday, Jul 2
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Alert
          </h1>
        </div>

        {/* Header Right: Avatar & Management Desk Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManagerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all active:scale-95"
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              color: '#38BDF8'
            }}
            title="Management Desk"
          >
            <Lock size={12} className="text-sky-400" />
            <span className="text-[11px] hidden sm:inline">Desk</span>
          </button>

          {/* Volunteer Avatar Pill */}
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
            style={{
              background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.4)'
            }}
            title={`Logged in: ${currentVolunteer.name} (${currentVolunteer.id})`}
          >
            {currentVolunteer.name.charAt(0).toUpperCase()}
          </div>

          <button
            type="button"
            onClick={() => realtimeStore.signOutVolunteer()}
            className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusFeedback && (
        <div 
          className={`w-full p-2.5 rounded-xl text-xs flex items-center gap-2 ${
            statusFeedback.type === 'success' 
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
          }`}
        >
          {statusFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusFeedback.message}</span>
        </div>
      )}

      {/* 2. Volunteer Alert Card */}
      <div 
        className="w-full rounded-2xl p-3.5 flex items-center justify-between"
        style={{
          background: '#101726',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 shrink-0"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <Bell size={18} />
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Volunteer Alert</span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Broadcast to all available team members
            </span>
          </div>
        </div>

        <span 
          className="px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{
            background: activeAlert ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.15)',
            color: activeAlert ? '#FB7185' : '#38BDF8',
            border: activeAlert ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid rgba(56, 189, 248, 0.3)'
          }}
        >
          {activeAlert ? 'Active' : 'Standby'}
        </span>
      </div>

      {/* 3. Central Circular Alert Button with Concentric Rings */}
      <div 
        className="w-full rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden"
        style={{
          background: '#101726',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
        }}
      >
        {/* Concentric Circle Visual Frame */}
        <div className="relative flex items-center justify-center my-3">
          {/* Outermost ring */}
          <div 
            className="w-48 h-48 rounded-full flex items-center justify-center"
            style={{
              border: '1px solid rgba(56, 189, 248, 0.12)'
            }}
          >
            {/* Middle ring */}
            <div 
              className="w-36 h-36 rounded-full flex items-center justify-center"
              style={{
                border: '1px solid rgba(56, 189, 248, 0.22)',
                background: 'rgba(56, 189, 248, 0.03)'
              }}
            >
              {/* Center Action Button */}
              <button
                type="button"
                onClick={handleOneTapAlert}
                disabled={isAlertBroadcasting}
                className="w-24 h-24 rounded-full flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-90"
                style={{
                  background: '#090F1E',
                  border: '2px solid #38BDF8',
                  boxShadow: '0 0 24px rgba(56, 189, 248, 0.35)'
                }}
                aria-label="Send push notification alert"
              >
                <Megaphone size={24} className="text-sky-400 mb-1" />
                <span className="text-xs font-bold text-sky-400">
                  Alert
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Clear Instructions */}
        <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
          Tap to send a push notification to all available volunteers in your ministry group.
        </p>

        {/* Live Active Alert Response Banner */}
        {activeAlert && (
          <div 
            className="w-full mt-4 p-3.5 rounded-xl flex flex-col space-y-2.5"
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.35)'
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                ALERT ACTIVE
              </span>
              <span className="text-[10px] text-slate-300 font-mono">
                {activeAlert.message || 'All Volunteers Needed'}
              </span>
            </div>

            {/* Quick 3-Response Buttons */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleQuickResponse('coming')}
                className={`py-2 px-1 rounded-xl text-center cursor-pointer transition-all ${
                  userSelectedResponse === 'coming'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-500/30'
                }`}
              >
                <CheckCircle2 size={13} className="mx-auto mb-0.5" />
                <span className="text-[10px] block leading-tight">I'm Coming</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickResponse('coming_late')}
                className={`py-2 px-1 rounded-xl text-center cursor-pointer transition-all ${
                  userSelectedResponse === 'coming_late'
                    ? 'bg-amber-600 text-white font-bold shadow'
                    : 'bg-amber-950/60 text-amber-300 font-semibold border border-amber-500/30'
                }`}
              >
                <Clock size={13} className="mx-auto mb-0.5" />
                <span className="text-[10px] block leading-tight">Coming Late</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickResponse('not_coming')}
                className={`py-2 px-1 rounded-xl text-center cursor-pointer transition-all ${
                  userSelectedResponse === 'not_coming'
                    ? 'bg-rose-700 text-white font-bold shadow'
                    : 'bg-rose-950/60 text-rose-300 font-semibold border border-rose-500/30'
                }`}
              >
                <XCircle size={13} className="mx-auto mb-0.5" />
                <span className="text-[10px] block leading-tight">Can't Come</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. RECIPIENTS Groups List */}
      <div className="w-full flex flex-col space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Recipients
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            12 volunteers
          </span>
        </div>

        {/* Group 1: Worship Team */}
        <div 
          className="w-full rounded-2xl p-3.5 flex items-center justify-between"
          style={{
            background: '#101726',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 shrink-0"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <Users size={16} />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Worship Team</span>
                <span className="text-[10px] text-slate-400">5 members</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">
                All available this weekend
              </span>
            </div>
          </div>

          <ChevronRight size={16} className="text-slate-400" />
        </div>

        {/* Group 2: Children's Ministry */}
        <div 
          className="w-full rounded-2xl p-3.5 flex items-center justify-between"
          style={{
            background: '#101726',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 shrink-0"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <Users size={16} />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Children's Ministry</span>
                <span className="text-[10px] text-slate-400">4 members</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">
                2 pending confirmation
              </span>
            </div>
          </div>

          <ChevronRight size={16} className="text-slate-400" />
        </div>

        {/* Group 3: Greeters & Ushers */}
        <div 
          className="w-full rounded-2xl p-3.5 flex items-center justify-between"
          style={{
            background: '#101726',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 shrink-0"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <Users size={16} />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Greeters & Ushers</span>
                <span className="text-[10px] text-slate-400">3 members</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">
                All confirmed
              </span>
            </div>
          </div>

          <ChevronRight size={16} className="text-slate-400" />
        </div>
      </div>

      {/* 5. Live Coordination Chat Accordion */}
      <div 
        className="w-full rounded-2xl p-3.5 flex flex-col space-y-2.5"
        style={{
          background: '#101726',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
        }}
      >
        <button
          type="button"
          onClick={() => setShowLiveChat(!showLiveChat)}
          className="flex items-center justify-between w-full cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-sky-400" />
            <span className="text-xs font-bold text-white">Live Coordination Chat</span>
            <span className="text-[10px] font-mono text-slate-400">({chatMessages.length})</span>
          </div>

          <span className="text-xs text-sky-400 font-semibold">
            {showLiveChat ? 'Hide' : 'Open'}
          </span>
        </button>

        {showLiveChat && (
          <div className="w-full flex flex-col space-y-2 pt-2 border-t border-slate-800">
            <div className="w-full max-h-48 overflow-y-auto space-y-2 pr-1">
              {chatMessages.length === 0 ? (
                <div className="text-center py-4 text-[11px] text-slate-400">
                  No coordination messages yet.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.volunteerId === currentVolunteer.id;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[9px] text-slate-400 font-medium px-1">
                        {msg.senderName} &bull; {msg.volunteerId}
                      </span>
                      <div 
                        className={`p-2 rounded-xl text-xs max-w-[85%] mt-0.5 ${
                          isMe 
                            ? 'bg-sky-600 text-white rounded-tr-none' 
                            : 'bg-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type coordination message..."
                className="flex-1 py-2 px-3 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                style={{ background: '#070D1D', border: '1px solid rgba(56, 189, 248, 0.2)' }}
              />
              <button
                type="submit"
                disabled={isSendingMessage || !chatInput.trim()}
                className="p-2 rounded-xl text-white cursor-pointer"
                style={{ background: '#0284C7' }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 6. Management Desk Access Trigger */}
      <div className="w-full pt-1 flex justify-center">
        <button
          type="button"
          onClick={() => setIsManagerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95"
          style={{
            background: 'rgba(16, 23, 38, 0.8)',
            border: '1px solid rgba(56, 189, 248, 0.2)'
          }}
        >
          <Lock size={13} className="text-sky-400" />
          <span>Management Desk (Coordinators & Pastors)</span>
        </button>
      </div>

      {/* Integrated Management Desk Modal */}
      {isManagerOpen && (
        <ManagerModal isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
      )}
    </div>
  );
};

export default AlertScreen;
