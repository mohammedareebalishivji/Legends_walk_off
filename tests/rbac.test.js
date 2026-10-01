/**
 * Legends Walk Off — Automated RBAC Security & Permission Test Suite
 * STME Impulse Committee • NMIMS Hyderabad 2026
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 RUNNING LEGENDS RBAC SECURITY & PIPELINE TEST SUITE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${desc}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

// Mock browser localStorage and window for headless testing
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  location: { pathname: '/admin-console.html', href: '' }
};

global.CustomEvent = class CustomEvent {
  constructor(name, detail) { this.name = name; this.detail = detail; }
};

global.document = {
  addEventListener: () => {},
  querySelectorAll: () => [],
  querySelector: () => null,
  getElementById: (id) => null
};

// Load RBAC engine
const rbacFile = path.join(__dirname, '../js/legends-rbac.js');
const rbacCode = fs.readFileSync(rbacFile, 'utf-8');
eval(rbacCode); // executes and attaches to global.window.LegendsRBAC

const RBAC = global.window.LegendsRBAC;

console.log('--- 1. ROLE DEFINITION & PERMISSION CHECKS ---');

it('Should contain 6 configured roles', () => {
  const roles = Object.keys(RBAC.roles);
  assert.deepStrictEqual(roles.sort(), ['captain', 'committee', 'cricket', 'football', 'referees', 'viewer'].sort());
});

it('Team Captain role must have wallet, roster, and auction viewing permissions, but not scoring', () => {
  const captain = RBAC.roles.captain;
  assert.ok(captain.permissions.includes('wallet:view'));
  assert.ok(captain.permissions.includes('roster:view'));
  assert.ok(captain.permissions.includes('auction:view'));
  assert.ok(captain.permissions.includes('paddle:participate'));
  assert.strictEqual(captain.permissions.includes('cricket:score'), false);
  assert.strictEqual(captain.permissions.includes('football:score'), false);
  assert.strictEqual(captain.permissions.includes('match:finalize'), false);
});

it('Committee Admin role must have all core permissions', () => {
  const committee = RBAC.roles.committee;
  assert.ok(committee.permissions.includes('cricket:score'));
  assert.ok(committee.permissions.includes('football:score'));
  assert.ok(committee.permissions.includes('alerts:broadcast'));
  assert.ok(committee.permissions.includes('match:finalize'));
  assert.ok(committee.permissions.includes('match:reset'));
});

it('Cricket Scorer role must only score cricket, not football', () => {
  const cricket = RBAC.roles.cricket;
  assert.ok(cricket.permissions.includes('cricket:score'));
  assert.ok(cricket.permissions.includes('cricket:wicket'));
  assert.strictEqual(cricket.permissions.includes('football:score'), false);
  assert.strictEqual(cricket.permissions.includes('alerts:broadcast'), false);
});

it('Football Scorer role must only score football, not cricket', () => {
  const football = RBAC.roles.football;
  assert.ok(football.permissions.includes('football:score'));
  assert.ok(football.permissions.includes('football:clock'));
  assert.strictEqual(football.permissions.includes('cricket:score'), false);
  assert.strictEqual(football.permissions.includes('match:reset'), false);
});

it('Referees Panel role must have override and DLS, but not routine scoring', () => {
  const referee = RBAC.roles.referees;
  assert.ok(referee.permissions.includes('referee:override'));
  assert.ok(referee.permissions.includes('dls:calculate'));
  assert.strictEqual(referee.permissions.includes('cricket:score'), false);
  assert.strictEqual(referee.permissions.includes('football:score'), false);
});

it('Public Viewer role must have ZERO admin permissions', () => {
  const viewer = RBAC.roles.viewer;
  assert.strictEqual(viewer.permissions.length, 0);
});

console.log('\n--- 2. AUTHENTICATION & SESSION PERSISTENCE ---');

it('Logging in as cricket scorer saves correct session state', () => {
  const user = RBAC.login('scorer1@nmims.edu.in', 'cricket');
  assert.strictEqual(user.role, 'cricket');
  assert.strictEqual(user.email, 'scorer1@nmims.edu.in');
  assert.ok(user.token.startsWith('AUTH-'));
  assert.strictEqual(RBAC.isAuthenticated(), true);
  assert.strictEqual(RBAC.hasPermission('cricket:score'), true);
  assert.strictEqual(RBAC.hasPermission('football:score'), false);
});

it('Switching role dynamically changes active permissions', () => {
  RBAC.switchRole('football');
  assert.strictEqual(RBAC.getCurrentUser().role, 'football');
  assert.strictEqual(RBAC.hasPermission('football:score'), true);
  assert.strictEqual(RBAC.hasPermission('cricket:score'), false);
});

it('Logging out clears session and permissions', () => {
  RBAC.logout();
  assert.strictEqual(RBAC.isAuthenticated(), false);
  assert.strictEqual(RBAC.hasPermission('cricket:score'), false);
});

it('Guest / unauthenticated user is strictly blocked by page guard', () => {
  RBAC.logout();
  assert.strictEqual(RBAC.isAuthenticated(), false);
  const allowed = RBAC.enforcePageGuard();
  assert.strictEqual(allowed, false);
});

it('Admin user passes page guard and accesses scoring console', () => {
  RBAC.login('officer@nmims.edu.in', 'committee');
  assert.strictEqual(RBAC.isAuthenticated(), true);
  const allowed = RBAC.enforcePageGuard();
  assert.strictEqual(allowed, true);
});

it('Logging in as team captain saves session with captain role and teamId', () => {
  const cap = RBAC.login('captain.stme@nmims.edu.in', 'captain', true, 'Vikramaditya', 'team-nmims-cricket');
  assert.strictEqual(cap.role, 'captain');
  assert.strictEqual(cap.teamId, 'team-nmims-cricket');
  assert.strictEqual(RBAC.hasPermission('wallet:view'), true);
  assert.strictEqual(RBAC.hasPermission('cricket:score'), false);
});

it('setRole dynamically switches captain role and franchise identity', () => {
  const user = RBAC.setRole('captain', 'team-cbit-cricket');
  assert.strictEqual(user.role, 'captain');
  assert.strictEqual(user.teamId, 'team-cbit-cricket');
  assert.strictEqual(RBAC.getCurrentUser().teamId, 'team-cbit-cricket');
});

it('Team Captain is guarded from official match scoring console', () => {
  RBAC.setRole('captain', 'team-nmims-cricket');
  assert.strictEqual(RBAC.isAuthenticated(), true);
  const allowed = RBAC.enforcePageGuard();
  assert.strictEqual(allowed, false, 'Captain must be blocked from admin scoring console');
});

console.log('\n--- 3. HTML CODEBASE INTEGRITY ---');

const expectedFiles = [
  'index.html',
  'standings.html',
  'live-scores.html',
  'auction.html',
  'about.html',
  'admin-console.html',
  'login.html',
  'mobile-live.html',
  'mobile-admin.html',
  'mph-screen.html',
  'captain-dashboard.html'
];

expectedFiles.forEach(file => {
  it(`File ${file} exists and contains Tailwind CDN & Google fonts`, () => {
    const filePath = path.join(__dirname, '..', file);
    assert.ok(fs.existsSync(filePath), `${file} should exist`);
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('cdn.tailwindcss.com'), `${file} should include Tailwind CDN`);
    assert.ok(content.includes('Material+Symbols+Outlined'), `${file} should include Material Symbols font`);
  });
});

console.log('\n====================================================');
console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
