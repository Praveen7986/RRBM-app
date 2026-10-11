// src/types/update.ts
// Data contracts for RRBM Private APK Update System

export interface UpdateManifest {
  latestVersionName: string; // e.g. "1.1.0"
  latestVersionCode: number; // e.g. 2
  minimumSupportedVersionCode: number; // e.g. 1
  apkUrl: string; // e.g. "https://domain.com/rrbm-app/releases/RRBM-1.1.0.apk"
  apkSize: number; // in bytes, e.g. 18454912
  sha256: string; // SHA-256 hash of APK file
  releaseDate: string; // e.g. "2026-10-10"
  releaseNotes: string[];
  forceUpdate?: boolean;
}

export type UpdateState = 
  | 'IDLE'
  | 'CHECKING'
  | 'NO_UPDATE'
  | 'UPDATE_AVAILABLE'
  | 'DOWNLOADING'
  | 'VERIFYING'
  | 'READY_TO_INSTALL'
  | 'INSTALLING'
  | 'FAILED'
  | 'FORCE_UPDATE';

export interface DownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  percentage: number;
  speedFormatted?: string;
}

export interface UpdateInfo {
  state: UpdateState;
  manifest: UpdateManifest | null;
  progress: DownloadProgress;
  errorMessage: string | null;
  isMandatory: boolean;
  isManualCheck: boolean;
  lastCheckedTime: string | null;
}
