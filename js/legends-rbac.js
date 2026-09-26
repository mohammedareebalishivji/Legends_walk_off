/**
 * Legends Walk Off — Role-Based Access Control (RBAC) Engine
 * STME Impulse Committee • NMIMS Hyderabad 2026
 *
 * Supports Roles:
 * - committee: Committee Executive Admin (Super Admin)
 * - cricket: Official Cricket Match Scorer
 * - football: Official Football Match Scorer
 * - referees: Match Referees Panel & Auditor
 * - viewer: Public / Unauthenticated
 */

(function () {
  'use strict';

  // 1. ROLE DEFINITIONS & PERMISSIONS MATRIX
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

  const DEFAULT_USER = {
    email: 'officer@nmims.edu.in',
    name: 'Rajesh K. (NMIMS STME Impulse)',
    role: 'committee',
    institution: 'School of Technology Management & Engineering, NMIMS Hyderabad',
    token: 'NMIMS-STME-AUTH-2026-X99',
    timestamp: Date.now()
  };

  // 2. RBAC ENGINE OBJECT
  window.LegendsRBAC = {
    roles: ROLES,

    // Retrieve active session
    getCurrentUser: function () {
      try {
        const saved = localStorage.getItem('legends_auth_session');
        if (saved) {
          const user = JSON.parse(saved);
          return user;
        }
      } catch (e) {
        console.warn('Failed to parse auth session:', e);
      }
      return null;
    },

    // Check if authenticated
    isAuthenticated: function () {
      const user = this.getCurrentUser();
      return user !== null && !!user.role;
    },

    // Check specific permission
    hasPermission: function (perm) {
      const user = this.getCurrentUser();
      if (!user) return false;
      const roleConfig = ROLES[user.role];
      if (!roleConfig) return false;
      return roleConfig.permissions.includes(perm);
    },

    // Login user
    login: function (email, roleId, remember = true) {
      const roleConfig = ROLES[roleId] || ROLES.cricket;
      const user = {
        email: email || 'officer@nmims.edu.in',
        name: email ? email.split('@')[0].toUpperCase() + ' (Official)' : 'Rajesh K. (NMIMS STME)',
        role: roleConfig.id,
        institution: 'NMIMS Hyderabad STME Impulse',
        token: 'AUTH-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('legends_auth_session', JSON.stringify(user));
      localStorage.setItem('legends_admin_logged_in', 'true');
      localStorage.setItem('legends_admin_email', user.email);

      window.dispatchEvent(new CustomEvent('legends_auth_changed', { detail: user }));
      return user;
    },

    // Logout user
    logout: function () {
      localStorage.removeItem('legends_auth_session');
      localStorage.removeItem('legends_admin_logged_in');
      localStorage.removeItem('legends_admin_email');
      window.dispatchEvent(new CustomEvent('legends_auth_changed', { detail: null }));
      if (window.LegendsApp) {
        window.LegendsApp.showToast('Logged out of Admin Portal.', 'info');
      }
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 500);
    },

    // Quick role switch (ideal for demonstrations)
    switchRole: function (roleId) {
      if (!ROLES[roleId]) return;
      let user = this.getCurrentUser();
      if (!user) {
        user = Object.assign({}, DEFAULT_USER);
      }
      user.role = roleId;
      localStorage.setItem('legends_auth_session', JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('legends_auth_changed', { detail: user }));
      this.applyUI();
      if (window.LegendsApp) {
        window.LegendsApp.showToast(`Switched Role: ${ROLES[roleId].title}`, 'success');
      }
    },

    // Route Guard for Admin Pages
    enforcePageGuard: function () {
      if (!this.isAuthenticated()) {
        // Show route guard modal or auto-login default for demo
        const isDemo = true; // Auto-login default committee admin for seamless review
        if (isDemo) {
          this.login(DEFAULT_USER.email, 'committee');
          if (window.LegendsApp) {
            window.LegendsApp.showToast('Authorized: Auto-authenticated as Committee Admin for review', 'info');
          }
        } else {
          window.location.href = 'login.html';
        }
      }
    },

    // Apply UI visibility & disable states based on permissions
    applyUI: function () {
      const user = this.getCurrentUser() || { role: 'viewer', name: 'Anonymous' };
      const roleConfig = ROLES[user.role] || ROLES.viewer;

      // 1. Update Role Banner / Info Badges
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

      // 2. Enforce Permissions on Elements with data-rbac-perm
      document.querySelectorAll('[data-rbac-perm]').forEach(el => {
        const requiredPerm = el.getAttribute('data-rbac-perm');
        const allowed = this.hasPermission(requiredPerm);

        if (!allowed) {
          el.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
          el.setAttribute('title', `Permission required: ${requiredPerm} (Active: ${roleConfig.title})`);
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

      // 3. Sport Deck Controls: lock decks if not permitted
      const canCricket = this.hasPermission('cricket:score');
      const canFootball = this.hasPermission('football:score');
      const cricketLockBanner = document.getElementById('cricket-deck-lock');
      const footballLockBanner = document.getElementById('football-deck-lock');

      if (cricketLockBanner) {
        if (!canCricket) cricketLockBanner.classList.remove('hidden');
        else cricketLockBanner.classList.add('hidden');
      }

      if (footballLockBanner) {
        if (!canFootball) footballLockBanner.classList.remove('hidden');
        else footballLockBanner.classList.add('hidden');
      }
    }
  };

  // 3. AUTO INITIALIZATION
  document.addEventListener('DOMContentLoaded', function () {
    const isProtectedPage = window.location.pathname.includes('admin-console') || window.location.pathname.includes('mobile-admin');
    if (isProtectedPage) {
      window.LegendsRBAC.enforcePageGuard();
    }
    window.LegendsRBAC.applyUI();

    // Listen for auth changes across tabs
    window.addEventListener('storage', function (e) {
      if (e.key === 'legends_auth_session') {
        window.LegendsRBAC.applyUI();
      }
    });
  });

})();
