// src/services/firebaseRealtimeService.ts
// Production Firebase Cloud Firestore & Auth Service for Free Internet-Wide Alert and Live Chat Sync

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  getAuth
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirebaseServices, isFirebaseConfigured, getActiveFirebaseConfig } from '../config/firebase';
import { Volunteer, AlertEvent, ChatMessage, OfferingBalance, Expenditure, Song } from '../types/volunteer';
import { triggerAlertSoundAndVibration, triggerChatNotification } from './audioNotification';
import { apiClient } from './api';

/**
 * Maps a human-friendly Volunteer ID (e.g. "001", "002", "261")
 * to a private internal Firebase Authentication email identity.
 */
export function volunteerIdToEmail(volunteerId: string): string {
  const cleanId = volunteerId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${cleanId}@volunteer.rrbm.org`;
}

export class FirebaseRealtimeService {
  private unsubs: Array<() => void> = [];
  private currentVolunteer: Volunteer | null = null;
  private isProcessingAlert: boolean = false;

  public isAvailable(): boolean {
    return isFirebaseConfigured();
  }

  public async ensureAuthenticated(): Promise<string | null> {
    const { auth } = getFirebaseServices();
    if (!auth) return null;
    return auth.currentUser ? auth.currentUser.uid : null;
  }

  // Observe Firebase Authentication State and Restore Active Volunteer Identity
  public initAuthListener(onAuthChange: (volunteer: Volunteer | null) => void): () => void {
    const { auth, db } = getFirebaseServices();
    if (!auth || !db) return () => {};

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Never treat coordinator / manager admin session as a volunteer identity!
          if (
            firebaseUser.uid === 'rrbm-manager-admin' ||
            firebaseUser.email?.toLowerCase().includes('admin')
          ) {
            this.currentVolunteer = null;
            onAuthChange(null);
            return;
          }

          const email = firebaseUser.email || '';
          const idMatch = email.match(/^([^@]+)@/);
          const volunteerId = idMatch ? idMatch[1] : firebaseUser.uid;

          if (volunteerId === 'rrbm-manager-admin' || volunteerId.toLowerCase().includes('admin')) {
            this.currentVolunteer = null;
            onAuthChange(null);
            return;
          }

          const docRef = doc(db, 'volunteers', volunteerId);
          const snap = await getDoc(docRef);

          let vol: Volunteer;
          if (snap.exists()) {
            const d = snap.data();
            if (d.active === false) {
              await signOut(auth);
              this.currentVolunteer = null;
              onAuthChange(null);
              return;
            }
            vol = {
              id: volunteerId,
              name: d.name || `Volunteer ${volunteerId}`,
              registeredAt: d.createdAt?.toDate?.()?.toISOString() || d.registeredAt || '',
              active: true,
              role: d.role || 'volunteer'
            };
          } else {
            vol = {
              id: volunteerId,
              name: firebaseUser.displayName || `Volunteer ${volunteerId}`,
              active: true,
              role: 'volunteer'
            };
          }

          this.currentVolunteer = vol;
          onAuthChange(vol);
        } catch (err) {
          console.warn('[Firebase] Auth state observer error:', err);
        }
      } else {
        this.currentVolunteer = null;
        this.cleanup();
        onAuthChange(null);
      }
    });
  }

  // 1. Authenticate Volunteer with ID & Password (Default festival password: 2026)
  public async signInVolunteer(volunteerId: string, password?: string): Promise<Volunteer> {
    const { auth, db } = getFirebaseServices();
    if (!auth || !db) {
      throw new Error('Firebase services are not available. Please verify connection.');
    }

    const trimmedId = volunteerId.trim();
    if (!trimmedId) {
      throw new Error('Please enter your Volunteer ID / UID.');
    }
    const cleanPassword = (password || '2026').trim() || '2026';

    const email = volunteerIdToEmail(trimmedId);

    try {
      // Authenticate with Firebase Authentication
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, cleanPassword);
      } catch (firstErr: any) {
        if (cleanPassword === '2026') {
          // Try festival fallback
          userCredential = await signInWithEmailAndPassword(auth, email, 'rrbm2026');
        } else {
          throw firstErr;
        }
      }
      
      // Fetch Volunteer Profile Metadata from Cloud Firestore
      const volunteerRef = doc(db, 'volunteers', trimmedId);
      const volunteerSnap = await getDoc(volunteerRef);

      if (!volunteerSnap.exists()) {
        await signOut(auth);
        throw new Error('Volunteer account not provisioned. Please contact your coordinator.');
      }

      const data = volunteerSnap.data();
      if (data.active === false) {
        await signOut(auth);
        throw new Error('This volunteer account has been deactivated. Please contact your coordinator.');
      }

      const volunteer: Volunteer = {
        id: trimmedId,
        name: data.name || `Volunteer ${trimmedId}`,
        registeredAt: data.createdAt?.toDate?.()?.toISOString() || data.registeredAt || new Date().toISOString(),
        active: true,
        role: data.role || 'volunteer'
      };

      // Update heartbeat / last active (strict schema: only lastActive is modified)
      await setDoc(volunteerRef, {
        lastActive: serverTimestamp()
      }, { merge: true });

      this.currentVolunteer = volunteer;
      return volunteer;
    } catch (err: any) {
      console.warn('[Firebase Auth Error]:', err.code, err.message);
      if (
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found'
      ) {
        throw new Error('Invalid Volunteer ID or password. Please verify with your coordinator.');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Invalid Volunteer ID format. Please enter numbers/letters only.');
      } else if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many failed sign-in attempts. Please try again in a few minutes.');
      } else if (err.code === 'auth/network-request-failed') {
        throw new Error('Network connection failed. Please check your internet connection.');
      } else if (err.code === 'auth/user-disabled') {
        throw new Error('This volunteer account has been disabled by the coordinator.');
      } else if (err.code === 'auth/configuration-not-found') {
        throw new Error('Firebase Authentication is not yet enabled. In Firebase Console, go to Authentication > Sign-in method and enable Email/Password.');
      }
      throw err;
    }
  }

  // 2. Sign Out Volunteer
  public async signOutVolunteer(): Promise<void> {
    const { auth } = getFirebaseServices();
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('[Firebase Auth] Sign out error:', err);
      }
    }
    this.cleanup();
    this.currentVolunteer = null;
  }

  // 3. Admin Account Creation (Protected Backend Provisioning)
  public async createVolunteerAccount(volunteerId: string, name: string, initialPassword?: string): Promise<Volunteer> {
    const trimmedId = volunteerId.trim();
    const trimmedName = name.trim();
    const pwdToUse = (initialPassword || '2026').trim() || '2026';

    if (!trimmedId) throw new Error('Volunteer ID is required.');
    if (!trimmedName) throw new Error('Volunteer name is required.');

    const res = await apiClient.createVolunteerAccount({
      volunteerId: trimmedId,
      fullName: trimmedName,
      initialPassword: pwdToUse
    }, '2026');

    return {
      id: res.volunteer.volunteerId,
      name: res.volunteer.name,
      registeredAt: new Date().toISOString(),
      active: true,
      role: 'volunteer'
    };
  }

  // 4. Fetch All Registered Volunteers (for Coordinator Dashboard)
  public async fetchVolunteersList(): Promise<Volunteer[]> {
    const { db } = getFirebaseServices();
    if (!db) return [];

    try {
      const snap = await getDocs(collection(db, 'volunteers'));
      const list: Volunteer[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        list.push({
          id: d.id || docSnap.id,
          name: d.name || 'Volunteer',
          registeredAt: d.createdAt?.toDate?.()?.toISOString() || d.registeredAt || '',
          active: d.active !== false,
          role: d.role || 'volunteer'
        });
      });
      return list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    } catch (err) {
      console.warn('[Firebase] fetchVolunteersList error:', err);
      return [];
    }
  }

  // 5. Toggle Volunteer Status (Activate / Deactivate)
  public async toggleVolunteerActive(volunteerId: string, active: boolean): Promise<void> {
    const { db } = getFirebaseServices();
    if (!db) throw new Error('Database not connected.');
    const ref = doc(db, 'volunteers', volunteerId);
    await setDoc(ref, { active, updatedAt: serverTimestamp() }, { merge: true });
  }

  // 6. Legacy Check-In Adapter
  public async registerVolunteer(name: string): Promise<Volunteer> {
    throw new Error('Self-registration is disabled. Please sign in with your Volunteer ID and password.');
  }

  // 2. Trigger One-Tap Instant Emergency Alert (No Cooldown)
  public async triggerAlert(senderId: string, senderName: string, messageText: string): Promise<AlertEvent> {
    const { db } = getFirebaseServices();
    if (!db) throw new Error('Firebase Firestore is not initialized.');

    try {
      await this.ensureAuthenticated();

      const alertId = `RRBM-ALERT-${Date.now()}`;
      const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newAlert: AlertEvent = {
        id: alertId,
        triggeredBy: { id: senderId, name: senderName },
        message: messageText || '🚨 RRBM ALERT: Leader is calling — volunteers please gather immediately!',
        status: 'active',
        createdAt: new Date().toISOString(),
        timeFormatted: nowFormatted,
        responses: { coming: [], coming_late: [], not_coming: [] }
      };

      // Set active alert document in Firestore (triggers onSnapshot on all devices globally)
      const activeAlertRef = doc(db, 'alerts', 'current');
      await setDoc(activeAlertRef, {
        ...newAlert,
        serverTime: serverTimestamp()
      });

      // Archive alert
      const archiveRef = doc(db, 'alerts_history', alertId);
      await setDoc(archiveRef, {
        ...newAlert,
        serverTime: serverTimestamp()
      });

      // Announce in live chat
      const chatMsgId = `MSG_${Date.now()}_ALERT`;
      const chatRef = doc(db, 'chat', chatMsgId);
      await setDoc(chatRef, {
        id: chatMsgId,
        volunteerId: senderId,
        senderName: senderName,
        text: newAlert.message,
        time: nowFormatted,
        type: 'alert',
        isAlert: true,
        alertId: alertId,
        createdAt: serverTimestamp()
      });

      // Sound siren on local device too
      triggerAlertSoundAndVibration('🚨 RRBM VOLUNTEER ALERT', newAlert.message);

      return newAlert;
    } finally {
      setTimeout(() => {
        this.isProcessingAlert = false;
      }, 1500);
    }
  }

  // 3. Quick Responses (I'M COMING / COMING LATE / CAN'T COME)
  // Writes to isolated per-volunteer response subcollection: /alerts/current/responses/{volunteerId}
  public async sendQuickResponse(
    volunteerId: string,
    volunteerName: string,
    responseType: 'coming' | 'coming_late' | 'not_coming'
  ): Promise<void> {
    const { db } = getFirebaseServices();
    if (!db) throw new Error('Firebase Firestore is not initialized.');

    await this.ensureAuthenticated();

    // Isolated per-volunteer subcollection write (prevents race condition overwrites)
    const responseDocRef = doc(db, 'alerts', 'current', 'responses', volunteerId);
    await setDoc(responseDocRef, {
      volunteerId,
      volunteerName: volunteerName || `Volunteer ${volunteerId}`,
      responseType,
      updatedAt: serverTimestamp()
    });

    // Post to live chat
    const text = responseType === 'coming'
      ? "✓ I'm coming right now."
      : responseType === 'coming_late'
      ? "⏳ I'll be there in 5–10 minutes."
      : "✕ Sorry, I'm unable to come.";

    const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = `MSG_${Date.now()}_RESP_${volunteerId}`;
    const chatRef = doc(db, 'chat', msgId);

    await setDoc(chatRef, {
      id: msgId,
      volunteerId,
      senderName: volunteerName || `Volunteer ${volunteerId}`,
      text,
      time: timeFormatted,
      type: 'quick_response',
      responseType,
      createdAt: serverTimestamp()
    });
  }

  // 4. Send Live Chat Message
  public async sendChatMessage(volunteerId: string, senderName: string, text: string): Promise<ChatMessage> {
    const { db } = getFirebaseServices();
    if (!db) throw new Error('Firebase Firestore is not initialized.');

    await this.ensureAuthenticated();

    const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = `MSG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: ChatMessage = {
      id: msgId,
      volunteerId: volunteerId || '260',
      senderName: senderName || 'Volunteer',
      text: text.trim(),
      time: timeFormatted,
      type: 'chat'
    };

    const chatRef = doc(db, 'chat', msgId);
    await setDoc(chatRef, {
      ...newMsg,
      createdAt: serverTimestamp()
    });

    return newMsg;
  }

  // 4b. Clear Live Chat Messages across Firebase Cloud
  public async clearChat(): Promise<void> {
    const { db } = getFirebaseServices();
    if (!db) return;

    try {
      const chatCol = collection(db, 'chat');
      const snap = await getDocs(chatCol);
      const deletePromises = snap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
      console.log(`[Firebase Firestore] Cleared ${snap.docs.length} chat messages.`);
    } catch (e) {
      console.warn('[Firebase Firestore] Failed to clear chat:', e);
    }
  }

  // 5. Resolve Active Alert
  public async resolveAlert(): Promise<void> {
    const { db } = getFirebaseServices();
    if (!db) return;

    await this.ensureAuthenticated();
    const activeAlertRef = doc(db, 'alerts', 'current');
    await setDoc(activeAlertRef, { status: 'resolved', resolvedAt: new Date().toISOString() }, { merge: true });
  }

  // 6. Listen for Active Alerts and Per-Volunteer Responses in Real Time
  public subscribeToAlerts(callback: (alert: AlertEvent | null) => void): () => void {
    const { db } = getFirebaseServices();
    if (!db) return () => {};

    const activeAlertRef = doc(db, 'alerts', 'current');
    const responsesColRef = collection(db, 'alerts', 'current', 'responses');
    let lastAlertId: string | null = null;
    let currentAlertBase: AlertEvent | null = null;
    let cachedResponses: { coming: string[]; coming_late: string[]; not_coming: string[] } = {
      coming: [],
      coming_late: [],
      not_coming: []
    };

    const emitMergedAlert = () => {
      if (!currentAlertBase) {
        callback(null);
        return;
      }
      callback({
        ...currentAlertBase,
        responses: { ...cachedResponses }
      });
    };

    const unsubAlert = onSnapshot(activeAlertRef, (snapshot) => {
      if (!snapshot.exists()) {
        currentAlertBase = null;
        callback(null);
        return;
      }

      const data = snapshot.data();
      if (data.status === 'resolved') {
        currentAlertBase = null;
        callback(null);
        return;
      }

      currentAlertBase = {
        id: data.id || 'current',
        triggeredBy: data.triggeredBy || { id: 'OFFICE', name: 'Altar Desk' },
        message: data.message || '',
        status: data.status || 'active',
        createdAt: data.createdAt || new Date().toISOString(),
        timeFormatted: data.timeFormatted || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responses: cachedResponses
      };

      if (lastAlertId && lastAlertId !== currentAlertBase.id) {
        triggerAlertSoundAndVibration('🚨 RRBM VOLUNTEER ALERT', currentAlertBase.message);
      }
      lastAlertId = currentAlertBase.id;

      emitMergedAlert();
    }, (err) => {
      console.warn('[Firebase Firestore] Alert listener error:', err);
    });

    const unsubResponses = onSnapshot(responsesColRef, (snapshot) => {
      const responses: { coming: string[]; coming_late: string[]; not_coming: string[] } = {
        coming: [],
        coming_late: [],
        not_coming: []
      };

      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const vId = d.volunteerId || docSnap.id;
        if (d.responseType === 'coming') {
          responses.coming.push(vId);
        } else if (d.responseType === 'coming_late') {
          responses.coming_late.push(vId);
        } else if (d.responseType === 'not_coming') {
          responses.not_coming.push(vId);
        }
      });

      cachedResponses = responses;
      emitMergedAlert();
    }, (err) => {
      console.warn('[Firebase Firestore] Alert responses listener error:', err);
    });

    const combinedUnsub = () => {
      unsubAlert();
      unsubResponses();
    };

    this.unsubs.push(combinedUnsub);
    return combinedUnsub;
  }

  // 7. Listen for Live Chat Messages in Real Time across Internet Devices
  public subscribeToChat(currentVolunteerId: string | null, callback: (messages: ChatMessage[]) => void): () => void {
    const { db } = getFirebaseServices();
    if (!db) return () => {};

    const chatCol = collection(db, 'chat');
    const chatQuery = query(chatCol, orderBy('createdAt', 'asc'), limit(100));

    let isInitialLoad = true;

    const unsub = onSnapshot(chatQuery, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        let formattedTime = d.time;
        if (!formattedTime && d.createdAt) {
          const ts = d.createdAt as Timestamp;
          formattedTime = ts.toDate ? ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        }
        messages.push({
          id: d.id || docSnap.id,
          volunteerId: d.volunteerId,
          senderName: d.senderName,
          text: d.text,
          time: formattedTime || 'Just now',
          type: d.type || 'chat',
          isAlert: d.isAlert,
          responseType: d.responseType,
          alertId: d.alertId
        });
      });

      // Notification for new incoming messages after initial load
      if (!isInitialLoad && snapshot.docChanges) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const newDoc = change.doc.data();
            if (newDoc.volunteerId !== currentVolunteerId && newDoc.type !== 'alert') {
              triggerChatNotification(newDoc.senderName, newDoc.text);
            }
          }
        });
      }
      isInitialLoad = false;

      callback(messages);
    }, (err) => {
      console.warn('[Firebase Firestore] Chat listener error:', err);
    });

    this.unsubs.push(unsub);
    return unsub;
  }

  // 8. Listen for Offering Balance
  public subscribeToBalance(callback: (balance: OfferingBalance) => void): () => void {
    const { db } = getFirebaseServices();
    if (!db) return () => {};

    const balanceRef = doc(db, 'system', 'balance');
    const unsub = onSnapshot(balanceRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        callback({
          amount: Number(d.amount) || 148500,
          updatedBy: d.updatedBy || 'Festival Coordination Desk',
          updatedAt: d.updatedAt || new Date().toISOString()
        });
      }
    }, () => {});

    this.unsubs.push(unsub);
    return unsub;
  }

  // 9. Listen for Expenditures (Money Spent) in Real Time
  public subscribeToExpenditures(callback: (expenditures: Expenditure[]) => void): () => void {
    const { db } = getFirebaseServices();
    if (!db) return () => {};

    const expRef = doc(db, 'system', 'expenditures');
    const unsub = onSnapshot(expRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (Array.isArray(d.items)) {
          callback(d.items.filter(e => !['EXP_1', 'EXP_2', 'EXP_3'].includes(e.id)));
        }
      }
    }, (err) => {
      console.warn('[Firebase] Expenditures listener error:', err);
    });

    this.unsubs.push(unsub);
    return unsub;
  }

  // 10. Listen for Songs in Real Time
  public subscribeToSongs(callback: (songs: Song[]) => void): () => void {
    const { db } = getFirebaseServices();
    if (!db) return () => {};

    const songsRef = doc(db, 'system', 'songs');
    const unsub = onSnapshot(songsRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (Array.isArray(d.items)) {
          callback(d.items);
        }
      }
    }, (err) => {
      console.warn('[Firebase] Songs listener error:', err);
    });

    this.unsubs.push(unsub);
    return unsub;
  }

  // 11. Save Expenditures to Cloud Firestore permanently
  public async saveExpendituresToCloud(expenditures: Expenditure[]): Promise<void> {
    const { db } = getFirebaseServices();
    if (!db) return;
    try {
      const expRef = doc(db, 'system', 'expenditures');
      await setDoc(expRef, {
        items: expenditures,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('[Firebase] Failed to save expenditures to Firestore:', e);
    }
  }

  // 12. Save Songs to Cloud Firestore permanently
  public async saveSongsToCloud(songs: Song[]): Promise<void> {
    const { db } = getFirebaseServices();
    if (!db) return;
    try {
      const songsRef = doc(db, 'system', 'songs');
      await setDoc(songsRef, {
        items: songs,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('[Firebase] Failed to save songs to Firestore:', e);
    }
  }

  // 13. Save Offering Balance to Cloud Firestore
  public async saveBalanceToCloud(balance: OfferingBalance): Promise<void> {
    const { db } = getFirebaseServices();
    if (!db) return;
    try {
      const balRef = doc(db, 'system', 'balance');
      await setDoc(balRef, {
        amount: balance.amount,
        updatedBy: balance.updatedBy,
        updatedAt: balance.updatedAt
      }, { merge: true });
    } catch (e) {
      console.warn('[Firebase] Failed to save balance to Firestore:', e);
    }
  }

  public cleanup() {
    this.unsubs.forEach(u => {
      try { u(); } catch {}
    });
    this.unsubs = [];
  }
}

export const firebaseRealtime = new FirebaseRealtimeService();
