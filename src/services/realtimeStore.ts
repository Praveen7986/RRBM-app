// src/services/realtimeStore.ts
// Production Realtime Store with Firebase Cloud Firestore (Internet-Wide) & Node.js/WebSocket LAN Fallback

import { Volunteer, AlertEvent, ChatMessage, OfferingBalance, ConnectionStatus, Expenditure, Song } from '../types/volunteer';
import { SONGS_DATA } from '../data/songsData';
import { triggerAlertSoundAndVibration, triggerChatNotification } from './audioNotification';
import { apiClient, getServerBaseUrl, setCustomServerUrl } from './api';
import { firebaseRealtime } from './firebaseRealtimeService';
import { isFirebaseConfigured, getFirebaseServices } from '../config/firebase';
import { signInWithCustomToken } from 'firebase/auth';

const STORAGE_KEYS = {
  CURRENT_VOLUNTEER: 'rrbm_volunteer_user_2026',
  CHAT_MESSAGES: 'rrbm_live_chat_messages_2026',
  ACTIVE_ALERT: 'rrbm_active_alert_2026',
  OFFERING_BALANCE: 'rrbm_festival_balance_2026',
  EXPENDITURES: 'rrbm_expenditures_2026',
  SONGS: 'rrbm_songs_hymnal_2026'
};

const BROADCAST_CHANNEL_NAME = 'rrbm_alert_realtime_channel_2026';

const DEFAULT_SONGS_SEEDS: Song[] = [
  ...SONGS_DATA.day1,
  ...SONGS_DATA.day2,
  ...SONGS_DATA.day3
];

const INITIAL_EXPENDITURES: Expenditure[] = [];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'MSG_INIT_1',
    volunteerId: 'OFFICE',
    senderName: 'Pastor Office',
    text: 'Welcome to RRBM 3-Day Fasting Prayers 2026! Morning altar prayer begins at 09:00 AM.',
    time: '09:00 AM',
    type: 'chat'
  },
  {
    id: 'MSG_INIT_2',
    volunteerId: 'LEAD',
    senderName: 'Worship Leader',
    text: 'Worship team sound check complete. All volunteers please take your respective stations.',
    time: '09:05 AM',
    type: 'chat'
  }
];

class RealtimeStoreService {
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<() => void> = new Set();
  
  private currentVolunteer: Volunteer | null = null;
  private activeAlert: AlertEvent | null = null;
  private chatMessages: ChatMessage[] = [];
  private offeringBalance: OfferingBalance = {
    amount: 148500,
    updatedBy: 'Festival Coordination Desk',
    updatedAt: new Date().toISOString()
  };
  private expenditures: Expenditure[] = [];
  private songs: Song[] = [];
  private connectionStatus: ConnectionStatus = 'connecting';
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private isProcessingAlert: boolean = false;
  private reconnectAttempts: number = 0;
  private isCloudFirebaseMode: boolean = false;

  constructor() {
    this.loadInitialStorage();
    this.initBroadcastChannel();
    this.initLifecycleListeners();

    if (isFirebaseConfigured()) {
      this.initFirebaseRealtime();
    } else {
      this.connectWebSocket();
      this.fetchInitialData();
    }
  }

