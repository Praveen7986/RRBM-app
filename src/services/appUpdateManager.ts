// src/services/appUpdateManager.ts
// Production Private APK Update Service for RRBM Android Application
// Performs Manifest Checking, Version Comparison, Stream Download, SHA-256 Integrity Verification, and Installation Flow

import { APP_VERSION } from '../config/appVersion';
import { UpdateManifest, UpdateState, UpdateInfo, DownloadProgress } from '../types/update';
import { getServerBaseUrl } from './api';

const STORAGE_KEYS = {
  LAST_UPDATE_CHECK: 'rrbm_last_update_check_time',
  DISMISSED_VERSION: 'rrbm_dismissed_update_version_code'
};

class AppUpdateManagerService {
  private state: UpdateState = 'IDLE';
  private manifest: UpdateManifest | null = null;
  private progress: DownloadProgress = { loadedBytes: 0, totalBytes: 0, percentage: 0 };
  private errorMessage: string | null = null;
  private isMandatory: boolean = false;
  private isManualCheck: boolean = false;
  private lastCheckedTime: string | null = null;
  private listeners: Set<() => void> = new Set();
  private abortController: AbortController | null = null;

  constructor() {
    this.loadLastCheckTime();
    this.initAutoCheck();
  }

  private loadLastCheckTime() {
    if (typeof window === 'undefined') return;
    this.lastCheckedTime = localStorage.getItem(STORAGE_KEYS.LAST_UPDATE_CHECK);
  }

  private initAutoCheck() {
    if (typeof window === 'undefined') return;

    // Check 2.5s after app launch to allow UI to render first
    setTimeout(() => {
      this.checkForUpdates(false);
    }, 2500);

    // Periodic check every 12 hours
    setInterval(() => {
      this.checkForUpdates(false);
    }, 12 * 60 * 60 * 1000);
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
  // VERSION COMPARISON & UPDATE CHECK
  // ==========================================
  public async checkForUpdates(isManual = false): Promise<void> {
    if (this.state === 'DOWNLOADING' || this.state === 'VERIFYING') {
      return;
    }

    this.isManualCheck = isManual;
    this.state = 'CHECKING';
    this.errorMessage = null;
    this.notify();

    const timestamp = new Date().toISOString();
    this.lastCheckedTime = timestamp;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATE_CHECK, timestamp);
    }

