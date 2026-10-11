# RRBM — Revival for Re-Built Ministries
## 3-Day Fasting Prayers 2026 Mobile Application & Live Coordination System

**Event Dates:** October 20, 21, 22, 2026  
**Theme:** *Reviving Lives Through Christ*  
**Version:** 1.0.0 (Production / Event Ready)

---

## 📖 Overview

The **RRBM 2026 Application** is a production-grade, mobile-first Progressive Web Application (PWA) and Android application with a built-in **Private APK Update System**, built specifically for the **RRBM 3-Day Fasting Prayers 2026** festival.

It provides instantaneous volunteer alerting, real-time response tracking, live synchronized chat, complete 3-day worship lyrics with Telugu transliteration, a 3D animated Money Jar with live manager-controlled financial offerings, an authenticated Manager Desk, and an independent version check & private APK update mechanism that runs with zero reliance on the Google Play Store.

---

## 🌟 Key Features

### 1. 🏠 Home Page
- Official **Revival for Re-Built Ministries** brand identity.
- 3-Day Fasting Prayers 2026 event schedule (Oct 20, 21, 22).
- Spiritual leadership profiles (Ps. Joshua & Nayomi, Rev. Satya Shekar).
- **App Version & Update Checker**: Live display of current installed version (`v1.0.0`, Build 1) with instant "Check Updates" trigger.

### 2. 📲 Private Android APK Update System (Zero Play Store Dependency)
- **Automatic & Manual Checking**: Checks update server on app startup, every 12 hours, and via manual button.
- **Server Update Manifest (`update.json`)**: Authoritative JSON hosted on private server (`/rrbm-app/update.json`).
- **Semantic Versioning**: Monotonic `versionCode` comparisons (`latestVersionCode > installedVersionCode`).
- **Optional & Mandatory Force Updates**: Automatic enforcement of `minimumSupportedVersionCode`.
- **Progressive Stream Download**: Live percentage, downloaded MB / total MB, and transfer speed.
- **Cryptographic Integrity**: Computes **SHA-256 Checksum** on downloaded APK before invoking Android installer.
- **Detailed Documentation**: Full guide in [`docs/UPDATE_SYSTEM.md`](file:///c:/Users/USER/Desktop/RRBM%20APP/docs/UPDATE_SYSTEM.md).

### 3. 🚨 Live Volunteer Alert System (Critical Feature)
- **One-Tap Instant Siren Alert**: Emergency broadcast button triggers dual-tone Web Audio siren, multi-pulse vibration pattern (`[500, 200, 500, 200, 800]`), and instant push notifications across all connected volunteer devices.
- **Centralized Volunteer ID Generation**: Server-assigned unique sequential IDs (`261`, `262`, `263`...) ensuring no duplicate IDs across devices.
- **Real-Time Active Alert Banner**: Prominently highlights active alert state with live volunteer response tallies (`Coming`, `Coming Late`, `Can't Come`).
- **Quick Response Buttons**: Single-tap acknowledgment (`I'M COMING`, `COMING LATE`, `CAN'T COME`) updates the live response metrics and appends to the live chat.
- **Live Volunteer Chat**: Synchronized in real time via WebSockets with distinct alert highlighting (emergency rose gradient).

### 4. 🎵 Praise & Worship Songs (3-Day Data-Driven Tracklist)
- **3-Day Day Selector**:
  - **Day 1 (Oct 20)**: Consecration & Opening Altar Prayer
  - **Day 2 (Oct 21)**: Holy Spirit Anointing & Youth Breakthrough
  - **Day 3 (Oct 22)**: Divine Healing & Final Thanksgiving Blessing
- **Interactive Lyrics Reader**: Full-screen modal with zoom in/out font controls, one-tap copy, chord key annotations, tempo, and English / Telugu transliterated verses.

### 5. 🏺 Blessings & Live Money Jar
- Centered 3D Glass Blessing Jar with ambient glowing aura.
- Hidden balance by default with Eye reveal toggle.
- Scripture verses in English (*Luke 6:38: “Give, and it will be given to you.”*) and Telugu (*“ఇయ్యుడి, అప్పుడు మీకియ్యబడును.”*).
- Authoritative financial balance synchronized directly from the server.

### 6. 🔐 Manager Desk & Admin Portal
- Authenticated manager access protected by secure PIN (Default: `2026`).
- **Live Financial Offering Publisher**: Modify offering balance and broadcast updates in real time to all volunteer devices.
- **Active Alert Management**: View volunteer response rosters and resolve alerts.
- **Registered Volunteer Directory**: View full list of volunteers with assigned server IDs and timestamps.
- **Emergency Dispatcher**: Send high-priority broadcast siren announcements.
- **APK Update Manager**: View active server manifest and test update dialogs.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind/CSS variables, Framer Motion, Lucide React
- **Mobile Wrapper**: Capacitor Android (`@capacitor/android`, `@capacitor/core`, `@capacitor/cli`)
- **Backend & Realtime**: Node.js, WebSockets (`ws`), REST API, persistent file storage (`server/data/db.json`, `server/data/update.json`)
- **PWA & Audio**: Service Worker API, Push API, Web Audio API (synthesized siren), Vibration API, Web Crypto API (SHA-256)

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
# Terminal 1: Start Backend Server (APIs, WebSockets & APK Manifest)
npm run server

# Terminal 2: Start Vite Frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build & Execution
```bash
# 1. Build the frontend bundle
npm run build

# 2. Run the production server (serves API, WebSocket, Update Manifest & SPA on port 3000)
npm run start
```
Open [http://localhost:3000](http://localhost:3000).

---

## 📲 APK Release & Update Generation

To generate a new release manifest with automated SHA-256 calculation:

```bash
# Syntax: node scripts/generate-release-manifest.js <versionName> <versionCode> <minSupportedCode> <isForce>
node scripts/generate-release-manifest.js 1.1.0 2 1 false
```

---

## 📦 Production Distribution Packages

To package the small, standalone deployment bundles without `node_modules`:

```bash
npm run package
```

This generates:
1. `dist-packages/rrbm-production-dist.zip` (Small production bundle with compiled SPA, server, update manifest & launchers)
2. `dist-packages/rrbm-source-package.zip` (Clean source code without `node_modules` or build caches)

---

## 📋 Production Readiness Verification Checklist

- [x] **Private APK Update System**: SHA-256 verification, stream download, mandatory force updates.
- [x] **Home Page**: RRBM 2026 branding, 3-day schedule & version checker card.
- [x] **Volunteer Sign-In**: Server-assigned unique IDs (`261`, `262`...).
- [x] **Alert System**: 1-Tap alert, siren audio, vibration, push notification.
- [x] **Live Chat**: Real-time WebSocket sync & bold alert highlighting.
- [x] **Worship Songs**: Complete 3-day schedule with full lyrics modal & zoom.
- [x] **Blessings Jar**: Centered 3D Money Jar, hidden balance, Luke 6:38 English & Telugu.
- [x] **Manager Desk**: Protected PIN login, live balance updater, volunteer list & APK release manager.
- [x] **PWA & Android Installable**: Manifest, Service Worker, offline fallback.
- [x] **Build Validation**: TypeScript compiled with 0 errors.
