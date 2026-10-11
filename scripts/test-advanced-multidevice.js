// scripts/test-advanced-multidevice.js
// Advanced multi-device test: 3 Response Types, Rapid Messages Ordering & Disconnect/Reconnect Catch-Up

import { WebSocket } from 'ws';

const BASE_URL = 'http://127.0.0.1:3000';
const WS_URL = 'ws://127.0.0.1:3000/ws';

async function runAdvancedTest() {
  console.log('========================================================');
  console.log('🔬 ADVANCED MULTI-DEVICE EDGE-CASE & SYNC TEST');
  console.log('========================================================\n');

  // 1. Establish Phone A and Phone B connections
  const wsA = new WebSocket(WS_URL);
  let wsB = new WebSocket(WS_URL);

  const phoneAMsgs = [];
  let phoneBMsgs = [];

  await new Promise((resolve) => {
    let connected = 0;
    wsA.on('open', () => { connected++; if (connected === 2) resolve(); });
    wsB.on('open', () => { connected++; if (connected === 2) resolve(); });
  });

  wsA.on('message', d => phoneAMsgs.push(JSON.parse(d.toString())));
  wsB.on('message', d => phoneBMsgs.push(JSON.parse(d.toString())));

  console.log('✓ Connected Phone A and Phone B to WebSocket.');

  // 2. Trigger Alert
  console.log('\n▶ Step 1: Testing Alert broadcast...');
  const alertRes = await fetch(`${BASE_URL}/api/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      volunteerId: '261',
      senderName: 'Praveen',
      message: '🚨 URGENT PRAYER: Sound check volunteers needed at altar!'
    })
  });
  const alertData = await alertRes.json();
  const alertId = alertData.alert.id;
  await new Promise(r => setTimeout(r, 200));
  console.log(`  Alert created: ${alertId}`);

  // 3. Test all 3 quick response types
  console.log('\n▶ Step 2: Testing all 3 quick response options (coming, coming_late, not_coming)...');
  const responseTypes = ['coming', 'coming_late', 'not_coming'];
  for (const respType of responseTypes) {
    phoneAMsgs.length = 0;
    const respRes = await fetch(`${BASE_URL}/api/alerts/${alertId}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        volunteerId: '262',
        volunteerName: 'Pavithra',
        responseType: respType
      })
    });
    const respJson = await respRes.json();
    await new Promise(r => setTimeout(r, 200));

    const updatedEv = phoneAMsgs.find(m => m.type === 'VOLUNTEER_RESPONSE_UPDATED');
    if (!updatedEv || updatedEv.payload.responseType !== respType) {
      throw new Error(`Failed to verify response update for ${respType}`);
    }
    console.log(`  ✓ Response '${respType}' successfully received on Phone A.`);
  }

  // 4. Test rapid consecutive messages and verify order
  console.log('\n▶ Step 3: Sending 5 rapid consecutive messages from Phone A -> Phone B...');
  const rapidTexts = [
    'Message 1: Check microphone 1',
    'Message 2: Check microphone 2',
    'Message 3: Check sound monitor',
    'Message 4: Check video feed',
    'Message 5: Stage ready!'
  ];

  phoneBMsgs.length = 0;
  for (const text of rapidTexts) {
    await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteerId: '261', senderName: 'Praveen', text })
    });
  }

  await new Promise(r => setTimeout(r, 400));
  const receivedTexts = phoneBMsgs
    .filter(m => m.type === 'CHAT_MESSAGE_CREATED')
    .map(m => m.payload.message.text);

  console.log('  Sent messages order:    ', rapidTexts);
  console.log('  Received messages order:', receivedTexts);

  for (let i = 0; i < rapidTexts.length; i++) {
    if (receivedTexts[i] !== rapidTexts[i]) {
      throw new Error(`Message order mismatch at index ${i}: expected "${rapidTexts[i]}", got "${receivedTexts[i]}"`);
    }
  }
  console.log('  ✓ Rapid messages arrived in exact order without duplicates.');

  // 5. Test disconnection and catch-up sync
  console.log('\n▶ Step 4: Simulating Phone B temporary network disconnection & reconnection...');
  wsB.close();
  console.log('  Phone B disconnected from WebSocket.');

  // Phone A sends a message while Phone B is offline
  const offlineMessage = 'Message sent while Phone B was disconnected!';
  await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ volunteerId: '261', senderName: 'Praveen', text: offlineMessage })
  });
  console.log(`  Phone A sent offline message: "${offlineMessage}"`);

  // Phone B reconnects and calls fetchInitialData (GET /api/chat)
  console.log('  Phone B reconnects and fetches message catch-up history...');
  const catchUpRes = await fetch(`${BASE_URL}/api/chat`);
  const catchUpData = await catchUpRes.json();
  const found = catchUpData.messages.find(m => m.text === offlineMessage);
  if (!found) {
    throw new Error('Phone B did not find the message sent while disconnected!');
  }
  console.log(`  ✓ Phone B successfully recovered message "${found.text}" (ID: ${found.id}) upon reconnect.`);

  // 6. Clean up: resolve alert
  console.log('\n▶ Step 5: Resolving alert...');
  phoneBMsgs.length = 0;
  wsB = new WebSocket(WS_URL);
  await new Promise(r => wsB.on('open', r));
  wsB.on('message', d => phoneBMsgs.push(JSON.parse(d.toString())));

  await fetch(`${BASE_URL}/api/alerts/${alertId}/resolve`, { method: 'POST' });
  await new Promise(r => setTimeout(r, 200));

  const resolvedEv = phoneBMsgs.find(m => m.type === 'ALERT_RESOLVED');
  if (!resolvedEv) {
    throw new Error('Phone B did not receive ALERT_RESOLVED event!');
  }
  console.log('  ✓ Alert resolution broadcasted to Phone B.');

  wsA.close();
  wsB.close();

  console.log('\n========================================================');
  console.log('🎉 ALL ADVANCED MULTI-DEVICE TESTS PASSED PERFECTLY!');
  console.log('========================================================');
}

runAdvancedTest().catch(err => {
  console.error('\n❌ ADVANCED TEST FAILED:', err.message);
  process.exit(1);
});
