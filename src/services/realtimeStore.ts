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

const INITIAL_EXPENDITURES: Expenditure[] = [
  { id: 'EXP_1', date: '2026-10-20', purpose: 'Sound & Tent arrangement', amount: 25000, createdAt: '2026-10-20T10:00:00.000Z' },
  { id: 'EXP_2', date: '2026-10-21', purpose: 'Food & Refreshments for volunteers', amount: 18500, createdAt: '2026-10-21T12:30:00.000Z' },
  { id: 'EXP_3', date: '2026-10-22', purpose: 'Stage lighting and flower decoration', amount: 12000, createdAt: '2026-10-22T08:00:00.000Z' }
];

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

      // Listen to Firebase Auth state to attach/detach protected Firestore listeners
      firebaseRealtime.initAuthListener((authenticatedVolunteer) => {
        if (authenticatedVolunteer) {
          this.currentVolunteer = authenticatedVolunteer;
          localStorage.setItem(STORAGE_KEYS.CURRENT_VOLUNTEER, JSON.stringify(authenticatedVolunteer));
          this.attachFirestoreListeners();
          this.notify();
        } else {
          // If Firebase Auth has no active user, only clean up Firebase Firestore listeners.
          // Do NOT wipe currentVolunteer if authenticated via backend session.
          firebaseRealtime.cleanup();
          const hasBackendSession = localStorage.getItem('rrbm_volunteer_token');
          if (!hasBackendSession && !localStorage.getItem(STORAGE_KEYS.CURRENT_VOLUNTEER)) {
            this.currentVolunteer = null;
            this.notify();
          }
        }
      });

      if (this.currentVolunteer) {
        this.attachFirestoreListeners();
      }

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
      if (messages && messages.length > 0) {
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
  }

  private loadInitialStorage() {
    if (typeof window === 'undefined') return;

    // Load Volunteer
    const savedVolunteer = localStorage.getItem(STORAGE_KEYS.CURRENT_VOLUNTEER);
    if (savedVolunteer) {
      try {
        this.currentVolunteer = JSON.parse(savedVolunteer);
      } catch {
        this.currentVolunteer = null;
      }
    }

    // Load Chat
    const savedChat = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
    if (savedChat) {
      try {
        this.chatMessages = JSON.parse(savedChat);
      } catch {
        this.chatMessages = INITIAL_CHAT;
      }
    } else {
      this.chatMessages = INITIAL_CHAT;
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

    // Load Expenditures
    const savedExp = localStorage.getItem(STORAGE_KEYS.EXPENDITURES);
    if (savedExp) {
      try {
        this.expenditures = JSON.parse(savedExp);
      } catch {
        this.expenditures = INITIAL_EXPENDITURES;
      }
    } else {
      this.expenditures = INITIAL_EXPENDITURES;
    }

    // Load Songs
    const savedSongs = localStorage.getItem(STORAGE_KEYS.SONGS);
    if (savedSongs) {
      try {
        this.songs = JSON.parse(savedSongs);
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

      if (expRes.status === 'fulfilled' && expRes.value.success && expRes.value.expenditures) {
        this.expenditures = expRes.value.expenditures;
        localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
      }

      if (songsRes.status === 'fulfilled' && songsRes.value.success && songsRes.value.songs) {
        this.songs = songsRes.value.songs;
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
        this.expenditures = payload.expenditures;
        localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
      }
      if (payload.songs && Array.isArray(payload.songs)) {
        this.songs = payload.songs;
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

  // 1. Volunteer Sign-In with Volunteer ID & Password
  public async signInVolunteer(volunteerId: string, password?: string): Promise<Volunteer> {
    const trimmedId = volunteerId.trim();
    if (!trimmedId) {
      throw new Error('Please enter your Volunteer ID.');
    }
    const cleanPassword = (password || '').trim();
    if (!cleanPassword) {
      throw new Error('Please enter your password.');
    }

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

  // 2. Trigger Immediate Alert Across All Devices (Cloud / Network)
  public async triggerImmediateAlert(customMessage?: string): Promise<{ success: boolean; alert: AlertEvent }> {
    if (this.isProcessingAlert) {
      throw new Error('An alert is already being broadcast.');
    }
    this.isProcessingAlert = true;

    const senderId = this.currentVolunteer ? this.currentVolunteer.id : '260';
    const senderName = this.currentVolunteer ? this.currentVolunteer.name : 'Leader Desk';
    const alertMsgText = customMessage || '🚨 PRAYER ALERT: Volunteers are requested to gather immediately!';

    try {
      // Cloud Firebase Dispatch (if authenticated with Firebase)
      const { auth } = getFirebaseServices();
      if (this.isCloudFirebaseMode && auth?.currentUser) {
        try {
          const alert = await firebaseRealtime.triggerAlert(senderId, senderName, alertMsgText);
          this.activeAlert = alert;
          localStorage.setItem(STORAGE_KEYS.ACTIVE_ALERT, JSON.stringify(alert));
          this.notify();
          return { success: true, alert };
        } catch (fbErr) {
          console.warn('[RealtimeStore] Cloud Firebase alert failed, falling back to server:', fbErr);
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
    } finally {
      setTimeout(() => {
        this.isProcessingAlert = false;
      }, 1000);
    }
  }

  // 3. Quick Response Button Handler (I'M COMING / COMING LATE / CAN'T COME)
  public async sendQuickResponse(responseType: 'coming' | 'coming_late' | 'not_coming'): Promise<void> {
    if (!this.currentVolunteer) {
      throw new Error('Please check in as a volunteer first.');
    }

    try {
      const { auth } = getFirebaseServices();
      if (this.isCloudFirebaseMode && auth?.currentUser) {
        try {
          await firebaseRealtime.sendQuickResponse(
            this.currentVolunteer.id,
            this.currentVolunteer.name,
            responseType
          );
          return;
        } catch (fbErr) {
          console.warn('[RealtimeStore] Cloud Firebase quick response failed, falling back to server:', fbErr);
        }
      }

      const alertId = this.activeAlert ? this.activeAlert.id : 'current';
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
          return await firebaseRealtime.sendChatMessage(volunteerId, senderName, trimmed);
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

  // 5. Update Offering Balance (Manager Desk)
  public async updateOfferingBalance(amount: number, adminPin: string, updatedBy = 'Festival Manager'): Promise<boolean> {
    try {
      const res = await apiClient.updateOfferingBalance(amount, adminPin, updatedBy);
      if (res.success && res.balance) {
        this.offeringBalance = res.balance;
        localStorage.setItem(STORAGE_KEYS.OFFERING_BALANCE, JSON.stringify(res.balance));
        this.notify();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Balance update failed:', err.message);
      throw err;
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

  public async addExpenditure(date: string, purpose: string, amount: number, adminPin: string): Promise<Expenditure[]> {
    const res = await apiClient.addExpenditure({ date, purpose, amount }, adminPin);
    if (res.success && res.expenditures) {
      this.expenditures = res.expenditures;
      localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
      this.notify();
      return this.expenditures;
    }
    throw new Error((res as any).message || 'Failed to save expenditure');
  }

  public async deleteExpenditure(id: string, adminPin: string): Promise<Expenditure[]> {
    const res = await apiClient.deleteExpenditure(id, adminPin);
    if (res.success && res.expenditures) {
      this.expenditures = res.expenditures;
      localStorage.setItem(STORAGE_KEYS.EXPENDITURES, JSON.stringify(this.expenditures));
      this.notify();
      return this.expenditures;
    }
    throw new Error((res as any).message || 'Failed to delete expenditure');
  }

  public async updateVolunteerName(volunteerId: string, name: string, adminPin: string): Promise<boolean> {
    const res = await apiClient.updateVolunteerName(volunteerId, name, adminPin);
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

  public async addSong(title: string, lyrics: string, adminPin: string): Promise<Song[]> {
    const res = await apiClient.addSong({ title, lyrics, category: 'Worship', day: 'all', key: 'Scale' }, adminPin);
    if (res.success && res.songs) {
      this.songs = res.songs;
      localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
      this.notify();
      return this.songs;
    }
    throw new Error((res as any).message || 'Failed to add song');
  }

  public async deleteSong(id: string, adminPin: string): Promise<Song[]> {
    const res = await apiClient.deleteSong(id, adminPin);
    if (res.success && res.songs) {
      this.songs = res.songs;
      localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songs));
      this.notify();
      return this.songs;
    }
    throw new Error((res as any).message || 'Failed to delete song');
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public isUsingCloud(): boolean {
    return this.isCloudFirebaseMode;
  }
}

export const realtimeStore = new RealtimeStoreService();
