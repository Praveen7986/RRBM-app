// src/services/api.ts
// Production HTTP API Client with Multi-Device Cloud/LAN Server Resolution & Offline Handling

import { Volunteer, AlertEvent, ChatMessage, OfferingBalance } from '../types/volunteer';

const STORAGE_KEY_SERVER_URL = 'rrbm_custom_server_url';
const DEFAULT_FALLBACK_SERVER = 'http://192.168.55.102:3000';

export function getServerBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_FALLBACK_SERVER;

  // 1. User/Tester configured custom server URL in app settings
  const customUrl = localStorage.getItem(STORAGE_KEY_SERVER_URL);
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  // 2. Build-time environment variable (e.g. from .env.production or .env)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. If running inside native Android WebView (Capacitor/localhost), point to the network server
  const isCapacitor = 
    window.location.protocol === 'capacitor:' || 
    window.location.protocol === 'ionic:' || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';

  if (isCapacitor) {
    return DEFAULT_FALLBACK_SERVER;
  }

  // 4. In web browser on public domain or port
  return window.location.origin;
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

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error) errorMsg = errJson.error;
      } catch {}
      throw new Error(errorMsg);
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

  // 9. Offering Balance
  async getOfferingBalance(): Promise<{ success: boolean; balance: OfferingBalance }> {
    return fetchJson<{ success: boolean; balance: OfferingBalance }>('/api/balance');
  },

  async updateOfferingBalance(amount: number, authTokenOrPin: string, updatedBy = 'Festival Manager'): Promise<{ success: boolean; balance: OfferingBalance }> {
    const headers: Record<string, string> = {};
    if (authTokenOrPin && authTokenOrPin.length > 30) {
      // Firebase ID token
      headers['Authorization'] = `Bearer ${authTokenOrPin}`;
    } else {
      headers['x-admin-pin'] = authTokenOrPin;
    }

    return fetchJson<{ success: boolean; balance: OfferingBalance }>('/api/balance', {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount, updatedBy })
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
      initialPassword: string;
      phone?: string;
      role?: string;
    },
    adminIdToken: string
  ): Promise<{ success: boolean; message: string; volunteer: { volunteerId: string; uid: string; name: string } }> {
    return fetchJson<{ success: boolean; message: string; volunteer: { volunteerId: string; uid: string; name: string } }>('/api/admin/volunteers/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminIdToken}`
      },
      body: JSON.stringify(params)
    });
  },

  // 10c. Update Volunteer Status (Active / Inactive)
  async updateVolunteerStatus(volunteerId: string, active: boolean, adminIdToken: string): Promise<{ success: boolean; volunteerId: string; active: boolean }> {
    return fetchJson<{ success: boolean; volunteerId: string; active: boolean }>('/api/admin/volunteers/status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminIdToken}`
      },
      body: JSON.stringify({ volunteerId, active })
    });
  },

  // 10d. Reset Volunteer Password (Admin Only)
  async resetVolunteerPassword(volunteerId: string, newPassword: string, adminIdToken: string): Promise<{ success: boolean; message: string }> {
    return fetchJson<{ success: boolean; message: string }>('/api/admin/volunteers/reset-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminIdToken}`
      },
      body: JSON.stringify({ volunteerId, newPassword })
    });
  },

  // 11. Manager Stats
  async getAdminStats(authTokenOrPin: string): Promise<{ success: boolean; stats: any }> {
    const headers: Record<string, string> = {};
    if (authTokenOrPin && authTokenOrPin.length > 30) {
      headers['Authorization'] = `Bearer ${authTokenOrPin}`;
    } else {
      headers['x-admin-pin'] = authTokenOrPin;
    }
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
  }
};
