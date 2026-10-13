// src/App.tsx
// Root RRBM Application Container with Responsive Sidebar Navigation (Desktop/Tablet) and Bottom Navigation (Mobile)
// Preserves real-time Firebase syncing, APK updates, background audio notification tap handling, and Management Desk

import React, { useState, useEffect } from 'react';
import { TabType } from './types/navigation';
import { BottomNavigation } from './components/BottomNavigation';
import { SidebarNavigation } from './components/SidebarNavigation';
import { HomeScreen } from './screens/HomeScreen';
import { AlertScreen } from './screens/AlertScreen';
import { SongsScreen } from './screens/SongsScreen';
import { MoneyJarScreen } from './screens/MoneyJarScreen';
import { UpdateModal } from './components/UpdateModal';
import { ManagerModal } from './components/ManagerModal';
import { realtimeStore } from './services/realtimeStore';
import { setupNotificationTapListener } from './services/audioNotification';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [isManagerOpen, setIsManagerOpen] = useState<boolean>(false);

  useEffect(() => {
    // 1. Listen for Android native notification tap routing (Leader Alert or Live Chat)
    const handleNotificationTap = (event: CustomEvent | Event) => {
      const customEv = event as CustomEvent;
      const detail = customEv.detail || {};
      console.log('🔔 [RRBM App] Native notification tapped:', detail);

      const type = detail.type || '';
      if (type === 'ALERT' || type === 'CHAT') {
        setCurrentTab('alert');
      }
    };

    window.addEventListener('rrbm_notification_tap', handleNotificationTap as EventListener);
    setupNotificationTapListener(() => setCurrentTab('alert'));

    // 2. Also register device push token if available in Capacitor/Android bridge
    try {
      const volunteer = realtimeStore.getCurrentVolunteer();
      if (volunteer && (window as unknown as { AndroidBridge?: { getPushToken?: () => string } }).AndroidBridge) {
        const token = (window as unknown as { AndroidBridge: { getPushToken: () => string } }).AndroidBridge.getPushToken();
        if (token) {
          fetch('/api/push/register-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              volunteerId: volunteer.id,
              deviceId: 'android-device-' + volunteer.id,
              pushToken: token,
              platform: 'android'
            })
          }).catch(() => {});
        }
      }
    } catch {
      // Ignore
    }

    return () => {
      window.removeEventListener('rrbm_notification_tap', handleNotificationTap as EventListener);
    };
  }, []);

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'home':
        return <HomeScreen onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'alert':
        return <AlertScreen />;
      case 'songs':
        return <SongsScreen />;
      case 'money':
        return <MoneyJarScreen />;
      default:
        return <HomeScreen onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <>
      {/* Android APK Update Dialog */}
      <UpdateModal />

      {/* Global Management Desk Modal (Accessible from Sidebar & Screen Buttons) */}
      {isManagerOpen && (
        <ManagerModal isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
      )}

      {/* Main Responsive App Container */}
      <div className="app-container" id="rrbm-app-root">
        {/* Left Sidebar Navigation for Desktop & Tablets (Figma Layout) */}
        <SidebarNavigation
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
          onOpenManager={() => setIsManagerOpen(true)}
        />

        {/* Scrollable Main Screen Content Area */}
        <main className="screen-content" id="app-main-content">
          {renderActiveScreen()}
        </main>

        {/* Fixed 4-Item Bottom Navigation Bar for Mobile Phones */}
        <BottomNavigation
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
        />
      </div>
    </>
  );
};

export default App;
