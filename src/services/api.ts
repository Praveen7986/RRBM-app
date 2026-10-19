// src/services/api.ts
// Production HTTP API Client with Multi-Device Cloud/LAN Server Resolution & Offline Handling

import { Volunteer, AlertEvent, ChatMessage, OfferingBalance, Expenditure, Song } from '../types/volunteer';

const STORAGE_KEY_SERVER_URL = 'rrbm_custom_server_url';
const DEFAULT_FALLBACK_SERVER = 'https://rrbm-app-backend.onrender.com';

export function getServerBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_FALLBACK_SERVER;

  // 1. User/Tester configured custom server URL in app settings
  const customUrl = localStorage.getItem(STORAGE_KEY_SERVER_URL);
  if (customUrl && customUrl.trim()) {
    const cleanCustom = customUrl.trim().replace(/\/+$/, '');
    // If phone has a stale local Wi-Fi IP (192.168.x.x) or localhost, purge it
    if (
      cleanCustom.includes('192.168.') || 
      cleanCustom === 'http://localhost' || 
      cleanCustom === 'https://localhost' ||
      (cleanCustom.startsWith('http://localhost:') && !cleanCustom.includes(':3000'))
    ) {
      localStorage.removeItem(STORAGE_KEY_SERVER_URL);
    } else {
      return cleanCustom;
    }
  }

  // 2. Comprehensive check for Native Android / iOS WebView (Capacitor / Cordova)
  // In Capacitor with androidScheme: 'http', window.location.origin is 'http://localhost'
  const isNativeApp = 
    typeof (window as any).Capacitor !== 'undefined' ||
    window.location.protocol === 'capacitor:' || 
    window.location.protocol === 'ionic:' ||
    (window.location.hostname === 'localhost' && window.location.port !== '3000' && window.location.port !== '5173') ||
    (window.location.hostname === '127.0.0.1' && window.location.port !== '3000' && window.location.port !== '5173');

  if (isNativeApp) {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl.trim() && !envUrl.includes('192.168.') && !envUrl.includes('localhost')) {
      return envUrl.trim().replace(/\/+$/, '');
    }
    return DEFAULT_FALLBACK_SERVER;
  }

  // 3. Web browser environment: ONLY use window.location.origin if it is the backend server itself:
  // - On Render: origin is "https://rrbm-app-backend.onrender.com"
  // - On local Node dev server: origin is "http://localhost:3000" or "http://127.0.0.1:3000"
  if (
    window.location.origin && 
    window.location.origin !== 'null' && 
    (window.location.origin.includes('rrbm-app-backend.onrender.com') || window.location.origin.includes(':3000'))
  ) {
    return window.location.origin;
  }

  // 4. Default: Render Cloud Backend
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('192.168.') && !envUrl.includes('localhost')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return DEFAULT_FALLBACK_SERVER;
}

export function setCustomServerUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const clean = url.trim().replace(/\/+$/, '');
  if (clean) {
    localStorage.setItem(STORAGE_KEY_SERVER_URL, clean);
  } else {
    localStorage.removeItem(STORAGE_KEY_SERVER_URL);
  }
}

export function getCustomServerUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_SERVER_URL);
}

export function resetCustomServerUrl(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_SERVER_URL);
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getServerBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        if (contentType.includes('application/json')) {
          const errJson = await res.json();
          if (errJson.error) errorMsg = errJson.error;
        } else {
          const rawText = await res.text();
          if (rawText && !rawText.includes('<!doctype') && !rawText.includes('<html')) {
            errorMsg = rawText.substring(0, 100);
          }
        }
      } catch {}
      throw new Error(errorMsg);
    }

    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.warn(`[API] Server returned non-JSON response from ${url} (${contentType}):`, text.substring(0, 80));
      throw new Error('Connection failed: Server returned an unexpected response. Please check your internet connection.');
    }

    return await res.json() as T;
  } catch (error: any) {
    console.warn(`[API] Failed to fetch ${url}:`, error.message);
    throw error;
  }
}

