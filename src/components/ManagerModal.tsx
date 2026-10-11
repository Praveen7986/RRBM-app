// src/components/ManagerModal.tsx
// Authenticated Manager / Admin Portal for Festival Coordinators & Ministry Pastors
// Includes Offering Balance, Alert Control, Volunteer Roster, Broadcast Siren & APK Release Manager

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  IndianRupee, 
  Users, 
  Bell, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Activity, 
  LogOut, 
  X, 
  ArrowRight, 
  RefreshCw,
  AlertTriangle,
  Send,
  Download,
  Cpu,
  FileCode,
  UserPlus,
  Eye,
  EyeOff,
  UserCheck,
  UserX
} from 'lucide-react';
import { apiClient } from '../services/api';
import { realtimeStore } from '../services/realtimeStore';
import { firebaseRealtime } from '../services/firebaseRealtimeService';
import { appUpdateManager } from '../services/appUpdateManager';
import { Volunteer, AlertEvent } from '../types/volunteer';
import { APP_VERSION } from '../config/appVersion';
import { UpdateManifest } from '../types/update';

interface ManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManagerModal: React.FC<ManagerModalProps> = ({ isOpen, onClose }) => {
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Manager dashboard state
  const [activeTab, setActiveTab] = useState<'balance' | 'alerts' | 'volunteers' | 'broadcast' | 'updates'>('balance');
  const [newBalanceInput, setNewBalanceInput] = useState('');
  const [balanceUpdateSuccess, setBalanceUpdateSuccess] = useState(false);
  const [volunteersList, setVolunteersList] = useState<Volunteer[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertEvent[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  // APK Update Manager State
  const [serverManifest, setServerManifest] = useState<UpdateManifest | null>(null);
  const [manifestEditSuccess, setManifestEditSuccess] = useState(false);

  // Volunteer Account Provisioning State
  const [newVolId, setNewVolId] = useState('');
  const [newVolName, setNewVolName] = useState('');
  const [newVolPassword, setNewVolPassword] = useState('');
  const [showNewVolPassword, setShowNewVolPassword] = useState(false);
  const [createVolSuccess, setCreateVolSuccess] = useState<string | null>(null);
  const [createVolError, setCreateVolError] = useState<string | null>(null);
  const [isCreatingVol, setIsCreatingVol] = useState(false);

  const activeAlert = realtimeStore.getActiveAlert();
  const offeringBalance = realtimeStore.getOfferingBalance();

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadAdminData();
    }
  }, [isOpen, isAuthenticated]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      if (realtimeStore.isUsingCloud()) {
        const cloudVols = await firebaseRealtime.fetchVolunteersList();
        if (cloudVols.length) {
          setVolunteersList(cloudVols);
        }
      }

      const [volRes, alertRes, manifestRes] = await Promise.allSettled([
        apiClient.getVolunteers(),
        apiClient.getAlertHistory(),
        fetch(`${APP_VERSION.updateManifestUrl}?_t=${Date.now()}`).then(r => r.json())
      ]);

      if (volRes.status === 'fulfilled' && volRes.value.success && !realtimeStore.isUsingCloud()) {
        setVolunteersList(volRes.value.volunteers);
      }
      if (alertRes.status === 'fulfilled' && alertRes.value.success) {
        setAlertHistory(alertRes.value.alerts);
      }
      if (manifestRes.status === 'fulfilled' && manifestRes.value) {
        setServerManifest(manifestRes.value as UpdateManifest);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = newVolId.trim();
    const name = newVolName.trim();
    const pwd = newVolPassword.trim();

    if (!id || !name || !pwd) {
      setCreateVolError('Volunteer ID, Name, and Password are all required.');
      return;
    }
    if (pwd.length < 6) {
      setCreateVolError('Password must be at least 6 characters.');
      return;
    }

    setIsCreatingVol(true);
    setCreateVolError(null);
    setCreateVolSuccess(null);

    try {
      if (realtimeStore.isUsingCloud()) {
        await firebaseRealtime.createVolunteerAccount(id, name, pwd);
        setCreateVolSuccess(`Volunteer "${name}" (ID: ${id}) created successfully!`);
        setNewVolId('');
        setNewVolName('');
        setNewVolPassword('');
        const updated = await firebaseRealtime.fetchVolunteersList();
        setVolunteersList(updated);
      } else {
        const res = await apiClient.registerVolunteer(name);
        if (res.success) {
          setCreateVolSuccess(`Volunteer ${name} registered on server (ID: ${res.volunteer.id}).`);
          setNewVolId('');
          setNewVolName('');
          setNewVolPassword('');
          loadAdminData();
        }
      }
    } catch (err: any) {
      setCreateVolError(err.message || 'Failed to create volunteer account.');
    } finally {
      setIsCreatingVol(false);
    }
  };

