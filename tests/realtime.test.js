/**
 * Legends Walk Off — Realtime Mesh Network Test Suite
 * STME Impulse Committee • NMIMS Hyderabad 2026
 *
 * Verifies:
 * 1. HTTP server endpoints (/api/health, /api/nodes, /api/state, static assets, pretty URLs)
 * 2. SSE streaming (/api/realtime/stream), node presence detection, join/leave lifecycle
 * 3. Realtime broadcast (/api/realtime/broadcast), state caching, low-latency distribution
 * 4. Zero-dependency Web Audio synthesizer & client API structure
 */

const http = require('http');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { server, connectedNodes, centralState } = require('../server.js');

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

function makeRequest(port, pathname, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: pathname,
      method: method,
      headers: {}
    };

    if (body) {
      const data = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', chunk => chunks += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: chunks,
          json: () => {
            try { return JSON.parse(chunks); } catch (e) { return null; }
          }
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING LEGENDS REALTIME MESH NETWORK TEST SUITE');
  console.log('====================================================\n');

  const TEST_PORT = 3991;

  await new Promise((resolve) => {
    server.listen(TEST_PORT, '127.0.0.1', () => {
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // 1. HEALTH & BASELINE ENDPOINTS
    // -------------------------------------------------------------
    console.log('--- 1. SERVER HEALTH & TOPOLOGY APIS ---');

    await runAsyncTest('GET /api/health returns ok status and uptime', async () => {
      const res = await makeRequest(TEST_PORT, '/api/health');
      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.strictEqual(data.status, 'ok');
      assert.ok(typeof data.uptime === 'number');
    });

    await runAsyncTest('GET /api/nodes returns empty list initially', async () => {
      const res = await makeRequest(TEST_PORT, '/api/nodes');
      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.strictEqual(data.count, 0);
      assert.ok(Array.isArray(data.nodes));
    });

    // -------------------------------------------------------------
    // 2. STATIC ASSETS & PRETTY ROUTES
    // -------------------------------------------------------------
    console.log('\n--- 2. STATIC ASSETS & PRETTY ROUTE RESOLUTION ---');

    await runAsyncTest('Root / serves index.html with text/html Content-Type', async () => {
      const res = await makeRequest(TEST_PORT, '/');
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/html'));
      assert.ok(res.body.includes('Legends Walk Off'));
    });

    await runAsyncTest('Pretty route /mph-screen serves mph-screen.html', async () => {
      const res = await makeRequest(TEST_PORT, '/mph-screen');
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/html'));
      assert.ok(res.body.includes('mphMasterWallGrid'));
    });

    await runAsyncTest('Serving js/legends-realtime.js with application/javascript', async () => {
      const res = await makeRequest(TEST_PORT, '/js/legends-realtime.js');
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('application/javascript'));
      assert.ok(res.body.includes('LegendsRealtime'));
    });

    // -------------------------------------------------------------
    // 3. SSE STREAMING & NODE LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n--- 3. SSE STREAMING & ACTIVE NODE PRESENCE ---');

    let stream1Res = null;
    let stream1Chunks = '';
    const stream1Req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/realtime/stream?nodeId=node-admin-1&role=Admin%20Console&name=Auctioneer&page=auction.html&sport=cricket',
      method: 'GET'
    }, (res) => {
      stream1Res = res;
      res.on('data', chunk => {
        stream1Chunks += chunk.toString();
      });
    });
    stream1Req.end();

    // Give SSE time to initialize
    await new Promise(r => setTimeout(r, 120));

    await runAsyncTest('First node connects via SSE and registers in active topology', async () => {
      assert.strictEqual(stream1Res.statusCode, 200);
      assert.ok(stream1Res.headers['content-type'].includes('text/event-stream'));
      assert.ok(stream1Chunks.includes('event: legends_connected'));
      assert.ok(stream1Chunks.includes('node-admin-1'));

      const nodesRes = await makeRequest(TEST_PORT, '/api/nodes');
      const nodesData = nodesRes.json();
      assert.strictEqual(nodesData.count, 1);
      assert.strictEqual(nodesData.nodes[0].id, 'node-admin-1');
      assert.strictEqual(nodesData.nodes[0].role, 'Admin Console');
    });

    let stream2Res = null;
    let stream2Chunks = '';
    const stream2Req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api/realtime/stream?nodeId=node-mph-1&role=Auditorium%20Projector&name=MPH%20Screen&page=mph-screen.html&sport=cricket',
      method: 'GET'
    }, (res) => {
      stream2Res = res;
      res.on('data', chunk => {
        stream2Chunks += chunk.toString();
      });
    });
    stream2Req.end();

    await new Promise(r => setTimeout(r, 120));

    await runAsyncTest('Second node (MPH Screen) connects and presence broadcasts to first node', async () => {
      assert.strictEqual(stream2Res.statusCode, 200);
      const nodesRes = await makeRequest(TEST_PORT, '/api/nodes');
      const nodesData = nodesRes.json();
      assert.strictEqual(nodesData.count, 2);

      // Node 1 should have received node_presence event
      assert.ok(stream1Chunks.includes('legends_node_presence'));
      assert.ok(stream1Chunks.includes('NODE_JOINED'));
      assert.ok(stream1Chunks.includes('node-mph-1'));
    });

    // -------------------------------------------------------------
    // 4. REALTIME BROADCAST & STATE SYNCHRONIZATION
    // -------------------------------------------------------------
    console.log('\n--- 4. REALTIME BROADCAST & STATE PROPAGATION ---');

    await runAsyncTest('POST /api/realtime/broadcast distributes BID_PLACED event to all connected nodes', async () => {
      const bidEvent = {
        type: 'BID_PLACED',
        payload: {
          lotId: 'lot-1',
          playerName: 'Tusshhar',
          teamName: 'Claude Super Kings',
          amount: 5000000,
          amountFormatted: '₹50.00 Lakh'
        },
        senderNodeId: 'node-admin-1',
        sport: 'cricket',
        timestamp: Date.now()
      };

      const res = await makeRequest(TEST_PORT, '/api/realtime/broadcast', 'POST', bidEvent);
      assert.strictEqual(res.statusCode, 200);
      const data = res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.deliveredTo, 2);

      // Wait a tick for chunks to flush
      await new Promise(r => setTimeout(r, 80));

      assert.ok(stream2Chunks.includes('BID_PLACED'));
      assert.ok(stream2Chunks.includes('Tusshhar'));
      assert.ok(stream2Chunks.includes('Claude Super Kings'));
    });

    await runAsyncTest('Broadcasting AUCTION_STATE_UPDATED updates server central state store', async () => {
      const stateEvent = {
        type: 'AUCTION_STATE_UPDATED',
        payload: {
          sport: 'cricket',
          state: {
            activeLotId: 'lot-2',
            teams: [{ id: 'team-csk', remainingPurse: 495000000 }]
          }
        },
        senderNodeId: 'node-admin-1',
        sport: 'cricket',
        timestamp: Date.now()
      };

      const res = await makeRequest(TEST_PORT, '/api/realtime/broadcast', 'POST', stateEvent);
      assert.strictEqual(res.statusCode, 200);

      // Verify centralState has it
      const stateRes = await makeRequest(TEST_PORT, '/api/state?key=auction_cricket');
      assert.strictEqual(stateRes.statusCode, 200);
      const stateData = stateRes.json();
      assert.strictEqual(stateData.key, 'auction_cricket');
      assert.strictEqual(stateData.data.activeLotId, 'lot-2');
    });

    // -------------------------------------------------------------
    // 5. NODE DISCONNECTION & CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- 5. NODE DISCONNECTION & LIFECYCLE CLEANUP ---');

    await runAsyncTest('Disconnecting a node unregisters it and broadcasts NODE_LEFT', async () => {
      // Abort node 1
      stream1Req.destroy();
      await new Promise(r => setTimeout(r, 120));

      const nodesRes = await makeRequest(TEST_PORT, '/api/nodes');
      const nodesData = nodesRes.json();
      assert.strictEqual(nodesData.count, 1);
      assert.strictEqual(nodesData.nodes[0].id, 'node-mph-1');

      // Node 2 should have received NODE_LEFT
      assert.ok(stream2Chunks.includes('NODE_LEFT'));
      assert.ok(stream2Chunks.includes('node-admin-1'));

      // Abort node 2
      stream2Req.destroy();
      await new Promise(r => setTimeout(r, 80));

      const finalNodes = await makeRequest(TEST_PORT, '/api/nodes');
      assert.strictEqual(finalNodes.json().count, 0);
    });

    // -------------------------------------------------------------
    // 6. CLIENT SCRIPT INTEGRITY & AUDIO SYNTHESIZER
    // -------------------------------------------------------------
    console.log('\n--- 6. CLIENT REALTIME LIBRARY & AUDIO SYNTHESIZER ---');

    it('js/legends-realtime.js contains RealtimeMeshClient, Web Audio synthesis and UI drawer', () => {
      const clientJs = fs.readFileSync(path.join(__dirname, '../js/legends-realtime.js'), 'utf-8');
      assert.ok(clientJs.includes('RealtimeMeshClient'), 'Should define RealtimeMeshClient');
      assert.ok(clientJs.includes('AudioContext'), 'Should use Web Audio API');
      assert.ok(clientJs.includes('bidChime'), 'Should synthesize bid chime');
      assert.ok(clientJs.includes('gavelKnock'), 'Should synthesize gavel knock');
      assert.ok(clientJs.includes('fanfare'), 'Should synthesize celebration fanfare');
      assert.ok(clientJs.includes('legends-mesh-drawer'), 'Should provide mesh drawer UI');
    });

  } finally {
    await new Promise(r => server.close(r));
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
