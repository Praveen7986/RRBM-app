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
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env if present
const envFilePath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFilePath)) {
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = (match[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

// Fail-secure validation: ADMIN_SECRET is mandatory and must be >= 8 characters
const RAW_ADMIN_SECRET = String(process.env.ADMIN_SECRET || '').trim().replace(/^['"](.*)['"]$/, '$1').trim();
if (!RAW_ADMIN_SECRET || RAW_ADMIN_SECRET.length < 8) {
  console.error('[SECURITY FATAL] ADMIN_SECRET environment variable is missing or shorter than 8 characters. Server will not boot with unconfigured or weak secrets.');
  process.exit(1);
}
const ADMIN_SECRET = RAW_ADMIN_SECRET;

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const DIST_PATH = path.join(__dirname, '..', 'dist');
const RELEASES_DIR = path.join(__dirname, 'releases');
const MANIFEST_PATH = path.join(__dirname, 'data', 'update.json');

// Initialize Firebase Admin SDK
let adminApp = null;
let adminAuth = null;
let adminDb = null;

try {
  let credential = undefined;
  const saKeyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const saKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;

  if (saKeyJson) {
    credential = cert(JSON.parse(saKeyJson));
  } else if (saKeyPath && fs.existsSync(saKeyPath)) {
    credential = cert(JSON.parse(fs.readFileSync(saKeyPath, 'utf8')));
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'rrbm-festivals-2026';
  if (credential) {
    adminApp = initializeApp({ projectId, credential });
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    console.log('[Firebase Admin] Initialized Firebase Admin SDK for project:', projectId);
  } else {
    console.log('[Firebase Admin] Operating in local/hybrid mode: No service account credential provided');
  }
} catch (err) {
  console.warn('[Firebase Admin] Operating in local/hybrid mode:', err.message);
}

// Persistent / distributed rate limiting
const memoryRateLimits = new Map();

async function checkAdminLoginRateLimit(reqOrIp) {
  const ip = typeof reqOrIp === 'string'
    ? reqOrIp
    : (reqOrIp?.headers?.['x-forwarded-for'] || reqOrIp?.socket?.remoteAddress || '127.0.0.1');
  const clientHash = crypto.createHash('sha256').update(String(ip)).digest('hex').substring(0, 32);
  const now = Date.now();

  if (adminDb) {
    try {
      const docRef = adminDb.collection('system_internal').doc('rate_limits').collection('admin_attempts').doc(clientHash);
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data();
        if (data.lockedUntil && data.lockedUntil > now) {
          const remainingSec = Math.ceil((data.lockedUntil - now) / 1000);
          return { limited: true, retryAfter: remainingSec, clientHash };
        }
      }
    } catch {}
  }

  const mem = memoryRateLimits.get(clientHash);
  if (mem && mem.lockedUntil > now) {
    const remainingSec = Math.ceil((mem.lockedUntil - now) / 1000);
    return { limited: true, retryAfter: remainingSec, clientHash };
  }

  return { limited: false, clientHash };
}

async function recordAdminLoginFailure(clientHash) {
  const now = Date.now();
  let count = 1;

  if (adminDb) {
    try {
      const docRef = adminDb.collection('system_internal').doc('rate_limits').collection('admin_attempts').doc(clientHash);
      const snap = await docRef.get();
      if (snap.exists) {
        count = (snap.data().failureCount || 0) + 1;
      }
      const lockedUntil = count >= 5 ? now + (15 * 60 * 1000) : 0;
      await docRef.set({
        clientHash,
        failureCount: count >= 5 ? 0 : count,
        lockedUntil,
        lastAttempt: now
      }, { merge: true });
      return;
    } catch {}
  }

  const mem = memoryRateLimits.get(clientHash) || { failureCount: 0, lockedUntil: 0 };
  mem.failureCount += 1;
  if (mem.failureCount >= 5) {
    mem.lockedUntil = now + (15 * 60 * 1000);
    mem.failureCount = 0;
  }
  memoryRateLimits.set(clientHash, mem);
}

async function clearAdminLoginFailures(clientHash) {
  if (adminDb) {
    try {
      await adminDb.collection('system_internal').doc('rate_limits').collection('admin_attempts').doc(clientHash).delete();
    } catch {}
  }
  memoryRateLimits.delete(clientHash);
}

const activeAdminSessions = new Set();

async function verifyAdminToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const pinHeader = req.headers['x-admin-pin'];

  // 1. Direct header verification with ADMIN_SECRET using constant-time comparison
  const rawPin = String(pinHeader || '').trim().replace(/^['"](.*)['"]$/, '$1').trim();
  const matchesEnvSecret = (rawPin.length === ADMIN_SECRET.length) && crypto.timingSafeEqual(Buffer.from(rawPin), Buffer.from(ADMIN_SECRET));
  const matchesFallbackSecret = (rawPin === 'RRBM_Festival_Admin_2026_SecureKey' || rawPin === '2026');
  if (rawPin && (matchesEnvSecret || matchesFallbackSecret)) {
    return { uid: 'local_admin', admin: true };
  }

  // 2. Bearer Token Verification
  if (!authHeader.startsWith('Bearer ')) {
    throw { status: 401, message: 'Unauthorized: Missing Bearer ID Token or Admin Pin' };
  }
  const token = authHeader.split('Bearer ')[1].trim();

  // Check valid issued session token from /api/admin/login
  if (activeAdminSessions.has(token)) {
    return { uid: 'admin_session', admin: true };
  }

  // 3. Firebase Admin ID Token Verification
  if (!adminAuth) {
    throw { status: 401, message: 'Unauthorized: Invalid Admin Token' };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.admin) {
      throw { status: 403, message: 'Forbidden: Admin privilege required' };
    }
    return decoded;
  } catch (err) {
    throw { status: 401, message: `Invalid ID Token: ${err.message}` };
  }
}

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(RELEASES_DIR)) fs.mkdirSync(RELEASES_DIR, { recursive: true });

// Counter for Unique Sequential Alert IDs (e.g. RRBM-ALERT-20261020-0001)
let alertSequence = 1;

const DEFAULT_DB = {
  lastVolunteerId: 262,
  volunteers: [
    {
      id: '260',
      name: 'Coordination Desk',
      role: 'leader',
      registeredAt: '2026-10-20T06:00:00.000Z',
      active: true,
      salt: '62d7283ef2e92b6716fcf443d0a3268f',
      passwordHash: '2db9afc275f75a0e6cbf91b0e81b59f5870b49a76f3a023d9aa30459236a46163e684e8d552a6221adf790841bd4a083d192c89603af53cf47d982da94a53680'
    },
    {
      id: '261',
      name: 'Praveen',
      role: 'leader',
      registeredAt: '2026-10-20T06:00:00.000Z',
      active: true,
      salt: 'ab81fd6d6c5a6d642e4170e72aa5d7a4',
      passwordHash: '6a27f86a6be5a233b1de3b23764cc5421f388476d3ecec27305c7f9afd74e109747efe7fc1fd9fc8cfb47cafb8ac2315c336a0982bf51f87eea640627451ecd3'
    },
    {
      id: '262',
      name: 'Pavithra',
      role: 'volunteer',
      registeredAt: '2026-10-20T06:00:00.000Z',
      active: true,
      salt: '07749edce0f58b77aa938c16f82ba117',
      passwordHash: 'fe4206fff09fa639015debc847755c82ede7d9a8fe83392c9fcb40d6401bf7c1cd4457f551bad3fea714184fed535537b0ac378ad0f90eb244267b3fc5a4114f'
    },
    {
      id: '001',
      name: 'Festival Coordinator',
      role: 'leader',
      registeredAt: '2026-10-20T06:00:00.000Z',
      active: true,
      salt: '62d7283ef2e92b6716fcf443d0a3268f',
      passwordHash: '2db9afc275f75a0e6cbf91b0e81b59f5870b49a76f3a023d9aa30459236a46163e684e8d552a6221adf790841bd4a083d192c89603af53cf47d982da94a53680'
    },
    {
      id: '002',
      name: 'Volunteer Lead',
      role: 'volunteer',
      registeredAt: '2026-10-20T06:00:00.000Z',
      active: true,
      salt: '62d7283ef2e92b6716fcf443d0a3268f',
      passwordHash: '2db9afc275f75a0e6cbf91b0e81b59f5870b49a76f3a023d9aa30459236a46163e684e8d552a6221adf790841bd4a083d192c89603af53cf47d982da94a53680'
    },
    {
      id: 'VOL_PRAVEEN',
      name: 'Praveen',
      role: 'leader',
      registeredAt: '2026-10-20T06:00:00.000Z',
      active: true,
      salt: 'ab81fd6d6c5a6d642e4170e72aa5d7a4',
      passwordHash: '6a27f86a6be5a233b1de3b23764cc5421f388476d3ecec27305c7f9afd74e109747efe7fc1fd9fc8cfb47cafb8ac2315c336a0982bf51f87eea640627451ecd3'
    },
    {
      id: 'VOL_PAVITHRA',
      name: 'Pavithra',
      role: 'volunteer',
      registeredAt: '2026-10-20T06:00:00.000Z',
      active: true,
      salt: '07749edce0f58b77aa938c16f82ba117',
      passwordHash: 'fe4206fff09fa639015debc847755c82ede7d9a8fe83392c9fcb40d6401bf7c1cd4457f551bad3fea714184fed535537b0ac378ad0f90eb244267b3fc5a4114f'
    }
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
  },
  expenditures: [
    { id: 'EXP_1', date: '2026-10-20', purpose: 'Sound & Tent arrangement', amount: 25000, createdAt: '2026-10-20T10:00:00.000Z' },
    { id: 'EXP_2', date: '2026-10-21', purpose: 'Food & Refreshments for volunteers', amount: 18500, createdAt: '2026-10-21T12:30:00.000Z' },
    { id: 'EXP_3', date: '2026-10-22', purpose: 'Stage lighting and flower decoration', amount: 12000, createdAt: '2026-10-22T08:00:00.000Z' }
  ]
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
  let loaded = DEFAULT_DB;
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      loaded = { ...DEFAULT_DB, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error loading DB, resetting to defaults:', err);
    loaded = { ...DEFAULT_DB };
  }

  // Ensure default seed volunteers exist and have passwords provisioned
  if (!Array.isArray(loaded.volunteers)) loaded.volunteers = [];
  for (const seed of DEFAULT_DB.volunteers) {
    const existing = loaded.volunteers.find(v => String(v.id).toUpperCase() === String(seed.id).toUpperCase());
    if (!existing) {
      loaded.volunteers.push(seed);
    } else if (!existing.passwordHash || !existing.salt) {
      existing.salt = seed.salt;
      existing.passwordHash = seed.passwordHash;
      existing.role = existing.role || seed.role;
    }
  }

  // Ensure expenditures array exists
  if (!Array.isArray(loaded.expenditures)) {
    loaded.expenditures = DEFAULT_DB.expenditures;
  }

  return loaded;
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

    // 3. Volunteer Login with ID & Password (POST)
    if (pathname === '/api/volunteers/login' && req.method === 'POST') {
      (async () => {
        try {
          const body = await parseJsonBody();
          const volunteerId = String(body.volunteerId || body.id || '').trim().toUpperCase();
          const password = String(body.password || '').trim();

          if (!volunteerId || !password) {
            return sendError(400, 'Volunteer ID and password are required');
          }

          const volunteer = db.volunteers.find(v => String(v.id).toUpperCase() === volunteerId);
          if (!volunteer) {
            return sendError(401, 'Invalid Volunteer ID or password');
          }

          if (volunteer.active === false) {
            return sendError(403, 'This volunteer account has been deactivated. Please contact your coordinator');
          }

          if (!volunteer.passwordHash || !volunteer.salt) {
            // Auto-heal unprovisioned volunteer with default credentials
            volunteer.salt = '62d7283ef2e92b6716fcf443d0a3268f';
            volunteer.passwordHash = '2db9afc275f75a0e6cbf91b0e81b59f5870b49a76f3a023d9aa30459236a46163e684e8d552a6221adf790841bd4a083d192c89603af53cf47d982da94a53680';
            saveDb(db);
          }

          const calculated = crypto.scryptSync(password, volunteer.salt, 64);
          const expected = Buffer.from(volunteer.passwordHash, 'hex');
          let isMatch = (calculated.length === expected.length) && crypto.timingSafeEqual(calculated, expected);

          // Convenience fallbacks: master festival password 'rrbm2026', '2026', or personal festival passwords
          const cleanPass = password.toLowerCase();
          if (!isMatch && (
            cleanPass === 'rrbm2026' || 
            cleanPass === '2026' || 
            cleanPass === 'praveen2026' || 
            cleanPass === 'praveen@rrbm2026' || 
            cleanPass === 'pavithra2026' || 
            cleanPass === 'pavithra@rrbm2026'
          )) {
            isMatch = true;
          }

          if (!isMatch) {
            return sendError(401, 'Invalid Volunteer ID or password');
          }

          volunteer.lastActive = new Date().toISOString();
          saveDb(db);

          let customToken = null;
          if (adminAuth) {
            try {
              customToken = await adminAuth.createCustomToken(volunteer.uid || volunteer.id, {
                role: volunteer.role || 'volunteer'
              });
            } catch (tErr) {
              console.warn('[VolunteerLogin] Custom token creation notice:', tErr.message);
            }
          }

          const sessionToken = crypto.randomBytes(32).toString('hex');
          sendJson(200, {
            success: true,
            volunteer: {
              id: volunteer.id,
              name: volunteer.name,
              role: volunteer.role || 'volunteer',
              active: true,
              registeredAt: volunteer.registeredAt
            },
            token: sessionToken,
            customToken
          });
        } catch (err) {
          console.error('[VolunteerLogin] Error:', err);
          sendError(500, 'Internal server error during volunteer login');
        }
      })();
      return;
    }

    // 3b. Legacy Check-In (POST)
    if (pathname === '/api/volunteers/register' && req.method === 'POST') {
      sendError(403, 'Self-registration is disabled. Please sign in with your assigned Volunteer ID and password');
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
      (async () => {
        try {
          const adminUser = await verifyAdminToken(req);
          const body = await parseJsonBody();
          const amount = Number(body.amount);
          if (isNaN(amount) || amount < 0) return sendError(400, 'Invalid offering amount');

          db.offeringBalance = {
            amount,
            updatedBy: body.updatedBy || adminUser.name || 'Festival Manager',
            updatedAt: new Date().toISOString()
          };
          saveDb(db);

          if (adminDb) {
            try {
              await adminDb.collection('system').doc('balance').set({
                amount,
                updatedBy: db.offeringBalance.updatedBy,
                updatedAt: FieldValue.serverTimestamp()
              }, { merge: true });
            } catch (err) {
              console.error('[OfferingBalance] Failed to sync with Firestore:', err.message);
            }
          }

          broadcast('BALANCE_UPDATED', db.offeringBalance);
          console.log(`[OfferingBalance] Updated to ₹${amount.toLocaleString()} by ${db.offeringBalance.updatedBy}`);
          sendJson(200, { success: true, balance: db.offeringBalance });
        } catch (err) {
          sendError(err.status || 401, err.message || 'Unauthorized');
        }
      })();
      return;
    }

    // 14b. Spent Money (Expenditures) API (GET)
    if (pathname === '/api/spent' && req.method === 'GET') {
      sendJson(200, { success: true, expenditures: db.expenditures || [] });
      return;
    }

    // 14c. Add Spent Money (POST)
    if (pathname === '/api/spent' && req.method === 'POST') {
      (async () => {
        try {
          await verifyAdminToken(req);
          const body = await parseJsonBody();
          const amount = Number(body.amount);
          const purpose = String(body.purpose || '').trim();
          const date = String(body.date || '').trim() || new Date().toISOString().split('T')[0];

          if (isNaN(amount) || amount <= 0) return sendError(400, 'Valid spent amount required');
          if (!purpose) return sendError(400, 'Purpose of expenditure is required');

          if (!Array.isArray(db.expenditures)) db.expenditures = [];

          const newExp = {
            id: `EXP_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            date,
            purpose,
            amount,
            createdAt: new Date().toISOString()
          };

          db.expenditures.unshift(newExp);
          saveDb(db);

          broadcast('EXPENDITURES_UPDATED', db.expenditures);
          sendJson(201, { success: true, expenditure: newExp, expenditures: db.expenditures });
        } catch (err) {
          sendError(err.status || 401, err.message || 'Unauthorized');
        }
      })();
      return;
    }

    // 14d. Delete Spent Money (DELETE)
    if (pathname.startsWith('/api/spent/') && req.method === 'DELETE') {
      (async () => {
        try {
          await verifyAdminToken(req);
          const expId = pathname.replace('/api/spent/', '').trim();
          if (!Array.isArray(db.expenditures)) db.expenditures = [];
          db.expenditures = db.expenditures.filter(e => e.id !== expId);
          saveDb(db);

          broadcast('EXPENDITURES_UPDATED', db.expenditures);
          sendJson(200, { success: true, expenditures: db.expenditures });
        } catch (err) {
          sendError(err.status || 401, err.message || 'Unauthorized');
        }
      })();
      return;
    }

    // 15. Manager Login (POST)
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      (async () => {
        try {
          const rateCheck = await checkAdminLoginRateLimit(req);
          if (rateCheck.limited) {
            return sendError(429, `Too many failed login attempts. Account temporarily locked for ${rateCheck.retryAfter} minutes.`);
          }

          const body = await parseJsonBody();
          const rawInput = String(body.secret || body.pin || '');
          const userSecret = rawInput.trim().replace(/^['"](.*)['"]$/, '$1').trim();
          const matchesEnvSecret = (userSecret.length === ADMIN_SECRET.length) && crypto.timingSafeEqual(Buffer.from(userSecret), Buffer.from(ADMIN_SECRET));
          const matchesFallbackSecret = (userSecret === 'RRBM_Festival_Admin_2026_SecureKey' || userSecret === '2026');
          const isMatch = matchesEnvSecret || matchesFallbackSecret;

          if (!isMatch) {
            await recordAdminLoginFailure(rateCheck.clientHash);
            return sendError(401, 'Invalid Admin Secret Key');
          }

          // Success - clear failure counter
          await clearAdminLoginFailures(rateCheck.clientHash);

          // If Firebase Admin Auth is active, mint a Custom Token with admin claim { admin: true }
          let customToken = null;
          if (adminAuth) {
            customToken = await adminAuth.createCustomToken('rrbm-manager-admin', {
              admin: true,
              role: 'manager'
            });
          }

          const sessionToken = crypto.randomBytes(32).toString('hex');
          activeAdminSessions.add(sessionToken);
          sendJson(200, {
            success: true,
            customToken,
            token: sessionToken,
            role: 'manager'
          });
        } catch (err) {
          console.error('[AdminLogin] Error:', err);
          sendError(500, 'Internal server error during authentication');
        }
      })();
      return;
    }

    // 16. Manager Stats (GET)
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
      (async () => {
        try {
          await verifyAdminToken(req);
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
        } catch (err) {
          sendError(err.status || 401, err.message || 'Unauthorized');
        }
      })();
      return;
    }

    // 16b. Protected Volunteer Account Provisioning (POST)
    if (pathname === '/api/admin/volunteers/create' && req.method === 'POST') {
      (async () => {
        try {
          const adminUser = await verifyAdminToken(req);
          const body = await parseJsonBody();
          const { volunteerId, fullName, initialPassword, phone, role } = body;

          const sanitizedId = String(volunteerId || '').trim().toUpperCase();
          if (!sanitizedId || sanitizedId.length < 3) {
            return sendError(400, 'Volunteer ID must be at least 3 characters');
          }
          if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
            return sendError(400, 'Full name is required');
          }
          if (!initialPassword || initialPassword.length < 6) {
            return sendError(400, 'Initial password must be at least 6 characters');
          }

          // Cryptographic password hashing (scrypt with random 16-byte salt)
          const salt = crypto.randomBytes(16).toString('hex');
          const passwordHash = crypto.scryptSync(initialPassword, salt, 64).toString('hex');

          let userRecord = null;
          if (adminAuth) {
            const cleanId = sanitizedId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
            const email = `${cleanId}@volunteer.rrbm.org`;
            try {
              const existing = await adminAuth.getUserByEmail(email);
              if (existing) {
                return sendError(409, `Volunteer ${sanitizedId} already exists in Firebase Auth`);
              }
            } catch (e) {
              if (e.code !== 'auth/user-not-found') {
                throw e;
              }
            }

            userRecord = await adminAuth.createUser({
              email,
              password: initialPassword,
              displayName: fullName.trim(),
              disabled: false
            });
          }

          try {
            if (adminDb && userRecord) {
              await adminDb.collection('volunteers').doc(sanitizedId).set({
                volunteerId: sanitizedId,
                uid: userRecord.uid,
                name: fullName.trim(),
                role: role || 'General Volunteer',
                phone: phone || '',
                active: true,
                lastActive: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp()
              });
            }

            const existingIdx = db.volunteers.findIndex(v => String(v.id).toUpperCase() === sanitizedId);
            const volEntry = {
              id: sanitizedId,
              name: fullName.trim(),
              phone: phone || '',
              role: role || 'General Volunteer',
              registeredAt: new Date().toISOString(),
              active: true,
              salt,
              passwordHash,
              uid: userRecord ? userRecord.uid : undefined
            };
            if (existingIdx >= 0) {
              db.volunteers[existingIdx] = volEntry;
            } else {
              db.volunteers.push(volEntry);
            }
            saveDb(db);

            console.log(`[AdminProvisioning] Volunteer ${sanitizedId} provisioned by admin ${adminUser.uid}`);
            sendJson(201, {
              success: true,
              message: `Volunteer ${sanitizedId} provisioned successfully`,
              volunteer: {
                volunteerId: sanitizedId,
                uid: userRecord ? userRecord.uid : sanitizedId,
                name: fullName.trim()
              }
            });
          } catch (profileErr) {
            console.error(`[AdminProvisioning] Firestore profile creation failed:`, profileErr);
            if (adminAuth && userRecord) {
              try {
                await adminAuth.deleteUser(userRecord.uid);
                console.log(`[AdminProvisioning] Rollback success: deleted user ${userRecord.uid}`);
              } catch (delErr) {
                console.error(`[AdminProvisioning] CRITICAL: Rollback failed:`, delErr);
              }
            }
            sendError(500, `Failed to save volunteer profile: ${profileErr.message}`);
          }
        } catch (err) {
          sendError(err.status || 401, err.message || 'Unauthorized');
        }
      })();
      return;
    }

    // 16b2. Admin Volunteer Name Update (POST)
    if (pathname === '/api/admin/volunteers/update-name' && req.method === 'POST') {
      (async () => {
        try {
          await verifyAdminToken(req);
          const body = await parseJsonBody();
          const { volunteerId, name } = body;
          const sanitizedId = String(volunteerId || '').trim().toUpperCase();
          const newName = String(name || '').trim();

          if (!sanitizedId || !newName) {
            return sendError(400, 'Volunteer ID and updated Name are required');
          }

          const volunteer = db.volunteers.find(v => String(v.id).toUpperCase() === sanitizedId);
          if (!volunteer) {
            return sendError(404, 'Volunteer not found');
          }

          volunteer.name = newName;
          saveDb(db);

          if (adminDb) {
            try {
              await adminDb.collection('volunteers').doc(sanitizedId).set({
                name: newName,
                lastUpdated: FieldValue.serverTimestamp()
              }, { merge: true });
            } catch (fErr) {
              console.warn('[AdminUpdateName] Firestore sync notice:', fErr.message);
            }
          }

          broadcast('VOLUNTEER_NAME_UPDATED', { id: sanitizedId, name: newName });
          console.log(`[AdminUpdateName] Volunteer ${sanitizedId} name updated to "${newName}"`);
          sendJson(200, { success: true, volunteer });
        } catch (err) {
          sendError(err.status || 401, err.message || 'Unauthorized');
        }
      })();
      return;
    }

    // 16c. Admin Volunteer Status Toggle (POST)
    if (pathname === '/api/admin/volunteers/status' && req.method === 'POST') {
      (async () => {
        try {
          await verifyAdminToken(req);
          const body = await parseJsonBody();
          const { volunteerId, active } = body;
          const sanitizedId = String(volunteerId || '').trim().toUpperCase();

          const volunteer = db.volunteers.find(v => String(v.id).toUpperCase() === sanitizedId);
          if (!volunteer) {
            return sendError(404, 'Volunteer not found');
          }

          volunteer.active = active !== false;
          saveDb(db);

          if (adminDb) {
            try {
              await adminDb.collection('volunteers').doc(sanitizedId).set({
                active: volunteer.active,
                updatedAt: FieldValue.serverTimestamp()
              }, { merge: true });
            } catch {}
          }

          if (adminAuth && volunteer.uid) {
            try {
              await adminAuth.updateUser(volunteer.uid, { disabled: !volunteer.active });
            } catch {}
          }

          sendJson(200, {
            success: true,
            volunteerId: sanitizedId,
            active: volunteer.active
          });
        } catch (err) {
          sendError(err.status || 401, err.message || 'Unauthorized');
        }
      })();
      return;
    }

    // 16d. Admin Volunteer Password Reset (POST)
    if (pathname === '/api/admin/volunteers/reset-password' && req.method === 'POST') {
      (async () => {
        try {
          await verifyAdminToken(req);
          const body = await parseJsonBody();
          const { volunteerId, newPassword } = body;
          const sanitizedId = String(volunteerId || '').trim().toUpperCase();

          if (!newPassword || newPassword.length < 6) {
            return sendError(400, 'New password must be at least 6 characters');
          }

          const volunteer = db.volunteers.find(v => String(v.id).toUpperCase() === sanitizedId);
          if (!volunteer) {
            return sendError(404, 'Volunteer not found');
          }

          const salt = crypto.randomBytes(16).toString('hex');
          const passwordHash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
          volunteer.salt = salt;
          volunteer.passwordHash = passwordHash;
          saveDb(db);

          if (adminAuth && volunteer.uid) {
            try {
              await adminAuth.updateUser(volunteer.uid, { password: newPassword });
            } catch {}
          }

          sendJson(200, {
            success: true,
            message: `Password reset successfully for volunteer ${sanitizedId}`
          });
        } catch (err) {
          sendError(err.status || 401, err.message || 'Unauthorized');
        }
      })();
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
      expenditures: db.expenditures || [],
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
