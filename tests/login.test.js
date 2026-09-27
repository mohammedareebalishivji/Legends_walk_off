/**
 * Legends Walk Off — Automated Admin Login & Authentication Test Suite
 * STME Impulse Committee • NMIMS Hyderabad 2026
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 RUNNING LEGENDS ADMIN LOGIN & AUTH TEST SUITE');
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

// Mock browser localStorage, sessionStorage, and window for headless testing
const mockStorage = {};
const mockSessionStorage = {};
const listeners = {};

global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

global.sessionStorage = {
  getItem: (k) => mockSessionStorage[k] || null,
  setItem: (k, v) => { mockSessionStorage[k] = String(v); },
  removeItem: (k) => { delete mockSessionStorage[k]; },
  clear: () => { Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k]); }
};

global.window = {
  dispatchEvent: (ev) => {
    if (listeners[ev.name]) {
      listeners[ev.name].forEach(fn => fn(ev));
    }
  },
  addEventListener: (name, fn) => {
    if (!listeners[name]) listeners[name] = [];
    listeners[name].push(fn);
  },
  location: { pathname: '/login.html', href: '', search: '' },
  LegendsApp: { showToast: () => {} }
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
eval(rbacCode); // attaches to global.window.LegendsRBAC

const RBAC = global.window.LegendsRBAC;

assert(RBAC, 'LegendsRBAC must be attached to window');

// TEST CASES
it('1. Official verified accounts are registered for all 4 tournament official roles', () => {
  const accounts = RBAC.getOfficialAccounts();
  assert(Array.isArray(accounts), 'Should return an array of accounts');
  assert.strictEqual(accounts.length, 4, 'Should have exactly 4 official accounts');

  const committee = accounts.find(a => a.role === 'committee');
  const cricket = accounts.find(a => a.role === 'cricket');
  const football = accounts.find(a => a.role === 'football');
  const referees = accounts.find(a => a.role === 'referees');

  assert(committee, 'Committee Admin account must exist');
  assert.strictEqual(committee.email, 'admin@nmims.edu.in');

  assert(cricket, 'Cricket Scorer account must exist');
  assert.strictEqual(cricket.email, 'cricket@nmims.edu.in');

  assert(football, 'Football Scorer account must exist');
  assert.strictEqual(football.email, 'football@nmims.edu.in');

  assert(referees, 'Referees Panel account must exist');
  assert.strictEqual(referees.email, 'referee@nmims.edu.in');
});

it('2. Committee Admin authenticates successfully with official password', () => {
  const res = RBAC.verifyCredentials('admin@nmims.edu.in', 'Admin@Legends2026', 'committee');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.account.role, 'committee');
  assert(res.account.name.includes('Rajesh'));
  assert.strictEqual(res.account.phoneHint, '•••• 9821');
});

it('3. Committee Admin authenticates with tournament alias password (legends2026)', () => {
  const res = RBAC.verifyCredentials('admin@nmims.edu.in', 'legends2026', 'committee');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.account.role, 'committee');
});

it('4. Cricket Scorer authenticates with cricket credentials', () => {
  const res = RBAC.verifyCredentials('cricket@nmims.edu.in', 'cricket2026', 'cricket');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.account.role, 'cricket');
  assert(res.account.name.includes('Arun Varma'));
});

it('5. Football Scorer authenticates with football credentials', () => {
  const res = RBAC.verifyCredentials('football@nmims.edu.in', 'football2026', 'football');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.account.role, 'football');
  assert(res.account.name.includes('Carlos Menezes'));
});

it('6. Referees Panel authenticates with referee credentials', () => {
  const res = RBAC.verifyCredentials('referee@nmims.edu.in', 'referee2026', 'referees');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.account.role, 'referees');
  assert(res.account.name.includes('Ramanathan'));
});

it('7. Rejects invalid password for registered official', () => {
  const res = RBAC.verifyCredentials('admin@nmims.edu.in', 'wrong_password_123', 'committee');
  assert.strictEqual(res.success, false);
  assert(res.error.includes('Invalid tournament password'));
});

it('8. Rejects unknown non-institutional email', () => {
  const res = RBAC.verifyCredentials('hacker@random.com', 'legends2026', 'committee');
  assert.strictEqual(res.success, false);
  assert(res.error.includes('Unrecognized official email'));
});

it('9. Rejects empty email or empty password', () => {
  const resEmptyEmail = RBAC.verifyCredentials('', 'legends2026');
  assert.strictEqual(resEmptyEmail.success, false);
  assert(resEmptyEmail.error.includes('Email is required'));

  const resEmptyPass = RBAC.verifyCredentials('admin@nmims.edu.in', '');
  assert.strictEqual(resEmptyPass.success, false);
  assert(resEmptyPass.error.includes('Password is required'));
});

it('10. 2FA generation creates valid security OTP session and phone hint', () => {
  const twoFa = RBAC.generate2FA('admin@nmims.edu.in');
  assert.strictEqual(twoFa.phoneHint, '•••• 9821');
  assert.strictEqual(typeof twoFa.demoCode, 'string');
  assert.strictEqual(twoFa.demoCode.length, 6);
  assert.strictEqual(twoFa.defaultCode, '123456');

  const pendingRaw = global.sessionStorage.getItem('legends_2fa_pending');
  assert(pendingRaw !== null, 'Session storage should contain pending 2FA token');
});

it('11. 2FA verification succeeds with generated OTP code', () => {
  const twoFa = RBAC.generate2FA('cricket@nmims.edu.in');
  const verifyRes = RBAC.verify2FA('cricket@nmims.edu.in', twoFa.demoCode);
  assert.strictEqual(verifyRes.success, true);
});

it('12. 2FA verification succeeds with master test bypass code (123456)', () => {
  RBAC.generate2FA('football@nmims.edu.in');
  const verifyRes = RBAC.verify2FA('football@nmims.edu.in', '123456');
  assert.strictEqual(verifyRes.success, true);
});

it('13. 2FA verification rejects incorrect OTP code', () => {
  RBAC.generate2FA('admin@nmims.edu.in');
  const verifyRes = RBAC.verify2FA('admin@nmims.edu.in', '999999');
  assert.strictEqual(verifyRes.success, false);
  assert(verifyRes.error.includes('Invalid 6-digit security code'));
});

it('14. Completing login creates persistent authenticated session in localStorage', () => {
  global.localStorage.clear();
  assert.strictEqual(RBAC.isAuthenticated(), false);

  const user = RBAC.login('admin@nmims.edu.in', 'committee', true, 'Dr. Rajesh K.');
  assert.strictEqual(user.email, 'admin@nmims.edu.in');
  assert.strictEqual(user.role, 'committee');
  assert.strictEqual(user.name, 'Dr. Rajesh K.');
  assert(user.token.startsWith('AUTH-'));

  assert.strictEqual(RBAC.isAuthenticated(), true);
  const current = RBAC.getCurrentUser();
  assert.strictEqual(current.email, 'admin@nmims.edu.in');
  assert.strictEqual(current.role, 'committee');
});

it('15. Logging out cleanly clears session and revokes authentication', () => {
  assert.strictEqual(RBAC.isAuthenticated(), true);
  RBAC.logout();
  assert.strictEqual(RBAC.isAuthenticated(), false);
  assert.strictEqual(RBAC.getCurrentUser(), null);
  assert.strictEqual(global.localStorage.getItem('legends_auth_session'), null);
});

console.log('\n----------------------------------------------------');
console.log(`Results: ${passedTests}/${totalTests} tests passed`);
console.log('----------------------------------------------------');

if (passedTests !== totalTests) {
  console.error(`💥 TEST SUITE FAILED: ${totalTests - passedTests} tests failed.`);
  process.exit(1);
} else {
  console.log('🎉 ALL ADMIN LOGIN & AUTHENTICATION TESTS PASSED!');
  process.exit(0);
}
