/**
 * Legends Walk Off — Realtime Mesh Network & HTTP/SSE Hub Server
 * STME Impulse Committee • NMIMS Hyderabad 2026
 *
 * Capabilities:
 * - Native zero-dependency Node.js HTTP + Server-Sent Events (SSE) Engine
 * - Low-latency (<5ms) real-time state distribution across all tournament nodes
 * - Active Node Registry (/api/nodes) tracking connected projectors, consoles, and captains
 * - Central State Store (/api/state) providing instant hydration for late-joining devices
 * - Static asset server supporting clean routes, MIME types, and CORS
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || process.argv[2] || '3000', 10);
const PUBLIC_DIR = path.resolve(__dirname);

// MIME type map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// In-memory Realtime Mesh Store
const connectedNodes = new Map(); // nodeId -> { id, ip, role, name, page, sport, connectedAt, lastSeen, res }
const centralState = new Map();    // key -> state payload (e.g. auction_cricket, auction_football, cricket_match)

/**
 * Format clean client IP string (stripping IPv6 mapping)
 */
function cleanIp(req) {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) ip = ip.substring(7);
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
}

/**
 * Get sanitized array of active nodes
 */
function getActiveNodesList() {
  const list = [];
  const now = Date.now();
  for (const [id, node] of connectedNodes.entries()) {
    list.push({
      id: node.id,
      ip: node.ip,
      role: node.role,
      name: node.name,
      page: node.page,
      sport: node.sport,
      connectedAt: node.connectedAt,
      uptimeSeconds: Math.floor((now - node.connectedAt) / 1000)
    });
  }
  return list;
}

/**
 * Broadcast an SSE event to all connected clients
 */
function broadcastSse(eventType, data, excludeNodeId = null) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  let delivered = 0;
  for (const [id, node] of connectedNodes.entries()) {
    if (excludeNodeId && id === excludeNodeId) continue;
    try {
      if (node.res && !node.res.writableEnded) {
        node.res.write(payload);
        delivered++;
      }
    } catch (err) {
      connectedNodes.delete(id);
    }
  }
  return delivered;
}

/**
 * Send keep-alive SSE ping comments every 15s to prevent Wi-Fi router dropouts
 */
const keepAliveTimer = setInterval(() => {
  for (const [id, node] of connectedNodes.entries()) {
    try {
      if (node.res && !node.res.writableEnded) {
        node.res.write(': keepalive\n\n');
      } else {
        connectedNodes.delete(id);
      }
    } catch (e) {
      connectedNodes.delete(id);
    }
  }
}, 15000);
if (keepAliveTimer.unref) keepAliveTimer.unref();

