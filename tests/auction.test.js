/**
 * Legends Walk Off — Automated Tournament Auction & Purse Management Test Suite
 * STME Impulse Committee • NMIMS Hyderabad 2026
 */

const assert = require('assert');

console.log('====================================================');
console.log('🧪 RUNNING LEGENDS AUCTION & PURSE MANAGEMENT TEST SUITE');
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

// Mock browser localStorage and window for headless Node.js testing
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

global.window = {};

// Load engine
require('../js/legends-auction.js');
const Auction = global.window.LegendsAuction;

it('1. Auction engine initializes with default teams, purses and player lots', () => {
  const state = Auction.getState();
  assert(state.teams && state.teams.length >= 6, 'Should load at least 6 tournament teams');
  assert(state.lots && state.lots.length >= 5, 'Should load auction player pool');
  assert(state.activeLotId, 'Should have an active lot ID on the hammer');

  const teams = Auction.getTeams();
  const stme = teams.find(t => t.id === 'team-nmims-cricket');
  assert(stme, 'NMIMS STME Strikers must exist');
  assert.strictEqual(stme.totalPurse, 10000000, 'Total purse should be ₹1.00 Crore');
  assert(stme.remainingPurse > 0, 'Remaining purse must be positive');
  assert.strictEqual(stme.remainingPurse, stme.totalPurse - stme.spentPurse);
});

it('2. Guests are strictly restricted to View-Only and CANNOT place bids', () => {
  // Ensure role is guest
  Auction.setActiveRole('guest');
  const role = Auction.getActiveRole();
  assert.strictEqual(role.role, 'guest');

  assert.throws(() => {
    Auction.placeBid(100000);
  }, /GUEST ACCESS IS VIEW-ONLY/);
});

it('3. Guests can view remaining amounts and spent amounts of each team accurately', () => {
  Auction.setActiveRole('guest');
  const teams = Auction.getTeams();
  assert(teams.length >= 6);

  teams.forEach(team => {
    assert(team.name, 'Team must have a name');
    assert(team.totalPurse >= 10000000, 'Team must have total purse allocated');
    assert(team.remainingPurse !== undefined, 'Team must have remaining purse');
    assert(team.spentPurse !== undefined, 'Team must have spent purse');
    assert.strictEqual(team.remainingPurse, team.totalPurse - team.spentPurse);
    assert(Number(team.pctRemaining) >= 0 && Number(team.pctRemaining) <= 100);
  });
});

it('4. Registered team captain can place a valid bid on active lot', () => {
  // Switch to Captain of CBIT Thunder
  Auction.setActiveRole('captain', 'team-cbit-cricket');
  const role = Auction.getActiveRole();
  assert.strictEqual(role.role, 'captain');
  assert.strictEqual(role.teamId, 'team-cbit-cricket');

  const beforeLot = Auction.getActiveLot();
  const prevBid = beforeLot.currentBid;
  const increment = 200000; // ₹2 Lakhs

  const res = Auction.placeBid(increment);
  assert(res.success);
  assert.strictEqual(res.newBid, prevBid + increment);

  const updatedLot = Auction.getActiveLot();
  assert.strictEqual(updatedLot.currentBid, prevBid + increment);
  assert.strictEqual(updatedLot.highestBidderTeamId, 'team-cbit-cricket');
  assert.strictEqual(updatedLot.highestBidderTeamName, 'CBIT Thunder');
});

it('5. Team captain cannot bid consecutively if already the highest bidder', () => {
  Auction.setActiveRole('captain', 'team-cbit-cricket');
  assert.throws(() => {
    Auction.placeBid(100000);
  }, /already the current highest bidder/);
});

it('6. Captain cannot bid more than their remaining team purse', () => {
  // Switch to VNR Warriors captain
  Auction.setActiveRole('captain', 'team-vnr-cricket');
  const team = Auction.getTeam('team-vnr-cricket');
  const hugeIncrement = team.remainingPurse + 5000000; // Way above budget

  assert.throws(() => {
    Auction.placeBid(hugeIncrement);
  }, /INSUFFICIENT TEAM PURSE/);
});

it('7. Non-admin users cannot strike hammer (SOLD or UNSOLD)', () => {
  Auction.setActiveRole('captain', 'team-vnr-cricket');
  assert.throws(() => {
    Auction.hammerSold();
  }, /PERMISSION DENIED/);

  assert.throws(() => {
    Auction.hammerUnsold();
  }, /PERMISSION DENIED/);
});

