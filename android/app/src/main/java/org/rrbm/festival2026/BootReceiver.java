package org.rrbm.festival2026;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.content.ContextCompat;

public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "RRBMBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Log.d(TAG, "Received broadcast action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            try {
                Intent serviceIntent = new Intent(context, RRBMNotificationService.class);
                ContextCompat.startForegroundService(context, serviceIntent);
                Log.d(TAG, "Started RRBMNotificationService after device boot");
            } catch (Exception e) {
                Log.e(TAG, "Failed to start RRBMNotificationService on boot: " + e.getMessage());
            }
        }
    }
}
