package org.rrbm.festival2026;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static final String CHANNEL_ALERTS_ID = "rrbm_alerts_channel";
    public static final String CHANNEL_CHAT_ID = "rrbm_chat_channel";
    public static final String CHANNEL_GENERAL_ID = "rrbm_general_channel";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
        startNotificationService();
        handleNotificationIntent(getIntent());
    }

    private void startNotificationService() {
        try {
            Intent serviceIntent = new Intent(this, RRBMNotificationService.class);
            androidx.core.content.ContextCompat.startForegroundService(this, serviceIntent);
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Failed to start notification service: " + e.getMessage());
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNotificationIntent(intent);
    }

    /**
     * Creates dedicated Android Notification Channels:
     * 1. RRBM ALERTS (High Importance, Strong Vibration Pattern, Lockscreen Public)
     * 2. RRBM LIVE CHAT (Default Importance, Chat Vibration)
     * 3. RRBM GENERAL (Default/Low Importance)
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) return;

            // --- Channel 1: RRBM ALERTS (HIGH Priority Leader Emergency Calls) ---
            CharSequence alertChannelName = "RRBM ALERTS";
            String alertChannelDesc = "High-priority leader emergency calls and urgent prayer alerts";
            int alertImportance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel alertChannel = new NotificationChannel(CHANNEL_ALERTS_ID, alertChannelName, alertImportance);
            alertChannel.setDescription(alertChannelDesc);
            alertChannel.enableLights(true);
            alertChannel.enableVibration(true);
            // Strong vibration pattern: 0ms delay, 500ms vibrate, 200ms pause, 500ms vibrate, 200ms pause, 800ms vibrate
            alertChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 800});
            alertChannel.setShowBadge(true);
            alertChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
            alertChannel.setSound(defaultSoundUri, audioAttributes);

            // --- Channel 2: RRBM LIVE CHAT (Default Priority Volunteer Chat) ---
            CharSequence chatChannelName = "RRBM LIVE CHAT";
            String chatChannelDesc = "Real-time volunteer chat messages and coordination replies";
            int chatImportance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel chatChannel = new NotificationChannel(CHANNEL_CHAT_ID, chatChannelName, chatImportance);
            chatChannel.setDescription(chatChannelDesc);
            chatChannel.enableLights(true);
            chatChannel.enableVibration(true);
            chatChannel.setVibrationPattern(new long[]{0, 150, 100, 150});
            chatChannel.setShowBadge(true);

            // --- Channel 3: RRBM GENERAL (General Festival Updates) ---
            CharSequence generalChannelName = "RRBM GENERAL";
            String generalChannelDesc = "Schedule updates, song sheets, and general festival notifications";
            int generalImportance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel generalChannel = new NotificationChannel(CHANNEL_GENERAL_ID, generalChannelName, generalImportance);
            generalChannel.setDescription(generalChannelDesc);
            generalChannel.setShowBadge(true);

            notificationManager.createNotificationChannel(alertChannel);
            notificationManager.createNotificationChannel(chatChannel);
            notificationManager.createNotificationChannel(generalChannel);
        }
    }

    /**
     * Cold-start & background notification click router
     */
    private void handleNotificationIntent(Intent intent) {
        if (intent == null || intent.getExtras() == null) return;

        String targetTab = intent.getStringExtra("targetTab");
        String alertId = intent.getStringExtra("alertId");
        String messageId = intent.getStringExtra("messageId");

        if (targetTab != null && !targetTab.isEmpty()) {
            // Forward routing parameters to WebView / Capacitor javascript runtime
            String jsCode = String.format(
                "window.dispatchEvent(new CustomEvent('rrbm_notification_tap', { detail: { targetTab: '%s', alertId: '%s', messageId: '%s' } }));",
                targetTab,
                alertId != null ? alertId : "",
                messageId != null ? messageId : ""
            );
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().post(() -> this.bridge.getWebView().evaluateJavascript(jsCode, null));
            }
        }
    }
}