  private initFirebaseRealtime() {
    try {
      this.isCloudFirebaseMode = true;
      this.connectionStatus = 'connected';
      console.log('[RealtimeStore] Operating in Cloud Firebase Mode (Internet-wide sync)');

      // Immediately attach Firestore listeners for alerts, chat, balance, songs & expenditures.
      // This ensures all volunteers receive background alerts and chat even without being logged in!
      this.attachFirestoreListeners();

      // Listen to Firebase Auth state to update currentVolunteer profile
      firebaseRealtime.initAuthListener((authenticatedVolunteer) => {
        if (authenticatedVolunteer) {
          // Never treat coordinator / admin manager session as a volunteer identity!
          if (
            authenticatedVolunteer.id === 'rrbm-manager-admin' ||
            authenticatedVolunteer.role === 'admin' ||
            authenticatedVolunteer.name?.toLowerCase().includes('admin')
          ) {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_VOLUNTEER);
            if (this.currentVolunteer?.id === 'rrbm-manager-admin') {
              this.currentVolunteer = null;
              this.notify();
            }
            return;
          }

          this.currentVolunteer = authenticatedVolunteer;
          localStorage.setItem(STORAGE_KEYS.CURRENT_VOLUNTEER, JSON.stringify(authenticatedVolunteer));
          this.notify();
        } else {
          const hasBackendSession = localStorage.getItem('rrbm_volunteer_token');
          if (!hasBackendSession && !localStorage.getItem(STORAGE_KEYS.CURRENT_VOLUNTEER)) {
            this.currentVolunteer = null;
            this.notify();
          }
        }
      });

      // Ensure WebSocket connection is active for real-time alerts
      if (!this.ws) {
        this.connectWebSocket();
      }

      this.notify();
    } catch (err) {
      console.warn('[RealtimeStore] Failed to initialize Firebase real-time listeners:', err);
      this.isCloudFirebaseMode = false;
      this.connectWebSocket();
      this.fetchInitialData();
    }
  }

  private attachFirestoreListeners() {
    // 1. Subscribe to Cloud Firestore Alerts
    firebaseRealtime.subscribeToAlerts((alert) => {
      this.activeAlert = alert;
      if (alert) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ALERT, JSON.stringify(alert));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ALERT);
      }
      this.notify();
    });

    // 2. Subscribe to Cloud Firestore Chat
    firebaseRealtime.subscribeToChat(this.currentVolunteer?.id || null, (messages) => {
      if (Array.isArray(messages)) {
        this.chatMessages = messages;
        localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages));
      }
      this.notify();
    });

    // 3. Subscribe to Offering Balance
    firebaseRealtime.subscribeToBalance((balance) => {
      this.offeringBalance = balance;
      localStorage.setItem(STORAGE_KEYS.OFFERING_BALANCE, JSON.stringify(balance));
      this.notify();
    });

    // 4. Subscribe to Expenditures (Money Spent) in Cloud Firestore
    firebaseRealtime.subscribeToExpenditures((expenditures) => {
      if (Array.isArray(expenditures)) {
        // Filter out any legacy temp fake expenditures
        const cleanExp = expenditures.filter(e => !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id));
        this.expenditures = cleanExp;
        localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(cleanExp));
        this.notify();
      }
    });

    // 5. Subscribe to Songs in Cloud Firestore
    firebaseRealtime.subscribeToSongs((songs) => {
      if (Array.isArray(songs) && songs.length > 0) {
        this.songs = songs;
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
        this.notify();
      }
    });
  }

  private loadInitialStorage() {
    if (typeof window === 'undefined') return;

    // Load Volunteer
    const savedVolunteer = localStorage.getItem(STORAGE_KEYS.CURRENT_VOLUNTEER);
    if (savedVolunteer) {
      try {
        const parsed = JSON.parse(savedVolunteer);
        // Clean out any accidental manager/admin profile
        if (
          parsed && 
          (parsed.id === 'rrbm-manager-admin' || 
           parsed.role === 'admin' || 
           parsed.name?.toLowerCase().includes('admin'))
        ) {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_VOLUNTEER);
          this.currentVolunteer = null;
        } else {
          this.currentVolunteer = parsed;
        }
      } catch {
        this.currentVolunteer = null;
      }
    } else {
      this.currentVolunteer = null;
    }

    // Load Chat
    const savedChat = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
    if (savedChat) {
      try {
        this.chatMessages = JSON.parse(savedChat);
      } catch {
        this.chatMessages = [];
      }
    } else {
      this.chatMessages = [];
    }

    // Load Active Alert
    const savedAlert = localStorage.getItem(STORAGE_KEYS.ACTIVE_ALERT);
    if (savedAlert) {
      try {
        this.activeAlert = JSON.parse(savedAlert);
      } catch {
        this.activeAlert = null;
      }
    }

    // Load Balance
    const savedBalance = localStorage.getItem(STORAGE_KEYS.OFFERING_BALANCE);
    if (savedBalance) {
      try {
        this.offeringBalance = JSON.parse(savedBalance);
      } catch {
        // use default
      }
    }

    // Load Expenditures (Permanent User Entries)
    const savedExp = localStorage.getItem(STORAGE_KEYS.EXPENDITURES);
    if (savedExp !== null) {
      try {
        const parsed = JSON.parse(savedExp);
        if (Array.isArray(parsed)) {
          // Filter out legacy temp dummy expenditures
          this.expenditures = parsed.filter(e => !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id));
        } else {
          this.expenditures = [];
        }
      } catch {
        this.expenditures = [];
      }
    } else {
      this.expenditures = [];
    }

    // Load Songs (Preserve All Added Songs & Hymnal)
    const savedSongs = localStorage.getItem(STORAGE_KEYS.SONGS);
    if (savedSongs !== null) {
      try {
        const parsed = JSON.parse(savedSongs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasAnyMain = parsed.some(s => s.isMainSong);
          if (!hasAnyMain) {
            this.songs = parsed.map(s => {
              if (s.id === 's1') return { ...s, isMainSong: true, mainSongDay: 'day1' };
              if (s.id === 's7') return { ...s, isMainSong: true, mainSongDay: 'day2' };
              if (s.id === 's13') return { ...s, isMainSong: true, mainSongDay: 'day3' };
              return s;
            });
          } else {
            this.songs = parsed;
          }
        } else {
          this.songs = DEFAULT_SONGS_SEEDS;
        }
      } catch {
        this.songs = DEFAULT_SONGS_SEEDS;
      }
    } else {
      this.songs = DEFAULT_SONGS_SEEDS;
    }
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        this.handleEvent(type, payload, false);
      };
    }
  }

  private initLifecycleListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[RealtimeStore] Device online event detected');
      if (this.isCloudFirebaseMode) {
        this.connectionStatus = 'connected';
        this.notify();
      } else {
        this.reconnectWithServer();
      }
    });

    window.addEventListener('focus', () => {
      if (!this.isCloudFirebaseMode && this.connectionStatus !== 'connected') {
        this.reconnectWithServer();
      }
    });
  }

  public getWebSocketUrl(): string {
    const baseUrl = getServerBaseUrl();
    try {
      const parsed = new URL(baseUrl);
      const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${parsed.host}/ws`;
    } catch {
      const envWs = import.meta.env.VITE_WS_URL;
      if (envWs && envWs.trim() && !envWs.includes('192.168.')) return envWs.trim();
      return 'wss://rrbm-app-backend.onrender.com/ws';
    }
  }

  public reconnectWithServer(newServerUrl?: string) {
    if (newServerUrl !== undefined) {
      setCustomServerUrl(newServerUrl);
    }

    if (isFirebaseConfigured()) {
      firebaseRealtime.cleanup();
      this.initFirebaseRealtime();
      return;
    }

    this.isCloudFirebaseMode = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectAttempts = 0;
    this.connectWebSocket();
    this.fetchInitialData();
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;

    try {
      this.connectionStatus = 'connecting';
      this.notify();

      const wsUrl = this.getWebSocketUrl();
      console.log(`[RealtimeStore] Connecting to WebSocket: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[RealtimeStore] WebSocket connected successfully to ${wsUrl}`);
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.notify();
        this.startHeartbeat();
        this.fetchInitialData();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type) {
            this.handleEvent(data.type, data.payload, true);
          }
        } catch (err) {
          console.warn('[RealtimeStore] WS parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.connectionStatus = 'offline';
        this.notify();
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[RealtimeStore] WebSocket error:', err);
        this.connectionStatus = 'offline';
        this.notify();
      };
    } catch (e) {
      console.warn('[RealtimeStore] WebSocket connection failed:', e);
      this.connectionStatus = 'offline';
      this.notify();
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(2000 + this.reconnectAttempts * 1000, 5000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, delay);
  }

  public async fetchInitialData() {
    if (this.isCloudFirebaseMode) return;

    try {
      const [alertRes, chatRes, balanceRes, expRes, songsRes] = await Promise.allSettled([
        apiClient.getActiveAlert(),
        apiClient.getChatMessages(),
        apiClient.getOfferingBalance(),
        apiClient.getExpenditures(),
        apiClient.getSongs()
      ]);

      if (alertRes.status === 'fulfilled' && alertRes.value.success) {
        this.activeAlert = alertRes.value.activeAlert;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ALERT, JSON.stringify(this.activeAlert));
      }

      if (chatRes.status === 'fulfilled' && chatRes.value.success && chatRes.value.messages) {
        this.chatMessages = chatRes.value.messages;
        localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(this.chatMessages));
      }

      if (balanceRes.status === 'fulfilled' && balanceRes.value.success && balanceRes.value.balance) {
        this.offeringBalance = balanceRes.value.balance;
        localStorage.setItem(STORAGE_KEYS.OFFERING_BALANCE, JSON.stringify(this.offeringBalance));
      }

      if (expRes.status === 'fulfilled' && expRes.value.success && Array.isArray(expRes.value.expenditures)) {
        const filteredServerExps = expRes.value.expenditures.filter(e => !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id));
        const expMap = new Map<string, Expenditure>();
        this.expenditures.filter(e => !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id)).forEach(e => expMap.set(e.id, e));
        filteredServerExps.forEach(e => expMap.set(e.id, e));
        this.expenditures = Array.from(expMap.values());
        localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
      }

      if (songsRes.status === 'fulfilled' && songsRes.value.success && Array.isArray(songsRes.value.songs) && songsRes.value.songs.length > 0) {
        const songMap = new Map<string, Song>();
        this.songs.forEach(s => songMap.set(s.id, s));
        songsRes.value.songs.forEach(s => songMap.set(s.id, s));
        this.songs = Array.from(songMap.values());
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
      }

      this.notify();
    } catch {
      // Offline fallback
    }
  }

  private handleEvent(type: string, payload: any, shouldBroadcastLocal = true) {
    if (!type) return;

    if (type === 'INITIAL_SYNC') {
      if (payload.activeAlert !== undefined) {
        this.activeAlert = payload.activeAlert;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ALERT, JSON.stringify(this.activeAlert));
      }
      if (payload.chatMessages && Array.isArray(payload.chatMessages)) {
        this.chatMessages = payload.chatMessages;
        localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(this.chatMessages));
      }
      if (payload.offeringBalance) {
        this.offeringBalance = payload.offeringBalance;
        localStorage.setItem(STORAGE_KEYS.OFFERING_BALANCE, JSON.stringify(this.offeringBalance));
      }
      if (payload.expenditures && Array.isArray(payload.expenditures)) {
        // Merge without losing locally saved user entries and strip temp entries
        const filteredServerExps = payload.expenditures.filter((e: Expenditure) => !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id));
        const expMap = new Map<string, Expenditure>();
        this.expenditures.filter(e => !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id)).forEach(e => expMap.set(e.id, e));
        filteredServerExps.forEach((e: Expenditure) => {
          if (!expMap.has(e.id)) expMap.set(e.id, e);
        });
        this.expenditures = Array.from(expMap.values());
        localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
      }
      if (payload.songs && Array.isArray(payload.songs) && payload.songs.length > 0) {
        // Merge without losing locally added songs
        const songMap = new Map<string, Song>();
        this.songs.forEach(s => songMap.set(s.id, s));
        payload.songs.forEach((s: Song) => {
          if (!songMap.has(s.id)) songMap.set(s.id, s);
        });
        this.songs = Array.from(songMap.values());
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
      }
      this.notify();
      return;
    }

    if (type === 'ALERT_CREATED') {
      const { alert, chatMessage } = payload;
      this.activeAlert = alert;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ALERT, JSON.stringify(alert));

      if (chatMessage && !this.chatMessages.find(m => m.id === chatMessage.id)) {
        this.chatMessages.push(chatMessage);
        localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(this.chatMessages));
      }

      triggerAlertSoundAndVibration(
        '🚨 RRBM VOLUNTEER ALERT',
        alert.message || 'Volunteers are requested to gather immediately. Tap to open live room.'
      );

      this.notify();
    } else if (type === 'ALERT_RESOLVED') {
      this.activeAlert = null;
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ALERT);
      this.notify();
    } else if (type === 'CHAT_MESSAGE_CREATED') {
      const newMsg = payload.message || payload;
      if (newMsg && !this.chatMessages.find(m => m.id === newMsg.id)) {
        this.chatMessages.push(newMsg);
        localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(this.chatMessages));
        
        if (!this.currentVolunteer || newMsg.volunteerId !== this.currentVolunteer.id) {
          triggerChatNotification(newMsg.senderName, newMsg.text);
        }

        this.notify();
      }
    } else if (type === 'VOLUNTEER_RESPONSE_UPDATED') {
      const { responses, chatMessage, alertId } = payload;
      if (this.activeAlert && (this.activeAlert.id === alertId || alertId === 'current') && responses) {
        this.activeAlert.responses = responses;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ALERT, JSON.stringify(this.activeAlert));
      }
      if (chatMessage && !this.chatMessages.find(m => m.id === chatMessage.id)) {
        this.chatMessages.push(chatMessage);
        localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(this.chatMessages));
      }
      this.notify();
    } else if (type === 'BALANCE_UPDATED') {
      this.offeringBalance = payload;
      localStorage.setItem(STORAGE_KEYS.OFFERING_BALANCE, JSON.stringify(payload));
      this.notify();
    } else if (type === 'EXPENDITURES_UPDATED') {
      this.expenditures = Array.isArray(payload) ? payload : [];
      localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
      this.notify();
    } else if (type === 'SONGS_UPDATED') {
      this.songs = Array.isArray(payload) ? payload : [];
      localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
      this.notify();
    } else if (type === 'VOLUNTEER_NAME_UPDATED') {
      if (payload && payload.id && this.currentVolunteer && this.currentVolunteer.id === payload.id) {
        this.currentVolunteer.name = payload.name;
        localStorage.setItem(STORAGE_KEYS.CURRENT_VOLUNTEER, JSON.stringify(this.currentVolunteer));
      }
      this.notify();
    } else if (type === 'CHAT_CLEARED') {
      this.chatMessages = [];
      localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify([]));
      this.notify();
    }

    if (shouldBroadcastLocal && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type, payload });
      } catch {}
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // ==========================================
  // PUBLIC ACTIONS
  // ==========================================

  // 1. Volunteer Sign-In with Volunteer ID (Default festival password: 2026)
  public async signInVolunteer(volunteerId: string, password?: string): Promise<Volunteer> {
    const trimmedId = volunteerId.trim();
    if (!trimmedId) {
      throw new Error('Please enter your Volunteer ID / UID.');
    }
    // Default password is 2026 for all volunteer logins
    const cleanPassword = (password || '2026').trim() || '2026';

    // Authoritative Backend Authentication via /api/volunteers/login
    try {
      const res = await apiClient.loginVolunteer(trimmedId, cleanPassword);
      if (res.success && res.volunteer) {
        if (res.token) {
          localStorage.setItem('rrbm_volunteer_token', res.token);
        }

        // If backend returned a Firebase custom token, attach Firebase Auth session
        if (res.customToken) {
          const { auth } = getFirebaseServices();
          if (auth) {
            try {
              await signInWithCustomToken(auth, res.customToken);
            } catch (authErr) {
              console.warn('[RealtimeStore] Custom token sign-in notice:', authErr);
            }
          }
        }

        this.currentVolunteer = res.volunteer;
        localStorage.setItem(STORAGE_KEYS.CURRENT_VOLUNTEER, JSON.stringify(res.volunteer));

        // Connect real-time listeners
        if (this.isCloudFirebaseMode && res.customToken) {
          this.attachFirestoreListeners();
        }
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.connectWebSocket();
          this.fetchInitialData();
        }

        this.notify();
        return res.volunteer;
      }
      throw new Error('Server returned invalid volunteer response.');
    } catch (err: any) {
      const errMsg = err.message || '';

      // If backend explicitly rejected credentials or account status (400, 401, 403),
      // we check Cloud Firebase Mode as fallback only if not an explicit deactivation.
      if (
        errMsg.includes('Invalid Volunteer ID or password') ||
        errMsg.includes('deactivated') ||
        errMsg.includes('not provisioned') ||
        errMsg.includes('required')
      ) {
        if (this.isCloudFirebaseMode && !errMsg.includes('deactivated')) {
          try {
            const vol = await firebaseRealtime.signInVolunteer(trimmedId, cleanPassword);
            this.currentVolunteer = vol;
            localStorage.setItem(STORAGE_KEYS.CURRENT_VOLUNTEER, JSON.stringify(vol));
            this.attachFirestoreListeners();
            this.notify();
            return vol;
          } catch {
            // Firebase Auth also rejected; throw authoritative backend message
            throw new Error(errMsg);
          }
        }
        throw new Error(errMsg);
      }

      // If backend network request failed (offline / network error),
      // attempt Cloud Firebase Auth if available as offline fallback
      if (this.isCloudFirebaseMode) {
        try {
          const vol = await firebaseRealtime.signInVolunteer(trimmedId, cleanPassword);
          this.currentVolunteer = vol;
          localStorage.setItem(STORAGE_KEYS.CURRENT_VOLUNTEER, JSON.stringify(vol));
          this.attachFirestoreListeners();
          this.notify();
          return vol;
        } catch (fbErr: any) {
          throw new Error(fbErr.message || 'Authentication failed. Please check your network connection.');
        }
      }

      throw new Error(errMsg || 'Failed to sign in. Check your credentials or internet connection.');
    }
  }

  public async signOutVolunteer() {
    if (this.isCloudFirebaseMode) {
      try {
        await firebaseRealtime.signOutVolunteer();
      } catch {}
    }
    this.currentVolunteer = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_VOLUNTEER);
    localStorage.removeItem('rrbm_volunteer_token');
    this.notify();
  }

  // 2. Trigger Immediate Alert Across All Devices (No Cooldown)
  public async triggerImmediateAlert(customMessage?: string): Promise<{ success: boolean; alert: AlertEvent }> {
    const senderId = this.currentVolunteer ? this.currentVolunteer.id : '260';
    const senderName = this.currentVolunteer ? this.currentVolunteer.name : 'Leader Desk';
    const alertMsgText = customMessage || '🚨 PRAYER ALERT: Volunteers are requested to gather immediately!';

    try {
      // Cloud Firebase Dispatch
      if (this.isCloudFirebaseMode) {
        try {
          const alert = await firebaseRealtime.triggerAlert(senderId, senderName, alertMsgText);
          this.activeAlert = alert;
          localStorage.setItem(STORAGE_KEYS.ACTIVE_ALERT, JSON.stringify(alert));
          this.notify();
          // Dual-dispatch to backend server in background to notify WebSockets and background services
          apiClient.createAlert(senderId, senderName, alertMsgText).catch(() => {});
          return { success: true, alert };
        } catch (fbErr) {
          console.warn('[RealtimeStore] Cloud Firebase alert notice, syncing with server:', fbErr);
        }
      }

      // Node Server Dispatch
      const res = await apiClient.createAlert(senderId, senderName, alertMsgText);
      if (res.success && res.alert) {
        this.activeAlert = res.alert;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ALERT, JSON.stringify(res.alert));
        if (res.chatMessage && !this.chatMessages.find(m => m.id === res.chatMessage.id)) {
          this.chatMessages.push(res.chatMessage);
          localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(this.chatMessages));
        }

        triggerAlertSoundAndVibration('🚨 RRBM VOLUNTEER ALERT', alertMsgText);
        this.notify();
        return { success: true, alert: res.alert };
      } else {
        throw new Error('Server did not confirm alert broadcast.');
      }
    } catch (err: any) {
      console.error('[RealtimeStore] Alert dispatch failed:', err.message);
      throw new Error(err.message || 'Failed to dispatch alert across devices. Check internet connection.');
    }
  }

  // 3. Quick Response Button Handler (I'M COMING / COMING LATE / CAN'T COME)
  public async sendQuickResponse(responseType: 'coming' | 'coming_late' | 'not_coming'): Promise<void> {
    if (!this.currentVolunteer) {
      throw new Error('Please check in as a volunteer first.');
    }

    const alertId = this.activeAlert ? this.activeAlert.id : 'current';

    try {
      const { auth } = getFirebaseServices();
      if (this.isCloudFirebaseMode && auth?.currentUser) {
        try {
          await firebaseRealtime.sendQuickResponse(
            this.currentVolunteer.id,
            this.currentVolunteer.name,
            responseType
          );
          // Dual-dispatch to backend server so WebSockets and background polling receive it
          apiClient.sendAlertResponse(
            alertId,
            this.currentVolunteer.id,
            this.currentVolunteer.name,
            responseType
          ).catch(() => {});
          return;
        } catch (fbErr) {
          console.warn('[RealtimeStore] Cloud Firebase quick response failed, falling back to server:', fbErr);
        }
      }

      const res = await apiClient.sendAlertResponse(
        alertId,
        this.currentVolunteer.id,
        this.currentVolunteer.name,
        responseType
      );

      if (res.success) {
        if (this.activeAlert && res.responses) {
          this.activeAlert.responses = res.responses;
          localStorage.setItem(STORAGE_KEYS.ACTIVE_ALERT, JSON.stringify(this.activeAlert));
        }
        if (res.chatMessage && !this.chatMessages.find(m => m.id === res.chatMessage.id)) {
          this.chatMessages.push(res.chatMessage);
          localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(this.chatMessages));
        }
        this.notify();
      }
    } catch (err: any) {
      console.error('[RealtimeStore] Quick response failed:', err.message);
      throw new Error(err.message || 'Failed to send response to other volunteers.');
    }
  }

  // 4. Send Custom Live Chat Message
  public async sendChatMessage(text: string): Promise<ChatMessage> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty.');
    }

    const volunteerId = this.currentVolunteer ? this.currentVolunteer.id : '260';
    const senderName = this.currentVolunteer ? this.currentVolunteer.name : 'Volunteer';

    try {
      const { auth } = getFirebaseServices();
      if (this.isCloudFirebaseMode && auth?.currentUser) {
        try {
          const msg = await firebaseRealtime.sendChatMessage(volunteerId, senderName, trimmed);
          // Dual-dispatch to backend server so WebSockets and background services receive it
          apiClient.sendChatMessage(volunteerId, senderName, trimmed).catch(() => {});
          return msg;
        } catch (fbErr) {
          console.warn('[RealtimeStore] Cloud Firebase chat failed, falling back to server:', fbErr);
        }
      }

      const res = await apiClient.sendChatMessage(volunteerId, senderName, trimmed);
      if (res.success && res.message) {
        if (!this.chatMessages.find(m => m.id === res.message.id)) {
          this.chatMessages.push(res.message);
          localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(this.chatMessages));
          this.notify();
        }
        return res.message;
      }
      throw new Error('Failed to send message: Server did not return message confirmation.');
    } catch (err: any) {
      console.error('[RealtimeStore] Send chat failed:', err.message);
      throw new Error(err.message || 'Failed to send message. Please try again.');
    }
  }

  // 4b. Clear Live Chat Messages (Manager Desk)
  public async clearChat(authTokenOrPin = '2026'): Promise<boolean> {
    this.chatMessages = [];
    localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify([]));
    this.notify();

    // Clear Cloud Firestore if active
    await firebaseRealtime.clearChat();

    // Clear backend server database & notify all connected WebSocket clients
    try {
      await apiClient.clearChat(authTokenOrPin);
    } catch (e) {
      console.warn('[RealtimeStore] Backend clearChat notice:', e);
    }

    return true;
  }

  // 5. Update Offering Balance (Manager Desk)
  public async updateOfferingBalance(amount: number, adminPin: string, updatedBy = 'Festival Manager'): Promise<boolean> {
    const newBal: OfferingBalance = {
      amount,
      updatedBy,
      updatedAt: new Date().toISOString()
    };
    this.offeringBalance = newBal;
    localStorage.setItem(STORAGE_KEYS.OFFERING_BALANCE, JSON.stringify(newBal));
    this.notify();

    // Persist permanently in Cloud Firestore
    await firebaseRealtime.saveBalanceToCloud(newBal);

    try {
      const res = await apiClient.updateOfferingBalance(amount, adminPin, updatedBy);
      if (res.success && res.balance) {
        this.offeringBalance = res.balance;
        localStorage.setItem(STORAGE_KEYS.OFFERING_BALANCE, JSON.stringify(res.balance));
        await firebaseRealtime.saveBalanceToCloud(res.balance);
        this.notify();
      }
      return true;
    } catch (err: any) {
      console.warn('[RealtimeStore] Backend balance update notice:', err);
      return true;
    }
  }

  // 6. Resolve Active Alert
  public async resolveAlert(alertId?: string): Promise<boolean> {
    try {
      if (this.isCloudFirebaseMode) {
        await firebaseRealtime.resolveAlert();
        this.activeAlert = null;
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ALERT);
        this.notify();
        return true;
      }

      const targetId = alertId || (this.activeAlert ? this.activeAlert.id : 'current');
      const res = await apiClient.resolveAlert(targetId);
      if (res.success) {
        this.activeAlert = null;
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ALERT);
        this.notify();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Alert resolve failed:', err.message);
      throw err;
    }
  }

  // Getters
  public getCurrentVolunteer(): Volunteer | null {
    return this.currentVolunteer;
  }

  public getActiveAlert(): AlertEvent | null {
    return this.activeAlert;
  }

  public getChatMessages(): ChatMessage[] {
    return [...this.chatMessages];
  }

  public getOfferingBalance(): OfferingBalance {
    return this.offeringBalance;
  }

  public getExpenditures(): Expenditure[] {
    return [...this.expenditures];
  }

  public async addExpenditure(date: string, purpose: string, amount: number, adminPin?: string): Promise<Expenditure[]> {
    const pinToUse = adminPin || '2026';
    const newExp: Expenditure = {
      id: `EXP_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date,
      purpose,
      amount,
      createdAt: new Date().toISOString()
    };
    this.expenditures = [newExp, ...this.expenditures].filter(e => !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id));
    localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
    this.notify();

    // Persist permanently to Cloud Firestore
    await firebaseRealtime.saveExpendituresToCloud(this.expenditures);

    try {
      const res = await apiClient.addExpenditure({ date, purpose, amount }, pinToUse);
      if (res.success && Array.isArray(res.expenditures)) {
        const clean = res.expenditures.filter(e => !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id));
        this.expenditures = clean;
        localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
        await firebaseRealtime.saveExpendituresToCloud(this.expenditures);
        this.notify();
      }
    } catch (err) {
      console.warn('[RealtimeStore] Backend expenditure sync notice:', err);
    }
    return this.expenditures;
  }

  public async deleteExpenditure(id: string, adminPin?: string): Promise<Expenditure[]> {
    const pinToUse = adminPin || '2026';
    this.expenditures = this.expenditures.filter(e => e.id !== id && !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id));
    localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
    this.notify();

    // Persist permanently to Cloud Firestore
    await firebaseRealtime.saveExpendituresToCloud(this.expenditures);

    try {
      const res = await apiClient.deleteExpenditure(id, pinToUse);
      if (res.success && Array.isArray(res.expenditures)) {
        const clean = res.expenditures.filter(e => !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id));
        this.expenditures = clean;
        localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
        await firebaseRealtime.saveExpendituresToCloud(this.expenditures);
        this.notify();
      }
    } catch (err) {
      console.warn('[RealtimeStore] Backend expenditure delete notice:', err);
    }
    return this.expenditures;
  }

  public async updateVolunteerName(volunteerId: string, name: string, adminPin?: string): Promise<boolean> {
    const pinToUse = adminPin || '2026';
    const res = await apiClient.updateVolunteerName(volunteerId, name, pinToUse);
    if (res.success) {
      if (this.currentVolunteer && this.currentVolunteer.id === volunteerId) {
        this.currentVolunteer.name = name;
        localStorage.setItem(STORAGE_KEYS.CURRENT_VOLUNTEER, JSON.stringify(this.currentVolunteer));
      }
      this.notify();
      return true;
    }
    throw new Error((res as any).message || 'Failed to update volunteer name');
  }

  // Songs Hymnal Methods
  public getSongs(): Song[] {
    return [...this.songs];
  }

  public async addSong(
    title: string, 
    lyrics: string, 
    adminPin?: string,
    options?: { isMainSong?: boolean; mainSongDay?: 'day1' | 'day2' | 'day3' | null; day?: string; key?: string; category?: string }
  ): Promise<Song[]> {
    const pinToUse = adminPin || '2026';
    const isMain = Boolean(options?.isMainSong);
    const mainDay = isMain && options?.mainSongDay ? options.mainSongDay : null;
    const songDay = mainDay || options?.day || 'all';

    // If new song is marked as main song for a day, clear previous main song of that day
    if (isMain && mainDay) {
      this.songs = this.songs.map(s => {
        if (s.mainSongDay === mainDay) {
          return { ...s, isMainSong: false, mainSongDay: undefined };
        }
        return s;
      });
    }

    const newSong: Song = {
      id: `SONG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      lyrics,
      category: options?.category || 'Worship',
      day: songDay,
      key: options?.key || 'Scale',
      sub: isMain && mainDay ? `Main Highlighted Song (${mainDay.toUpperCase()})` : 'Added from Management Desk',
      tempo: 'Live',
      time: 'Session',
      isMainSong: isMain,
      mainSongDay: isMain ? mainDay : undefined,
      createdAt: new Date().toISOString()
    };
    this.songs = [newSong, ...this.songs];
    localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
    this.notify();

    // Persist permanently to Cloud Firestore
    await firebaseRealtime.saveSongsToCloud(this.songs);

    try {
      const res = await apiClient.addSong({ 
        title, 
        lyrics, 
        category: newSong.category, 
        day: newSong.day, 
        key: newSong.key,
        isMainSong: isMain,
        mainSongDay: mainDay
      }, pinToUse);
      if (res.success && Array.isArray(res.songs)) {
        const songMap = new Map<string, Song>();
        this.songs.forEach(s => songMap.set(s.id, s));
        res.songs.forEach(s => songMap.set(s.id, s));
        this.songs = Array.from(songMap.values());
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
        await firebaseRealtime.saveSongsToCloud(this.songs);
        this.notify();
      }
    } catch (err) {
      console.warn('[RealtimeStore] Backend song sync notice:', err);
    }
    return this.songs;
  }

  public async setMainSong(
    songId: string, 
    mainSongDay: 'day1' | 'day2' | 'day3' | null, 
    adminPin?: string
  ): Promise<Song[]> {
    const pinToUse = adminPin || '2026';
    const isMain = Boolean(mainSongDay);

    this.songs = this.songs.map(s => {
      // Clear previous main song of this day
      if (mainSongDay && s.mainSongDay === mainSongDay && s.id !== songId) {
        return { ...s, isMainSong: false, mainSongDay: undefined };
      }
      if (s.id === songId) {
        return {
          ...s,
          isMainSong: isMain,
          mainSongDay: isMain ? mainSongDay : undefined,
          day: isMain ? mainSongDay : (s.day || 'all'),
          sub: isMain ? `Main Highlighted Song (${mainSongDay!.toUpperCase()})` : 'Added from Management Desk'
        };
      }
      return s;
    });

    localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
    this.notify();

    // Persist permanently to Cloud Firestore
    await firebaseRealtime.saveSongsToCloud(this.songs);

    try {
      const res = await apiClient.setMainSong(songId, mainSongDay, pinToUse);
      if (res.success && Array.isArray(res.songs)) {
        this.songs = res.songs;
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
        await firebaseRealtime.saveSongsToCloud(this.songs);
        this.notify();
      }
    } catch (err) {
      console.warn('[RealtimeStore] Backend song setMain notice:', err);
    }
    return this.songs;
  }

  public async deleteSong(id: string, adminPin?: string): Promise<Song[]> {
    const pinToUse = adminPin || '2026';
    this.songs = this.songs.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
    this.notify();

    // Persist permanently to Cloud Firestore
    await firebaseRealtime.saveSongsToCloud(this.songs);

    try {
      const res = await apiClient.deleteSong(id, pinToUse);
      if (res.success && Array.isArray(res.songs)) {
        this.songs = this.songs.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
        await firebaseRealtime.saveSongsToCloud(this.songs);
        this.notify();
      }
    } catch (err) {
      console.warn('[RealtimeStore] Backend song delete notice:', err);
    }
    return this.songs;
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public isUsingCloud(): boolean {
    return this.isCloudFirebaseMode;
  }
}

export const realtimeStore = new RealtimeStoreService();
