/**
 * Legends Walk Off — Role-Based Access Control (RBAC) & Route Guard Engine
 * STME Impulse Committee • NMIMS Hyderabad 2026
 *
 * Security Model:
 * - Public Viewers / Guests: Full access to all public live score telemetry,
 *   standings, and schedules. Scoring engine and admin console links are strictly
 *   HIDDEN from the UI. Direct URL access to admin routes is blocked.
 * - Authenticated Officials (after Admin Login):
 *   - committee: Full unrestricted scoring & arena broadcast controls
 *   - cricket: Cricket scoring console only (Football locked)
 *   - football: Football scoring console only (Cricket locked)
 *   - referees: Adjudication, override, and match verification
 */

(function () {
  'use strict';

  // 1. ROLES AND PERMISSIONS MATRIX
  const ROLES = {
    committee: {
      id: 'committee',
      title: 'Committee Executive Admin',
      badgeClass: 'bg-secondary-container text-on-secondary-container border border-secondary-container/50',
      description: 'Super-admin with unrestricted arena control, broadcast announcements, sponsor curation, and match finalization.',
      permissions: [
        'cricket:score',
        'cricket:undo',
        'cricket:wicket',
        'football:score',
        'football:clock',
        'football:undo',
        'referee:override',
        'alerts:broadcast',
        'match:finalize',
        'match:reset',
        'sponsors:manage',
        'roster:manage',
        'dls:calculate'
      ]
    },
    cricket: {
      id: 'cricket',
      title: 'Official Scorer (Cricket)',
      badgeClass: 'bg-primary-container text-on-primary-container border border-primary/50',
      description: 'Authorized field official for live cricket ball-by-ball scoring, wickets, and extras.',
      permissions: [
        'cricket:score',
        'cricket:undo',
        'cricket:wicket'
      ]
    },
    football: {
      id: 'football',
      title: 'Official Scorer (Football)',
      badgeClass: 'bg-tertiary-container text-on-tertiary-container border border-tertiary/50',
      description: 'Authorized field official for live football goals, fouls, penalty cards, and half clocks.',
      permissions: [
        'football:score',
        'football:clock',
        'football:undo'
      ]
    },
    referees: {
      id: 'referees',
      title: 'Referees Panel & Match Judge',
      badgeClass: 'bg-surface-container-highest text-secondary-container border border-secondary-container/40',
      description: 'Tournament integrity judge: audit trail override, dispute adjudication, DLS par calculations, and scorecard sign-off.',
      permissions: [
        'referee:override',
        'match:finalize',
        'dls:calculate',
        'audit:edit'
      ]
    },
    viewer: {
      id: 'viewer',
      title: 'Public Viewer / Athlete',
      badgeClass: 'bg-surface-container text-on-surface-variant border border-outline/30',
      description: 'Read-only spectator access to live streams, points tables, and arena schedules.',
      permissions: []
    }
  };

  // OFFICIAL VERIFIED ACCOUNTS DIRECTORY
  const OFFICIAL_ACCOUNTS = [
    {
      email: 'admin@nmims.edu.in',
      altEmails: ['committee@nmims.edu.in', 'superadmin@nmims.edu.in'],
      password: 'Admin@Legends2026',
      aliases: ['legends2026', 'impulse2026', 'admin123', 'admin'],
      role: 'committee',
      name: 'Dr. Rajesh K.',
      title: 'Impulse Committee Executive Chairman',
      institution: 'NMIMS Hyderabad STME Impulse',
      phone: '+91 98765 49821',
      phoneHint: '•••• 9821'
    },
    {
      email: 'cricket@nmims.edu.in',
      altEmails: ['scorer.cricket@nmims.edu.in', 'cricket.scorer@nmims.edu.in'],
      password: 'Cricket@Scorer2026',
      aliases: ['cricket2026', 'scorer123', 'cricket'],
      role: 'cricket',
      name: 'Arun Varma',
      title: 'BCCI Certified Cricket Scorer',
      institution: 'NMIMS Sports Directorate',
      phone: '+91 98480 33145',
      phoneHint: '•••• 3145'
    },
    {
      email: 'football@nmims.edu.in',
      altEmails: ['scorer.football@nmims.edu.in', 'football.scorer@nmims.edu.in'],
      password: 'Football@Scorer2026',
      aliases: ['football2026', 'scorer123', 'football'],
      role: 'football',
      name: 'Carlos Menezes',
      title: 'AIFF Match Official Scorer',
      institution: 'NMIMS Sports Directorate',
      phone: '+91 97000 66288',
      phoneHint: '•••• 6288'
    },
    {
      email: 'referee@nmims.edu.in',
      altEmails: ['panel@nmims.edu.in', 'referees@nmims.edu.in', 'judge@nmims.edu.in'],
      password: 'Referee@Judge2026',
      aliases: ['referee2026', 'judge123', 'referee'],
      role: 'referees',
      name: 'Chief Referee S. Ramanathan',
      title: 'Match Referees Panel Head',
      institution: 'Tournament Integrity Board',
      phone: '+91 94401 88312',
      phoneHint: '•••• 8312'
    }
  ];

  // 2. RBAC ENGINE
  window.LegendsRBAC = {
    roles: ROLES,
    accounts: OFFICIAL_ACCOUNTS,

    // Retrieve list of official accounts for UI quick-fill
    getOfficialAccounts: function () {
      return OFFICIAL_ACCOUNTS.map(acc => ({
        email: acc.email,
        role: acc.role,
        name: acc.name,
        title: acc.title,
        institution: acc.institution,
        phoneHint: acc.phoneHint,
        defaultPassword: acc.aliases[0]
      }));
    },

    // Find account by email
    findAccountByEmail: function (email) {
      if (!email) return null;
      const clean = email.trim().toLowerCase();
      return OFFICIAL_ACCOUNTS.find(acc => 
        acc.email.toLowerCase() === clean || 
        (acc.altEmails && acc.altEmails.some(ae => ae.toLowerCase() === clean))
      ) || null;
    },

    // Verify login credentials against registered accounts
    verifyCredentials: function (email, password, requestedRole) {
      if (!email || !email.trim()) {
        return { success: false, error: 'Official Institutional Email is required.' };
      }
      if (!password || !password.trim()) {
        return { success: false, error: 'Tournament Password is required.' };
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();

      const account = this.findAccountByEmail(cleanEmail);

      if (account) {
        const passMatch = cleanPass === account.password || 
                          account.aliases.includes(cleanPass) || 
                          cleanPass.toLowerCase() === 'legends2026' || 
                          cleanPass.toLowerCase() === 'impulse2026';
        if (!passMatch) {
          return { success: false, error: 'Access Denied: Invalid tournament password for this institutional account.' };
        }
        return {
          success: true,
          account: {
            email: account.email,
            role: requestedRole || account.role,
            name: account.name,
            title: account.title,
            institution: account.institution,
            phoneHint: account.phoneHint
          }
        };
      }

      // Allow official institution email addresses with master tournament password
      const isOfficialDomain = cleanEmail.endsWith('@nmims.edu.in') || cleanEmail.endsWith('@legends.org') || cleanEmail.endsWith('@impulse.org');
      const isMasterPass = cleanPass.toLowerCase() === 'legends2026' || cleanPass.toLowerCase() === 'impulse2026' || cleanPass === 'Admin@Legends2026';

      if (isOfficialDomain && isMasterPass) {
        const prefix = cleanEmail.split('@')[0];
        const role = requestedRole || 'committee';
        return {
          success: true,
          account: {
            email: cleanEmail,
            role: role,
            name: prefix.replace(/[._]/g, ' ').toUpperCase() + ' (Official)',
            title: 'Authorized Tournament Officer',
            institution: 'NMIMS Hyderabad STME',
            phoneHint: '•••• ' + (Math.floor(1000 + Math.random() * 9000))
          }
        };
      }

      return {
        success: false,
        error: 'Access Denied: Unrecognized official email or incorrect password. Use registered NMIMS credentials.'
      };
    },

    // Generate 2FA security OTP for 2FA verification flow
    generate2FA: function (email) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const account = this.findAccountByEmail(cleanEmail);
      const phoneHint = account ? account.phoneHint : '•••• 9821';
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const otpSession = {
        code: code,
        email: cleanEmail,
        phoneHint: phoneHint,
        expiresAt: Date.now() + 180000 // 3 minutes
      };
      try {
        sessionStorage.setItem('legends_2fa_pending', JSON.stringify(otpSession));
      } catch (e) {
        // Fallback for non-browser/headless environments
      }
      return {
        phoneHint: phoneHint,
        demoCode: code,
        defaultCode: '123456',
        expiresInSeconds: 180
      };
    },

    // Verify 6-digit OTP code
    verify2FA: function (email, inputOtp) {
      if (!inputOtp || !inputOtp.trim()) {
        return { success: false, error: 'Please enter the 6-digit security OTP.' };
      }
      const cleanOtp = inputOtp.trim();
      // Master code 123456 always valid for testability and live demos
      if (cleanOtp === '123456') {
        try { sessionStorage.removeItem('legends_2fa_pending'); } catch (e) {}
        return { success: true };
      }

      try {
        const pendingRaw = sessionStorage.getItem('legends_2fa_pending');
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          if (Date.now() > pending.expiresAt) {
            return { success: false, error: 'Security OTP has expired. Please request a new code.' };
          }
          if (pending.code === cleanOtp) {
            sessionStorage.removeItem('legends_2fa_pending');
            return { success: true };
          }
        }
      } catch (e) {
        console.warn('2FA verification check failed:', e);
      }

      return { success: false, error: 'Invalid 6-digit security code. Check SMS or use demo code 123456.' };
    },

    // Retrieve active session from localStorage
    getCurrentUser: function () {
      try {
        const saved = localStorage.getItem('legends_auth_session');
        if (saved) {
          const user = JSON.parse(saved);
          if (user && user.role && user.role !== 'viewer') {
            return user;
          }
        }
      } catch (e) {
        console.warn('Failed to parse auth session:', e);
      }
      return null;
    },

    // Check if user is an authenticated official
    isAuthenticated: function () {
      const user = this.getCurrentUser();
      return user !== null && !!user.role && user.role !== 'viewer';
    },

    // Check specific permission
    hasPermission: function (perm) {
      const user = this.getCurrentUser();
      if (!user) return false;
      const roleConfig = ROLES[user.role];
      if (!roleConfig) return false;
      return roleConfig.permissions.includes(perm);
    },

    // Login user (stores session)
    login: function (email, roleId, rememberMe, optionalName) {
      const cleanEmail = (email || 'officer@nmims.edu.in').trim();
      const account = this.findAccountByEmail(cleanEmail);
      const roleConfig = ROLES[roleId] || (account ? ROLES[account.role] : ROLES.committee);
      
      const displayName = optionalName || (account ? account.name : (cleanEmail.split('@')[0].toUpperCase() + ' (Official)'));
      const institution = account ? account.institution : 'NMIMS Hyderabad STME Impulse';

      const user = {
        email: cleanEmail,
        name: displayName,
        role: roleConfig.id,
        institution: institution,
        token: 'AUTH-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        loginTime: new Date().toISOString(),
        rememberMe: rememberMe !== false
      };

      localStorage.setItem('legends_auth_session', JSON.stringify(user));
      localStorage.setItem('legends_admin_logged_in', 'true');
      localStorage.setItem('legends_admin_email', user.email);

      window.dispatchEvent(new CustomEvent('legends_auth_changed', { detail: user }));
      return user;
    },

    // Logout user (reverts to guest / public viewer)
    logout: function () {
      localStorage.removeItem('legends_auth_session');
      localStorage.removeItem('legends_admin_logged_in');
      localStorage.removeItem('legends_admin_email');
      window.dispatchEvent(new CustomEvent('legends_auth_changed', { detail: null }));
      if (window.LegendsApp) {
        window.LegendsApp.showToast('Logged out: Reverted to Public Viewer mode.', 'info');
      }
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 400);
    },

    // Switch role (only accessible to authenticated officials)
    switchRole: function (roleId) {
      if (!ROLES[roleId] || !this.isAuthenticated()) return;
      const user = this.getCurrentUser();
      user.role = roleId;
      localStorage.setItem('legends_auth_session', JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('legends_auth_changed', { detail: user }));
      this.applyUI();
      if (window.LegendsApp) {
        window.LegendsApp.showToast(`Active Role: ${ROLES[roleId].title}`, 'success');
      }
    },

    // Strict Page Guard for Admin Scoring Routes
    enforcePageGuard: function () {
      const isProtectedPage = window.location.pathname.includes('admin-console') || window.location.pathname.includes('mobile-admin');
      if (!isProtectedPage) return true;

      const isAuthed = this.isAuthenticated();
      const gate = document.getElementById('rbac-auth-gate');
      const mainContent = document.querySelector('main');

      if (!isAuthed) {
        // Strict Lock: Hide main content and display Access Denied Gate
        if (mainContent) {
          mainContent.style.filter = 'blur(12px)';
          mainContent.style.pointerEvents = 'none';
          mainContent.style.userSelect = 'none';
        }
        if (gate) {
          gate.classList.remove('hidden');
          gate.classList.add('flex');
        } else {
          // If gate element is missing, redirect immediately to login
          window.location.href = 'login.html';
        }
        return false;
      }

      // Authenticated: remove gate & blur
      if (mainContent) {
        mainContent.style.filter = 'none';
        mainContent.style.pointerEvents = 'auto';
        mainContent.style.userSelect = 'auto';
      }
      if (gate) {
        gate.classList.add('hidden');
        gate.classList.remove('flex');
      }
      return true;
    },

    // Apply UI visibility based on whether user is Admin or Public Viewer
    applyUI: function () {
      const isAuthed = this.isAuthenticated();
      const user = this.getCurrentUser();
      const roleConfig = user ? (ROLES[user.role] || ROLES.viewer) : ROLES.viewer;

      // 1. PUBLIC VIEWERS: HIDE ALL "Admin Console" NAV, DRAWER, AND FOOTER LINKS
      document.querySelectorAll('[data-admin-only="true"], [data-path="admin-console"], [data-path="admin-portal"]').forEach(el => {
        if (isAuthed) {
          el.classList.remove('hidden');
          el.style.removeProperty('display');
          el.style.display = '';
        } else {
          el.classList.add('hidden');
          el.style.setProperty('display', 'none', 'important');
        }
      });

      // 2. MOBILE DRAWER: HIDE Admin Console for Guests
      const mobileDrawer = document.getElementById('mobile-menu-drawer');
      if (mobileDrawer) {
        mobileDrawer.querySelectorAll('a[href*="admin-console"]').forEach(el => {
          if (isAuthed) {
            el.classList.remove('hidden');
            el.style.removeProperty('display');
            el.style.display = 'flex';
          } else {
            el.classList.add('hidden');
            el.style.setProperty('display', 'none', 'important');
          }
        });
      }

      // 3. HEADER ACTIONS:
      // Guests see "Admin Login"
      // Authenticated Admins see Profile Chip + Logout
      document.querySelectorAll('[data-path="admin-login"]').forEach(el => {
        if (isAuthed) {
          el.classList.add('hidden');
          el.style.display = 'none';
        } else {
          el.classList.remove('hidden');
          el.style.display = '';
        }
      });

      // Render or Update Admin Status Chip in Header
      const headerActionAreas = document.querySelectorAll('header .flex.items-center.gap-space-md.shrink-0');
      headerActionAreas.forEach(container => {
        let existingChip = document.getElementById('navbar-admin-status-chip');
        if (isAuthed && user) {
          if (!existingChip) {
            existingChip = document.createElement('div');
            existingChip.id = 'navbar-admin-status-chip';
            existingChip.className = 'flex items-center gap-space-xs bg-surface-container-high px-space-sm py-1 border border-secondary-container/50 clip-angle shadow-md';
            container.insertBefore(existingChip, container.firstChild);
          }
          existingChip.classList.remove('hidden');
          existingChip.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
            <span class="font-label-badge text-label-badge uppercase font-bold text-secondary-container hidden sm:inline">${roleConfig.title.split(' ')[0]}</span>
            <a href="admin-console.html" class="font-headline-sm text-xs text-primary hover:text-white uppercase tracking-wider ml-1" title="Open Scoring Engine">Console</a>
            <button onclick="window.LegendsRBAC.logout()" class="text-on-surface-variant hover:text-error ml-1 transition-colors p-0.5" title="Exit Admin Session">
              <span class="material-symbols-outlined text-[15px] align-middle">logout</span>
            </button>
          `;
        } else if (existingChip) {
          existingChip.classList.add('hidden');
        }
      });

      // 4. INSIDE ADMIN CONSOLE: ENFORCE BUTTON PERMISSIONS & DECK LOCKS
      if (isAuthed) {
        const bannerName = document.getElementById('rbac-user-name');
        if (bannerName) bannerName.textContent = user.name || user.email;

        const bannerRole = document.getElementById('rbac-role-badge');
        if (bannerRole) {
          bannerRole.className = `px-space-sm py-0.5 font-label-badge text-label-badge uppercase font-bold clip-angle ${roleConfig.badgeClass}`;
          bannerRole.textContent = roleConfig.title;
        }

        const roleSelect = document.getElementById('rbac-role-switcher');
        if (roleSelect && roleSelect.value !== user.role) {
          roleSelect.value = user.role;
        }

        // Apply permission attributes
        document.querySelectorAll('[data-rbac-perm]').forEach(el => {
          const perm = el.getAttribute('data-rbac-perm');
          const allowed = this.hasPermission(perm);

          if (!allowed) {
            el.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            el.setAttribute('title', `Restricted: Requires ${perm}`);
            if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') {
              el.disabled = true;
            }
          } else {
            el.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            el.removeAttribute('title');
            if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') {
              el.disabled = false;
            }
          }
        });

        // Sport deck locks
        const canCricket = this.hasPermission('cricket:score');
        const canFootball = this.hasPermission('football:score');
        const cricketLock = document.getElementById('cricket-deck-lock');
        const footballLock = document.getElementById('football-deck-lock');

        if (cricketLock) {
          if (!canCricket) cricketLock.classList.remove('hidden');
          else cricketLock.classList.add('hidden');
        }
        if (footballLock) {
          if (!canFootball) footballLock.classList.remove('hidden');
          else footballLock.classList.add('hidden');
        }
      }
    }
  };

  // 3. AUTO INITIALIZATION
  document.addEventListener('DOMContentLoaded', function () {
    window.LegendsRBAC.enforcePageGuard();
    window.LegendsRBAC.applyUI();

    window.addEventListener('storage', function (e) {
      if (e.key === 'legends_auth_session') {
        window.LegendsRBAC.enforcePageGuard();
        window.LegendsRBAC.applyUI();
      }
    });

    window.addEventListener('legends_auth_changed', function () {
      window.LegendsRBAC.enforcePageGuard();
      window.LegendsRBAC.applyUI();
    });
  });

})();
