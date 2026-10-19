// src/services/audioNotification.ts
// Production Alert & Live Chat Notification System with Native Android Vibration, System Channels & Audio Chimes

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Channel definitions matching Android MainActivity.java (v3 with Heads-Up High Importance)
export const CHANNEL_ALERTS_ID = 'rrbm_alerts_headsup_v3';
export const CHANNEL_CHAT_ID = 'rrbm_chat_headsup_v3';

let isChannelsInitialized = false;

/**
 * Initialize Android notification channels with strong vibration patterns and Heads-Up pop-up display
 */
export const initNotificationChannels = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || isChannelsInitialized) return;

  try {
    // Delete legacy default-importance channels so Android clears cached low priorities
    try {
      await LocalNotifications.deleteChannel({ id: 'rrbm_alerts_channel' });
      await LocalNotifications.deleteChannel({ id: 'rrbm_chat_channel' });
    } catch {}

    // 1. Alert Channel (Max Importance, Heads-Up Pop-up Display, Strong Multi-Pulse Vibration)
    await LocalNotifications.createChannel({
      id: CHANNEL_ALERTS_ID,
      name: '🚨 RRBM URGENT ALERTS',
      description: 'High-priority leader emergency calls and urgent prayer alerts with pop-up display',
      importance: 5, // High / Max: Displays Heads-Up banner over any active app
      visibility: 1, // Public on lockscreen
      vibration: true,
      lights: true,
      lightColor: '#F43F5E'
    });

    // 2. Chat Channel (High Importance, Heads-Up Banner Display Over Other Apps)
    await LocalNotifications.createChannel({
      id: CHANNEL_CHAT_ID,
      name: '💬 RRBM LIVE CHAT',
      description: 'Real-time volunteer chat messages with pop-up banner over any display',
      importance: 5, // High / Max: Displays Heads-Up banner over any active app
      visibility: 1, // Public on lockscreen
      vibration: true,
      lights: true,
      lightColor: '#38BDF8'
    });

    isChannelsInitialized = true;
    console.log('[NotificationService] Android Heads-Up v3 channels initialized successfully');
  } catch (err) {
    console.warn('[NotificationService] Failed to create notification channels:', err);
  }
};

export const ACTION_TYPE_ALERT = 'RRBM_ALERT_ACTIONS';

export const registerNotificationActionTypes = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: ACTION_TYPE_ALERT,
          actions: [
            {
              id: 'send_alert',
              title: '🚨 Send alert'
            },
            {
              id: 'coming',
              title: "✓ I'm coming"
            },
            {
              id: 'not_coming',
              title: "✕ I cant come"
            }
          ]
        }
      ]
    });
  } catch (err) {
    console.warn('[NotificationService] registerActionTypes error:', err);
  }
};

/**
 * Setup listener for notification taps and action buttons (Send alert, I'm coming, I cant come)
 */
export const setupNotificationTapListener = (
  onNavigateToAlertTab: () => void,
  onQuickResponse?: (responseType: 'coming' | 'not_coming') => void,
  onOpenSendAlert?: () => void
) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('[NotificationService] Notification action performed:', action);
      const actionId = action.actionId;
      if (actionId === 'coming') {
        if (onQuickResponse) {
          onQuickResponse('coming');
        } else {
          window.dispatchEvent(new CustomEvent('rrbm_notification_action', { detail: { action: 'coming' } }));
        }
      } else if (actionId === 'not_coming') {
        if (onQuickResponse) {
          onQuickResponse('not_coming');
        } else {
          window.dispatchEvent(new CustomEvent('rrbm_notification_action', { detail: { action: 'not_coming' } }));
        }
      } else if (actionId === 'send_alert') {
        onNavigateToAlertTab();
        if (onOpenSendAlert) {
          onOpenSendAlert();
        } else {
          window.dispatchEvent(new CustomEvent('rrbm_notification_action', { detail: { action: 'send_alert' } }));
        }
      } else {
        if (action.notification?.extra?.targetTab === 'alert') {
          onNavigateToAlertTab();
        }
      }
    });
  } catch (err) {
    console.warn('[NotificationService] Could not register action listener:', err);
  }
};

/**
 * Trigger Leader Alert Notification:
 * - Native Android system notification with HIGH priority, vibration, and 3 quick action buttons:
 *   1. Send alert
 *   2. I'm coming
 *   3. I cant come
 * - Web Audio API emergency harmonic chime
 * - Browser Notification with rich actions fallback
 */
