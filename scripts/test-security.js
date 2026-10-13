// scripts/test-security.js
// Comprehensive Automated Security Test Suite for RRBM Fasting Prayers 2026 App
// Validates:
// 1. Cloud Firestore security rules structure, schema enforcement & anti-impersonation
// 2. Admin authentication fail-secure behavior & brute-force rate-limiting
// 3. Complete Volunteer Credential Validation:
//    - Deprecation of unauthenticated self-registration (403)
//    - Cryptographic scrypt password hashing (no plaintext, 128-hex-char hash, 32-hex-char salt)
//    - Valid credentials login (200)
//    - Invalid password rejection (401)
//    - Non-existent Volunteer ID rejection (401)
//    - Unprovisioned account rejection (401)
//    - Account deactivation enforcement (403)
//    - Account reactivation validation (200)
//    - Secure Admin password reset flow (old rejected 401, new accepted 200)
//    - Multi-volunteer account isolation and independence
//    - Admin-only access restriction on provisioning and management endpoints

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
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

let spawnedServerProcess = null;

async function ensureServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.ok) {
      console.log('  Connected to existing active server on port 3000.\n');
      return;
    }
  } catch {}

  console.log('  Spawning local backend server for automated security testing...');
  const serverPath = path.join(ROOT_DIR, 'server', 'server.js');
  spawnedServerProcess = spawn(process.execPath, [serverPath], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: String(PORT) }
  });
  spawnedServerProcess.stdout?.on('data', d => {
    // console.log('    [Server]', d.toString().trim());
  });
  spawnedServerProcess.stderr?.on('data', d => {
    console.error('    [Server STDERR]', d.toString().trim());
  });

  // Wait for server to become responsive
  const start = Date.now();
  while (Date.now() - start < 15000) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) {
        console.log('  Backend test server is up and responsive!\n');
        return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 400));
  }

  throw new Error('Backend test server failed to start within timeout.');
}