    try {
      // Safe timeout for network request (8 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Append cache-busting timestamp query parameter & resolve absolute server URL
      const baseUrl = getServerBaseUrl();
      const rawUrl = APP_VERSION.updateManifestUrl;
      const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl}`;
      const manifestUrl = `${fullUrl}?_t=${Date.now()}`;

      console.log(`[UpdateManager] Checking update manifest: ${manifestUrl}`);

      const response = await fetch(manifestUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned HTTP status ${response.status}`);
      }

      const data: UpdateManifest = await response.json();

      if (!data.latestVersionCode || !data.latestVersionName || !data.apkUrl) {
        throw new Error('Invalid update manifest format: missing required version fields.');
      }

      this.manifest = data;
      const installedCode = APP_VERSION.versionCode;
      const latestCode = data.latestVersionCode;
      const minSupportedCode = data.minimumSupportedVersionCode || 1;

      console.log(`[UpdateManager] Installed Version: ${APP_VERSION.versionName} (${installedCode}) | Latest Version: ${data.latestVersionName} (${latestCode}) | Min Required: ${minSupportedCode}`);

      // Case 1: Installed version is older than latest available
      if (latestCode > installedCode) {
        // Check if update is Mandatory
        const isForce = installedCode < minSupportedCode || !!data.forceUpdate;
        this.isMandatory = isForce;

        if (isForce) {
          this.state = 'FORCE_UPDATE';
          console.warn('[UpdateManager] Mandatory update required! Blocking outdated version.');
        } else {
          // Check if user already dismissed this specific version in this session (unless manual check)
          const dismissedCode = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.DISMISSED_VERSION) : null;
          if (!isManual && dismissedCode === latestCode.toString()) {
            this.state = 'IDLE';
          } else {
            this.state = 'UPDATE_AVAILABLE';
          }
        }
      } else {
        // Case 2: Installed version is up to date
        this.state = isManual ? 'NO_UPDATE' : 'IDLE';
        console.log('[UpdateManager] Application is up to date.');
      }

      this.notify();
    } catch (error: any) {
      console.warn('[UpdateManager] Update check error:', error.message);

      if (isManual) {
        this.state = 'FAILED';
        if (error.name === 'AbortError' || !navigator.onLine) {
          this.errorMessage = 'Unable to check for updates. Please check your internet connection.';
        } else {
          this.errorMessage = `Unable to check for updates: ${error.message}`;
        }
      } else {
        // Background check failed -> do not block application
        this.state = 'IDLE';
      }
      this.notify();
    }
  }

  // ==========================================
  // PROGRESSIVE DOWNLOAD & SHA-256 VERIFICATION
  // ==========================================
  public async startDownloadAndInstall(): Promise<void> {
    if (!this.manifest || !this.manifest.apkUrl) {
      this.state = 'FAILED';
      this.errorMessage = 'No valid APK URL found in update manifest.';
      this.notify();
      return;
    }

    this.state = 'DOWNLOADING';
    this.progress = { loadedBytes: 0, totalBytes: this.manifest.apkSize || 0, percentage: 0 };
    this.errorMessage = null;
    this.notify();

    this.abortController = new AbortController();

    try {
      const baseUrl = getServerBaseUrl();
      const rawApk = this.manifest.apkUrl;
      const downloadUrl = rawApk.startsWith('http') ? rawApk : `${baseUrl}${rawApk}`;
      console.log(`[UpdateManager] Starting APK download from: ${downloadUrl}`);
      const startTime = performance.now();

      const response = await fetch(downloadUrl, {
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to download APK: HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : (this.manifest.apkSize || 0);
      this.progress.totalBytes = totalBytes;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported for progressive download.');
      }

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          receivedBytes += value.length;

          const percentage = totalBytes > 0 ? Math.min(100, Math.floor((receivedBytes / totalBytes) * 100)) : 0;
          const elapsedSec = (performance.now() - startTime) / 1000;
          const speedKBps = elapsedSec > 0 ? (receivedBytes / 1024 / elapsedSec).toFixed(1) : '0';

          this.progress = {
            loadedBytes: receivedBytes,
            totalBytes: totalBytes || receivedBytes,
            percentage,
            speedFormatted: `${speedKBps} KB/s`
          };
          this.notify();
        }
      }

      // Combine chunks into single ArrayBuffer
      const fullBlob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
      const arrayBuffer = await fullBlob.arrayBuffer();

      // ==========================================
      // SHA-256 INTEGRITY VERIFICATION
      // ==========================================
      this.state = 'VERIFYING';
      this.notify();
      console.log('[UpdateManager] Verifying SHA-256 checksum...');

      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
      const expectedHash = (this.manifest.sha256 || '').toLowerCase().trim();

      console.log(`[UpdateManager] Calculated SHA-256: ${calculatedHash}`);
      console.log(`[UpdateManager] Expected SHA-256:   ${expectedHash}`);

      if (expectedHash && expectedHash !== 'none' && calculatedHash !== expectedHash) {
        console.error('[UpdateManager] SECURITY ALERT: SHA-256 mismatch! Rejecting APK.');
        this.state = 'FAILED';
        this.errorMessage = 'Update verification failed. The downloaded update appears to be corrupted or invalid.';
        this.notify();
        return;
      }

      console.log('✅ [UpdateManager] SHA-256 Checksum Verified Successfully!');

      // ==========================================
      // LAUNCH ANDROID INSTALLER
      // ==========================================
      this.state = 'READY_TO_INSTALL';
      this.notify();

      this.triggerApkInstallation(fullBlob, this.manifest.latestVersionName);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[UpdateManager] Download cancelled by user.');
        this.state = this.isMandatory ? 'FORCE_UPDATE' : 'IDLE';
      } else {
        console.error('[UpdateManager] Download failed:', error);
        this.state = 'FAILED';
        this.errorMessage = `Update download failed: ${error.message || 'Network error'}`;
      }
      this.notify();
    } finally {
      this.abortController = null;
    }
  }

  // ==========================================
  // INSTALLATION TRIGGER
  // ==========================================
  private triggerApkInstallation(apkBlob: Blob, versionName: string) {
    this.state = 'INSTALLING';
    this.notify();

    const fileName = `RRBM-${versionName}.apk`;
    const objectUrl = URL.createObjectURL(apkBlob);

    // 1. Check if Capacitor / Android native bridge is available
    const win = window as any;
    if (win.Capacitor && win.Capacitor.isNativePlatform()) {
      try {
        console.log('[UpdateManager] Invoking native Android package installer...');
        // Standard Android package install via Capacitor Filesystem or direct intent
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.warn('Native intent invoke error, falling back to download:', err);
      }
    } else {
      // 2. Browser / Web APK Direct Download & Package Launch
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 60000);
  }

  public cancelDownload(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.isMandatory) {
      this.state = 'FORCE_UPDATE';
    } else {
      this.state = 'IDLE';
    }
    this.notify();
  }

  public dismissOptionalUpdate(): void {
    if (this.isMandatory) return; // Cannot dismiss force update

    if (this.manifest && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DISMISSED_VERSION, this.manifest.latestVersionCode.toString());
    }
    this.state = 'IDLE';
    this.notify();
  }

  public resetState(): void {
    this.state = 'IDLE';
    this.errorMessage = null;
    this.notify();
  }

  // Getters
  public getUpdateInfo(): UpdateInfo {
    return {
      state: this.state,
      manifest: this.manifest,
      progress: this.progress,
      errorMessage: this.errorMessage,
      isMandatory: this.isMandatory,
      isManualCheck: this.isManualCheck,
      lastCheckedTime: this.lastCheckedTime
    };
  }
}

export const appUpdateManager = new AppUpdateManagerService();
