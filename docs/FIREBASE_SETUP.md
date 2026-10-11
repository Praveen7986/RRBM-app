# RRBM 2026 — Firebase Setup Guide (Firestore, FCM & Cloud Functions)

This guide provides the complete setup for deploying RRBM volunteer alerting and live chat over the internet via Google Firebase, without requiring devices to be on the same local Wi-Fi.

---

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and name it `rrbm-festivals-2026` (or any preferred project name).
3. Disable Google Analytics (optional) and click **Create Project**.
4. In the project dashboard, click **Add App** and select **Android**.
   - **Android package name:** `org.rrbm.festival2026` (Must match `capacitor.config.ts` and `build.gradle`).
   - **App nickname:** `RRBM Mobile`.
5. Download `google-services.json`.
6. Copy `google-services.json` into:
   ```
   android/app/google-services.json
   ```

---

## 2. Enable Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**.
2. Click **Create Database**.
3. Choose **Production mode** and select your closest region (e.g. `asia-south1` for Mumbai).
4. Apply the following **Firestore Security Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Volunteers Collection: Any registered volunteer can read list; create own profile
    match /volunteers/{volunteerId} {
      allow read: if true;
      allow create: if request.resource.data.name != null && request.resource.data.name.size() > 0;
      allow update, delete: if false;
    }

    // Alerts Collection: Created when a leader triggers an alert
    match /alerts/{alertId} {
      allow read: if true;
      allow create: if request.resource.data.triggeredBy != null && request.resource.data.message != null;
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['responses', 'status', 'resolvedAt']);
      allow delete: if false;
    }

    // Live Chat Messages: All volunteers can read and post
    match /chat/{messageId} {
      allow read: if true;
      allow create: if request.resource.data.text != null && request.resource.data.text.size() > 0 && request.resource.data.text.size() <= 500;
      allow update, delete: if false;
    }

    // Offering Balance: Read-only for volunteers; update restricted
    match /system/balance {
      allow read: if true;
      allow write: if false; // Only updated via secure Cloud Function or Admin SDK
    }
  }
}
```

---

## 3. Enable Cloud Messaging (FCM) for Background Push

1. In Firebase Console, go to **Project settings** → **Cloud Messaging**.
2. Note your **Sender ID** and **Server Key** (or use HTTP v1 API with a Service Account).
3. Devices register their FCM push token in the `devices` collection or to the backend:
   ```json
   {
     "volunteerId": "261",
     "token": "fcm_token_...",
     "platform": "android"
   }
   ```

---

## 4. Firebase Cloud Function for Emergency Alert Broadcast

When a leader triggers an alert in Firestore (`alerts/{alertId}`), a Firebase Cloud Function sends high-priority FCM push notifications to all registered volunteers:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.onAlertCreated = functions.firestore
  .document('alerts/{alertId}')
  .onCreate(async (snap, context) => {
    const alert = snap.data();
    
    // Fetch all registered Android device tokens
    const devicesSnap = await admin.firestore().collection('devices').get();
    const tokens = devicesSnap.docs.map(doc => doc.data().token).filter(Boolean);

    if (tokens.length === 0) return null;

    const payload = {
      notification: {
        title: '🚨 RRBM VOLUNTEER ALERT',
        body: alert.message || 'Leader is calling — please report to the main altar immediately.'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'rrbm_alerts_channel',
          sound: 'default',
          defaultVibrateTimings: false,
          vibrateTimingsMillis: [0, 500, 200, 500, 200, 800],
          clickAction: 'rrbm_notification_tap'
        }
      },
      data: {
        targetTab: 'alert',
        alertId: context.params.alertId,
        type: 'ALERT'
      }
    };

    return admin.messaging().sendEachForMulticast({
      tokens: tokens,
      ...payload
    });
  });
```

---

## 5. Switch App to Remote Server / Firebase

In the RRBM App:
1. Tap the **Sync Live / Offline** button on the Alert screen.
2. Enter your Cloud URL (e.g., `https://your-rrbm-server.onrender.com` or your Firebase URL).
3. Tap **Save & Reconnect**.
