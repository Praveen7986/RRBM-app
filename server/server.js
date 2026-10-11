// server/server.js
// RRBM — Production Realtime Backend Server & Notification Engine
// Features: Multi-Device Registration, High-Priority Leader Alerts, Live Chat Push, WebSocket Sync, Private APK Manifest

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const DIST_PATH = path.join(__dirname, '..', 'dist');
const RELEASES_DIR = path.join(__dirname, 'releases');
const MANIFEST_PATH = path.join(__dirname, 'data', 'update.json');
const ADMIN_PIN = process.env.ADMIN_PIN || '2026';

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(RELEASES_DIR)) fs.mkdirSync(RELEASES_DIR, { recursive: true });

// Counter for Unique Sequential Alert IDs (e.g. RRBM-ALERT-20261020-0001)
let alertSequence = 1;

const DEFAULT_DB = {
  lastVolunteerId: 260,
  volunteers: [
    { id: '260', name: 'Coordination Desk', registeredAt: '2026-10-20T06:00:00.000Z', active: true, role: 'leader' }
  ],
  devices: [], // [{ volunteerId: '261', deviceId: '...', pushToken: '...', platform: 'android', registeredAt: '...' }]
  activeAlert: null,
  alertsHistory: [],
  chatMessages: [
    {
      id: 'MSG_INIT_1',
      volunteerId: 'OFFICE',
      senderName: 'Pastor Office',
      text: 'Welcome to RRBM 3-Day Fasting Prayers 2026! Morning altar prayer begins at 09:00 AM.',
      time: '09:00 AM',
      type: 'chat'
    },
    {
      id: 'MSG_INIT_2',
      volunteerId: 'LEAD',
      senderName: 'Worship Leader',
      text: 'Worship team sound check complete. All volunteers please take your respective stations.',
      time: '09:05 AM',
      type: 'chat'
    }
  ],
  offeringBalance: {
    amount: 148500,
    updatedBy: 'Festival Coordination Desk',
    updatedAt: new Date().toISOString()
  }
};

const DEFAULT_MANIFEST = {
  latestVersionName: "1.1.0",
  latestVersionCode: 2,
  minimumSupportedVersionCode: 1,
  apkUrl: "/rrbm-app/releases/RRBM-1.1.0.apk",
  apkSize: 18454912,
  sha256: "c2947a531f91bf5528eb3a7909b700028f99ccb8d153748647567d3cecbbd933",
  releaseDate: "2026-10-10",
  releaseNotes: [
    "Dedicated High-Priority RRBM ALERTS channel with strong vibration pattern",
    "Real-time volunteer chat notifications with grouping and cold-start tap routing",
    "Integrated official RRBM application logo across all screens and notification icons",
    "Private in-app APK update system with SHA-256 cryptographic verification"
  ],
  forceUpdate: false
};

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return { ...DEFAULT_DB, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error loading DB, resetting to defaults:', err);
  }
  saveDb(DEFAULT_DB);
  return { ...DEFAULT_DB };
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

function loadManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const data = fs.readFileSync(MANIFEST_PATH, 'utf-8');
      return { ...DEFAULT_MANIFEST, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error loading Manifest:', err);
  }
  saveManifest(DEFAULT_MANIFEST);
  return { ...DEFAULT_MANIFEST };
}

function saveManifest(data) {
  try {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving Manifest:', err);
  }
}

// Generate unique format: RRBM-ALERT-YYYYMMDD-XXXX
function generateAlertId() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const seq = String(alertSequence++).padStart(4, '0');
  return `RRBM-ALERT-${yyyy}${mm}${dd}-${seq}`;
}

let db = loadDb();
let updateManifest = loadManifest();