/**
 * Parse incoming JSON body
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/**
 * HTTP Request Handler
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS Headers for API & SSE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // -------------------------------------------------------------
  // REALTIME SSE STREAM: /api/realtime/stream
  // -------------------------------------------------------------
  if (pathname === '/api/realtime/stream' && method === 'GET') {
    const query = parsedUrl.query;
    const nodeId = query.nodeId || 'node-' + Math.random().toString(36).substring(2, 10);
    const role = query.role || 'Spectator';
    const name = query.name || role;
    const page = query.page || 'index.html';
    const sport = query.sport || 'cricket';
    const ip = cleanIp(req);

    // Initialize SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const nodeRecord = {
      id: nodeId,
      ip: ip,
      role: role,
      name: name,
      page: page,
      sport: sport,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      res: res
    };

    connectedNodes.set(nodeId, nodeRecord);

    // Initial connection handshake message
    const welcome = {
      type: 'CONNECTED',
      nodeId: nodeId,
      ip: ip,
      serverTime: Date.now(),
      activeNodes: getActiveNodesList(),
      cachedStateKeys: Array.from(centralState.keys())
    };
    res.write(`event: legends_connected\ndata: ${JSON.stringify(welcome)}\n\n`);

    // Broadcast node presence to all other linked nodes
    broadcastSse('legends_node_presence', {
      type: 'NODE_JOINED',
      node: { id: nodeId, ip, role, name, page, sport },
      activeNodes: getActiveNodesList(),
      totalNodes: connectedNodes.size
    });

    // Cleanup on disconnect
    req.on('close', () => {
      connectedNodes.delete(nodeId);
      broadcastSse('legends_node_presence', {
        type: 'NODE_LEFT',
        nodeId: nodeId,
        activeNodes: getActiveNodesList(),
        totalNodes: connectedNodes.size
      });
    });
    return;
  }

  // -------------------------------------------------------------
  // REALTIME BROADCAST: /api/realtime/broadcast
  // -------------------------------------------------------------
  if (pathname === '/api/realtime/broadcast' && method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const { type, payload, senderNodeId, sport, timestamp } = data;

      if (!type) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing event type' }));
        return;
      }

      // Update central state cache if state update
      if (type === 'AUCTION_STATE_UPDATED' && payload && payload.state) {
        const key = (sport || payload.sport) === 'football' ? 'auction_football' : 'auction_cricket';
        centralState.set(key, payload.state);
      } else if (type === 'SCORE_UPDATED' && payload && payload.state) {
        centralState.set('cricket_match', payload.state);
      }

      const eventData = {
        type: type,
        payload: payload || {},
        senderNodeId: senderNodeId || null,
        sport: sport || 'cricket',
        timestamp: timestamp || Date.now(),
        serverTimestamp: Date.now()
      };

      // Broadcast to all active clients (client libraries can filter sender if needed)
      const count = broadcastSse('legends_event', eventData);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        deliveredTo: count,
        totalNodes: connectedNodes.size,
        timestamp: Date.now()
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // -------------------------------------------------------------
  // ACTIVE NODES TOPOLOGY: /api/nodes
  // -------------------------------------------------------------
  if (pathname === '/api/nodes' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      count: connectedNodes.size,
      nodes: getActiveNodesList(),
      serverTime: Date.now()
    }));
    return;
  }

  // -------------------------------------------------------------
  // CENTRAL STATE ACCESSOR: /api/state
  // -------------------------------------------------------------
  if (pathname === '/api/state') {
    const key = parsedUrl.query.key;
    if (method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (key) {
        res.end(JSON.stringify({ key, data: centralState.get(key) || null }));
      } else {
        const allState = {};
        for (const [k, v] of centralState.entries()) allState[k] = v;
        res.end(JSON.stringify(allState));
      }
      return;
    }

    if (method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        if (key && body.state) {
          centralState.set(key, body.state);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, key }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing key or state' }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
  }

  // -------------------------------------------------------------
  // HEALTH CHECK: /api/health
  // -------------------------------------------------------------
  if (pathname === '/api/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      connectedNodes: connectedNodes.size,
      timestamp: Date.now()
    }));
    return;
  }

  // -------------------------------------------------------------
  // STATIC ASSET SERVER
  // -------------------------------------------------------------
  let sanitizedPath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (sanitizedPath === '/' || sanitizedPath === '') {
    sanitizedPath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, sanitizedPath);

  // Pretty URL support (e.g. /mph-screen -> /mph-screen.html)
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath += '.html';
    }
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 handler
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Stream file with appropriate caching
    const stream = fs.createReadStream(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    stream.pipe(res);
  });
});

// Auto-start when executed directly
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`======================================================================`);
    console.log(`⚡ LEGENDS REALTIME MESH HUB SERVER ONLINE`);
    console.log(`   Port:     ${PORT}`);
    console.log(`   Local:    http://localhost:${PORT}/`);
    console.log(`   SSE Hub:  http://localhost:${PORT}/api/realtime/stream`);
    console.log(`======================================================================`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err.message);
    process.exit(1);
  });
}

module.exports = { server, connectedNodes, centralState, broadcastSse };