  const handleToggleVolunteerStatus = async (vol: Volunteer) => {
    if (!realtimeStore.isUsingCloud()) return;
    try {
      const nextState = !vol.active;
      await firebaseRealtime.toggleVolunteerActive(vol.id, nextState);
      setVolunteersList(prev => prev.map(v => v.id === vol.id ? { ...v, active: nextState } : v));
    } catch (err: any) {
      console.warn('Failed to toggle volunteer status:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    setIsLoading(true);
    setAuthError('');

    try {
      const res = await apiClient.adminLogin(pinInput.trim());
      if (res.success) {
        setIsAuthenticated(true);
        setPinInput('');
        loadAdminData();
      }
    } catch {
      // Check local default fallback PIN (2026)
      if (pinInput.trim() === '2026') {
        setIsAuthenticated(true);
        setPinInput('');
      } else {
        setAuthError('Invalid Manager PIN. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newBalanceInput.replace(/,/g, ''));
    if (isNaN(amountNum) || amountNum < 0) return;

    setIsLoading(true);
    try {
      await realtimeStore.updateOfferingBalance(amountNum, '2026', 'Festival Manager');
      setBalanceUpdateSuccess(true);
      setNewBalanceInput('');
      setTimeout(() => setBalanceUpdateSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update balance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!confirm('Mark this alert as resolved and clear active alert state?')) return;
    setIsLoading(true);
    try {
      await realtimeStore.resolveAlert(alertId);
      loadAdminData();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAdminBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    setIsLoading(true);
    try {
      await realtimeStore.triggerImmediateAlert(`📢 MANAGER BROADCAST: ${broadcastMessage.trim()}`);
      setBroadcastMessage('');
      setBroadcastSent(true);
      setTimeout(() => setBroadcastSent(false), 3000);
      loadAdminData();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerClientUpdateCheck = () => {
    onClose();
    appUpdateManager.checkForUpdates(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPinInput('');
    setAuthError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 select-none">
      <div className="w-full max-w-md bg-[#0c152a] border border-sky-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[#101c36] border-b border-sky-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck size={18} />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Manager Desk & Control
              </h3>
              <p className="text-[10px] text-sky-300 font-bold">
                RRBM 3-Day Fasting 2026 Admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-all text-xs flex items-center gap-1 cursor-pointer"
                title="Log Out"
              >
                <LogOut size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {!isAuthenticated ? (
            /* Manager PIN Login */
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
                <Lock size={28} />
              </div>

              <div>
                <h4 className="text-base font-black text-white uppercase tracking-wide">
                  Manager Verification
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Enter authorized manager PIN to update live financial offerings, control alerts, and manage APK releases.
                </p>
              </div>

              <form onSubmit={handleLogin} className="w-full space-y-3 max-w-xs">
                <div>
                  <input
                    type="password"
                    maxLength={10}
                    placeholder="Enter PIN (e.g. 2026)"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-mono font-black py-3 px-4 rounded-2xl bg-[#101c36] border border-sky-500/40 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                </div>

                {authError && (
                  <p className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1">
                    <AlertTriangle size={13} />
                    <span>{authError}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  {isLoading ? <RefreshCw size={15} className="animate-spin" /> : <span>UNLOCK MANAGER DESK</span>}
                  {!isLoading && <ArrowRight size={15} />}
                </button>
              </form>

              <span className="text-[10px] text-slate-500 font-mono">
                Production Protection &bull; Event Year 2026
              </span>
            </div>
          ) : (
            /* Manager Dashboard Tabs */
            <div className="space-y-3">
              {/* Tab Selector */}
              <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-[#101c36] border border-sky-500/20 text-[10px] font-black">
                <button
                  type="button"
                  onClick={() => setActiveTab('balance')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    activeTab === 'balance'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <IndianRupee size={12} />
                  <span>Offering</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('alerts')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    activeTab === 'alerts'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Bell size={12} />
                  <span>Alerts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('volunteers')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    activeTab === 'volunteers'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Users size={12} />
                  <span>Roster</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('broadcast')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    activeTab === 'broadcast'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Send size={12} />
                  <span>Siren</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('updates')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    activeTab === 'updates'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Download size={12} />
                  <span>APK Updates</span>
                </button>
              </div>

              {/* Tab 1: Offering Balance Management */}
              {activeTab === 'balance' && (
                <div className="space-y-3">
                  {/* Current Balance Display Card */}
                  <div className="p-4 rounded-2xl bg-[#101c36] border border-amber-500/30 text-center shadow-lg relative overflow-hidden">
                    <span className="text-[10.5px] uppercase font-black tracking-widest text-amber-400">
                      Live Authoritative Balance
                    </span>
                    <h2 className="text-3xl font-black text-white font-mono my-1 drop-shadow-md">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(offeringBalance.amount)}
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      Last updated: {new Date(offeringBalance.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} by {offeringBalance.updatedBy}
                    </p>
                  </div>

                  {/* Update Form */}
                  <form onSubmit={handleUpdateBalance} className="p-4 rounded-2xl bg-[#101c36] border border-sky-500/20 space-y-3">
                    <label className="block text-xs font-black text-sky-300 uppercase tracking-wide">
                      Update Total Offering Amount (₹)
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0c152a] border border-sky-500/30 text-white focus-within:border-sky-400">
                      <span className="text-amber-400 font-bold text-base">₹</span>
                      <input
                        type="number"
                        placeholder="e.g. 175000"
                        value={newBalanceInput}
                        onChange={(e) => setNewBalanceInput(e.target.value)}
                        className="w-full bg-transparent text-sm font-mono font-bold text-white focus:outline-none"
                      />
                    </div>

                    {balanceUpdateSuccess && (
                      <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-pulse">
                        <CheckCircle2 size={14} />
                        <span>Offering balance updated live on all volunteer screens!</span>
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading || !newBalanceInput}
                      className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <span>PUBLISH TO LIVE MONEY JAR</span>}
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 2: Alert History & Live Responses */}
              {activeTab === 'alerts' && (
                <div className="space-y-3">
                  {activeAlert ? (
                    <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-rose-300 flex items-center gap-1.5 uppercase">
                          <Activity size={13} className="animate-pulse" />
                          ACTIVE LIVE ALERT
                        </span>
                        <button
                          type="button"
                          onClick={() => handleResolveAlert(activeAlert.id)}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase cursor-pointer"
                        >
                          Resolve Alert
                        </button>
                      </div>

                      <p className="text-xs text-white font-bold leading-snug">
                        "{activeAlert.message}"
                      </p>

                      <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                        <div className="p-2 rounded-xl bg-[#0c152a] border border-emerald-500/30">
                          <span className="text-[10px] text-emerald-300 font-bold block">COMING</span>
                          <span className="text-base font-black text-emerald-400 font-mono">
                            {activeAlert.responses?.coming?.length || 0}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#0c152a] border border-amber-500/30">
                          <span className="text-[10px] text-amber-300 font-bold block">LATE</span>
                          <span className="text-base font-black text-amber-400 font-mono">
                            {activeAlert.responses?.coming_late?.length || 0}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#0c152a] border border-rose-500/30">
                          <span className="text-[10px] text-rose-300 font-bold block">CAN'T</span>
                          <span className="text-base font-black text-rose-400 font-mono">
                            {activeAlert.responses?.not_coming?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#101c36] border border-sky-500/20 text-center text-xs text-slate-400">
                      <CheckCircle2 size={20} className="text-emerald-400 mx-auto mb-1 opacity-80" />
                      No active emergency alert currently running.
                    </div>
                  )}

                  {/* Past Alerts List */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Recent Alert Events
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {alertHistory.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">No previous alerts recorded.</p>
                      ) : (
                        alertHistory.map((a) => (
                          <div key={a.id} className="p-2.5 rounded-xl bg-[#101c36] border border-sky-500/15 text-xs flex items-center justify-between">
                            <div className="text-left">
                              <span className="font-bold text-white text-[11px] block">{a.message}</span>
                              <span className="text-[9.5px] text-sky-300/80 font-mono">{a.timeFormatted} &bull; By {a.triggeredBy.name}</span>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              a.status === 'active' ? 'bg-rose-500/30 text-rose-300' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {a.status.toUpperCase()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Provision Accounts & Volunteer Roster */}
              {activeTab === 'volunteers' && (
                <div className="space-y-3">
                  {/* Account Provisioning Form */}
                  <form onSubmit={handleCreateVolunteer} className="p-3.5 rounded-2xl bg-[#101c36] border border-sky-500/20 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
                        <UserPlus size={14} />
                      </div>
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                        Provision Volunteer Account
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      Create secure volunteer credentials. The volunteer will use this ID and password to sign into the Alert & Coordination screen.
                    </p>

                    {createVolSuccess && (
                      <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                        <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                        <span>{createVolSuccess}</span>
                      </div>
                    )}

                    {createVolError && (
                      <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0 text-rose-400" />
                        <span>{createVolError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Volunteer ID</label>
                        <input
                          type="text"
                          placeholder="e.g. 001, 002"
                          value={newVolId}
                          onChange={(e) => setNewVolId(e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-[#0c152a] border border-sky-500/30 text-xs text-white placeholder-slate-500 font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Full Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Joshua"
                          value={newVolName}
                          onChange={(e) => setNewVolName(e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-[#0c152a] border border-sky-500/30 text-xs text-white placeholder-slate-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">Initial Password (min 6 chars)</label>
                      <div className="relative flex items-center">
                        <input
                          type={showNewVolPassword ? 'text' : 'password'}
                          placeholder="Initial password"
                          value={newVolPassword}
                          onChange={(e) => setNewVolPassword(e.target.value)}
                          className="w-full py-1.5 pl-2.5 pr-8 rounded-xl bg-[#0c152a] border border-sky-500/30 text-xs text-white placeholder-slate-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewVolPassword(!showNewVolPassword)}
                          className="absolute right-2.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showNewVolPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingVol}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold text-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      {isCreatingVol ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Creating in Firebase Auth...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={13} />
                          <span>Create Volunteer Account</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Registered Volunteers List */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between pb-0.5">
                      <span className="text-xs font-black text-white uppercase">
                        Registered Volunteers ({volunteersList.length})
                      </span>
                      <button
                        type="button"
                        onClick={loadAdminData}
                        className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {volunteersList.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic p-2 text-center">No volunteers registered yet.</p>
                      ) : (
                        volunteersList.map((vol) => (
                          <div key={vol.id} className="p-2.5 rounded-xl bg-[#101c36] border border-sky-500/20 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 font-mono font-black flex items-center justify-center text-[10.5px]">
                                {vol.id}
                              </div>
                              <div className="text-left">
                                <span className="font-bold text-white text-xs block leading-tight">{vol.name}</span>
                                <span className="text-[9.5px] text-slate-400">
                                  {vol.active !== false ? 'Active Account' : 'Deactivated'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleVolunteerStatus(vol)}
                              className={`p-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                                vol.active !== false
                                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                              }`}
                              title={vol.active !== false ? 'Click to deactivate' : 'Click to activate'}
                            >
                              {vol.active !== false ? <UserCheck size={13} /> : <UserX size={13} />}
                              <span>{vol.active !== false ? 'Active' : 'Disabled'}</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Official Broadcast */}
              {activeTab === 'broadcast' && (
                <form onSubmit={handleSendAdminBroadcast} className="p-4 rounded-2xl bg-[#101c36] border border-sky-500/20 space-y-3">
                  <label className="block text-xs font-black text-amber-400 uppercase tracking-wide">
                    Emergency Broadcast / Official Call
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Sends high-priority siren alert + chat banner + push notification to every connected volunteer device.
                  </p>

                  <textarea
                    rows={3}
                    placeholder="e.g. All worship team members report to green room for sound check..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[#0c152a] border border-sky-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium resize-none"
                  />

                  {broadcastSent && (
                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-pulse">
                      <CheckCircle2 size={14} />
                      <span>Broadcast siren and alert dispatched across all devices!</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !broadcastMessage.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Bell size={14} />}
                    <span>DISPATCH OFFICIAL BROADCAST</span>
                  </button>
                </form>
              )}

              {/* Tab 5: Private APK Update Manager */}
              {activeTab === 'updates' && (
                <div className="space-y-3 text-left">
                  {/* Current App Info */}
                  <div className="p-3.5 rounded-2xl bg-[#101c36] border border-sky-500/25 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                      Installed Application Info
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Version Name</span>
                        <span className="font-mono font-bold text-white">v{APP_VERSION.versionName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Version Code</span>
                        <span className="font-mono font-bold text-white">{APP_VERSION.versionCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Server Manifest Status */}
                  <div className="p-3.5 rounded-2xl bg-[#0c152a] border border-sky-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-sky-300">
                        Server Published Manifest
                      </span>
                      <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        ACTIVE
                      </span>
                    </div>

                    {serverManifest ? (
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <p><strong className="text-white">Latest Version:</strong> v{serverManifest.latestVersionName} (Build {serverManifest.latestVersionCode})</p>
                        <p><strong className="text-white">Min Supported:</strong> Build {serverManifest.minimumSupportedVersionCode}</p>
                        <p><strong className="text-white">APK Target:</strong> <span className="font-mono text-[10px] text-sky-300">{serverManifest.apkUrl}</span></p>
                        <p><strong className="text-white">SHA-256:</strong> <span className="font-mono text-[9.5px] text-slate-400 break-all">{serverManifest.sha256}</span></p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No manifest loaded yet.</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTriggerClientUpdateCheck}
                      className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={13} />
                      <span>TEST UPDATE CHECK DIALOG</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerModal;
