// src/components/ManagerModal.tsx
// Authenticated Manager / Admin Portal for Festival Coordinators & Ministry Pastors
// Includes Offering Balance, Spent Money (Expenditures), Songs Management, and Volunteer Roster

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  IndianRupee, 
  Users, 
  CheckCircle2, 
  LogOut, 
  X, 
  ArrowRight, 
  RefreshCw,
  AlertTriangle,
  UserPlus,
  Eye,
  EyeOff,
  Receipt,
  Calendar,
  Edit3,
  Trash2,
  Check,
  Music2
} from 'lucide-react';
import { apiClient } from '../services/api';
import { realtimeStore } from '../services/realtimeStore';
import { firebaseRealtime } from '../services/firebaseRealtimeService';
import { Volunteer, Expenditure, Song } from '../types/volunteer';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirebaseServices } from '../config/firebase';

interface ManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManagerModal: React.FC<ManagerModalProps> = ({ isOpen, onClose }) => {
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState<string>('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Active Tab: Offering | Spent | Songs | Roster
  const [activeTab, setActiveTab] = useState<'balance' | 'spent' | 'songs' | 'volunteers'>('balance');

  // Offering Balance State
  const [newBalanceInput, setNewBalanceInput] = useState('');
  const [balanceUpdateSuccess, setBalanceUpdateSuccess] = useState(false);

  // Spent Money State
  const [spentDate, setSpentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [spentPurpose, setSpentPurpose] = useState('');
  const [spentAmount, setSpentAmount] = useState('');
  const [isSavingSpent, setIsSavingSpent] = useState(false);
  const [spentSuccess, setSpentSuccess] = useState<string | null>(null);
  const [spentError, setSpentError] = useState<string | null>(null);
  const [expendituresList, setExpendituresList] = useState<Expenditure[]>(() => realtimeStore.getExpenditures());

  // Songs Hymnal State
  const [songName, setSongName] = useState('');
  const [songLyrics, setSongLyrics] = useState('');
  const [isSavingSong, setIsSavingSong] = useState(false);
  const [songSuccess, setSongSuccess] = useState<string | null>(null);
  const [songError, setSongError] = useState<string | null>(null);
  const [songsList, setSongsList] = useState<Song[]>(() => realtimeStore.getSongs());

  // Volunteer Roster State
  const [volunteersList, setVolunteersList] = useState<Volunteer[]>([]);
  const [editingVolId, setEditingVolId] = useState<string | null>(null);
  const [editingVolName, setEditingVolName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameUpdateSuccess, setNameUpdateSuccess] = useState<string | null>(null);

  // Volunteer Provisioning State
  const [newVolId, setNewVolId] = useState('');
  const [newVolName, setNewVolName] = useState('');
  const [newVolPassword, setNewVolPassword] = useState('');
  const [showNewVolPassword, setShowNewVolPassword] = useState(false);
  const [createVolSuccess, setCreateVolSuccess] = useState<string | null>(null);
  const [createVolError, setCreateVolError] = useState<string | null>(null);
  const [isCreatingVol, setIsCreatingVol] = useState(false);

  const offeringBalance = realtimeStore.getOfferingBalance();

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadAdminData();
    }
  }, [isOpen, isAuthenticated]);

  useEffect(() => {
    const unsub = realtimeStore.subscribe(() => {
      setExpendituresList(realtimeStore.getExpenditures());
      setSongsList(realtimeStore.getSongs());
    });
    return unsub;
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      if (realtimeStore.isUsingCloud()) {
        const cloudVols = await firebaseRealtime.fetchVolunteersList();
        if (cloudVols.length) {
          setVolunteersList(cloudVols);
        }
      }

      const [volRes, expRes, songsRes] = await Promise.allSettled([
        apiClient.getVolunteers(),
        apiClient.getExpenditures(),
        apiClient.getSongs()
      ]);

      if (volRes.status === 'fulfilled' && volRes.value.success && !realtimeStore.isUsingCloud()) {
        setVolunteersList(volRes.value.volunteers);
      }
      if (expRes.status === 'fulfilled' && expRes.value.success && expRes.value.expenditures) {
        setExpendituresList(expRes.value.expenditures);
      }
      if (songsRes.status === 'fulfilled' && songsRes.value.success && songsRes.value.songs) {
        setSongsList(songsRes.value.songs);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (!cleanPin) {
      setAuthError('Please enter the Admin Secret Key.');
      return;
    }

    setIsLoading(true);
    setAuthError('');

    try {
      const res = await apiClient.adminLogin(cleanPin);
      if (res.success) {
        let currentToken = cleanPin;
        if (res.token) {
          currentToken = res.token;
        }

        if (res.customToken) {
          const { auth } = getFirebaseServices();
          if (auth) {
            try {
              const userCred = await signInWithCustomToken(auth, res.customToken);
              currentToken = await userCred.user.getIdToken();
            } catch (err) {
              console.warn('Firebase custom token notice:', err);
            }
          }
        }
        setAdminToken(currentToken);
        setIsAuthenticated(true);
        setPinInput('');
        loadAdminData();
      } else {
        setAuthError('Authentication failed.');
      }
    } catch (err: any) {
      let msg = err.message || 'Invalid Secret Key. Please verify credentials.';
      if (msg.includes('Unexpected token') || msg.includes('<!doctype') || msg.includes('JSON')) {
        msg = 'Connection error: Unable to reach RRBM Cloud Backend. Please check your internet connection.';
      }
      setAuthError(msg);
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
      const { auth } = getFirebaseServices();
      let token = adminToken;
      if (auth?.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      await realtimeStore.updateOfferingBalance(amountNum, token, 'Festival Manager');
      setBalanceUpdateSuccess(true);
      setNewBalanceInput('');
      setTimeout(() => setBalanceUpdateSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update balance');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Spent Money (Add Expenditure)
  const handleSaveSpent = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(spentAmount.replace(/,/g, ''));
    const purpose = spentPurpose.trim();
    const date = spentDate.trim() || new Date().toISOString().split('T')[0];

    if (!purpose) {
      setSpentError('Please enter the purpose of this expenditure.');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setSpentError('Please enter a valid spent amount in Rupees.');
      return;
    }

    setIsSavingSpent(true);
    setSpentError(null);
    setSpentSuccess(null);

    try {
      const { auth } = getFirebaseServices();
      let token = adminToken;
      if (auth?.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const updated = await realtimeStore.addExpenditure(date, purpose, amountNum, token);
      setExpendituresList(updated);
      setSpentPurpose('');
      setSpentAmount('');
      setSpentSuccess(`Saved ₹${amountNum.toLocaleString('en-IN')} for "${purpose}"! Updated on Blessings page.`);
      setTimeout(() => setSpentSuccess(null), 4000);
    } catch (err: any) {
      setSpentError(err.message || 'Failed to save expenditure');
    } finally {
      setIsSavingSpent(false);
    }
  };

  const handleDeleteSpent = async (id: string, purpose: string) => {
    if (!confirm(`Are you sure you want to delete expenditure "${purpose}"?`)) return;

    try {
      const { auth } = getFirebaseServices();
      let token = adminToken;
      if (auth?.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const updated = await realtimeStore.deleteExpenditure(id, token);
      setExpendituresList(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to delete expenditure');
    }
  };

  // 3. Songs Hymnal (Add Song)
  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = songName.trim();
    const lyrics = songLyrics.trim();

    if (!name) {
      setSongError('Please enter a Song Name.');
      return;
    }
    if (!lyrics) {
      setSongError('Please enter or paste the song lyrics.');
      return;
    }

    setIsSavingSong(true);
    setSongError(null);
    setSongSuccess(null);

    try {
      const { auth } = getFirebaseServices();
      let token = adminToken;
      if (auth?.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const updated = await realtimeStore.addSong(name, lyrics, token);
      setSongsList(updated);
      setSongName('');
      setSongLyrics('');
      setSongSuccess(`Song "${name}" added to Songs tab successfully!`);
      setTimeout(() => setSongSuccess(null), 4000);
    } catch (err: any) {
      setSongError(err.message || 'Failed to add song');
    } finally {
      setIsSavingSong(false);
    }
  };

  const handleDeleteSong = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete song "${title}"?`)) return;

    try {
      const { auth } = getFirebaseServices();
      let token = adminToken;
      if (auth?.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const updated = await realtimeStore.deleteSong(id, token);
      setSongsList(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to delete song');
    }
  };

  // 4. Edit Volunteer Name
  const handleStartEditName = (vol: Volunteer) => {
    setEditingVolId(vol.id);
    setEditingVolName(vol.name);
    setNameUpdateSuccess(null);
  };

  const handleSaveVolunteerName = async (volunteerId: string) => {
    const trimmed = editingVolName.trim();
    if (!trimmed) {
      alert('Volunteer name cannot be empty');
      return;
    }

    setIsUpdatingName(true);
    try {
      const { auth } = getFirebaseServices();
      let token = adminToken;
      if (auth?.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      await realtimeStore.updateVolunteerName(volunteerId, trimmed, token);
      setVolunteersList(prev => prev.map(v => v.id === volunteerId ? { ...v, name: trimmed } : v));
      setEditingVolId(null);
      setNameUpdateSuccess(`Name updated to "${trimmed}"`);
      setTimeout(() => setNameUpdateSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update volunteer name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  // 5. Provision Volunteer Account
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
      const { auth } = getFirebaseServices();
      let token = adminToken;
      if (auth?.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      if (token) {
        const res = await apiClient.createVolunteerAccount({
          volunteerId: id,
          fullName: name,
          initialPassword: pwd
        }, token);
        setCreateVolSuccess(`Volunteer "${name}" (ID: ${res.volunteer.volunteerId}) registered successfully!`);
        setNewVolId('');
        setNewVolName('');
        setNewVolPassword('');
        loadAdminData();
      }
    } catch (err: any) {
      setCreateVolError(err.message || 'Failed to create volunteer account.');
    } finally {
      setIsCreatingVol(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setPinInput('');
    setAuthError('');
    setAdminToken('');
    const { auth } = getFirebaseServices();
    if (auth && auth.currentUser) {
      try {
        await signOut(auth);
      } catch {}
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="manager-modal-box max-w-lg w-full bg-[#0a101f] border border-sky-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[#101c36] border-b border-sky-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck size={18} />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Management Desk
              </h3>
              <p className="text-[10px] text-sky-300 font-bold">
                Festival Administration & Records
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
                  Enter authorized Secret Key to manage offering balance, expenditures, hymnal songs, and volunteer roster.
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="w-full max-w-xs space-y-3">
                <input
                  type="password"
                  placeholder="Enter Admin Secret Key"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-2xl bg-[#0c152a] border border-sky-500/30 text-sm text-center text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono tracking-wider"
                  autoFocus
                />

                {authError && (
                  <p className="text-xs text-rose-400 font-semibold leading-relaxed bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !pinInput.trim()}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider transition-all active:scale-98 cursor-pointer shadow-lg shadow-sky-500/20 flex items-center justify-center gap-1.5"
                >
                  {isLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span>AUTHENTICATE DESK</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Manager Dashboard Tabs */
            <div className="space-y-3">
              {/* 4 Tabs: Offering | Spent | Songs | Roster */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[#101c36] border border-sky-500/20 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setActiveTab('balance')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'balance'
                      ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <IndianRupee size={13} />
                  <span>Offering</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('spent')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'spent'
                      ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Receipt size={13} />
                  <span>Spent</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('songs')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'songs'
                      ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Music2 size={13} />
                  <span>Songs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('volunteers')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'volunteers'
                      ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Users size={13} />
                  <span>Roster</span>
                </button>
              </div>

              {/* TAB 1: OFFERING BALANCE */}
              {activeTab === 'balance' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[#101c36] border border-amber-500/30 text-center shadow-lg relative overflow-hidden">
                    <span className="text-[10.5px] uppercase font-black tracking-widest text-amber-400">
                      Live Authoritative Balance
                    </span>
                    <h2 className="text-3xl font-black text-white font-mono my-1 drop-shadow-md">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(offeringBalance.amount)}
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      Last updated: {new Date(offeringBalance.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {offeringBalance.updatedBy}
                    </p>
                  </div>

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

              {/* TAB 2: SPENT OPTION (Inputs: Date, Purpose, Money Spent) */}
              {activeTab === 'spent' && (
                <div className="space-y-3.5">
                  <form onSubmit={handleSaveSpent} className="p-4 rounded-2xl bg-[#101c36] border border-sky-500/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                        <Receipt size={14} />
                      </div>
                      <span className="text-xs font-black text-rose-300 uppercase tracking-wide">
                        Record Spent Money
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      Enter festival expenditures. Once saved, these will appear immediately in the Spent Money list on the Blessings page.
                    </p>

                    {spentSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                        <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                        <span>{spentSuccess}</span>
                      </div>
                    )}

                    {spentError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0 text-rose-400" />
                        <span>{spentError}</span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">
                          Date
                        </label>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0c152a] border border-sky-500/30 text-white focus-within:border-sky-400">
                          <Calendar size={13} className="text-sky-400 shrink-0" />
                          <input
                            type="date"
                            value={spentDate}
                            onChange={(e) => setSpentDate(e.target.value)}
                            className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">
                          Purpose
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Sound system advance, Food supplies..."
                          value={spentPurpose}
                          onChange={(e) => setSpentPurpose(e.target.value)}
                          className="w-full py-2 px-3 rounded-xl bg-[#0c152a] border border-sky-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">
                          Money Spent (₹)
                        </label>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0c152a] border border-sky-500/30 text-white focus-within:border-sky-400">
                          <span className="text-rose-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            placeholder="e.g. 15000"
                            value={spentAmount}
                            onChange={(e) => setSpentAmount(e.target.value)}
                            className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingSpent}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-98 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      {isSavingSpent ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Saving Expenditure...</span>
                        </>
                      ) : (
                        <>
                          <Receipt size={13} />
                          <span>Save Expenditure</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Existing Expenditures List */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pb-0.5">
                      <span className="text-xs font-black text-white uppercase">
                        Recorded Expenditures ({expendituresList.length})
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {expendituresList.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic p-2 text-center">No expenditures recorded yet.</p>
                      ) : (
                        expendituresList.map((item) => (
                          <div 
                            key={item.id} 
                            className="p-2.5 rounded-xl bg-[#101c36] border border-sky-500/20 flex items-center justify-between text-xs"
                          >
                            <div className="flex flex-col text-left min-w-0 pr-2">
                              <span className="font-bold text-white text-xs truncate">{item.purpose}</span>
                              <span className="text-[9.5px] text-sky-300/80 font-mono">
                                {item.date} &bull; ₹{Number(item.amount).toLocaleString('en-IN')}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteSpent(item.id, item.purpose)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-colors shrink-0"
                              title="Delete this record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SONGS TAB (Inputs: Song name, Lyrics) */}
              {activeTab === 'songs' && (
                <div className="space-y-3.5">
                  <form onSubmit={handleSaveSong} className="p-4 rounded-2xl bg-[#101c36] border border-sky-500/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
                        <Music2 size={14} />
                      </div>
                      <span className="text-xs font-black text-sky-300 uppercase tracking-wide">
                        Add Song to Hymnal
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      Add a song to the volunteer Songs tab. Lyrics will be visualized in Telugu NATS font exactly as pasted.
                    </p>

                    {songSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                        <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                        <span>{songSuccess}</span>
                      </div>
                    )}

                    {songError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0 text-rose-400" />
                        <span>{songError}</span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">
                          Song Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. యెహోవా నా బలమా / Hosanna Praise"
                          value={songName}
                          onChange={(e) => setSongName(e.target.value)}
                          className="w-full py-2 px-3 rounded-xl bg-[#0c152a] border border-sky-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-semibold"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">
                          Lyrics
                        </label>
                        <textarea
                          rows={6}
                          placeholder="Paste song lyrics here as-is...&#10;యెహోవా నా బలమా - యథార్థమైనది నీ మార్గం&#10;పరిపూర్ణమైనది నీ చిత్తం..."
                          value={songLyrics}
                          onChange={(e) => setSongLyrics(e.target.value)}
                          className="w-full py-2 px-3 rounded-xl bg-[#0c152a] border border-sky-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-nats resize-y leading-relaxed"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingSong}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all active:scale-98 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      {isSavingSong ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Adding Song...</span>
                        </>
                      ) : (
                        <>
                          <Music2 size={13} />
                          <span>Submit to Songs Tab</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Existing Songs List */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pb-0.5">
                      <span className="text-xs font-black text-white uppercase">
                        Songs in Hymnal ({songsList.length})
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {songsList.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic p-2 text-center">No songs added yet.</p>
                      ) : (
                        songsList.map((item) => (
                          <div 
                            key={item.id} 
                            className="p-2.5 rounded-xl bg-[#101c36] border border-sky-500/20 flex items-center justify-between text-xs"
                          >
                            <div className="flex flex-col text-left min-w-0 pr-2">
                              <span className="font-bold text-white text-xs truncate font-nats">{item.title}</span>
                              <span className="text-[9.5px] text-sky-300/80 font-mono">
                                {item.category || 'Worship'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteSong(item.id, item.title)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-colors shrink-0"
                              title="Delete this song"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ROSTER (Show registered volunteers with Edit button beside them to edit name) */}
              {activeTab === 'volunteers' && (
                <div className="space-y-3">
                  {/* Account Provisioning Form */}
                  <form onSubmit={handleCreateVolunteer} className="p-3.5 rounded-2xl bg-[#101c36] border border-sky-500/20 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
                        <UserPlus size={14} />
                      </div>
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                        Register New Volunteer
                      </span>
                    </div>

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
                          placeholder="e.g. 001"
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
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={13} />
                          <span>Register Volunteer</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Registered Volunteers List with Edit Name Button */}
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

                    {nameUpdateSuccess && (
                      <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>{nameUpdateSuccess}</span>
                      </div>
                    )}

                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {volunteersList.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic p-2 text-center">No volunteers registered yet.</p>
                      ) : (
                        volunteersList.map((vol) => (
                          <div 
                            key={vol.id} 
                            className="p-2.5 rounded-xl bg-[#101c36] border border-sky-500/20 flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 font-mono font-black flex items-center justify-center text-xs shrink-0">
                                {vol.id}
                              </div>

                              {editingVolId === vol.id ? (
                                <div className="flex items-center gap-1.5 flex-1">
                                  <input
                                    type="text"
                                    value={editingVolName}
                                    onChange={(e) => setEditingVolName(e.target.value)}
                                    className="py-1 px-2 rounded-lg bg-[#0c152a] border border-sky-400 text-xs text-white outline-none w-full font-bold"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveVolunteerName(vol.id);
                                      if (e.key === 'Escape') setEditingVolId(null);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveVolunteerName(vol.id)}
                                    disabled={isUpdatingName}
                                    className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer transition-colors shrink-0"
                                    title="Save name"
                                  >
                                    <Check size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingVolId(null)}
                                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer transition-colors shrink-0"
                                    title="Cancel"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-left min-w-0">
                                  <span className="font-bold text-white text-xs block leading-tight truncate">
                                    {vol.name}
                                  </span>
                                  <span className="text-[9.5px] text-slate-400 font-mono">
                                    Volunteer ID: {vol.id}
                                  </span>
                                </div>
                              )}
                            </div>

                            {editingVolId !== vol.id && (
                              <button
                                type="button"
                                onClick={() => handleStartEditName(vol)}
                                className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-[11px] cursor-pointer transition-all flex items-center gap-1 shrink-0 active:scale-95"
                                title="Edit volunteer name"
                              >
                                <Edit3 size={11} />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
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
