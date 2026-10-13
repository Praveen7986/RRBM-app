// src/types/volunteer.ts

export type TabType = 'home' | 'alert' | 'songs' | 'money';

export interface Volunteer {
  id: string; // e.g. "001", "002", "261" (Assigned by admin)
  name: string;
  registeredAt?: string;
  lastActive?: string;
  active?: boolean;
  role?: 'volunteer' | 'leader' | 'admin';
}

export interface AlertResponses {
  coming: string[]; // volunteer IDs
  coming_late: string[];
  not_coming: string[];
}

export interface AlertEvent {
  id: string;
  triggeredBy: {
    id: string;
    name: string;
  };
  message: string;
  status: 'active' | 'resolved';
  createdAt: string;
  timeFormatted: string;
  resolvedAt?: string;
  responses: AlertResponses;
}

export interface ChatMessage {
  id: string;
  volunteerId: string;
  senderName: string;
  text: string;
  time: string;
  type?: 'chat' | 'alert' | 'quick_response';
  isAlert?: boolean;
  responseType?: 'coming' | 'coming_late' | 'not_coming';
  alertId?: string;
}

export interface OfferingBalance {
  amount: number;
  updatedBy: string;
  updatedAt: string;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'offline';
