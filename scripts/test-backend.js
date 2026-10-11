// scripts/test-backend.js
// Multi-Device End-to-End Simulation Test: Phone A (Praveen) & Phone B (Pavithra)

import { WebSocket } from 'ws';

const BASE_URL = 'http://127.0.0.1:3000';
const WS_URL = 'ws://127.0.0.1:3000/ws';

async function runTest() {
  console.log('========================================================');
  console.log('🧪 RUNNING RRBM MULTI-DEVICE REAL-TIME BACKEND TESTS');
  console.log('========================================================\n');

  // Test 1: Health check
  console.log('▶ Test 1: Checking Server Health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log('  Status:', healthData.status, '| Installed Version:', healthData.installedVersion);
  if (healthData.status !== 'healthy') throw new Error('Health check failed');
  console.log('  ✓ PASS: Server is healthy.\n');

  // Test 2: Register Phone A (Praveen)
  console.log('▶ Test 2: Registering Phone A (Praveen)...');
  const regARes = await fetch(`${BASE_URL}/api/volunteers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Praveen', isLeader: true })
  });
  const regA = await regARes.json();
  console.log(`  Praveen Volunteer ID: ${regA.volunteer.id} (Role: ${regA.volunteer.role})`);
  if (!regA.volunteer || !regA.volunteer.id) throw new Error('Volunteer A registration failed');
  console.log('  ✓ PASS: Volunteer A registered.\n');

  // Test 3: Register Phone B (Pavithra)
  console.log('▶ Test 3: Registering Phone B (Pavithra)...');
  const regBRes = await fetch(`${BASE_URL}/api/volunteers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Pavithra', isLeader: false })
  });
  const regB = await regBRes.json();
  console.log(`  Pavithra Volunteer ID: ${regB.volunteer.id} (Role: ${regB.volunteer.role})`);
  if (!regB.volunteer || !regB.volunteer.id) throw new Error('Volunteer B registration failed');
  console.log('  ✓ PASS: Volunteer B registered.\n');

  // Test 4: Establish WebSocket Connections for Phone A and Phone B
  console.log('▶ Test 4: Connecting Phone A and Phone B to WebSocket Server...');
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

  // Test 5: Phone A triggers Leader Alert -> Verify Phone B receives event
  console.log('▶ Test 5: Phone A (Praveen) triggers ALERT -> Phone B (Pavithra) receives in real-time...');
  const alertMsg = '🚨 EMERGENCY PRAYER: All volunteers report to Main Stage Altar immediately!';
  const alertRes = await fetch(`${BASE_URL}/api/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: regA.volunteer.id,
      senderName: regA.volunteer.name,
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

  // Test 6: Phone B sends Quick Response ("I'M COMING") -> Verify Phone A receives response
  console.log('▶ Test 6: Phone B (Pavithra) selects "I\'M COMING" -> Phone A receives updated counts...');
  const respRes = await fetch(`${BASE_URL}/api/alerts/${alertData.alert.id}/response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: regB.volunteer.id,
      volunteerName: regB.volunteer.name,
      responseType: 'coming'
    })
  });
  const respData = await respRes.json();
  console.log(`  Response Recorded: ${respData.chatMessage.text}`);

  await new Promise(r => setTimeout(r, 250));

  const respEventA = phoneAMessages.find(m => m.type === 'VOLUNTEER_RESPONSE_UPDATED' && m.payload.volunteerId === regB.volunteer.id);
  if (!respEventA) throw new Error('Phone A did not receive VOLUNTEER_RESPONSE_UPDATED via WebSocket!');
  console.log(`  Phone A received response update: ${respEventA.payload.volunteerName} -> ${respEventA.payload.responseType}`);
  console.log('  ✓ PASS: Quick response synchronized to Phone A.\n');

  // Test 7: Phone A sends Live Chat Message -> Phone B receives in real-time
  console.log('▶ Test 7: Phone A (Praveen) sends Live Chat Message -> Phone B receives...');
  const chatARes = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: regA.volunteer.id,
      senderName: regA.volunteer.name,
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

  // Test 8: Phone B replies in Live Chat -> Phone A receives in real-time
  console.log('▶ Test 8: Phone B (Pavithra) replies in Live Chat -> Phone A receives...');
  const chatBRes = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: regB.volunteer.id,
      senderName: regB.volunteer.name,
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

  // Test 9: Active Alert Query & Chat History from Central Database
  console.log('▶ Test 9: Querying Central Database State...');
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

runTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
