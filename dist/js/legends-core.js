/**
 * Legends Walk Off - Tournament Core & Real-time Live Sync System
 * STME Impulse Committee - NMIMS Hyderabad 2026
 */

(function () {
  'use strict';

  // 1. DEFAULT TOURNAMENT MATCH STATE
  const DEFAULT_MATCH = {
    runs: 148,
    wickets: 3,
    balls: 88, // 14.4 overs
    target: 176,
    battingTeam: 'STME Strikers',
    bowlingTeam: 'CBIT Spartans',
    striker: 'Arjun Sharma',
    strikerRuns: 48,
    strikerBalls: 28,
    nonStriker: 'Rohan Verma',
    nonStrikerRuns: 34,
    nonStrikerBalls: 22,
    bowler: 'K. Reddy',
    bowlerOvers: '3.2',
    bowlerRuns: 28,
    bowlerWickets: 2,
    matchState: 'LIVE / IN PROGRESS',
    lastEvent: 'Single taken',
    announcement: 'Championship Match #14 - Rain prediction 0%, floodlights at 100%'
  };

  // State accessor
  window.LegendsApp = {
    getMatchState: function () {
      try {
        const saved = localStorage.getItem('legends_cricket_match');
        return saved ? JSON.parse(saved) : DEFAULT_MATCH;
      } catch (e) {
        return DEFAULT_MATCH;
      }
    },
    saveMatchState: function (state) {
      try {
        localStorage.setItem('legends_cricket_match', JSON.stringify(state));
        window.dispatchEvent(new CustomEvent('legends_state_changed', { detail: state }));
      } catch (e) {
        console.error('Failed to save state:', e);
      }
    },
    resetMatchState: function () {
      localStorage.removeItem('legends_cricket_match');
      window.dispatchEvent(new CustomEvent('legends_state_changed', { detail: DEFAULT_MATCH }));
      return DEFAULT_MATCH;
    },
    showToast: function (message, type = 'info') {
      let toast = document.getElementById('legends-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'legends-toast';
        toast.className = 'fixed bottom-6 right-6 z-[9999] px-space-md py-3 rounded-none clip-angle border shadow-2xl transition-all duration-300 transform translate-y-12 opacity-0 flex items-center gap-3 font-title-md text-sm';
        document.body.appendChild(toast);
      }

      if (type === 'success') {
        toast.className = 'fixed bottom-6 right-6 z-[9999] px-space-md py-3 rounded-none clip-angle border border-tertiary bg-surface-container-high text-tertiary shadow-[0_0_24px_rgba(130,162,225,0.4)] transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-3 font-title-md text-sm';
        toast.innerHTML = `<span class="material-symbols-outlined text-tertiary">check_circle</span><span>${message}</span>`;
      } else if (type === 'error') {
        toast.className = 'fixed bottom-6 right-6 z-[9999] px-space-md py-3 rounded-none clip-angle border border-primary-container bg-surface-container-high text-primary shadow-[0_0_24px_rgba(130,162,225,0.5)] transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-3 font-title-md text-sm';
        toast.innerHTML = `<span class="material-symbols-outlined text-primary-container">warning</span><span>${message}</span>`;
      } else {
        toast.className = 'fixed bottom-6 right-6 z-[9999] px-space-md py-3 rounded-none clip-angle border border-secondary-container bg-surface-container-high text-secondary-container shadow-[0_0_24px_rgba(168,117,89,0.5)] transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-3 font-title-md text-sm';
        toast.innerHTML = `<span class="material-symbols-outlined text-secondary-container">bolt</span><span>${message}</span>`;
      }

      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => {
        toast.classList.add('translate-y-12', 'opacity-0');
      }, 3500);
    }
  };

  // Helper: balls to overs string
  function calculateOversString(legalBalls) {
    const ov = Math.floor(legalBalls / 6);
    const b = legalBalls % 6;
    return `${ov}.${b}`;
  }

  // 2. MOBILE NAVIGATION DRAWER
  function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const drawer = document.getElementById('mobile-menu-drawer');
    const icon = document.getElementById('mobile-menu-icon');

    if (btn && drawer) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = !drawer.classList.contains('hidden');
        if (isOpen) {
          drawer.classList.add('hidden');
          if (icon) icon.textContent = 'menu';
        } else {
          drawer.classList.remove('hidden');
          if (icon) icon.textContent = 'close';
        }
      });

      document.addEventListener('click', function (e) {
        if (!drawer.contains(e.target) && !btn.contains(e.target) && !drawer.classList.contains('hidden')) {
          drawer.classList.add('hidden');
          if (icon) icon.textContent = 'menu';
        }
      });
    }
  }

  // 3. TOURNAMENT COUNTDOWN TIMER
  function initCountdown() {
    const daysEl = document.getElementById('timer-days');
    const hoursEl = document.getElementById('timer-hours');
    const minsEl = document.getElementById('timer-mins');
    const secsEl = document.getElementById('timer-secs');

    if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

    // Target date: 4 days, 14 hours from launch
    let targetTime = localStorage.getItem('legends_kickoff_timestamp');
    if (!targetTime) {
      targetTime = Date.now() + (4 * 24 * 3600 + 14 * 3600 + 32 * 60 + 45) * 1000;
      localStorage.setItem('legends_kickoff_timestamp', targetTime);
    } else {
      targetTime = parseInt(targetTime, 10);
    }

    function updateTimer() {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      daysEl.textContent = String(d).padStart(2, '0');
      hoursEl.textContent = String(h).padStart(2, '0');
      minsEl.textContent = String(m).padStart(2, '0');
      secsEl.textContent = String(s).padStart(2, '0');
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  }

  // 4. LIVE SCORES PAGE SYNCHRONIZATION
  function syncLiveViewerPage() {
    const state = window.LegendsApp.getMatchState();

    // Elements on live-scores.html or index.html
    const oversText = calculateOversString(state.balls);
    const scoreStr = `${state.runs}/${state.wickets}`;

    // Target score displays
    document.querySelectorAll('[data-sync="cricket-score"]').forEach(el => {
      el.innerHTML = `${state.runs}<span class="text-primary">/${state.wickets}</span>`;
    });
    document.querySelectorAll('[data-sync="cricket-overs"]').forEach(el => {
      el.textContent = `(${oversText} OV)`;
    });

    // Run rate calculation
    const crr = state.balls > 0 ? ((state.runs / state.balls) * 6).toFixed(2) : '0.00';
    const remainingBalls = Math.max(0, 120 - state.balls); // 20 overs T20
    const neededRuns = Math.max(0, state.target - state.runs);
    const rrr = remainingBalls > 0 ? ((neededRuns / remainingBalls) * 6).toFixed(2) : '0.00';

    document.querySelectorAll('[data-sync="crr-rrr"]').forEach(el => {
      el.textContent = `CRR: ${crr} / RRR: ${rrr}`;
    });

    // Announcement banner
    const announcementEl = document.getElementById('live-broadcast-alert');
    if (announcementEl && state.announcement) {
      announcementEl.textContent = state.announcement;
      announcementEl.parentElement.classList.remove('hidden');
    }
  }

  // 5. FAN VOTING POLL SYSTEM
  function initPoll() {
    const savedVote = localStorage.getItem('legends_fan_vote');
    const stmeEl = document.getElementById('stme-pct');
    const cbitEl = document.getElementById('cbit-pct');
    const votedNotice = document.getElementById('poll-voted-notice');

    let stmeVotes = parseInt(localStorage.getItem('legends_poll_stme') || '68', 10);
    let cbitVotes = parseInt(localStorage.getItem('legends_poll_cbit') || '32', 10);

    function updatePct() {
      const total = stmeVotes + cbitVotes;
      const stmePct = Math.round((stmeVotes / total) * 100);
      const cbitPct = 100 - stmePct;
      if (stmeEl) stmeEl.textContent = `${stmePct}%`;
      if (cbitEl) cbitEl.textContent = `${cbitPct}%`;
    }

    updatePct();

    if (savedVote && votedNotice) {
      votedNotice.classList.remove('hidden');
      votedNotice.textContent = `You voted for ${savedVote === 'stme' ? 'STME Strikers' : 'CBIT Spartans'}!`;
    }

    window.castVote = function (team) {
      if (localStorage.getItem('legends_fan_vote')) {
        window.LegendsApp.showToast('You have already cast your vote for this clash!', 'info');
        return;
      }
      if (team === 'stme') stmeVotes += 5;
      else cbitVotes += 5;

      localStorage.setItem('legends_fan_vote', team);
      localStorage.setItem('legends_poll_stme', stmeVotes);
      localStorage.setItem('legends_poll_cbit', cbitVotes);
      updatePct();

      window.LegendsApp.showToast(`Vote Registered! +5 Arena Energy for ${team === 'stme' ? 'STME' : 'CBIT'}!`, 'success');
      if (votedNotice) {
        votedNotice.classList.remove('hidden');
        votedNotice.textContent = `You voted for ${team === 'stme' ? 'STME Strikers' : 'CBIT Spartans'}!`;
      }
    };
  }

  // 6. INITIALIZATION HOOKS
  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initCountdown();
    initPoll();
    syncLiveViewerPage();

    // Listen for storage changes across tabs (e.g. admin updating score)
    window.addEventListener('storage', function (e) {
      if (e.key === 'legends_cricket_match') {
        syncLiveViewerPage();
      }
    });

    window.addEventListener('legends_state_changed', function () {
      syncLiveViewerPage();
    });
  });

})();