export const triggerAlertSoundAndVibration = async (title: string, body: string) => {
  // 1. Native Android Local Notification (Vibration + Status Bar + Sound + Heads-Up Banner + 3 Action Buttons)
  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannels();
      await registerNotificationActionTypes();
      const notifId = Math.floor(Date.now() % 2147483647);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: title || '🚨 RRBM VOLUNTEER ALERT',
            body: body || 'Leader is calling — volunteers are requested to gather immediately.',
            channelId: CHANNEL_ALERTS_ID,
            actionTypeId: ACTION_TYPE_ALERT,
            extra: {
              targetTab: 'alert',
              type: 'ALERT',
              timestamp: Date.now()
            }
          }
        ]
      });
    } catch (e) {
      console.warn('[NotificationService] Native alert notification failed:', e);
    }
  }

  // 2. Strong Vibration Pattern via Vibration API (Foreground fallback)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([500, 200, 500, 200, 800]);
    } catch {
      // Ignore vibration error if not supported
    }
  }

  // 3. Professional Alert Notification Chime via Web Audio API
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const tones = [
        { freq: 523.25, time: 0.0, dur: 0.2 },
        { freq: 659.25, time: 0.12, dur: 0.25 },
        { freq: 783.99, time: 0.24, dur: 0.45 }
      ];

      tones.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.3, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    }
  } catch (err) {
    console.warn('Audio alert chime could not be played:', err);
  }

  // 4. Web Desktop / Mobile Browser Service Worker Notification fallback with Action Buttons
  if (!Capacitor.isNativePlatform() && typeof window !== 'undefined') {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          reg.showNotification(title || '🚨 RRBM VOLUNTEER ALERT', {
            body: body || 'Leader is calling — volunteers are requested to gather immediately.',
            icon: '/logo.png',
            badge: '/logo.png',
            vibrate: [500, 200, 500, 200, 800],
            tag: `rrbm-alert-${Date.now()}`,
            renotify: true,
            requireInteraction: true,
            actions: [
              { action: 'send_alert', title: '🚨 Send alert' },
              { action: 'coming', title: "✓ I'm coming" },
              { action: 'not_coming', title: "✕ I cant come" }
            ],
            data: { url: '/?tab=alert', targetTab: 'alert' }
          } as any);
          return;
        }
      } catch {}
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const options: NotificationOptions & { vibrate?: number[]; requireInteraction?: boolean; actions?: any[] } = {
          body: body || 'Leader is calling — volunteers are requested to gather immediately.',
          icon: '/logo.png',
          badge: '/logo.png',
          vibrate: [500, 200, 500, 200, 800],
          tag: `rrbm-alert-${Date.now()}`,
          requireInteraction: true,
          actions: [
            { action: 'send_alert', title: '🚨 Send alert' },
            { action: 'coming', title: "✓ I'm coming" },
            { action: 'not_coming', title: "✕ I cant come" }
          ]
        };
        new Notification(title || '🚨 RRBM VOLUNTEER ALERT', options as NotificationOptions);
      } catch {
        // Fallback
      }
    }
  }
};

/**
 * Trigger Live Chat Notification on receiving messages from other volunteers
 */
export const triggerChatNotification = async (senderName: string, text: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannels();
      const notifId = Math.floor(Date.now() % 2147483647);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: `💬 ${senderName}`,
            body: text.length > 70 ? text.substring(0, 67) + '...' : text,
            channelId: CHANNEL_CHAT_ID,
            extra: {
              targetTab: 'alert',
              type: 'CHAT',
              timestamp: Date.now()
            }
          }
        ]
      });
    } catch (e) {
      console.warn('[NotificationService] Chat notification failed:', e);
    }
  } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        reg.showNotification(`💬 ${senderName}`, {
          body: text,
          icon: '/logo.png',
          badge: '/logo.png',
          vibrate: [250, 150, 250],
          tag: `rrbm-chat-${Date.now()}`,
          data: { url: '/?tab=alert', targetTab: 'alert' }
        } as any);
      }
    } catch {}
  }
};

/**
 * Request notification permissions across Android and Browser environments
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  // Native Android permission request (Android 13+ POST_NOTIFICATIONS)
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      await initNotificationChannels();
      return perm.display === 'granted';
    } catch {
      return false;
    }
  }

  // Browser permission request
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  return false;
};
