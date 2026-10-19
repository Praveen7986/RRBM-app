package org.rrbm.festival2026;

import android.app.AlarmManager;
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
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
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
    private static final String BACKEND_ALERTS_URL = "https://rrbm-app-backend.onrender.com/api/alerts/active";
    private static final String BACKEND_CHAT_URL = "https://rrbm-app-backend.onrender.com/api/chat";

    private OkHttpClient client;
    private WebSocket webSocket;
    private Handler handler;
    private boolean isDestroyed = false;
    private int reconnectAttempts = 0;

    private String lastAlertIdNotified = null;
    private final Set<String> seenChatMessageIds = Collections.synchronizedSet(new HashSet<>());
    private boolean isInitialChatPoll = true;

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
        startBackgroundHttpPoll();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "RRBMNotificationService onStartCommand (START_STICKY)");
        if ((webSocket == null || isWebSocketDisconnected()) && !isDestroyed) {
            connectWebSocket();
        }
        return START_STICKY;
    }

    private boolean isWebSocketDisconnected() {
        return webSocket == null;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        Log.d(TAG, "onTaskRemoved: App swiped/closed. Keeping background notification service active.");
        try {
            Intent restartServiceIntent = new Intent(getApplicationContext(), RRBMNotificationService.class);
            restartServiceIntent.setPackage(getPackageName());
            PendingIntent restartPending = PendingIntent.getService(
                    getApplicationContext(),
                    1009,
                    restartServiceIntent,
                    PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
            );
            AlarmManager alarmService = (AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            if (alarmService != null) {
                alarmService.set(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        SystemClock.elapsedRealtime() + 1000,
                        restartPending
                );
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule restart in onTaskRemoved: " + e.getMessage());
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // Delete legacy cached channels
            try {
                nm.deleteNotificationChannel("rrbm_alerts_channel");
                nm.deleteNotificationChannel("rrbm_chat_channel");
            } catch (Exception ignored) {}

            Uri defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttrs = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                    .build();

            // 1. ALERTS CHANNEL (HIGH Priority / Max Heads-Up)
            NotificationChannel alertChannel = new NotificationChannel(
                    MainActivity.CHANNEL_ALERTS_ID,
                    "🚨 RRBM URGENT ALERTS",
                    NotificationManager.IMPORTANCE_HIGH
            );
            alertChannel.setDescription("High-priority leader emergency calls and urgent prayer alerts with pop-up display");
            alertChannel.enableLights(true);
            alertChannel.enableVibration(true);
            alertChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 800});
            alertChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            alertChannel.setShowBadge(true);
            alertChannel.setSound(defaultSound, audioAttrs);
            nm.createNotificationChannel(alertChannel);

            // 2. CHAT CHANNEL (HIGH Priority Heads-Up Pop-up Banner over other apps)
            NotificationChannel chatChannel = new NotificationChannel(
                    MainActivity.CHANNEL_CHAT_ID,
                    "💬 RRBM LIVE CHAT",
                    NotificationManager.IMPORTANCE_HIGH // HIGH importance enables Heads-Up banner!
            );
            chatChannel.setDescription("Real-time volunteer chat messages with heads-up banner over any display");
            chatChannel.enableLights(true);
            chatChannel.enableVibration(true);
            chatChannel.setVibrationPattern(new long[]{0, 250, 150, 250});
            chatChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            chatChannel.setShowBadge(true);
            chatChannel.setSound(defaultSound, audioAttrs);
            nm.createNotificationChannel(chatChannel);

            // 3. GENERAL / STATUS CHANNEL (LOW Priority ongoing background status)
            NotificationChannel generalChannel = new NotificationChannel(
                    MainActivity.CHANNEL_GENERAL_ID,
                    "RRBM GENERAL",
                    NotificationManager.IMPORTANCE_LOW
            );
            generalChannel.setDescription("Background alert network service indicator");
            generalChannel.setShowBadge(false);
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
                .setContentTitle("RRBM Volunteer Active Network")
                .setContentText("Connected • Listening for prayer alerts & team chat in real time")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setContentIntent(pendingIntent)
                .build();
    }

    private void acquireWakeLock(long durationMs) {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                @SuppressWarnings("deprecation")
                PowerManager.WakeLock wl = pm.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                        "rrbm:heads_up_wake_lock"
                );
                wl.acquire(durationMs);
            }
        } catch (Exception ignored) {}
    }

    private void initWebSocket() {
        client = new OkHttpClient.Builder()
                .pingInterval(20, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .connectTimeout(15, TimeUnit.SECONDS)
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
        long delay = Math.min(2000L * reconnectAttempts, 12000L);
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
                lastAlertIdNotified = alertId;
                showLeaderAlertNotification(alertMsg, alertId);
            } else if ("CHAT_MESSAGE_CREATED".equals(type) && payload != null) {
                JSONObject msgObj = payload.optJSONObject("message");
                if (msgObj == null) msgObj = payload;

                String msgId = msgObj.optString("id", "");
                if (!msgId.isEmpty()) {
                    seenChatMessageIds.add(msgId);
                }
                String senderName = msgObj.optString("senderName", "Volunteer");
                String text = msgObj.optString("text", "New message");
                showChatNotification(senderName, text);
            }
        } catch (Exception e) {
            Log.w(TAG, "Error handling incoming packet: " + e.getMessage());
        }
    }

    public void showLeaderAlertNotification(String message, String alertId) {
        acquireWakeLock(5000);
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

        // Action 1: Send alert
        Intent sendAlertIntent = new Intent(this, MainActivity.class);
        sendAlertIntent.putExtra("targetTab", "alert");
        sendAlertIntent.putExtra("action", "compose_alert");
        sendAlertIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pSendAlert = PendingIntent.getActivity(
                this,
                101,
                sendAlertIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Action 2: I'm coming
        Intent comingIntent = new Intent(this, NotificationActionReceiver.class);
        comingIntent.setAction("ACTION_IM_COMING");
        comingIntent.putExtra("alertId", alertId);
        PendingIntent pComing = PendingIntent.getBroadcast(
                this,
                102,
                comingIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Action 3: I cant come
        Intent notComingIntent = new Intent(this, NotificationActionReceiver.class);
        notComingIntent.setAction("ACTION_CANT_COME");
        notComingIntent.putExtra("alertId", alertId);
        PendingIntent pNotComing = PendingIntent.getBroadcast(
                this,
                103,
                notComingIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, MainActivity.CHANNEL_ALERTS_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("🚨 RRBM VOLUNTEER ALERT")
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_MAX) // MAX priority for Heads-Up
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 500, 200, 500, 200, 800})
                .setAutoCancel(true)
                .addAction(R.mipmap.ic_launcher, "🚨 Send alert", pSendAlert)
                .addAction(R.mipmap.ic_launcher, "✓ I'm coming", pComing)
                .addAction(R.mipmap.ic_launcher, "✕ I cant come", pNotComing)
                .setFullScreenIntent(pendingIntent, true) // Triggers heads-up pop-up banner over display
                .setContentIntent(pendingIntent);

        nm.notify(1001, builder.build());
    }

    public void showChatNotification(String senderName, String message) {
        acquireWakeLock(3000);
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

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, MainActivity.CHANNEL_CHAT_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("💬 " + senderName)
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH) // HIGH priority for Heads-Up banner
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 250, 150, 250})
                .setFullScreenIntent(pendingIntent, false) // Enables Heads-Up pop-up banner over any active app!
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        int notificationId = (int) (System.currentTimeMillis() % 100000);
        nm.notify(notificationId, builder.build());
    }

    private void startBackgroundHttpPoll() {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!isDestroyed) {
                    pollBackendAlerts();
                    pollBackendChat();
                    handler.postDelayed(this, 12000); // Poll every 12 seconds for real-time responsiveness
                }
            }
        }, 3000);
    }

    private void pollBackendAlerts() {
        new Thread(() -> {
            try {
                Request request = new Request.Builder()
                        .url(BACKEND_ALERTS_URL)
                        .build();
                Response response = client.newCall(request).execute();
                if (response.isSuccessful() && response.body() != null) {
                    String resStr = response.body().string();
                    JSONObject obj = new JSONObject(resStr);
                    JSONObject alert = obj.optJSONObject("activeAlert");
                    if (alert != null && "active".equals(alert.optString("status"))) {
                        String id = alert.optString("id");
                        String msg = alert.optString("message", "Volunteers are requested to gather immediately!");
                        if (id != null && !id.equals(lastAlertIdNotified)) {
                            lastAlertIdNotified = id;
                            handler.post(() -> showLeaderAlertNotification(msg, id));
                        }
                    }
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private void pollBackendChat() {
        new Thread(() -> {
            try {
                Request request = new Request.Builder()
                        .url(BACKEND_CHAT_URL)
                        .build();
                Response response = client.newCall(request).execute();
                if (response.isSuccessful() && response.body() != null) {
                    String resStr = response.body().string();
                    JSONObject obj = new JSONObject(resStr);
                    JSONArray messages = obj.optJSONArray("messages");
                    if (messages != null) {
                        if (isInitialChatPoll) {
                            // On initial poll, record existing IDs so we do not notify on historical messages
                            for (int i = 0; i < messages.length(); i++) {
                                JSONObject m = messages.optJSONObject(i);
                                if (m != null) {
                                    String id = m.optString("id");
                                    if (!id.isEmpty()) seenChatMessageIds.add(id);
                                }
                            }
                            isInitialChatPoll = false;
                        } else {
                            // On subsequent polls, trigger notification for any newly arrived messages
                            for (int i = 0; i < messages.length(); i++) {
                                JSONObject m = messages.optJSONObject(i);
                                if (m != null) {
                                    String id = m.optString("id");
                                    if (!id.isEmpty() && !seenChatMessageIds.contains(id)) {
                                        seenChatMessageIds.add(id);
                                        String type = m.optString("type", "chat");
                                        String senderName = m.optString("senderName", "Volunteer");
                                        String text = m.optString("text", "");

                                        if ("alert".equals(type) || m.optBoolean("isAlert", false)) {
                                            String alertId = m.optString("alertId", "current");
                                            if (!alertId.equals(lastAlertIdNotified)) {
                                                lastAlertIdNotified = alertId;
                                                handler.post(() -> showLeaderAlertNotification(text, alertId));
                                            }
                                        } else {
                                            handler.post(() -> showChatNotification(senderName, text));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }).start();
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