// Create HTTP Server
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-pin, x-volunteer-id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  const parseJsonBody = () => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });
  };

  const sendJson = (statusCode, data, extraHeaders = {}) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      ...extraHeaders
    });
    res.end(JSON.stringify(data));
  };

  const sendError = (statusCode, message) => {
    sendJson(statusCode, { success: false, error: message });
  };

  // ==========================================
  // UPDATE MANIFEST & APK HOSTING
  // ==========================================
  if ((pathname === '/rrbm-app/update.json' || pathname === '/api/update.json') && req.method === 'GET') {
    sendJson(200, updateManifest, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    return;
  }

  if (pathname.startsWith('/rrbm-app/releases/')) {
    const fileName = path.basename(pathname);
    const apkFilePath = path.join(RELEASES_DIR, fileName);

    if (fs.existsSync(apkFilePath) && fs.statSync(apkFilePath).isFile()) {
      const stat = fs.statSync(apkFilePath);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600'
      });
      const readStream = fs.createReadStream(apkFilePath);
      readStream.pipe(res);
      return;
    }
    return sendError(404, 'Release APK file not found on private server');
  }

  // ==========================================
  // API ENDPOINTS
  // ==========================================

    // 1. Health Check
    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(200, {
        status: 'healthy',
        service: 'RRBM Production Alert & Realtime Server',
        event: 'RRBM 3-Day Fasting Prayers 2026',
        installedVersion: '1.0.0',
        activeAlert: db.activeAlert ? db.activeAlert.id : null,
        volunteersCount: db.volunteers.length,
        registeredDevices: (db.devices || []).length,
        chatMessagesCount: db.chatMessages.length,
        connectedSockets: wss.clients.size,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 2. Volunteers List (GET)
    if (pathname === '/api/volunteers' && req.method === 'GET') {
      sendJson(200, {
        success: true,
        volunteers: db.volunteers,
        count: db.volunteers.length
      });
      return;
    }

    // 3. Volunteer Registration (POST)
    if (pathname === '/api/volunteers/register' && req.method === 'POST') {
      parseJsonBody().then(body => {
        const name = (body.name || '').trim();
        if (!name) return sendError(400, 'Volunteer name is required.');

        const existing = db.volunteers.find(v => v.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          existing.lastActive = new Date().toISOString();
          saveDb(db);
          broadcast('VOLUNTEER_REGISTERED', existing);
          console.log(`[Volunteer] Existing volunteer '${name}' reconnected (ID: ${existing.id})`);
          return sendJson(200, { success: true, volunteer: existing, reused: true });
        }

        db.lastVolunteerId += 1;
        const newVolunteer = {
          id: db.lastVolunteerId.toString(),
          name: name,
          registeredAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          active: true,
          role: body.isLeader ? 'leader' : 'volunteer'
        };

        db.volunteers.push(newVolunteer);
        saveDb(db);

        broadcast('VOLUNTEER_REGISTERED', newVolunteer);
        console.log(`[Volunteer] Registered new volunteer '${name}' with ID ${newVolunteer.id}`);
        sendJson(201, { success: true, volunteer: newVolunteer });
      }).catch(err => sendError(400, 'Invalid JSON body'));
      return;
    }

    // 4. Multi-Device Push Registration (POST)
    if (pathname === '/api/push/register-device' && req.method === 'POST') {
      parseJsonBody().then(body => {
        const { volunteerId, deviceId, pushToken, platform } = body;
        if (!volunteerId || !pushToken) {
          return sendError(400, 'volunteerId and pushToken are required.');
        }

        if (!db.devices) db.devices = [];

        const existingIdx = db.devices.findIndex(d => d.deviceId === deviceId || d.pushToken === pushToken);
        const deviceRecord = {
          volunteerId,
          deviceId: deviceId || `dev_${Date.now()}`,
          pushToken,
          platform: platform || 'android',
          registeredAt: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          db.devices[existingIdx] = deviceRecord;
        } else {
          db.devices.push(deviceRecord);
        }

        saveDb(db);
        console.log(`[PushRegistry] Device registered for Volunteer ${volunteerId} (Total devices: ${db.devices.length})`);
        sendJson(200, { success: true, message: 'Device registered for alerts & live chat push' });
      }).catch(err => sendError(400, 'Invalid request'));
      return;
    }

    // 5. Token Refresh (POST)
    if (pathname === '/api/push/refresh-token' && req.method === 'POST') {
      parseJsonBody().then(body => {
        const { oldToken, newToken, volunteerId } = body;
        if (!newToken) return sendError(400, 'newToken required');

        if (!db.devices) db.devices = [];
        const dev = db.devices.find(d => d.pushToken === oldToken || d.volunteerId === volunteerId);
        if (dev) {
          dev.pushToken = newToken;
          dev.lastSeen = new Date().toISOString();
          saveDb(db);
        }
        sendJson(200, { success: true, message: 'Push token refreshed' });
      }).catch(err => sendError(400, 'Invalid request'));
      return;
    }

    // 6. Active Alert (GET)
    if (pathname === '/api/alerts/active' && req.method === 'GET') {
      sendJson(200, {
        success: true,
        activeAlert: db.activeAlert
      });
      return;
    }

    // 7. Alert History (GET)
    if (pathname === '/api/alerts/history' && req.method === 'GET') {
      sendJson(200, {
        success: true,
        alerts: db.alertsHistory || []
      });
      return;
    }

    // 8. Leader Alert Dispatch (POST)
    if (pathname === '/api/alerts' && req.method === 'POST') {
      parseJsonBody().then(body => {
        const senderId = body.volunteerId || '260';
        const senderName = body.senderName || 'Leader Call';
        const customMessage = body.message || '🚨 RRBM ALERT: Leader is calling — volunteers are requested to gather immediately.';

        const alertId = generateAlertId();
        const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newAlert = {
          id: alertId,
          triggeredBy: { id: senderId, name: senderName },
          message: customMessage,
          status: 'active',
          createdAt: new Date().toISOString(),
          timeFormatted: nowFormatted,
          responses: { coming: [], coming_late: [], not_coming: [] }
        };

        db.activeAlert = newAlert;
        if (!db.alertsHistory) db.alertsHistory = [];
        db.alertsHistory.unshift(newAlert);
        if (db.alertsHistory.length > 50) db.alertsHistory.pop();

        // Chat announcement entry
        const chatMsg = {
          id: `MSG_${Date.now()}_ALERT`,
          volunteerId: senderId,
          senderName: senderName,
          text: customMessage,
          time: nowFormatted,
          type: 'alert',
          isAlert: true,
          alertId: alertId
        };

        db.chatMessages.push(chatMsg);
        if (db.chatMessages.length > 200) db.chatMessages.shift();
        saveDb(db);

        // Notification Payload
        const alertNotificationPayload = {
          channelId: 'rrbm_alerts_channel',
          title: '🚨 RRBM ALERT',
          body: 'Leader is calling — please check the RRBM app.',
          priority: 'high',
          vibrationPattern: [0, 500, 200, 500, 200, 800],
          icon: '/logo.png',
          badge: '/logo.png',
          tag: `rrbm-alert-${alertId}`,
          data: {
            type: 'ALERT',
            alertId: alertId,
            targetTab: 'alert',
            timestamp: Date.now()
          }
        };

        // Broadcast in real-time to active WebSocket clients
        broadcast('ALERT_CREATED', {
          alert: newAlert,
          chatMessage: chatMsg,
          notification: alertNotificationPayload
        });

        console.log(`[LeaderAlert] Dispatched ${alertId} by ${senderName} (${senderId}) to all connected clients.`);
        sendJson(201, { success: true, alert: newAlert, chatMessage: chatMsg, alertId });
      }).catch(err => sendError(400, 'Invalid request'));
      return;
    }

    // 9. Resolve Active Alert (POST)
    if (pathname.match(/^\/api\/alerts\/([^/]+)\/resolve$/) && req.method === 'POST') {
      const alertId = pathname.split('/')[3];
      if (db.activeAlert && (db.activeAlert.id === alertId || alertId === 'current')) {
        db.activeAlert.status = 'resolved';
        db.activeAlert.resolvedAt = new Date().toISOString();
        const resolved = db.activeAlert;
        db.activeAlert = null;
        saveDb(db);

        broadcast('ALERT_RESOLVED', { alertId: resolved.id });
        console.log(`[AlertResolved] Alert ${resolved.id} marked resolved.`);
        sendJson(200, { success: true, message: 'Alert resolved successfully' });
      } else {
        db.activeAlert = null;
        saveDb(db);
        broadcast('ALERT_RESOLVED', { alertId });
        sendJson(200, { success: true, message: 'Active alert cleared' });
      }
      return;
    }

    // 10. Volunteer Quick Response (POST)
    if (pathname.match(/^\/api\/alerts\/([^/]+)\/response$/) && req.method === 'POST') {
      const alertId = pathname.split('/')[3];
      parseJsonBody().then(body => {
        const { volunteerId, volunteerName, responseType } = body;
        if (!volunteerId || !responseType) {
          return sendError(400, 'volunteerId and responseType are required');
        }

        let targetAlert = (db.activeAlert && db.activeAlert.id === alertId) ? db.activeAlert : (db.alertsHistory || []).find(a => a.id === alertId);
        if (!targetAlert && db.activeAlert) targetAlert = db.activeAlert;

        if (targetAlert) {
          if (!targetAlert.responses) targetAlert.responses = { coming: [], coming_late: [], not_coming: [] };
          ['coming', 'coming_late', 'not_coming'].forEach(k => {
            if (targetAlert.responses[k]) {
              targetAlert.responses[k] = targetAlert.responses[k].filter(id => id !== volunteerId);
            }
          });
          if (targetAlert.responses[responseType]) {
            targetAlert.responses[responseType].push(volunteerId);
          }
        }

        const responseText = responseType === 'coming'
          ? "✓ I'm coming right now."
          : responseType === 'coming_late'
          ? "⏳ I'll be there in 5–10 minutes."
          : "✕ Sorry, I'm unable to come.";

        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const chatMsg = {
          id: `MSG_${Date.now()}_RESP_${volunteerId}`,
          volunteerId,
          senderName: volunteerName || `Volunteer ${volunteerId}`,
          text: responseText,
          time: timeFormatted,
          type: 'quick_response',
          responseType,
          alertId
        };

        db.chatMessages.push(chatMsg);
        if (db.chatMessages.length > 200) db.chatMessages.shift();
        saveDb(db);

        broadcast('VOLUNTEER_RESPONSE_UPDATED', {
          alertId: targetAlert ? targetAlert.id : alertId,
          volunteerId,
          volunteerName,
          responseType,
          responses: targetAlert ? targetAlert.responses : null,
          chatMessage: chatMsg
        });

        console.log(`[QuickResponse] Volunteer ${volunteerName} (${volunteerId}) responded: ${responseType}`);
        sendJson(200, { success: true, chatMessage: chatMsg, responses: targetAlert ? targetAlert.responses : null });
      }).catch(err => sendError(400, 'Invalid request'));
      return;
    }

    // 11. Get Chat Messages (GET)
    if (pathname === '/api/chat' && req.method === 'GET') {
      sendJson(200, {
        success: true,
        messages: db.chatMessages || []
      });
      return;
    }

    // 12. Post Live Chat Message (POST)
    if (pathname === '/api/chat' && req.method === 'POST') {
      parseJsonBody().then(body => {
        const { volunteerId, senderName, text } = body;
        if (!text || !text.trim()) return sendError(400, 'Message text is required');

        const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageId = `MSG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        const newMsg = {
          id: messageId,
          volunteerId: volunteerId || '260',
          senderName: senderName || 'Volunteer',
          text: text.trim().substring(0, 500),
          time: timeFormatted,
          type: 'chat'
        };

        db.chatMessages.push(newMsg);
        if (db.chatMessages.length > 200) db.chatMessages.shift();
        saveDb(db);

        const chatNotificationPayload = {
          channelId: 'rrbm_chat_channel',
          title: 'RRBM Live Chat',
          body: `${senderName}: ${newMsg.text.length > 60 ? newMsg.text.substring(0, 57) + '...' : newMsg.text}`,
          priority: 'default',
          group: 'rrbm_chat_group',
          icon: '/logo.png',
          badge: '/logo.png',
          tag: `rrbm-chat-${messageId}`,
          data: {
            type: 'CHAT',
            messageId: messageId,
            senderId: volunteerId,
            targetTab: 'alert',
            timestamp: Date.now()
          }
        };

        broadcast('CHAT_MESSAGE_CREATED', {
          message: newMsg,
          notification: chatNotificationPayload
        });

        console.log(`[LiveChat] Message from ${senderName} (${volunteerId}): "${newMsg.text}"`);
        sendJson(201, { success: true, message: newMsg });
      }).catch(err => sendError(400, 'Invalid request'));
      return;
    }

    // 13. Offering Balance API (GET)
    if (pathname === '/api/balance' && req.method === 'GET') {
      sendJson(200, { success: true, balance: db.offeringBalance });
      return;
    }

    // 14. Offering Balance API (POST / PUT)
    if (pathname === '/api/balance' && (req.method === 'POST' || req.method === 'PUT')) {
      const adminPin = req.headers['x-admin-pin'];
      if (adminPin !== ADMIN_PIN) return sendError(401, 'Unauthorized: Invalid Manager PIN');

      parseJsonBody().then(body => {
        const amount = Number(body.amount);
        if (isNaN(amount) || amount < 0) return sendError(400, 'Invalid offering amount');

        db.offeringBalance = {
          amount,
          updatedBy: body.updatedBy || 'Festival Manager',
          updatedAt: new Date().toISOString()
        };
        saveDb(db);

        broadcast('BALANCE_UPDATED', db.offeringBalance);
        console.log(`[OfferingBalance] Updated to ₹${amount.toLocaleString()} by ${db.offeringBalance.updatedBy}`);
        sendJson(200, { success: true, balance: db.offeringBalance });
      }).catch(err => sendError(400, 'Invalid request'));
      return;
    }

    // 15. Manager PIN Login (POST)
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      parseJsonBody().then(body => {
        const pin = body.pin || '';
        if (pin === ADMIN_PIN) {
          const token = crypto.createHash('sha256').update(pin + Date.now()).digest('hex');
          sendJson(200, { success: true, token, role: 'manager' });
        } else {
          sendError(401, 'Invalid Security PIN');
        }
      }).catch(() => sendError(400, 'Invalid request'));
      return;
    }

    // 16. Manager Stats (GET)
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
      const adminPin = req.headers['x-admin-pin'];
      if (adminPin !== ADMIN_PIN) return sendError(401, 'Unauthorized');

      sendJson(200, {
        success: true,
        stats: {
          volunteersCount: db.volunteers.length,
          volunteersList: db.volunteers,
          devicesCount: (db.devices || []).length,
          activeAlert: db.activeAlert,
          alertsCount: (db.alertsHistory || []).length,
          chatMessagesCount: db.chatMessages.length,
          offeringBalance: db.offeringBalance,
          connectedSockets: wss.clients.size
        }
      });
      return;
    }

    // 17. Static File Server
    if (fs.existsSync(DIST_PATH)) {
      let filePath = path.join(DIST_PATH, pathname === '/' ? 'index.html' : pathname);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_PATH, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const MIME_TYPES = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.apk': 'application/vnd.android.package-archive',
        '.webmanifest': 'application/manifest+json'
      };

      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      } catch (e) {}
    }

    sendError(404, 'Endpoint Not Found');
  });

// ==========================================
// REALTIME WEBSOCKET SERVER
// ==========================================
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(type, payload) {
  const messageStr = JSON.stringify({ type, payload, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
      } catch (err) {}
    }
  });
}

wss.on('connection', (ws) => {
  const initState = {
    type: 'INITIAL_SYNC',
    payload: {
      activeAlert: db.activeAlert,
      chatMessages: db.chatMessages.slice(-50),
      offeringBalance: db.offeringBalance,
      volunteerCount: db.volunteers.length
    },
    timestamp: Date.now()
  };

  try {
    ws.send(JSON.stringify(initState));
  } catch (err) {}

  ws.on('message', rawMsg => {
    try {
      const parsed = JSON.parse(rawMsg.toString());
      if (parsed.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {}
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  console.log(`====================================================`);
  console.log(`🌟 RRBM FASTING PRAYERS 2026 ALERT ENGINE ONLINE`);
  console.log(`📡 Local URL:   http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`📱 Phone URL:   http://${ip}:${PORT}`);
    console.log(`⚡ WebSocket:   ws://${ip}:${PORT}/ws`);
  });
  console.log(`🔔 Android Alert Channel: rrbm_alerts_channel (HIGH)`);
  console.log(`💬 Android Chat Channel:  rrbm_chat_channel (DEFAULT)`);
  console.log(`📦 Private APK Manifest:  http://localhost:${PORT}/rrbm-app/update.json`);
  console.log(`====================================================`);
});
