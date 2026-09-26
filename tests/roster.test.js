/**
 * Legends Walk Off — Automated Teams & Squad Roster Test Suite
 * STME Impulse Committee • NMIMS Hyderabad 2026
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 RUNNING LEGENDS ROSTER MANAGEMENT TEST SUITE');
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
const listeners = {};

global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
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
  LegendsApp: {
    showToast: () => {}
  }
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

// Load Roster engine
const rosterFile = path.join(__dirname, '../js/legends-roster.js');
const rosterCode = fs.readFileSync(rosterFile, 'utf-8');
eval(rosterCode); // executes and attaches to global.window.LegendsRoster

const Roster = global.window.LegendsRoster;

assert(Roster, 'LegendsRoster must be initialized on window');

// TEST CASES
it('1. Default teams are loaded initially when localStorage is empty', () => {
  global.localStorage.clear();
  const teams = Roster.getTeams();
  assert(Array.isArray(teams), 'Teams should be an array');
  assert(teams.length >= 5, `Expected at least 5 default teams, got ${teams.length}`);
  const stme = teams.find(t => t.id === 'team-nmims-cricket');
  assert(stme, 'NMIMS STME Cricket team should exist in defaults');
  assert.strictEqual(stme.sport, 'cricket');
  assert(stme.members.length >= 6, 'STME Cricket should have initial squad members');
});

it('2. Adding a new cricket team succeeds and persists to localStorage', () => {
  const newTeam = Roster.addTeam({
    name: 'Osmania Strikers',
    shortCode: 'OU',
    institution: 'Osmania University, Hyderabad',
    sport: 'cricket',
    pool: 'Group Bravo',
    captain: 'Kiran Reddy',
    color: '#38bdf8'
  });

  assert(newTeam.id.startsWith('team-osmania-strikers'), 'ID should be properly slugified');
  assert.strictEqual(newTeam.name, 'Osmania Strikers');
  assert.strictEqual(newTeam.shortCode, 'OU');
  assert.strictEqual(newTeam.captain, 'Kiran Reddy');
  assert.strictEqual(newTeam.sport, 'cricket');

  // Verify in storage
  const fetched = Roster.getTeam(newTeam.id);
  assert(fetched, 'Newly created team must be retrievable via getTeam');
  assert.strictEqual(fetched.name, 'Osmania Strikers');
});

it('3. Adding a new football team succeeds with conference and members array', () => {
  const newTeam = Roster.addTeam({
    name: 'Gokaraju Rangaraju FC',
    shortCode: 'GRIET',
    institution: 'GRIET Bachupally',
    sport: 'football',
    pool: 'Conference Bravo',
    captain: 'Sai Teja',
    color: '#4edea3'
  });

  assert.strictEqual(newTeam.sport, 'football');
  assert.strictEqual(newTeam.pool, 'Conference Bravo');
  assert(Array.isArray(newTeam.members), 'Members should be initialized as empty array');
  assert.strictEqual(newTeam.members.length, 0);
});

it('4. Team creation rejects empty or missing team names', () => {
  assert.throws(() => {
    Roster.addTeam({ sport: 'cricket' });
  }, /Team name is required/);
});

it('5. Drafting / Adding squad players to a team updates the team roster', () => {
  const teams = Roster.getTeams();
  const testTeam = teams[0];
  const initialCount = testTeam.members.length;

  const player = Roster.addMember(testTeam.id, {
    name: 'Harsh Vardhan',
    number: 77,
    role: 'Pace Bowler',
    style: 'Right-arm Express Fast'
  });

  assert(player.id.startsWith('p-'), 'Player ID should be generated');
  assert.strictEqual(player.name, 'Harsh Vardhan');
  assert.strictEqual(player.number, 77);

  const updatedTeam = Roster.getTeam(testTeam.id);
  assert.strictEqual(updatedTeam.members.length, initialCount + 1, 'Member count should increment by 1');
  assert(updatedTeam.members.some(m => m.name === 'Harsh Vardhan'), 'Player should be in members array');
});

it('6. Adding a captain player updates team captain property', () => {
  const teams = Roster.getTeams();
  const testTeam = teams[0];

  const captain = Roster.addMember(testTeam.id, {
    name: 'Suresh Raina',
    number: 3,
    role: 'Captain & Middle-order Batsman',
    style: 'Left-hand bat',
    isCaptain: true
  });

  const updatedTeam = Roster.getTeam(testTeam.id);
  assert(updatedTeam.captain.includes('Suresh Raina'), 'Team captain should be updated');
});

it('7. Player addition rejects empty or missing player names', () => {
  const teams = Roster.getTeams();
  const testTeam = teams[0];
  assert.throws(() => {
    Roster.addMember(testTeam.id, { number: 10 });
  }, /Player name is required/);
});

it('8. Player addition rejects non-existent team IDs', () => {
  assert.throws(() => {
    Roster.addMember('non-existent-team-id-999', { name: 'Ghost Player' });
  }, /Team not found/);
});

it('9. Removing a squad player deletes them from team members list', () => {
  const teams = Roster.getTeams();
  const testTeam = teams[0];
  
  // Add a player first
  const player = Roster.addMember(testTeam.id, {
    name: 'Temporary Player',
    number: 90
  });

  const beforeRemoval = Roster.getTeam(testTeam.id);
  assert(beforeRemoval.members.some(m => m.id === player.id));

  // Remove the player
  const result = Roster.removeMember(testTeam.id, player.id);
  assert.strictEqual(result, true, 'removeMember should return true on success');

  const afterRemoval = Roster.getTeam(testTeam.id);
  assert(!afterRemoval.members.some(m => m.id === player.id), 'Player should no longer exist in members array');
});

it('10. Removing a non-existent member returns false gracefully', () => {
  const teams = Roster.getTeams();
  const testTeam = teams[0];
  const result = Roster.removeMember(testTeam.id, 'fake-player-id');
  assert.strictEqual(result, false);
});

it('11. Removing a team deletes the team and its entire roster', () => {
  const teamsBefore = Roster.getTeams();
  const teamToDelete = teamsBefore[teamsBefore.length - 1];
  const idToDelete = teamToDelete.id;

  const result = Roster.removeTeam(idToDelete);
  assert.strictEqual(result, true, 'removeTeam should return true on success');

  const teamsAfter = Roster.getTeams();
  assert.strictEqual(teamsAfter.length, teamsBefore.length - 1, 'Total team count should decrement by 1');
  assert(!teamsAfter.some(t => t.id === idToDelete), 'Deleted team should not exist in teams list');
  assert.strictEqual(Roster.getTeam(idToDelete), null, 'getTeam should return null for deleted team');
});

it('12. Removing a non-existent team returns false gracefully', () => {
  const result = Roster.removeTeam('non-existent-team-1234');
  assert.strictEqual(result, false);
});

it('13. Resetting defaults restores initial tournament franchises and squads', () => {
  Roster.resetDefaults();
  const teams = Roster.getTeams();
  assert(teams.length >= 5, 'Defaults should restore default team count');
  const nmims = Roster.getTeam('team-nmims-cricket');
  assert(nmims !== null, 'NMIMS STME Cricket should be restored');
  assert(nmims.members.length >= 6, 'NMIMS STME Cricket squad should be restored');
});

console.log('\n----------------------------------------------------');
console.log(`Results: ${passedTests}/${totalTests} tests passed`);
console.log('----------------------------------------------------');

if (passedTests !== totalTests) {
  console.error(`💥 TEST SUITE FAILED: ${totalTests - passedTests} tests failed.`);
  process.exit(1);
} else {
  console.log('🎉 ALL ROSTER MANAGEMENT TESTS PASSED!');
  process.exit(0);
}
