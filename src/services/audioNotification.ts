// src/services/audioNotification.ts
// Production Alert & Live Chat Notification System with Native Android Vibration, System Channels & Audio Chimes

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Channel definitions matching Android MainActivity.java
export const CHANNEL_ALERTS_ID = 'rrbm_alerts_channel';
export const CHANNEL_CHAT_ID = 'rrbm_chat_channel';

let isChannelsInitialized = false;

/**
 * Initialize Android notification channels with strong vibration patterns
 */
export const initNotificationChannels = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || isChannelsInitialized) return;

  try {
    // 1. Alert Channel (High Importance, Strong Vibration)
    await LocalNotifications.createChannel({
      id: CHANNEL_ALERTS_ID,
      name: 'RRBM ALERTS',
      description: 'High-priority leader emergency calls and urgent prayer alerts',
      importance: 5, // High / Max
      visibility: 1, // Public on lockscreen
      vibration: true,
      lights: true,
      lightColor: '#F43F5E'
    });

    // 2. Chat Channel (Default Importance)
    await LocalNotifications.createChannel({
      id: CHANNEL_CHAT_ID,
      name: 'RRBM LIVE CHAT',
      description: 'Real-time volunteer chat messages and coordination replies',
      importance: 3, // Default
      visibility: 1,
      vibration: true
    });

    isChannelsInitialized = true;
    console.log('[NotificationService] Android channels initialized successfully');
  } catch (err) {
    console.warn('[NotificationService] Failed to create notification channels:', err);
  }
};

/**
 * Setup listener for notification taps to route to the appropriate screen
 */
export const setupNotificationTapListener = (onNavigateToAlertTab: () => void) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('[NotificationService] Notification tapped:', action);
      if (action.notification?.extra?.targetTab === 'alert') {
        onNavigateToAlertTab();
      }
    });
  } catch (err) {
    console.warn('[NotificationService] Could not register action listener:', err);
  }
};

/**
 * Trigger Leader Alert Notification:
 * - Native Android system notification with HIGH priority and vibration
 * - Web Audio API emergency harmonic chime
 * - Browser Notification fallback
 */
export const triggerAlertSoundAndVibration = async (title: string, body: string) => {
  // 1. Native Android Local Notification (Vibration + Status Bar + Sound + Heads-Up Banner)
  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannels();
      const notifId = Math.floor(Date.now() % 2147483647);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: title || '🚨 RRBM VOLUNTEER ALERT',
            body: body || 'Leader is calling — volunteers are requested to gather immediately.',
            channelId: CHANNEL_ALERTS_ID,
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
      // Pattern: VIBRATE (500ms) -> PAUSE (200ms) -> VIBRATE (500ms) -> PAUSE (200ms) -> VIBRATE (800ms)
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
      // Harmonic chime frequencies: C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz)
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

  // 4. Web Desktop Notification fallback if running in browser
  if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const options: NotificationOptions & { vibrate?: number[]; requireInteraction?: boolean } = {
          body: body || 'Volunteers are requested to gather. Tap to open live coordination room.',
          icon: '/rrb_logo.png',
          badge: '/rrb_logo.png',
          vibrate: [500, 200, 500, 200, 800],
          tag: 'rrbm-volunteer-alert',
          requireInteraction: true
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
            title: `💬 RRBM: ${senderName}`,
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
