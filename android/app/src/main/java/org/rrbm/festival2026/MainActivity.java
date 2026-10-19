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

    public static final String CHANNEL_ALERTS_ID = "rrbm_alerts_headsup_v3";
    public static final String CHANNEL_CHAT_ID = "rrbm_chat_headsup_v3";
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
     * Creates dedicated Android Notification Channels with Heads-Up High Importance:
     * 1. RRBM URGENT ALERTS (High Importance, Strong Vibration Pattern, Lockscreen Public)
     * 2. RRBM LIVE CHAT (High Importance, Heads-Up Banner Over Other Apps, Chat Vibration)
     * 3. RRBM GENERAL (Low Importance Ongoing Service Indicator)
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) return;

            // Delete legacy cached channels that were stuck with IMPORTANCE_DEFAULT
            try {
                notificationManager.deleteNotificationChannel("rrbm_alerts_channel");
                notificationManager.deleteNotificationChannel("rrbm_chat_channel");
            } catch (Exception ignored) {}

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                    .build();

            // --- Channel 1: RRBM URGENT ALERTS (HIGH Priority Leader Emergency Calls) ---
            CharSequence alertChannelName = "🚨 RRBM URGENT ALERTS";
            String alertChannelDesc = "High-priority leader emergency calls and urgent prayer alerts with pop-up banner";
            int alertImportance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel alertChannel = new NotificationChannel(CHANNEL_ALERTS_ID, alertChannelName, alertImportance);
            alertChannel.setDescription(alertChannelDesc);
            alertChannel.enableLights(true);
            alertChannel.enableVibration(true);
            // Strong vibration pattern: 0ms delay, 500ms vibrate, 200ms pause, 500ms vibrate, 200ms pause, 800ms vibrate
            alertChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 800});
            alertChannel.setShowBadge(true);
            alertChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            alertChannel.setSound(defaultSoundUri, audioAttributes);

            // --- Channel 2: RRBM LIVE CHAT (HIGH Priority Heads-Up Display Over Any App) ---
            CharSequence chatChannelName = "💬 RRBM LIVE CHAT";
            String chatChannelDesc = "Real-time volunteer chat messages with heads-up banner over any display";
            int chatImportance = NotificationManager.IMPORTANCE_HIGH; // HIGH: Pop up over any active app!
            NotificationChannel chatChannel = new NotificationChannel(CHANNEL_CHAT_ID, chatChannelName, chatImportance);
            chatChannel.setDescription(chatChannelDesc);
            chatChannel.enableLights(true);
            chatChannel.enableVibration(true);
            chatChannel.setVibrationPattern(new long[]{0, 250, 150, 250});
            chatChannel.setShowBadge(true);
            chatChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            chatChannel.setSound(defaultSoundUri, audioAttributes);

            // --- Channel 3: RRBM GENERAL (Background Active Indicator) ---
            CharSequence generalChannelName = "RRBM GENERAL";
            String generalChannelDesc = "Background network connectivity and standing alert indicator";
            int generalImportance = NotificationManager.IMPORTANCE_LOW;
            NotificationChannel generalChannel = new NotificationChannel(CHANNEL_GENERAL_ID, generalChannelName, generalImportance);
            generalChannel.setDescription(generalChannelDesc);
            generalChannel.setShowBadge(false);

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
