/**
 * Legends Walk Off — Realtime Mesh Network Client Connector
 * STME Impulse Committee • NMIMS Hyderabad 2026
 *
 * Links all tournament devices & screens in real-time:
 * - Admin Auctioneer Console
 * - Auditorium MPH Projector Screen
 * - Captain Bidding Consoles
 * - Official Match Scorers
 * - Spectator Live Boards
 *
 * Features:
 * - Server-Sent Events (SSE) stream over LAN / Wi-Fi with automatic reconnect
 * - Dual-layer fallback (BroadcastChannel + localStorage) for local-only resilience
 * - Zero-dependency synthesized audio (Web Audio API) for bids, gavel strikes & pings
 * - Sleek floating status pill ("🟢 X Nodes Linked") & interactive Node Topology Drawer
 * - Bid alerts, hammer celebration broadcasts, and live ball-by-ball score sync
 */

(function () {
  'use strict';

  // 1. UNIQUE NODE IDENTITY PER BROWSER TAB / DEVICE
  function getOrCreateNodeId() {
    try {
      let id = sessionStorage.getItem('legends_node_id');
      if (!id) {
        id = 'node-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36).slice(-4);
        sessionStorage.setItem('legends_node_id', id);
      }
      return id;
    } catch (e) {
      return 'node-' + Math.random().toString(36).substring(2, 9);
    }
  }

  const NODE_ID = getOrCreateNodeId();

  // Detect Sport (Cricket or Football)
  function detectSport() {
    try {
      const p = new URLSearchParams(window.location.search).get('sport');
      return (p || window.LEGENDS_AUCTION_SPORT || '').toLowerCase() === 'football' ? 'football' : 'cricket';
    } catch (e) {
      return 'cricket';
    }
  }

  // Detect Current Page & Friendly Node Role
  function detectNodeProfile() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const sport = detectSport();
    let role = 'Spectator';
    let name = 'Live Viewer';
    let icon = 'visibility';

    // Check RBAC session
    try {
      const session = JSON.parse(localStorage.getItem('legends_auth_session') || 'null');
      if (session) {
        if (session.role === 'committee') {
          role = 'Committee Admin';
          name = session.name || 'Admin Auctioneer';
          icon = 'shield';
        } else if (session.role === 'captain') {
          role = 'Team Captain';
          name = session.name || 'Franchise Captain';
          icon = 'badge';
        } else if (session.role === 'cricket' || session.role === 'football') {
          role = 'Official Match Scorer';
          name = `${session.role === 'cricket' ? 'Cricket' : 'Football'} Scorer`;
          icon = 'sports_score';
        } else if (session.role === 'referees') {
          role = 'Referees Panel';
          name = 'Chief Referee';
          icon = 'gavel';
        }
      }
    } catch (e) {}

    // Page-specific overrides if role is default spectator
    if (role === 'Spectator') {
      if (path.includes('mph-screen')) {
        role = 'Auditorium Projector';
        name = `MPH Screen (${sport.toUpperCase()})`;
        icon = 'tv';
      } else if (path.includes('captain-dashboard')) {
        role = 'Captain Console';
        name = `Captain Console (${sport.toUpperCase()})`;
        icon = 'military_tech';
      } else if (path.includes('auction')) {
        role = 'Auction Room Desk';
        name = `Auction Floor (${sport.toUpperCase()})`;
        icon = 'gavel';
      } else if (path.includes('admin-console') || path.includes('mobile-admin')) {
        role = 'Scorer Console';
        name = 'Scoring Operations Desk';
        icon = 'sports_score';
      } else if (path.includes('live-scores') || path.includes('mobile-live')) {
        role = 'Live Spectator';
        name = 'Match Centre Display';
        icon = 'bolt';
      } else {
        role = 'Tournament Portal';
        name = 'Arena Hub Node';
        icon = 'devices';
      }
    }

    return { role, name, icon, page: path, sport };
  }

  // 2. SYNTHESIZED ZERO-DEPENDENCY AUDIO (Web Audio API)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  // Unlock audio on first user touch / click
  if (typeof document !== 'undefined') {
    const unlockAudio = () => {
      getAudioContext();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
  }

  const SoundFX = {
    // Sharp energetic 2-tone chime for bids
    bidChime: function () {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Tone 1
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.28);

        // Tone 2 (Harmonic overlay)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, now + 0.08);
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6
        gain2.gain.setValueAtTime(0.14, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.35);
      } catch (e) {}
    },

    // Resonant wooden gavel thud for Sold / Knockdown
    gavelKnock: function () {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Low thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);

        // Wooden click
        const click = ctx.createOscillator();
        const clickGain = ctx.createGain();
        click.type = 'square';
        click.frequency.setValueAtTime(800, now);
        click.frequency.exponentialRampToValueAtTime(200, now + 0.04);
        clickGain.gain.setValueAtTime(0.2, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        click.connect(clickGain);
        clickGain.connect(ctx.destination);
        click.start(now);
        click.stop(now + 0.05);
      } catch (e) {}
    },

    // Celebratory fanfare for SOLD lots
    fanfare: function () {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major triad (C5, E5, G5, C6)

        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.08;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.15, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.45);
        });
      } catch (e) {}
    },

    // High crisp sonar ping for mesh test
    ping: function () {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1318.51, now); // E6
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } catch (e) {}
    }
  };

  // 3. REALTIME MESH CLIENT ENGINE
  class RealtimeMeshClient {
    constructor() {
      this.nodeId = NODE_ID;
      this.profile = detectNodeProfile();
      this.eventSource = null;
      this.broadcastChannel = null;
      this.status = 'disconnected'; // 'connected' | 'local_fallback' | 'connecting' | 'disconnected'
      this.activeNodes = [];
      this.listeners = new Map(); // eventType -> Set of callbacks
      this.reconnectTimer = null;
      this.reconnectAttempts = 0;
      this.serverIp = 'localhost';
      this.latencyMs = 0;

      // Initialize local BroadcastChannel fallback
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          this.broadcastChannel = new BroadcastChannel('legends_realtime_mesh_v1');
          this.broadcastChannel.onmessage = (e) => this.handleIncomingMessage(e.data, true);
        }
      } catch (e) {
        console.warn('BroadcastChannel not supported in this environment');
      }

      // Start SSE connection
      this.connect();

      // Listen for window storage changes as additional resilience
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (e) => {
          if (e.key === 'legends_mesh_event_bridge' && e.newValue) {
            try {
              const data = JSON.parse(e.newValue);
              if (data && data.senderNodeId !== this.nodeId) {
                this.handleIncomingMessage(data, true);
              }
            } catch (err) {}
          }
        });
      }
    }

    /**
     * Connect to SSE Endpoint
     */
    connect() {
      if (this.eventSource) {
        try { this.eventSource.close(); } catch (e) {}
      }

      this.status = 'connecting';
      this.updatePillUi();

      // Determine stream URL
      const origin = window.location.origin;
      const isFile = window.location.protocol === 'file:';
      if (isFile) {
        this.status = 'local_fallback';
        this.activeNodes = [{ id: this.nodeId, role: this.profile.role, name: this.profile.name, page: this.profile.page, isSelf: true }];
        this.updatePillUi();
        return;
      }

      const streamUrl = `${origin}/api/realtime/stream?nodeId=${encodeURIComponent(this.nodeId)}&role=${encodeURIComponent(this.profile.role)}&name=${encodeURIComponent(this.profile.name)}&page=${encodeURIComponent(this.profile.page)}&sport=${encodeURIComponent(this.profile.sport)}`;

      try {
        this.eventSource = new EventSource(streamUrl);

        // Handshake
        this.eventSource.addEventListener('legends_connected', (e) => {
          try {
            const data = JSON.parse(e.data);
            this.status = 'connected';
            this.reconnectAttempts = 0;
            this.serverIp = data.ip || window.location.hostname;
            this.activeNodes = data.activeNodes || [];
            this.markSelfInNodes();
            this.updatePillUi();
            this.notifyListeners('CONNECTED', data);
          } catch (err) {
            console.error('Error parsing handshake', err);
          }
        });

        // Presence (nodes joined/left)
        this.eventSource.addEventListener('legends_node_presence', (e) => {
          try {
            const data = JSON.parse(e.data);
            this.activeNodes = data.activeNodes || [];
            this.markSelfInNodes();
            this.updatePillUi();
            this.renderDrawerList();
            this.notifyListeners('NODE_PRESENCE', data);
          } catch (err) {
            console.error('Error parsing node presence', err);
          }
        });

        // Generic Realtime Events (bids, hammer, scores, pings)
        this.eventSource.addEventListener('legends_event', (e) => {
          try {
            const data = JSON.parse(e.data);
            this.handleIncomingMessage(data, false);
          } catch (err) {
            console.error('Error handling SSE event', err);
          }
        });

        this.eventSource.onopen = () => {
          this.status = 'connected';
          this.updatePillUi();
        };

        this.eventSource.onerror = () => {
          // If SSE fails (e.g. server down or static host), transition to local fallback and schedule retry
          this.status = 'local_fallback';
          this.updatePillUi();
          try { this.eventSource.close(); } catch (e) {}

          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
          this.reconnectAttempts++;
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        };
      } catch (err) {
        this.status = 'local_fallback';
        this.updatePillUi();
      }
    }

    markSelfInNodes() {
      let found = false;
      this.activeNodes.forEach(n => {
        if (n.id === this.nodeId) {
          n.isSelf = true;
          found = true;
        }
      });
      if (!found) {
        this.activeNodes.unshift({
          id: this.nodeId,
          role: this.profile.role,
          name: this.profile.name,
          page: this.profile.page,
          sport: this.profile.sport,
          ip: 'This Device',
          isSelf: true
        });
      }
    }

    /**
     * Process received broadcast message
     */
    handleIncomingMessage(msg, fromLocalBridge = false) {
      if (!msg || !msg.type) return;
      const isFromSelf = msg.senderNodeId === this.nodeId;

      // 1. Process specific event types
      if (msg.type === 'AUCTION_STATE_UPDATED') {
        const payload = msg.payload || {};
        const sport = msg.sport || payload.sport || 'cricket';
        const storageKey = sport === 'football' ? 'legends_football_auction_state_v2' : 'legends_auction_state_v2';

        if (payload.state && !isFromSelf) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(payload.state));
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(new CustomEvent('legends_auction_updated', { detail: payload.state }));
            }
          } catch (e) {}
        }
      } else if (msg.type === 'BID_PLACED') {
        // Play energetic audio cue
        SoundFX.bidChime();
        this.showToast(`🔨 New Bid: ${msg.payload.amountFormatted || 'Higher Bid'} by ${msg.payload.teamName || 'Team'}`, 'bid');
      } else if (msg.type === 'HAMMER_ACTION') {
        if (msg.payload.action === 'sold') {
          SoundFX.gavelKnock();
          setTimeout(() => SoundFX.fanfare(), 250);
          this.showToast(`🎉 SOLD! ${msg.payload.playerName || 'Player'} to ${msg.payload.teamName || 'Team'} for ${msg.payload.priceFormatted || ''}`, 'sold');
        } else if (msg.payload.action === 'unsold') {
          SoundFX.gavelKnock();
          this.showToast(`⛔ UNSOLD: ${msg.payload.playerName || 'Player'} moves to unsold pool`, 'info');
        } else {
          SoundFX.gavelKnock();
        }
      } else if (msg.type === 'SCORE_UPDATED') {
        if (msg.payload.state && !isFromSelf) {
          try {
            localStorage.setItem('legends_cricket_match', JSON.stringify(msg.payload.state));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('legends_state_changed', { detail: msg.payload.state }));
            }
          } catch (e) {}
        }
      } else if (msg.type === 'PING_TEST') {
        SoundFX.ping();
        const sender = msg.payload.senderName || 'Peer Node';
        this.showToast(`⚡ Network Ping received from ${sender}`, 'ping');
        this.flashScreen();
      }

      // Notify external subscribers
      this.notifyListeners(msg.type, msg.payload, msg);
    }

    /**
     * Broadcast an event across all nodes in the mesh
     */
    async broadcast(type, payload = {}) {
      const sport = this.profile.sport;
      const message = {
        type: type,
        payload: payload,
        senderNodeId: this.nodeId,
        senderProfile: this.profile,
        sport: sport,
        timestamp: Date.now()
      };

      // 1. Mirror locally via BroadcastChannel & localStorage
      if (this.broadcastChannel) {
        try { this.broadcastChannel.postMessage(message); } catch (e) {}
      }
      try {
        localStorage.setItem('legends_mesh_event_bridge', JSON.stringify(message));
      } catch (e) {}

      // 2. Dispatch to Server SSE Hub via POST /api/realtime/broadcast
      if (window.location.protocol !== 'file:') {
        try {
          const t0 = performance.now();
          const res = await fetch('/api/realtime/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          });
          if (res.ok) {
            this.latencyMs = Math.round(performance.now() - t0);
          }
        } catch (err) {
          // If server call fails, local broadcast has already succeeded
        }
      }

      return message;
    }

    /**
     * Event Subscriptions
     */
    subscribe(eventType, callback) {
      if (!this.listeners.has(eventType)) {
        this.listeners.set(eventType, new Set());
      }
      this.listeners.get(eventType).add(callback);

      return () => {
        const set = this.listeners.get(eventType);
        if (set) set.delete(callback);
      };
    }

    notifyListeners(eventType, payload, fullMessage) {
      const set = this.listeners.get(eventType);
      if (set) {
        set.forEach(cb => {
          try { cb(payload, fullMessage); } catch (e) { console.error(e); }
        });
      }
      const allSet = this.listeners.get('*');
      if (allSet) {
        allSet.forEach(cb => {
          try { cb(eventType, payload, fullMessage); } catch (e) { console.error(e); }
        });
      }
    }

    /**
     * Visual Toast Notification
     */
    showToast(message, type = 'info') {
      if (window.LegendsApp && typeof window.LegendsApp.showToast === 'function') {
        const toastType = type === 'sold' || type === 'bid' ? 'success' : 'info';
        window.LegendsApp.showToast(message, toastType);
        return;
      }

      let toast = document.getElementById('legends-mesh-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'legends-mesh-toast';
        toast.className = 'fixed bottom-6 left-6 z-[99999] px-4 py-3 rounded-xl bg-surface-container-highest border border-secondary-container/60 shadow-[0_0_24px_rgba(0,0,0,0.8)] text-on-surface text-xs font-headline-sm uppercase tracking-wider flex items-center gap-2.5 transition-all duration-300 transform translate-y-8 opacity-0 pointer-events-none';
        document.body.appendChild(toast);
      }

      toast.innerHTML = `<span class="material-symbols-outlined text-secondary-container text-base">bolt</span><span>${message}</span>`;
      toast.classList.remove('translate-y-8', 'opacity-0');

      clearTimeout(window.__meshToastTimer);
      window.__meshToastTimer = setTimeout(() => {
        toast.classList.add('translate-y-8', 'opacity-0');
      }, 4000);
    }

    /**
     * Subtle screen flash for network ping
     */
    flashScreen() {
      const flash = document.createElement('div');
      flash.className = 'fixed inset-0 pointer-events-none z-[99998] bg-secondary-container/10 transition-opacity duration-500 opacity-100';
      document.body.appendChild(flash);
      setTimeout(() => {
        flash.classList.add('opacity-0');
        setTimeout(() => flash.remove(), 500);
      }, 100);
    }

    // -------------------------------------------------------------
    // UI: FLOATING STATUS PILL & TOPOLOGY MODAL DRAWER
    // -------------------------------------------------------------
    mountUi() {
      if (document.getElementById('legends-mesh-pill')) return;

      // 1. Floating Status Pill (top right)
      const pill = document.createElement('div');
      pill.id = 'legends-mesh-pill';
      pill.className = 'fixed top-3 right-3 z-[9999] cursor-pointer select-none group';
      pill.setAttribute('title', 'Realtime Mesh Network • Click to view linked nodes');
      pill.onclick = () => this.toggleDrawer(true);

      pill.innerHTML = `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/50 shadow-lg hover:border-secondary-container/80 transition-all hover:scale-105 active:scale-95">
          <span id="meshPillDot" class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
          <span id="meshPillText" class="font-headline-sm text-[11px] uppercase tracking-wider text-on-surface">1 Node Linked</span>
        </div>
      `;
      document.body.appendChild(pill);

      // 2. Topology Modal Drawer
      const drawer = document.createElement('div');
      drawer.id = 'legends-mesh-drawer';
      drawer.className = 'fixed inset-0 z-[100000] hidden bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 transition-all opacity-0';
      drawer.onclick = (e) => {
        if (e.target === drawer) this.toggleDrawer(false);
      };

      drawer.innerHTML = `
        <div class="relative w-full max-w-lg rounded-2xl bg-surface-container border border-outline-variant/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
          <!-- Drawer Header -->
          <div class="px-5 py-4 bg-surface-container-high border-b border-outline/20 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-ping"></span>
              <div>
                <h3 class="font-headline-sm text-sm uppercase tracking-wider text-on-surface">Legends Realtime Mesh Network</h3>
                <span id="meshStatusSubtitle" class="text-[10px] font-mono text-outline">SSE Low Latency • LAN Connected</span>
              </div>
            </div>
            <button onclick="window.LegendsRealtime.toggleDrawer(false)" class="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors">
              <span class="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <!-- Drawer Body -->
          <div class="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
            <!-- Connection Stats Strip -->
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="p-2.5 rounded-xl bg-surface-container-lowest border border-outline/20">
                <span class="block font-label-badge text-[9px] uppercase text-outline">Network State</span>
                <span id="meshDrawerState" class="block font-headline-sm text-xs uppercase text-emerald-400 font-bold mt-0.5">Online</span>
              </div>
              <div class="p-2.5 rounded-xl bg-surface-container-lowest border border-outline/20">
                <span class="block font-label-badge text-[9px] uppercase text-outline">Linked Nodes</span>
                <span id="meshDrawerCount" class="block font-headline-sm text-xs font-mono text-primary font-bold mt-0.5">1 Node</span>
              </div>
              <div class="p-2.5 rounded-xl bg-surface-container-lowest border border-outline/20">
                <span class="block font-label-badge text-[9px] uppercase text-outline">Hub IP</span>
                <span id="meshDrawerIp" class="block font-mono text-[11px] text-secondary-container truncate mt-0.5">localhost</span>
              </div>
            </div>

            <!-- Active Nodes List -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="font-label-badge text-[10px] uppercase tracking-wider text-outline font-bold">Active Connected Nodes:</span>
                <span class="text-[10px] text-outline font-mono">Auto-refreshed</span>
              </div>
              <div id="meshNodesContainer" class="flex flex-col gap-2">
                <!-- Filled dynamically -->
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="pt-2 border-t border-outline/20 flex flex-col sm:flex-row gap-2">
              <button onclick="window.LegendsRealtime.sendPingTest()" class="flex-1 px-4 py-2.5 rounded-xl bg-secondary-container hover:brightness-110 text-on-secondary font-headline-sm text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md">
                <span class="material-symbols-outlined text-sm">sensors</span>
                <span>Ping All Nodes (Audio Test)</span>
              </button>
              <button onclick="window.LegendsRealtime.resyncState()" class="px-4 py-2.5 rounded-xl bg-surface-container-highest hover:bg-surface-bright text-on-surface font-headline-sm text-xs uppercase tracking-wider border border-outline/30 transition-all flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-sm">sync</span>
                <span>Resync</span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(drawer);

      this.updatePillUi();
    }

    toggleDrawer(open) {
      const drawer = document.getElementById('legends-mesh-drawer');
      if (!drawer) return;
      if (open) {
        this.renderDrawerList();
        drawer.classList.remove('hidden');
        requestAnimationFrame(() => {
          drawer.classList.remove('opacity-0');
        });
      } else {
        drawer.classList.add('opacity-0');
        setTimeout(() => drawer.classList.add('hidden'), 200);
      }
    }

    updatePillUi() {
      const pillText = document.getElementById('meshPillText');
      const pillDot = document.getElementById('meshPillDot');
      if (!pillText || !pillDot) return;

      const count = Math.max(1, this.activeNodes.length);
      const isOnline = this.status === 'connected';

      if (isOnline) {
        pillDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]';
        pillText.textContent = `${count} Node${count > 1 ? 's' : ''} Linked`;
        pillText.className = 'font-headline-sm text-[11px] uppercase tracking-wider text-emerald-400';
      } else if (this.status === 'local_fallback') {
        pillDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
        pillText.textContent = `${count} Node (Local Tab Sync)`;
        pillText.className = 'font-headline-sm text-[11px] uppercase tracking-wider text-amber-400';
      } else {
        pillDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping';
        pillText.textContent = 'Connecting Mesh...';
        pillText.className = 'font-headline-sm text-[11px] uppercase tracking-wider text-rose-400';
      }
    }

    renderDrawerList() {
      const container = document.getElementById('meshNodesContainer');
      const countEl = document.getElementById('meshDrawerCount');
      const stateEl = document.getElementById('meshDrawerState');
      const ipEl = document.getElementById('meshDrawerIp');
      const subEl = document.getElementById('meshStatusSubtitle');

      if (!container) return;

      const count = Math.max(1, this.activeNodes.length);
      if (countEl) countEl.textContent = `${count} Active`;
      if (stateEl) {
        stateEl.textContent = this.status === 'connected' ? 'Online' : 'Local Mesh';
        stateEl.className = `block font-headline-sm text-xs uppercase font-bold mt-0.5 ${this.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`;
      }
      if (ipEl) ipEl.textContent = this.serverIp;
      if (subEl) {
        subEl.textContent = this.status === 'connected' ? `SSE Low Latency • ${this.latencyMs ? this.latencyMs + 'ms' : '<5ms'} ping` : 'Browser Tab Bridge Active';
      }

      container.innerHTML = this.activeNodes.map(node => {
        const isSelf = node.isSelf || node.id === this.nodeId;
        const icon = node.role.includes('Projector') || node.role.includes('Screen') ? 'tv' :
                     node.role.includes('Captain') ? 'military_tech' :
                     node.role.includes('Admin') ? 'shield' :
                     node.role.includes('Scorer') ? 'sports_score' : 'devices';

        return `
          <div class="p-3 rounded-xl ${isSelf ? 'bg-secondary-container/10 border-secondary-container/50' : 'bg-surface-container-lowest border-outline/20'} border flex items-center justify-between gap-3 transition-all">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg ${isSelf ? 'bg-secondary-container text-on-secondary' : 'bg-surface-container-high text-primary'} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-lg">${icon}</span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="font-headline-sm text-xs uppercase text-on-surface truncate">${node.name || node.role}</h4>
                  ${isSelf ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-secondary-container/30 text-secondary-container font-bold">THIS SCREEN</span>' : ''}
                </div>
                <div class="flex items-center gap-2 text-[10px] text-outline font-mono mt-0.5">
                  <span>${node.role}</span>
                  <span>•</span>
                  <span>${node.page || 'page'}</span>
                  ${node.ip && node.ip !== 'This Device' ? `<span>•</span><span>${node.ip}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span class="text-[10px] font-mono text-emerald-400 font-semibold">Live</span>
            </div>
          </div>
        `;
      }).join('');
    }

    sendPingTest() {
      SoundFX.ping();
      this.broadcast('PING_TEST', {
        senderName: `${this.profile.name} (${this.profile.role})`,
        timestamp: Date.now()
      });
      this.showToast('📡 Test ping sent to all connected screens!', 'ping');
    }

    async resyncState() {
      if (window.location.protocol !== 'file:') {
        try {
          const res = await fetch('/api/state');
          if (res.ok) {
            const allState = await res.json();
            if (allState.auction_cricket) localStorage.setItem('legends_auction_state_v2', JSON.stringify(allState.auction_cricket));
            if (allState.auction_football) localStorage.setItem('legends_football_auction_state_v2', JSON.stringify(allState.auction_football));
            if (allState.cricket_match) localStorage.setItem('legends_cricket_match', JSON.stringify(allState.cricket_match));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('legends_auction_updated'));
              window.dispatchEvent(new CustomEvent('legends_state_changed'));
            }
            this.showToast('Central state synchronized successfully!', 'info');
          }
        } catch (e) {
          this.showToast('Synchronized with local storage cache', 'info');
        }
      }
    }
  }

  // 4. INSTANTIATE & EXPOSE GLOBAL API
  const instance = new RealtimeMeshClient();
  window.LegendsRealtime = instance;
  window.LegendsSoundFX = SoundFX;

  // Mount UI when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => instance.mountUi());
    } else {
      instance.mountUi();
    }
  }

})();