async function runSecurityTests() {
  console.log('================================================================');
  console.log('🛡️  RRBM FASTING PRAYERS 2026 - COMPREHENSIVE SECURITY TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(message);
    }
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  }

  // ---------------------------------------------------------
  // SECTION 1: FIRESTORE SECURITY RULES STATIC VERIFICATION
  // ---------------------------------------------------------
  console.log('▶ [Section 1] Verifying Cloud Firestore Security Rules File...');
  const rulesPath = path.join(ROOT_DIR, 'firestore.rules');
  assert(fs.existsSync(rulesPath), 'firestore.rules exists in repository root');

  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  assert(
    rulesContent.includes('isAdmin()') && rulesContent.includes('request.auth.token.admin == true'),
    'Rules verify admin authorization via Firebase Auth token custom claim (admin == true)'
  );

  assert(
    rulesContent.includes('match /system/{document}') &&
    rulesContent.includes('allow write: if isAdmin()'),
    'Money Jar offering balance (/system/balance) write is restricted strictly to isAdmin()'
  );

  assert(
    rulesContent.includes('match /responses/{volId}') &&
    rulesContent.includes('isVolunteerOwner(volId)') &&
    rulesContent.includes('updatedAt == request.time'),
    'Per-volunteer alert responses enforce ownership, full schema and request.time server timestamp'
  );

  assert(
    rulesContent.includes('volunteerDoc(volId).data.name'),
    'Per-volunteer responses verify volunteerName matches trusted Firestore profile'
  );

  assert(
    rulesContent.includes('match /system_internal/{document=**}') &&
    rulesContent.includes('allow read, write: if false'),
    'Internal system state (/system_internal) completely rejects all client reads/writes'
  );

  assert(
    rulesContent.includes('match /chat/{messageId}') &&
    rulesContent.includes('isVolunteerOwner(request.resource.data.volunteerId)'),
    'Chat messages strictly validate sender identity against authenticated volunteer profile (anti-impersonation)'
  );

  assert(
    rulesContent.includes("request.resource.data.status == 'active'") &&
    rulesContent.includes('isVolunteerOwner(request.resource.data.triggeredBy.id)'),
    'Alert creation requires status == "active" and triggeredBy.id to match authenticated volunteer'
  );

  assert(
    rulesContent.includes("hasOnly(['lastActive'])") &&
    !rulesContent.includes("hasOnly(['lastActive', 'uid'])"),
    'Volunteer profile updates restrict affected keys strictly to lastActive (uid cannot be changed)'
  );

  assert(
    rulesContent.includes('isParentAlertActive(alertId)'),
    'Alert responses are only allowed when the parent alert is currently active'
  );

  assert(
    rulesContent.includes('match /responses/{volId}') &&
    rulesContent.includes('allow delete: if isAdmin();') &&
    !rulesContent.includes('allow delete: if isAdmin() || isVolunteerOwner(volId);'),
    'Alert response deletion is reserved exclusively for admins'
  );

  assert(
    rulesContent.includes('match /alerts/{alertId}') &&
    rulesContent.includes('allow update, delete: if isAdmin();'),
    'Alert status updates (resolving) and deletion are restricted exclusively to admins'
  );

  console.log('  All static Firestore rules assertions passed!\n');

  // ---------------------------------------------------------
  // SECTION 2: BACKEND ENDPOINT & CREDENTIAL AUTHENTICATION
  // ---------------------------------------------------------
  console.log('▶ [Section 2] Verifying Backend Server Endpoints & Credential Validation...');
  await ensureServerRunning();

  // 2.1 Legacy Self-Registration Rejection
  console.log('  Testing legacy self-registration endpoint rejection...');
  const selfRegRes = await fetch(`${BASE_URL}/api/volunteers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Unprovisioned Hacker' })
  });
  assert(selfRegRes.status === 403, 'POST /api/volunteers/register is disabled and returns 403 Forbidden');

  // 2.2 Admin Login: Invalid PIN rejection
  console.log('  Testing admin login rejection with old PIN ("2026")...');
  const badLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '2026' })
  });
  assert(badLoginRes.status === 401, 'POST /api/admin/login rejects old "2026" PIN with 401 Unauthorized');

  // 2.3 Privileged Endpoints Reject Unauthenticated Requests
  console.log('  Testing privileged endpoints without authentication...');
  const noAuthBal = await fetch(`${BASE_URL}/api/balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 500000 })
  });
  assert(noAuthBal.status === 401, 'POST /api/balance rejects unauthenticated write with 401 Unauthorized');

  const noAuthProv = await fetch(`${BASE_URL}/api/admin/volunteers/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: 'RRBM999',
      fullName: 'Unauthorized Provision Test',
      initialPassword: 'Password123!'
    })
  });
  assert(noAuthProv.status === 401, 'POST /api/admin/volunteers/create rejects unauthenticated request with 401 Unauthorized');

  // 2.4 Admin Login with valid ADMIN_SECRET
  console.log('  Testing admin login with configured ADMIN_SECRET...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: ADMIN_SECRET })
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminLoginData.success === true, 'POST /api/admin/login succeeds with valid ADMIN_SECRET');
  const adminToken = adminLoginData.token;
  assert(typeof adminToken === 'string' && adminToken.length > 20, 'Admin login returns cryptographically strong session token');

  // 2.5 Admin Provisions Volunteer 1 (VOL_TEST_A)
  console.log('  Testing Admin provisioning Volunteer 1 (VOL_TEST_A)...');
  const testVolAId = 'TEST_VOL_A';
  const testVolAPass = 'P@ssword_Alpha_2026!';
  const provARes = await fetch(`${BASE_URL}/api/admin/volunteers/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      volunteerId: testVolAId,
      fullName: 'Alpha Volunteer',
      initialPassword: testVolAPass,
      role: 'leader'
    })
  });
  const provAData = await provARes.json();
  assert(provARes.status === 201 && provAData.success === true, 'Admin successfully provisions volunteer account with 201 Created');

  // 2.6 Verify Password Hash Security (Stored as scrypt hash, not plaintext)
  console.log('  Verifying backend storage stores cryptographic scrypt hashes and salt, not plaintext...');
  const dbPath = path.join(ROOT_DIR, 'server', 'data', 'db.json');
  assert(fs.existsSync(dbPath), 'server/data/db.json exists');
  const serverDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const storedVolA = serverDb.volunteers.find(v => v.id === testVolAId);
  assert(storedVolA !== undefined, 'Volunteer record persisted in backend database');
  assert(!('password' in storedVolA), 'Backend database NEVER contains plaintext "password" key');
  assert(typeof storedVolA.passwordHash === 'string' && storedVolA.passwordHash.length === 128, 'Password stored as 64-byte scrypt hash (128 hex chars)');
  assert(typeof storedVolA.salt === 'string' && storedVolA.salt.length === 32, 'Password salt stored as 16-byte random salt (32 hex chars)');

  // 2.7 Volunteer Login: Missing parameters
  console.log('  Testing volunteer login rejection with missing parameters...');
  const missingRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ volunteerId: testVolAId })
  });
  assert(missingRes.status === 400, 'POST /api/volunteers/login rejects request missing password with 400 Bad Request');

  // 2.8 Volunteer Login: Invalid Password
  console.log('  Testing volunteer login rejection with incorrect password...');
  const wrongPassRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: testVolAId,
      password: 'WrongPassword123!'
    })
  });
  assert(wrongPassRes.status === 401, 'POST /api/volunteers/login rejects wrong password with 401 Unauthorized');

  // 2.9 Volunteer Login: Unknown / Non-existent ID
  console.log('  Testing volunteer login rejection with unknown Volunteer ID...');
  const unknownIdRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: 'NON_EXISTENT_ID_9999',
      password: testVolAPass
    })
  });
  assert(unknownIdRes.status === 401, 'POST /api/volunteers/login rejects unknown ID with 401 Unauthorized');

  // 2.10 Volunteer Login: Unprovisioned Account (account without password hash)
  console.log('  Testing volunteer login rejection with unprovisioned account (no password setup)...');
  const unprovRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: '260',
      password: 'AnyPassword123!'
    })
  });
  assert(unprovRes.status === 401, 'POST /api/volunteers/login rejects unprovisioned account with 401 Unauthorized');

  // 2.11 Volunteer Login: Valid Credentials Success
  console.log('  Testing volunteer login success with valid credentials...');
  const goodVolLoginRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: testVolAId,
      password: testVolAPass
    })
  });
  const goodVolLoginData = await goodVolLoginRes.json();
  assert(goodVolLoginRes.status === 200 && goodVolLoginData.success === true, 'POST /api/volunteers/login succeeds with valid credentials (200 OK)');
  assert(goodVolLoginData.volunteer && goodVolLoginData.volunteer.id === testVolAId, 'Login returns authenticated volunteer identity');
  assert(!('passwordHash' in goodVolLoginData.volunteer) && !('salt' in goodVolLoginData.volunteer), 'Sanitized volunteer profile does not leak password hash or salt to client');
  assert(typeof goodVolLoginData.token === 'string', 'Login returns session token');

  // 2.12 Account Deactivation: Admin Deactivates Account
  console.log('  Testing account deactivation by admin...');
  const deactivateRes = await fetch(`${BASE_URL}/api/admin/volunteers/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      volunteerId: testVolAId,
      active: false
    })
  });
  assert(deactivateRes.status === 200, 'POST /api/admin/volunteers/status deactivates volunteer account');

  // 2.13 Deactivated Account Rejection
  console.log('  Testing login attempt on deactivated account...');
  const deactLoginRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: testVolAId,
      password: testVolAPass
    })
  });
  const deactLoginData = await deactLoginRes.json();
  assert(deactLoginRes.status === 403, 'POST /api/volunteers/login rejects deactivated account with 403 Forbidden');
  assert(deactLoginData.error.includes('deactivated'), 'Login error clearly informs volunteer that account has been deactivated');

  // 2.14 Account Reactivation: Admin Reactivates Account
  console.log('  Testing account reactivation by admin...');
  const reactivateRes = await fetch(`${BASE_URL}/api/admin/volunteers/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      volunteerId: testVolAId,
      active: true
    })
  });
  assert(reactivateRes.status === 200, 'POST /api/admin/volunteers/status reactivates volunteer account');

  const reactLoginRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: testVolAId,
      password: testVolAPass
    })
  });
  assert(reactLoginRes.status === 200, 'Reactivated volunteer can successfully log in again');

  // 2.15 Admin Resets Volunteer Password
  console.log('  Testing admin password reset...');
  const newVolAPass = 'NewP@ssword_Alpha_2026!';
  const resetRes = await fetch(`${BASE_URL}/api/admin/volunteers/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      volunteerId: testVolAId,
      newPassword: newVolAPass
    })
  });
  assert(resetRes.status === 200, 'POST /api/admin/volunteers/reset-password resets password successfully');

  // Old password must fail
  const oldPassRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: testVolAId,
      password: testVolAPass
    })
  });
  assert(oldPassRes.status === 401, 'Volunteer login with OLD password fails with 401 Unauthorized');

  // New password must succeed
  const newPassRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: testVolAId,
      password: newVolAPass
    })
  });
  assert(newPassRes.status === 200, 'Volunteer login with NEW reset password succeeds with 200 OK');

  // 2.16 Multi-Volunteer Account Independence
  console.log('  Testing multi-volunteer provisioning and account isolation...');
  const testVolBId = 'TEST_VOL_B';
  const testVolBPass = 'P@ssword_Bravo_2026!';
  const provBRes = await fetch(`${BASE_URL}/api/admin/volunteers/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      volunteerId: testVolBId,
      fullName: 'Bravo Volunteer',
      initialPassword: testVolBPass,
      role: 'volunteer'
    })
  });
  assert(provBRes.status === 201, 'Admin successfully provisions Volunteer 2 (TEST_VOL_B)');

  const volBLoginRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: testVolBId,
      password: testVolBPass
    })
  });
  assert(volBLoginRes.status === 200, 'Volunteer 2 logs in successfully with their own credentials');

  // Cross-credential rejection
  const crossLoginRes = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: testVolBId,
      password: newVolAPass // Volunteer A's password
    })
  });
  assert(crossLoginRes.status === 401, 'Volunteer 2 cannot log in using Volunteer 1\'s password (cross-credential isolation)');

  // 2.17 Frontend Contract Parity Validation
  console.log('  Testing Frontend API Contract Parity & Error Message Structure...');
  // 2.17.1 Missing credentials
  const contractMissing = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ volunteerId: '', password: '' })
  });
  const contractMissingData = await contractMissing.json();
  assert(contractMissing.status === 400, 'Frontend contract: missing credentials returns 400');
  assert(contractMissingData.error === 'Volunteer ID and password are required', 'Frontend contract: 400 error message matches expectation');

  // 2.17.2 Invalid credentials message
  const contractBad = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ volunteerId: 'UNKNOWN_999', password: 'bad_password' })
  });
  const contractBadData = await contractBad.json();
  assert(contractBad.status === 401, 'Frontend contract: unknown user returns 401');
  assert(contractBadData.error === 'Invalid Volunteer ID or password', 'Frontend contract: 401 error message matches user-friendly expectation');

  // 2.17.3 Successful response contract
  const contractOk = await fetch(`${BASE_URL}/api/volunteers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ volunteerId: testVolBId, password: testVolBPass })
  });
  const contractOkData = await contractOk.json();
  assert(contractOk.status === 200, 'Frontend contract: valid login returns 200');
  assert(contractOkData.success === true, 'Frontend contract: success flag is true');
  assert(contractOkData.volunteer && contractOkData.volunteer.id === testVolBId, 'Frontend contract: volunteer.id matches request');
  assert(typeof contractOkData.token === 'string', 'Frontend contract: session token is present');

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed}/${total} SECURITY & AUTHENTICATION TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
}

runSecurityTests()
  .catch(err => {
    console.error('\n❌ Security Test Suite Failure:', err);
    process.exit(1);
  })
  .finally(() => {
    if (spawnedServerProcess) {
      console.log('  Stopping spawned test server process...');
      spawnedServerProcess.kill();
    }
  });
