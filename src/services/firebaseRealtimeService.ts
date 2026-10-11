// src/services/firebaseRealtimeService.ts
// Production Firebase Cloud Firestore & Auth Service for Free Internet-Wide Alert and Live Chat Sync

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
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
import { Volunteer, AlertEvent, ChatMessage, OfferingBalance } from '../types/volunteer';
import { triggerAlertSoundAndVibration, triggerChatNotification } from './audioNotification';

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
          const email = firebaseUser.email || '';
          const idMatch = email.match(/^([^@]+)@/);
          const volunteerId = idMatch ? idMatch[1] : firebaseUser.uid;

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

  // 1. Authenticate Volunteer with ID & Password (Firebase Authentication)
  public async signInVolunteer(volunteerId: string, password: string): Promise<Volunteer> {
    const { auth, db } = getFirebaseServices();
    if (!auth || !db) {
      throw new Error('Firebase services are not available. Please verify connection.');
    }

    const trimmedId = volunteerId.trim();
    if (!trimmedId) {
      throw new Error('Please enter your Volunteer ID.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const email = volunteerIdToEmail(trimmedId);

    try {
      // Authenticate with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch Volunteer Profile Metadata from Cloud Firestore
      const volunteerRef = doc(db, 'volunteers', trimmedId);
      const volunteerSnap = await getDoc(volunteerRef);

      let volunteer: Volunteer;

      if (volunteerSnap.exists()) {
        const data = volunteerSnap.data();
        if (data.active === false) {
          await signOut(auth);
          throw new Error('This volunteer account has been deactivated. Please contact your coordinator.');
        }

        volunteer = {
          id: trimmedId,
          name: data.name || `Volunteer ${trimmedId}`,
          registeredAt: data.createdAt?.toDate?.()?.toISOString() || data.registeredAt || new Date().toISOString(),
          active: true,
          role: data.role || 'volunteer'
        };

        // Update heartbeat / last active
        await setDoc(volunteerRef, { lastActive: serverTimestamp() }, { merge: true });
      } else {
        // Fallback profile if Firestore document is pending creation
        volunteer = {
          id: trimmedId,
          name: userCredential.user.displayName || `Volunteer ${trimmedId}`,
          registeredAt: new Date().toISOString(),
          active: true,
          role: 'volunteer'
        };
        await setDoc(volunteerRef, {
          ...volunteer,
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp()
        }, { merge: true });
      }

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

  // 3. Admin Account Creation (Isolated Secondary App Instance)
  public async createVolunteerAccount(volunteerId: string, name: string, initialPassword: string): Promise<Volunteer> {
    const { db } = getFirebaseServices();
    if (!db) {
      throw new Error('Firebase Firestore is not initialized.');
    }

    const trimmedId = volunteerId.trim();
    const trimmedName = name.trim();

    if (!trimmedId) throw new Error('Volunteer ID is required.');
    if (!trimmedName) throw new Error('Volunteer name is required.');
    if (!initialPassword || initialPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const email = volunteerIdToEmail(trimmedId);
    const config = getActiveFirebaseConfig();
    const secondaryAppName = `ProvisionAdmin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const secondaryApp = initializeApp(config, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 1. Create Identity in Firebase Authentication
      await createUserWithEmailAndPassword(secondaryAuth, email, initialPassword);

      // 2. Write Volunteer Metadata into Cloud Firestore (NO PLAINTEXT PASSWORDS)
      const volunteerRef = doc(db, 'volunteers', trimmedId);
      const volunteerRecord: Volunteer = {
        id: trimmedId,
        name: trimmedName,
        registeredAt: new Date().toISOString(),
        active: true,
        role: 'volunteer'
      };

      await setDoc(volunteerRef, {
        id: trimmedId,
        name: trimmedName,
        role: 'volunteer',
        active: true,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        createdBy: 'admin'
      });

      return volunteerRecord;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error(`Volunteer ID "${trimmedId}" already exists. Please choose a different ID.`);
      } else if (err.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/configuration-not-found') {
        throw new Error('Firebase Authentication is not yet enabled. In Firebase Console, go to Authentication > Sign-in method and enable Email/Password.');
      }
      throw new Error(err.message || 'Failed to create volunteer account.');
    } finally {
      try {
        await deleteApp(secondaryApp);
      } catch {}
    }
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

  // 2. Trigger One-Tap Instant Emergency Alert
  public async triggerAlert(senderId: string, senderName: string, messageText: string): Promise<AlertEvent> {
    const { db } = getFirebaseServices();
    if (!db) throw new Error('Firebase Firestore is not initialized.');

    if (this.isProcessingAlert) {
      throw new Error('An alert is already being broadcast.');
    }
    this.isProcessingAlert = true;

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
  public async sendQuickResponse(
    volunteerId: string,
    volunteerName: string,
    responseType: 'coming' | 'coming_late' | 'not_coming'
  ): Promise<void> {
    const { db } = getFirebaseServices();
    if (!db) throw new Error('Firebase Firestore is not initialized.');

    await this.ensureAuthenticated();

    const activeAlertRef = doc(db, 'alerts', 'current');
    const alertSnap = await getDoc(activeAlertRef);

    if (alertSnap.exists()) {
      const data = alertSnap.data();
      const responses = data.responses || { coming: [], coming_late: [], not_coming: [] };

      // Remove volunteer from other buckets
      ['coming', 'coming_late', 'not_coming'].forEach(k => {
        if (responses[k]) {
          responses[k] = responses[k].filter((id: string) => id !== volunteerId);
        }
      });

      // Add to selected bucket
      if (!responses[responseType]) responses[responseType] = [];
      responses[responseType].push(volunteerId);

      await setDoc(activeAlertRef, { responses }, { merge: true });
    }

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

  // 5. Resolve Active Alert
  public async resolveAlert(): Promise<void> {
    const { db } = getFirebaseServices();
    if (!db) return;

    await this.ensureAuthenticated();
    const activeAlertRef = doc(db, 'alerts', 'current');
    await setDoc(activeAlertRef, { status: 'resolved', resolvedAt: new Date().toISOString() }, { merge: true });
  }

  // 6. Listen for Active Alerts in Real Time across all Internet Devices
  public subscribeToAlerts(callback: (alert: AlertEvent | null) => void): () => void {
    const { db } = getFirebaseServices();
    if (!db) return () => {};

    const activeAlertRef = doc(db, 'alerts', 'current');
    let lastAlertId: string | null = null;

    const unsub = onSnapshot(activeAlertRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const data = snapshot.data();
      if (data.status === 'resolved') {
        callback(null);
        return;
      }

      const alert: AlertEvent = {
        id: data.id || 'current',
        triggeredBy: data.triggeredBy || { id: 'OFFICE', name: 'Altar Desk' },
        message: data.message || '',
        status: data.status || 'active',
        createdAt: data.createdAt || new Date().toISOString(),
        timeFormatted: data.timeFormatted || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responses: data.responses || { coming: [], coming_late: [], not_coming: [] }
      };

      // If a brand new alert arrived from another volunteer, trigger vibration and siren!
      if (lastAlertId && lastAlertId !== alert.id) {
        triggerAlertSoundAndVibration('🚨 RRBM VOLUNTEER ALERT', alert.message);
      }
      lastAlertId = alert.id;

      callback(alert);
    }, (err) => {
      console.warn('[Firebase Firestore] Alert listener error:', err);
    });

    this.unsubs.push(unsub);
    return unsub;
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

  public cleanup() {
    this.unsubs.forEach(u => {
      try { u(); } catch {}
    });
    this.unsubs = [];
  }
}

export const firebaseRealtime = new FirebaseRealtimeService();
