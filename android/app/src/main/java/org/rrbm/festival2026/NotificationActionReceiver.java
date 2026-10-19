package org.rrbm.festival2026;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class NotificationActionReceiver extends BroadcastReceiver {

    private static final String TAG = "NotifActionReceiver";
    private static final String API_BASE = "https://rrbm-app-backend.onrender.com";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String alertId = intent.getStringExtra("alertId");
        if (alertId == null || alertId.isEmpty()) {
            alertId = "current";
        }

        // Dismiss alert notification
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(1001);
        }

        if ("ACTION_IM_COMING".equals(action)) {
            sendQuickResponse(context, alertId, "coming", "✓ Sent: I'm coming right now!");
        } else if ("ACTION_CANT_COME".equals(action)) {
            sendQuickResponse(context, alertId, "not_coming", "✕ Sent: I cant come.");
        }
    }

    private void sendQuickResponse(Context context, String alertId, String responseType, String feedbackText) {
        new Thread(() -> {
            try {
                URL url = new URL(API_BASE + "/api/alerts/response");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                JSONObject body = new JSONObject();
                body.put("alertId", alertId);
                body.put("volunteerId", "260");
                body.put("volunteerName", "Volunteer");
                body.put("responseType", responseType);

                byte[] input = body.toString().getBytes("utf-8");
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                Log.d(TAG, "Quick response sent, HTTP: " + code);

                new Handler(Looper.getMainLooper()).post(() -> {
                    Toast.makeText(context, feedbackText, Toast.LENGTH_SHORT).show();
                });
            } catch (Exception e) {
                Log.w(TAG, "Error posting quick response: " + e.getMessage());
                new Handler(Looper.getMainLooper()).post(() -> {
                    Toast.makeText(context, feedbackText, Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }
}
