package org.rrbm.festival2026;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

public class RRBMNotificationService extends Service {

    private static final String TAG = "RRBMNotificationService";
    private static final int FOREGROUND_NOTIFICATION_ID = 7799;
    private static final String WS_URL = "wss://rrbm-app-backend.onrender.com/ws";

    private OkHttpClient client;
    private WebSocket webSocket;
    private Handler handler;
    private boolean isDestroyed = false;
    private int reconnectAttempts = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "RRBMNotificationService created");
        handler = new Handler(Looper.getMainLooper());
        createNotificationChannels();

        // Start Foreground immediately with non-intrusive status notification
        Notification foregroundNotification = buildForegroundNotification();
        try {
            startForeground(FOREGROUND_NOTIFICATION_ID, foregroundNotification);
        } catch (Exception e) {
            Log.e(TAG, "Error calling startForeground: " + e.getMessage());
        }

        initWebSocket();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "RRBMNotificationService onStartCommand");
        if (webSocket == null && !isDestroyed) {
            connectWebSocket();
        }
        return START_STICKY;
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // 1. ALERTS CHANNEL (HIGH Priority)
            NotificationChannel alertChannel = new NotificationChannel(
                    MainActivity.CHANNEL_ALERTS_ID,
                    "RRBM ALERTS",
                    NotificationManager.IMPORTANCE_HIGH
            );
            alertChannel.setDescription("High-priority leader emergency calls and urgent prayer alerts");
            alertChannel.enableLights(true);
            alertChannel.enableVibration(true);
            alertChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 800});
            alertChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            Uri alertSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttrs = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
            alertChannel.setSound(alertSound, audioAttrs);
            nm.createNotificationChannel(alertChannel);

            // 2. CHAT CHANNEL (DEFAULT Priority)
            NotificationChannel chatChannel = new NotificationChannel(
                    MainActivity.CHANNEL_CHAT_ID,
                    "RRBM LIVE CHAT",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            chatChannel.setDescription("Real-time volunteer chat messages and coordination replies");
            chatChannel.enableLights(true);
            chatChannel.enableVibration(true);
            chatChannel.setVibrationPattern(new long[]{0, 150, 100, 150});
            nm.createNotificationChannel(chatChannel);

            // 3. GENERAL / STATUS CHANNEL (LOW Priority)
            NotificationChannel generalChannel = new NotificationChannel(
                    MainActivity.CHANNEL_GENERAL_ID,
                    "RRBM GENERAL",
                    NotificationManager.IMPORTANCE_LOW
            );
            generalChannel.setDescription("Background alert network service indicator");
            nm.createNotificationChannel(generalChannel);
        }
    }

    private Notification buildForegroundNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        return new NotificationCompat.Builder(this, MainActivity.CHANNEL_GENERAL_ID)
                .setContentTitle("RRBM Volunteer Network")
                .setContentText("Connected • Listening for prayer alerts & team chat")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setContentIntent(pendingIntent)
                .build();
    }

    private void initWebSocket() {
        client = new OkHttpClient.Builder()
                .pingInterval(25, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .retryOnConnectionFailure(true)
                .build();

        connectWebSocket();
    }

    private synchronized void connectWebSocket() {
        if (isDestroyed) return;

        try {
            Request request = new Request.Builder()
                    .url(WS_URL)
                    .build();

            if (webSocket != null) {
                try {
                    webSocket.cancel();
                } catch (Exception ignored) {}
            }

            Log.d(TAG, "Connecting to WebSocket: " + WS_URL);
            webSocket = client.newWebSocket(request, new WebSocketListener() {
                @Override
                public void onOpen(WebSocket ws, Response response) {
                    Log.d(TAG, "WebSocket connected successfully");
                    reconnectAttempts = 0;
                }

                @Override
                public void onMessage(WebSocket ws, String text) {
                    handleIncomingPacket(text);
                }

                @Override
                public void onClosed(WebSocket ws, int code, String reason) {
                    Log.d(TAG, "WebSocket closed: " + reason);
                    scheduleReconnect();
                }

                @Override
                public void onFailure(WebSocket ws, Throwable t, @Nullable Response response) {
                    Log.w(TAG, "WebSocket failure: " + t.getMessage());
                    scheduleReconnect();
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error initializing WebSocket connection: " + e.getMessage());
            scheduleReconnect();
        }
    }

    private void scheduleReconnect() {
        if (isDestroyed) return;

        reconnectAttempts++;
        long delay = Math.min(2000L * reconnectAttempts, 15000L);
        Log.d(TAG, "Scheduling reconnect in " + delay + "ms (attempt " + reconnectAttempts + ")");

        handler.postDelayed(() -> {
            if (!isDestroyed) {
                connectWebSocket();
            }
        }, delay);
    }

    private void handleIncomingPacket(String jsonStr) {
        try {
            JSONObject obj = new JSONObject(jsonStr);
            String type = obj.optString("type");
            JSONObject payload = obj.optJSONObject("payload");

            if ("ALERT_CREATED".equals(type) && payload != null) {
                JSONObject alertObj = payload.optJSONObject("alert");
                String alertMsg = "Volunteers are requested to gather immediately!";
                String alertId = "current";
                if (alertObj != null) {
                    alertMsg = alertObj.optString("message", alertMsg);
                    alertId = alertObj.optString("id", alertId);
                }
                showLeaderAlertNotification(alertMsg, alertId);
            } else if ("CHAT_MESSAGE_CREATED".equals(type) && payload != null) {
                JSONObject msgObj = payload.optJSONObject("message");
                if (msgObj == null) msgObj = payload;

                String senderName = msgObj.optString("senderName", "Volunteer");
                String text = msgObj.optString("text", "New message");
                showChatNotification(senderName, text);
            }
        } catch (Exception e) {
            Log.w(TAG, "Error handling incoming packet: " + e.getMessage());
        }
    }

    private void showLeaderAlertNotification(String message, String alertId) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("targetTab", "alert");
        intent.putExtra("alertId", alertId);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                (int) System.currentTimeMillis(),
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, MainActivity.CHANNEL_ALERTS_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("🚨 RRBM VOLUNTEER ALERT")
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 500, 200, 500, 200, 800})
                .setAutoCancel(true)
                .setFullScreenIntent(pendingIntent, true)
                .setContentIntent(pendingIntent);

        nm.notify(1001, builder.build());
    }

    private void showChatNotification(String senderName, String message) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("targetTab", "alert");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                (int) System.currentTimeMillis(),
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, MainActivity.CHANNEL_CHAT_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(senderName)
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        int notificationId = (int) (System.currentTimeMillis() % 100000);
        nm.notify(notificationId, builder.build());
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isDestroyed = true;
        Log.d(TAG, "RRBMNotificationService destroyed");
        if (webSocket != null) {
            try {
                webSocket.close(1000, "Service destroyed");
            } catch (Exception ignored) {}
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