export const apiClient = {
  // 1. Volunteer Login with ID and Password
  async loginVolunteer(volunteerId: string, password: string): Promise<{ success: boolean; volunteer: Volunteer; token: string; customToken?: string | null }> {
    return fetchJson<{ success: boolean; volunteer: Volunteer; token: string; customToken?: string | null }>('/api/volunteers/login', {
      method: 'POST',
      body: JSON.stringify({ volunteerId, password })
    });
  },

  // 1b. Legacy Check-In (Deprecated)
  async registerVolunteer(name: string): Promise<{ success: boolean; volunteer: Volunteer; reused?: boolean }> {
    return fetchJson<{ success: boolean; volunteer: Volunteer; reused?: boolean }>('/api/volunteers/register', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },

  // 2. Get All Registered Volunteers
  async getVolunteers(): Promise<{ success: boolean; volunteers: Volunteer[]; count: number }> {
    return fetchJson<{ success: boolean; volunteers: Volunteer[]; count: number }>('/api/volunteers');
  },

  // 3. Active Alert
  async getActiveAlert(): Promise<{ success: boolean; activeAlert: AlertEvent | null }> {
    return fetchJson<{ success: boolean; activeAlert: AlertEvent | null }>('/api/alerts/active');
  },

  // 4. Alert History
  async getAlertHistory(): Promise<{ success: boolean; alerts: AlertEvent[] }> {
    return fetchJson<{ success: boolean; alerts: AlertEvent[] }>('/api/alerts/history');
  },

  // 5. Create Instant Alert
  async createAlert(volunteerId: string, senderName: string, message?: string): Promise<{ success: boolean; alert: AlertEvent; chatMessage: ChatMessage }> {
    return fetchJson<{ success: boolean; alert: AlertEvent; chatMessage: ChatMessage }>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify({ volunteerId, senderName, message })
    });
  },

  // 6. Resolve Active Alert
  async resolveAlert(alertId: string): Promise<{ success: boolean; message: string }> {
    return fetchJson<{ success: boolean; message: string }>(`/api/alerts/${alertId}/resolve`, {
      method: 'POST'
    });
  },

  // 7. Volunteer Quick Response (I'm Coming / Coming Late / Can't Come)
  async sendAlertResponse(
    alertId: string,
    volunteerId: string,
    volunteerName: string,
    responseType: 'coming' | 'coming_late' | 'not_coming'
  ): Promise<{ success: boolean; chatMessage: ChatMessage; responses: AlertEvent['responses'] }> {
    return fetchJson<{ success: boolean; chatMessage: ChatMessage; responses: AlertEvent['responses'] }>(`/api/alerts/${alertId}/response`, {
      method: 'POST',
      body: JSON.stringify({ volunteerId, volunteerName, responseType })
    });
  },

  // 8. Chat Messages
  async getChatMessages(): Promise<{ success: boolean; messages: ChatMessage[] }> {
    return fetchJson<{ success: boolean; messages: ChatMessage[] }>('/api/chat');
  },

  async sendChatMessage(volunteerId: string, senderName: string, text: string): Promise<{ success: boolean; message: ChatMessage }> {
    return fetchJson<{ success: boolean; message: ChatMessage }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ volunteerId, senderName, text })
    });
  },

  async clearChat(authTokenOrPin?: string): Promise<{ success: boolean; message?: string }> {
    const pin = authTokenOrPin || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; message?: string }>('/api/admin/chat/clear', {
      method: 'POST',
      headers
    });
  },

  // 9. Offering Balance
  async getOfferingBalance(): Promise<{ success: boolean; balance: OfferingBalance }> {
    return fetchJson<{ success: boolean; balance: OfferingBalance }>('/api/balance');
  },

  async updateOfferingBalance(amount: number, authTokenOrPin?: string, updatedBy = 'Festival Manager'): Promise<{ success: boolean; balance: OfferingBalance }> {
    const pin = authTokenOrPin || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; balance: OfferingBalance }>('/api/balance', {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount, updatedBy })
    });
  },

  // 9b. Spent Money (Expenditures)
  async getExpenditures(): Promise<{ success: boolean; expenditures: Expenditure[] }> {
    return fetchJson<{ success: boolean; expenditures: Expenditure[] }>('/api/spent');
  },

  async addExpenditure(
    exp: { date: string; purpose: string; amount: number },
    authTokenOrPin?: string
  ): Promise<{ success: boolean; expenditure: Expenditure; expenditures: Expenditure[] }> {
    const pin = authTokenOrPin || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; expenditure: Expenditure; expenditures: Expenditure[] }>('/api/spent', {
      method: 'POST',
      headers,
      body: JSON.stringify(exp)
    });
  },

  async deleteExpenditure(
    id: string,
    authTokenOrPin?: string
  ): Promise<{ success: boolean; expenditures: Expenditure[] }> {
    const pin = authTokenOrPin || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; expenditures: Expenditure[] }>(`/api/spent/${id}`, {
      method: 'DELETE',
      headers
    });
  },

  // 10. Manager Authentication
  async adminLogin(secretOrPin: string): Promise<{ success: boolean; token: string; customToken?: string | null; role?: string }> {
    return fetchJson<{ success: boolean; token: string; customToken?: string | null; role?: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ secret: secretOrPin, pin: secretOrPin })
    });
  },

  // 10b. Protected Volunteer Account Provisioning (Admin SDK)
  async createVolunteerAccount(
    params: {
      volunteerId: string;
      fullName: string;
      initialPassword?: string;
      phone?: string;
      role?: string;
    },
    adminIdToken?: string
  ): Promise<{ success: boolean; message: string; volunteer: { volunteerId: string; uid: string; name: string } }> {
    const pin = adminIdToken || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; message: string; volunteer: { volunteerId: string; uid: string; name: string } }>('/api/admin/volunteers/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...params,
        initialPassword: params.initialPassword || '2026'
      })
    });
  },

  // 10c. Update Volunteer Status (Active / Inactive)
  async updateVolunteerStatus(volunteerId: string, active: boolean, adminIdToken?: string): Promise<{ success: boolean; volunteerId: string; active: boolean }> {
    const pin = adminIdToken || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; volunteerId: string; active: boolean }>('/api/admin/volunteers/status', {
      method: 'POST',
      headers,
      body: JSON.stringify({ volunteerId, active })
    });
  },

  // 10d. Reset Volunteer Password (Admin Only)
  async resetVolunteerPassword(volunteerId: string, newPassword: string, adminIdToken?: string): Promise<{ success: boolean; message: string }> {
    const pin = adminIdToken || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; message: string }>('/api/admin/volunteers/reset-password', {
      method: 'POST',
      headers,
      body: JSON.stringify({ volunteerId, newPassword })
    });
  },

  // 10e. Update Volunteer Name
  async updateVolunteerName(
    volunteerId: string,
    name: string,
    authTokenOrPin?: string
  ): Promise<{ success: boolean; volunteer: Volunteer }> {
    const pin = authTokenOrPin || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; volunteer: Volunteer }>('/api/admin/volunteers/update-name', {
      method: 'POST',
      headers,
      body: JSON.stringify({ volunteerId, name })
    });
  },

  // 11. Manager Stats
  async getAdminStats(authTokenOrPin?: string): Promise<{ success: boolean; stats: any }> {
    const pin = authTokenOrPin || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };
    return fetchJson<{ success: boolean; stats: any }>('/api/admin/stats', {
      headers
    });
  },

  // 12. Push Subscription
  async savePushSubscription(subscription: any): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription })
    });
  },

  // 13. Songs API
  async getSongs(): Promise<{ success: boolean; songs: Song[] }> {
    return fetchJson<{ success: boolean; songs: Song[] }>('/api/songs');
  },

  async addSong(
    song: { 
      title: string; 
      lyrics: string; 
      category?: string; 
      day?: string; 
      key?: string;
      isMainSong?: boolean;
      mainSongDay?: string | null;
    },
    authTokenOrPin?: string
  ): Promise<{ success: boolean; song: Song; songs: Song[] }> {
    const pin = authTokenOrPin || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; song: Song; songs: Song[] }>('/api/songs', {
      method: 'POST',
      headers,
      body: JSON.stringify(song)
    });
  },

  async deleteSong(
    songId: string,
    authTokenOrPin?: string
  ): Promise<{ success: boolean; songs: Song[] }> {
    const pin = authTokenOrPin || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; songs: Song[] }>(`/api/songs/${encodeURIComponent(songId)}`, {
      method: 'DELETE',
      headers
    });
  },

  async setMainSong(
    songId: string,
    mainSongDay: 'day1' | 'day2' | 'day3' | null,
    authTokenOrPin?: string
  ): Promise<{ success: boolean; songs: Song[] }> {
    const pin = authTokenOrPin || '2026';
    const headers: Record<string, string> = {
      'x-admin-pin': pin,
      'Authorization': `Bearer ${pin}`
    };

    return fetchJson<{ success: boolean; songs: Song[] }>(`/api/songs/${encodeURIComponent(songId)}/main`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ mainSongDay })
    });
  }
};
