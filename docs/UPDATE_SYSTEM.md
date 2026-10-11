# RRBM Android App — Private APK Update System Documentation

**Application:** RRBM — Revival for Re-Built Ministries  
**Event:** 3-Day Fasting Prayers 2026 (October 20–22, 2026)  
**Distribution:** Private Server Distribution (Zero dependency on Google Play Store)

---

## 1. Architecture Overview

The RRBM Android Private Update System operates independently of the Google Play Store. It allows the RRBM ministry team to securely distribute, verify, and install APK updates directly from our private servers.

```
+-------------------------------------------------------------------+
|                        RRBM Android Device                        |
+-------------------------------------------------------------------+
| 1. App Launch / Periodic 12h Timer / Manual "Check for Updates"   |
| 2. Fetch Manifest: https://yourdomain.com/rrbm-app/update.json   |
| 3. Compare: latestVersionCode > installedVersionCode              |
| 4. Prompt: Optional Update Dialog OR Mandatory Force Update       |
| 5. Stream Download: Progressive Chunk Reader (Live % & Speed)     |
| 6. Cryptographic Integrity: Compute SHA-256 Checksum              |
| 7. Match Expected Hash -> Launch Android Package Installer        |
+-------------------------------------------------------------------+
                                  ^
                                  | HTTPS Stream
                                  v
+-------------------------------------------------------------------+
|                     Private Production Server                     |
+-------------------------------------------------------------------+
| • /rrbm-app/update.json (No-Cache Manifest Source of Truth)       |
| • /rrbm-app/releases/RRBM-1.1.0.apk (Signed Release Binaries)     |
| • Manager Desk Control API (/api/update/publish)                  |
+-------------------------------------------------------------------+
```

---

## 2. Versioning Specification

Standard Semantic Versioning + Monotonic Integer Version Code:

| Attribute | Type | Example | Purpose |
| :--- | :--- | :--- | :--- |
| `versionName` | String | `"1.0.0"`, `"1.1.0"`, `"2.0.0"` | Human-readable version displayed in UI. |
| `versionCode` | Integer | `1`, `2`, `3`, `10` | **Authoritative comparison key**. Must strictly increase with every build. |

> [!IMPORTANT]
> Always compare versions using `latestVersionCode > installedVersionCode`. Never compare version strings with alphabetical sort (e.g. `1.10.0` vs `1.9.0`).

---

## 3. Server Update Manifest Specification (`update.json`)

Hosted at `https://YOUR_DOMAIN/rrbm-app/update.json` with HTTP header `Cache-Control: no-cache, no-store, must-revalidate`:

```json
{
  "latestVersionName": "1.1.0",
  "latestVersionCode": 2,
  "minimumSupportedVersionCode": 1,
  "apkUrl": "https://YOUR_DOMAIN/rrbm-app/releases/RRBM-1.1.0.apk",
  "apkSize": 18454912,
  "sha256": "c2947a531f91bf5528eb3a7909b700028f99ccb8d153748647567d3cecbbd933",
  "releaseDate": "2026-10-10",
  "releaseNotes": [
    "Improved One-Tap Volunteer Alert system with multi-pulse vibration",
    "Enhanced realtime live chat synchronization with instant emergency banner",
    "Added full Telugu lyrics transliteration and interactive zoom controls",
    "Optimized performance and offline battery efficiency for Android devices"
  ],
  "forceUpdate": false
}
```

---

## 4. State Machine & Update Logic

```
   [START]
      │
      ▼
  [CHECKING] ──(Network Error / Offline)──> [FAILED (if manual)] / [IDLE (if auto)]
      │
      ├─(latestVersionCode <= installedVersionCode)─> [NO_UPDATE]
      │
      ├─(installedVersionCode < minimumSupportedVersionCode OR forceUpdate == true)─> [FORCE_UPDATE]
      │                                                                                     │
      └─(latestVersionCode > installedVersionCode)─────────────────────────> [UPDATE_AVAILABLE]
                                                                                     │
                                                                   [User taps "UPDATE NOW"]
                                                                                     │
                                                                                     ▼
                                                                               [DOWNLOADING]
                                                                                     │
                                                                         (Download 100% complete)
                                                                                     │
                                                                                     ▼
                                                                                [VERIFYING]
                                                                         (Compute SHA-256 Hash)
                                                                                     │
                                           ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                                           │ (Hash Match)                                                                      │ (Hash Mismatch)
                                           ▼                                                                                   ▼
                                  [READY_TO_INSTALL]                                                                        [FAILED]
                                           │                                                                         ("Verification Failed:
                                           ▼                                                                          Corrupt or Invalid")
                                      [INSTALLING]
                              (Android Package Installer)
```

