// src/config/appVersion.ts
// Single Source of Truth for Installed RRBM Android Application Version

export const APP_VERSION = {
  versionName: '1.0.0',
  versionCode: 1,
  buildDate: '2026-10-06',
  appTitle: 'RRBM — Revival for Re-Built Ministries',
  eventTitle: '3-Day Fasting Prayers 2026',
  
  // Update Manifest URL: Default relative endpoint or custom domain via .env
  updateManifestUrl: import.meta.env.VITE_UPDATE_MANIFEST_URL || '/rrbm-app/update.json'
};
