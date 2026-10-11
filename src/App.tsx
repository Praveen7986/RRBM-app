// src/App.tsx
// Root RRBM Mobile Application Container with Integrated APK Update System & Notification Router

import React, { useState, useEffect } from 'react';
import { TabType } from './types/navigation';
import { BottomNavigation } from './components/BottomNavigation';
import { HomeScreen } from './screens/HomeScreen';
import { AlertScreen } from './screens/AlertScreen';
import { SongsScreen } from './screens/SongsScreen';
import { BlessingsScreen } from './screens/BlessingsScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { UpdateModal } from './components/UpdateModal';
import { realtimeStore } from './services/realtimeStore';
import { setupNotificationTapListener } from './services/audioNotification';

export const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  useEffect(() => {
    // 1. Listen for Android native notification tap routing (Leader Alert or Live Chat)
    const handleNotificationTap = (event: CustomEvent | Event) => {
      const customEv = event as CustomEvent;
      const detail = customEv.detail || {};
      console.log('🔔 [RRBM App] Native notification tapped:', detail);

      const type = detail.type || '';
      if (type === 'ALERT' || type === 'CHAT') {
        // Immediately navigate to Active Alert + Live Chat Screen
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
      case 'blessings':
        return <BlessingsScreen />;
      default:
        return <HomeScreen onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <>
      {/* Initial Loading Screen with RRBM Brand & Progress Bar */}
      {isLoading && (
        <LoadingScreen onComplete={() => setIsLoading(false)} />
      )}

      {/* Private Android APK Update Dialog */}
      <UpdateModal />

      {/* Main Mobile App Container */}
      <div className="app-container" id="rrbm-app-root">
        {/* Scrollable Main Screen Content Area */}
        <main className="screen-content" id="app-main-content">
          {renderActiveScreen()}
        </main>

        {/* Fixed 4-Item 3D Bottom Navigation Bar */}
        <BottomNavigation
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
        />
      </div>
    </>
  );
};

export default App;