---

## 5. Security & Cryptographic Integrity

1. **HTTPS Only**: Production APK downloads must always run over encrypted HTTPS (`https://`).
2. **SHA-256 Checksum Verification**: Every downloaded byte stream is hashed using `crypto.subtle.digest('SHA-256', buffer)`. If the computed hash does not strictly match `manifest.sha256`, the file is purged immediately.
3. **Android Signature Match**: Android's OS package manager enforces that the upgrade APK is signed with the same release certificate keystore as the currently installed application.
4. **No Secrets in Repo**: Keystores and private signing passwords must never be stored in Git repositories.

---

## 6. Manager Release Workflow (Step-by-Step)

When releasing a new version (e.g. **v1.1.0**, `versionCode = 2`):

### Step 1: Update App Version
In `src/config/appVersion.ts`:
```ts
export const APP_VERSION = {
  versionName: '1.1.0',
  versionCode: 2,
  ...
};
```

### Step 2: Build Production Frontend
```bash
npm run build
```

### Step 3: Build Signed Release APK
Generate the signed release APK using Android Gradle / Capacitor:
```bash
npx cap sync android
cd android && ./gradlew assembleRelease
```

### Step 4: Generate Release Manifest & Compute SHA-256
Place the output APK in `server/releases/RRBM-1.1.0.apk` and run:
```bash
node scripts/generate-release-manifest.js 1.1.0 2 1 false
```

### Step 5: Deploy to Production Server
Upload `server/releases/RRBM-1.1.0.apk` and `server/data/update.json` to your private production server.

---

## 7. Verification Test Scenarios (Matrix)

| Test ID | Scenario | Expected Behavior | Status |
| :--- | :--- | :--- | :--- |
| **TEST 1** | Installed `1.0.0` (1), Server `1.0.0` (1) | No update dialog shown. App opens normally. | ✅ Passed |
| **TEST 2** | Installed `1.0.0` (1), Server `1.0.1` (2) | Optional update dialog appears with "Update Now" and "Later". | ✅ Passed |
| **TEST 3** | Installed `1.0.0` (1), Server `1.1.0` (3) | Optional update dialog appears with dynamic release notes. | ✅ Passed |
| **TEST 4** | Installed `1.0.0` (1), Min Code = `2` | Mandatory Force Update dialog appears. No "Later" button. App blocked until update. | ✅ Passed |
| **TEST 5** | Offline / No Internet on launch | App opens normally. Auto-check ignores offline error without blocking. | ✅ Passed |
| **TEST 6** | Invalid / Malformed `update.json` | Graceful fallback. App logs warning safely without crashing. | ✅ Passed |
| **TEST 7** | APK SHA-256 Hash Mismatch | Download aborted. Error: *"Update verification failed. The downloaded update appears to be corrupted."* | ✅ Passed |
| **TEST 8** | Network Interrupted during download | Progress stops, transitions to FAILED state with `[Retry]` button. | ✅ Passed |
| **TEST 9** | User clicks "Later" on optional update | Dialog closes. Session preserved until next 12h check. | ✅ Passed |
| **TEST 10** | Force Update dismissal attempt | Non-dismissible backdrop. Back press / tap outside ignored. | ✅ Passed |
| **TEST 11** | Manual Check when on latest version | Success screen: *"You are on the latest version: RRBM v1.0.0 (Build 1)"*. | ✅ Passed |
| **TEST 12** | Android "Install Unknown Apps" Prompt | Clean guidance provided to open device Settings and allow installation. | ✅ Passed |

---

## 8. Android Permissions

Only non-intrusive standard permissions are declared in `AndroidManifest.xml`:
- `android.permission.INTERNET` (API communication & APK download)
- `android.permission.ACCESS_NETWORK_STATE` (Offline state detection)
- `android.permission.VIBRATE` (Emergency alert siren haptics)
- `android.permission.REQUEST_INSTALL_PACKAGES` (Invoking standard Android package installer)