it('8. Admin can declare player SOLD, updating winning team purse and squad', () => {
  Auction.setActiveRole('admin');
  const role = Auction.getActiveRole();
  assert.strictEqual(role.role, 'admin');

  const lotBefore = Auction.getActiveLot();
  const winningTeamId = lotBefore.highestBidderTeamId;
  assert(winningTeamId, 'Winning team should be established from previous bid');

  const teamBefore = Auction.getTeam(winningTeamId);
  const spentBefore = teamBefore.spentPurse;
  const squadCountBefore = teamBefore.acquiredPlayers.length;

  const res = Auction.hammerSold();
  assert(res.success);
  assert.strictEqual(res.lot.status, 'sold');

  // Verify winning team deducted purse
  const teamAfter = Auction.getTeam(winningTeamId);
  assert.strictEqual(teamAfter.spentPurse, spentBefore + res.price);
  assert.strictEqual(teamAfter.remainingPurse, teamAfter.totalPurse - teamAfter.spentPurse);
  assert.strictEqual(teamAfter.acquiredPlayers.length, squadCountBefore + 1);
  assert(teamAfter.acquiredPlayers.some(p => p.id === lotBefore.id));
});

it('9. Admin can nominate next player lot to active hammer', () => {
  Auction.setActiveRole('admin');
  const res = Auction.nominateLot('lot-102');
  assert(res.success);
  assert.strictEqual(res.lot.id, 'lot-102');
  assert.strictEqual(res.lot.status, 'active');

  const active = Auction.getActiveLot();
  assert.strictEqual(active.id, 'lot-102');
  assert.strictEqual(active.name, 'Devansh Singhal');
});

it('10. Admin can declare active player lot UNSOLD', () => {
  Auction.setActiveRole('admin');
  const res = Auction.hammerUnsold();
  assert(res.success);
  assert.strictEqual(res.lot.status, 'unsold');
});

it('11. Admin can add a new custom player to the auction pool', () => {
  Auction.setActiveRole('admin');
  const newLot = Auction.addPlayerLot({
    name: 'Yashwardhan Roy',
    sport: 'cricket',
    category: 'Cricket • Express Fast Bowler',
    institution: 'Vasavi College of Engineering',
    basePrice: 1200000
  });

  assert(newLot.id.startsWith('lot-'));
  assert.strictEqual(newLot.name, 'Yashwardhan Roy');
  assert.strictEqual(newLot.basePrice, 1200000);
  assert.strictEqual(newLot.status, 'upcoming');
});

it('12. Format currency handles Lakhs and Crores accurately', () => {
  assert.strictEqual(Auction.formatCurrency(10000000), '₹1.00 Cr');
  assert.strictEqual(Auction.formatCurrency(2850000), '₹28.50 Lakh');
  assert.strictEqual(Auction.formatCurrency(50000), '₹50,000');
});

it('13. getTeamAllMembers returns full roster combining retained squad and auction drafted players', () => {
  const members = Auction.getTeamAllMembers('team-nmims-cricket');
  assert.ok(Array.isArray(members));
  assert.ok(members.length >= 4, 'Should contain at least 4 members');
  assert.ok(members.some(m => m.name === 'Vikramaditya' && m.type === 'Captain'));
  assert.ok(members.some(m => m.name === 'Rohan Verma' && m.isRetained));
});

it('14. getOpponents returns all 5 opponent franchises with wallets, differences and squad members', () => {
  const opponents = Auction.getOpponents('team-nmims-cricket');
  assert.strictEqual(opponents.length, 5, 'Should have exactly 5 opponents');
  assert.ok(!opponents.some(t => t.id === 'team-nmims-cricket'), 'Should not include my own team');
  opponents.forEach(opp => {
    assert.ok(typeof opp.remainingPurse === 'number', 'Opponent should have remaining purse');
    assert.ok(Array.isArray(opp.allMembers), 'Opponent should have allMembers array');
    assert.ok(opp.allMembers.length > 0, 'Opponent should have squad members');
  });
});

console.log('\n----------------------------------------------------');
console.log(`Results: ${passedTests}/${totalTests} tests passed`);
console.log('----------------------------------------------------');

if (passedTests !== totalTests) {
  console.error('❌ SOME AUCTION TESTS FAILED!');
  process.exit(1);
} else {
  console.log('🎉 ALL AUCTION & PURSE MANAGEMENT TESTS PASSED!\n');
  process.exit(0);
}
