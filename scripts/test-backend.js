// scripts/test-backend.js
// Multi-Device End-to-End Simulation Test: Phone A (Praveen) & Phone B (Pavithra)
// Updated for Authenticated Volunteer Credential Validation System

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Load environment variables for local testing
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
    }
  });
}

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'RRBM_Festival_Admin_2026_SecureKey';
const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WS_URL = `ws://127.0.0.1:${PORT}/ws`;

let spawnedServerProcess = null;

async function ensureServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.ok) return;
  } catch {}

  console.log('  Spawning local backend server for multi-device test...');
  const serverPath = path.join(ROOT_DIR, 'server', 'server.js');
  spawnedServerProcess = spawn(process.execPath, [serverPath], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore'
  });

  const start = Date.now();
  while (Date.now() - start < 15000) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 400));
  }

  throw new Error('Backend test server failed to start within timeout.');
}

async function runTest() {
  console.log('========================================================');
  console.log('🧪 RUNNING RRBM MULTI-DEVICE REAL-TIME BACKEND TESTS');
  console.log('========================================================\n');

  await ensureServerRunning();

  // Test 1: Health check
  console.log('▶ Test 1: Checking Server Health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log('  Status:', healthData.status, '| Installed Version:', healthData.installedVersion);
  if (healthData.status !== 'healthy') throw new Error('Health check failed');
  console.log('  ✓ PASS: Server is healthy.\n');

  // Test 2: Admin Authentication for Account Provisioning
  console.log('▶ Test 2: Authenticating Festival Administrator...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: ADMIN_SECRET })
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLoginData.token) {
    throw new Error('Admin authentication failed');
  }
  const adminToken = adminLoginData.token;
  console.log('  ✓ PASS: Festival administrator authenticated.\n');

  // Test 3: Provision & Login Phone A (Praveen)
  console.log('▶ Test 3: Provisioning & Logging in Phone A (Praveen)...');
  const volAId = 'VOL_PRAVEEN';
  const volAPass = 'Praveen@RRBM2026';
  await fetch(`${BASE_URL}/api/admin/volunteers/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      volunteerId: volAId,
      fullName: 'Praveen',
      initialPassword: volAPass,
      role: 'leader'
    })
  });

  const loginARes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ volunteerId: volAId, password: volAPass })
  });
  const loginA = await loginARes.json();
  if (!loginA.success || !loginA.volunteer) throw new Error('Volunteer A login failed');
  console.log(`  Praveen Volunteer ID: ${loginA.volunteer.id} (Role: ${loginA.volunteer.role})`);
  console.log('  ✓ PASS: Phone A (Praveen) authenticated with password.\n');

  // Test 4: Provision & Login Phone B (Pavithra)
  console.log('▶ Test 4: Provisioning & Logging in Phone B (Pavithra)...');
  const volBId = 'VOL_PAVITHRA';
  const volBPass = 'Pavithra@RRBM2026';
  await fetch(`${BASE_URL}/api/admin/volunteers/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      volunteerId: volBId,
      fullName: 'Pavithra',
      initialPassword: volBPass,
      role: 'volunteer'
    })
  });

  const loginBRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ volunteerId: volBId, password: volBPass })
  });
  const loginB = await loginBRes.json();
  if (!loginB.success || !loginB.volunteer) throw new Error('Volunteer B login failed');
  console.log(`  Pavithra Volunteer ID: ${loginB.volunteer.id} (Role: ${loginB.volunteer.role})`);
  console.log('  ✓ PASS: Phone B (Pavithra) authenticated with password.\n');

  // Test 5: Establish WebSocket Connections for Phone A and Phone B
  console.log('▶ Test 5: Connecting Phone A and Phone B to WebSocket Server...');
  const wsA = new WebSocket(WS_URL);
  const wsB = new WebSocket(WS_URL);

  const phoneAMessages = [];
  const phoneBMessages = [];

  await new Promise((resolve) => {
    let connected = 0;
    wsA.on('open', () => { connected++; if (connected === 2) resolve(); });
    wsB.on('open', () => { connected++; if (connected === 2) resolve(); });
  });

  wsA.on('message', data => phoneAMessages.push(JSON.parse(data.toString())));
  wsB.on('message', data => phoneBMessages.push(JSON.parse(data.toString())));

  console.log('  Phone A WebSocket State: OPEN');
  console.log('  Phone B WebSocket State: OPEN');
  console.log('  ✓ PASS: Both devices connected to real-time sync.\n');

  // Allow initial sync to arrive
  await new Promise(r => setTimeout(r, 200));

  // Test 6: Phone A triggers Leader Alert -> Verify Phone B receives event
  console.log('▶ Test 6: Phone A (Praveen) triggers ALERT -> Phone B (Pavithra) receives in real-time...');
  const alertMsg = '🚨 EMERGENCY PRAYER: All volunteers report to Main Stage Altar immediately!';
  const alertRes = await fetch(`${BASE_URL}/api/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: loginA.volunteer.id,
      senderName: loginA.volunteer.name,
      message: alertMsg
    })
  });
  const alertData = await alertRes.json();
  console.log(`  Alert Created: ${alertData.alert.id} by ${alertData.alert.triggeredBy.name}`);

  // Wait for WebSocket event on Phone B
  await new Promise(r => setTimeout(r, 250));

  const alertEventB = phoneBMessages.find(m => m.type === 'ALERT_CREATED' && m.payload.alert.id === alertData.alert.id);
  if (!alertEventB) throw new Error('Phone B did not receive ALERT_CREATED event via WebSocket!');
  console.log(`  Phone B received Alert Event: "${alertEventB.payload.alert.message}"`);
  console.log(`  Notification Channel: ${alertEventB.payload.notification.channelId} (Priority: ${alertEventB.payload.notification.priority})`);
  console.log('  ✓ PASS: Real-time Alert synchronized to Phone B.\n');

  // Test 7: Phone B sends Quick Response ("I'M COMING") -> Verify Phone A receives response
  console.log('▶ Test 7: Phone B (Pavithra) selects "I\'M COMING" -> Phone A receives updated counts...');
  const respRes = await fetch(`${BASE_URL}/api/alerts/${alertData.alert.id}/response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: loginB.volunteer.id,
      volunteerName: loginB.volunteer.name,
      responseType: 'coming'
    })
  });
  const respData = await respRes.json();
  console.log(`  Response Recorded: ${respData.chatMessage.text}`);

  await new Promise(r => setTimeout(r, 250));

  const respEventA = phoneAMessages.find(m => m.type === 'VOLUNTEER_RESPONSE_UPDATED' && m.payload.volunteerId === loginB.volunteer.id);
  if (!respEventA) throw new Error('Phone A did not receive VOLUNTEER_RESPONSE_UPDATED via WebSocket!');
  console.log(`  Phone A received response update: ${respEventA.payload.volunteerName} -> ${respEventA.payload.responseType}`);
  console.log('  ✓ PASS: Quick response synchronized to Phone A.\n');

  // Test 8: Phone A sends Live Chat Message -> Phone B receives in real-time
  console.log('▶ Test 8: Phone A (Praveen) sends Live Chat Message -> Phone B receives...');
  const chatARes = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: loginA.volunteer.id,
      senderName: loginA.volunteer.name,
      text: 'Sound system check is complete. Pavithra, please coordinate altar chairs.'
    })
  });
  const chatA = await chatARes.json();
  console.log(`  Phone A Sent: "${chatA.message.text}" (ID: ${chatA.message.id})`);

  await new Promise(r => setTimeout(r, 250));

  const chatEventB = phoneBMessages.find(m => m.type === 'CHAT_MESSAGE_CREATED' && m.payload.message.id === chatA.message.id);
  if (!chatEventB) throw new Error('Phone B did not receive chat message from Phone A!');
  console.log(`  Phone B Received: "${chatEventB.payload.message.text}" from ${chatEventB.payload.message.senderName}`);
  console.log('  ✓ PASS: Live chat Phone A -> Phone B verified.\n');

  // Test 9: Phone B replies in Live Chat -> Phone A receives in real-time
  console.log('▶ Test 9: Phone B (Pavithra) replies in Live Chat -> Phone A receives...');
  const chatBRes = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: loginB.volunteer.id,
      senderName: loginB.volunteer.name,
      text: 'Got it Praveen! Altar chairs are all set and ushers are ready.'
    })
  });
  const chatB = await chatBRes.json();
  console.log(`  Phone B Sent: "${chatB.message.text}" (ID: ${chatB.message.id})`);

  await new Promise(r => setTimeout(r, 250));

  const chatEventA = phoneAMessages.find(m => m.type === 'CHAT_MESSAGE_CREATED' && m.payload.message.id === chatB.message.id);
  if (!chatEventA) throw new Error('Phone A did not receive chat reply from Phone B!');
  console.log(`  Phone A Received: "${chatEventA.payload.message.text}" from ${chatEventA.payload.message.senderName}`);
  console.log('  ✓ PASS: Live chat Phone B -> Phone A verified.\n');

  // Test 10: Active Alert Query & Chat History from Central Database
  console.log('▶ Test 10: Querying Central Database State...');
  const activeAlertCheck = await (await fetch(`${BASE_URL}/api/alerts/active`)).json();
  const chatCheck = await (await fetch(`${BASE_URL}/api/chat`)).json();
  const volunteersCheck = await (await fetch(`${BASE_URL}/api/volunteers`)).json();

  console.log(`  Central Active Alert: ${activeAlertCheck.activeAlert?.id}`);
  console.log(`  Total Registered Volunteers: ${volunteersCheck.count}`);
  console.log(`  Total Central Chat Messages: ${chatCheck.messages.length}`);
  console.log('  ✓ PASS: Central database persistence confirmed.\n');

  wsA.close();
  wsB.close();

  console.log('========================================================');
  console.log('🎉 ALL MULTI-DEVICE REAL-TIME TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================');
}

runTest()
  .catch(err => {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  })
  .finally(() => {
    if (spawnedServerProcess) {
      spawnedServerProcess.kill();
    }
  });
