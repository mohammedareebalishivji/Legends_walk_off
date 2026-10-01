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

it('15. Dynamic bidding increments calculate 10L (<1Cr), 20L (1Cr-3Cr), and 25L (>3Cr)', () => {
  // Below 1 Cr -> +10 Lakhs
  assert.strictEqual(Auction.getDynamicIncrement(1000000), 1000000); // at 10L -> +10L
  assert.strictEqual(Auction.getDynamicIncrement(5000000), 1000000); // at 50L -> +10L
  assert.strictEqual(Auction.getDynamicIncrement(9000000), 1000000); // at 90L -> +10L

  // 1 Cr to 3 Cr -> +20 Lakhs
  assert.strictEqual(Auction.getDynamicIncrement(10000000), 2000000); // at 1 Cr -> +20L
  assert.strictEqual(Auction.getDynamicIncrement(20000000), 2000000); // at 2 Cr -> +20L
  assert.strictEqual(Auction.getDynamicIncrement(28000000), 2000000); // at 2.8 Cr -> +20L

  // Above 3 Cr -> +25 Lakhs
  assert.strictEqual(Auction.getDynamicIncrement(30000000), 2500000); // at 3 Cr -> +25L
  assert.strictEqual(Auction.getDynamicIncrement(45000000), 2500000); // at 4.5 Cr -> +25L
});

it('16. Admin can place bids on behalf of teams with dynamic increments and custom exact bids', () => {
  // Nominate fresh lot
  Auction.setActiveRole('admin');
  Auction.nominateLot('lot-104');
  const lot = Auction.getActiveLot();
  assert.strictEqual(lot.id, 'lot-104');
  const startBid = lot.currentBid;

  // Place dynamic tier bid for STME
  const res1 = Auction.placeAdminBid('team-nmims-cricket');
  assert.ok(res1.success);
  assert.strictEqual(res1.newBid, startBid + 1000000); // +10L
  assert.strictEqual(res1.lot.highestBidderTeamId, 'team-nmims-cricket');

  // Place exact custom bid for CBIT
  const res2 = Auction.placeAdminBid('team-cbit-cricket', 3500000, true);
  assert.ok(res2.success);
  assert.strictEqual(res2.newBid, 3500000);
  assert.strictEqual(res2.lot.highestBidderTeamId, 'team-cbit-cricket');
});

it('17. Undo last bid reverts bid amount and previous highest bidder', () => {
  Auction.setActiveRole('admin');
  const lotBefore = Auction.getActiveLot();
  assert.strictEqual(lotBefore.currentBid, 3500000);

  // Undo the 35L bid
  const undoRes = Auction.undoLastBid();
  assert.ok(undoRes.success);
  const lotAfter = Auction.getActiveLot();
  assert.strictEqual(lotAfter.highestBidderTeamId, 'team-nmims-cricket');
  assert(lotAfter.currentBid < 3500000);
});

it('18. Undo hammer reverts sold player status and refunds team purse', () => {
  Auction.setActiveRole('admin');
  const lot = Auction.getActiveLot();
  const winningTeamId = lot.highestBidderTeamId;
  const teamBefore = Auction.getTeam(winningTeamId);
  const purseBefore = teamBefore.remainingPurse;

  // Hammer sold
  const soldRes = Auction.hammerSold();
  assert.ok(soldRes.success);
  const teamAfterSold = Auction.getTeam(winningTeamId);
  assert.strictEqual(teamAfterSold.remainingPurse, purseBefore - soldRes.price);

  // Undo hammer
  const undoAction = Auction.undoLastAction();
  assert.ok(undoAction.success);
  const teamAfterUndo = Auction.getTeam(winningTeamId);
  assert.strictEqual(teamAfterUndo.remainingPurse, purseBefore, 'Purse should be completely refunded');
  assert.strictEqual(Auction.getActiveLot().status, 'active', 'Lot should be restored to active');
});

it('19. Admin can manually create, update, and manage teams and custom purses', () => {
  // Create a new team
  const newTeam = Auction.createTeam({
    name: 'VNR Mavericks',
    shortCode: 'MAV',
    captain: 'Harsha Vardhan',
    totalPurse: 15000000, // ₹1.50 Cr
    color: '#a87559'
  });

  assert.ok(newTeam.id);
  assert.strictEqual(newTeam.name, 'VNR Mavericks');
  assert.strictEqual(newTeam.totalPurse, 15000000);
  assert.strictEqual(newTeam.remainingPurse, 15000000);

  // Update team
  const updated = Auction.updateTeam(newTeam.id, {
    captain: 'Harsha V. (Captain)',
    totalPurse: 20000000 // Increase to 2 Cr
  });
  assert.strictEqual(updated.captain, 'Harsha V. (Captain)');
  assert.strictEqual(updated.totalPurse, 20000000);

  // Clean up
  const deleted = Auction.deleteTeam(newTeam.id);
  assert.strictEqual(deleted, true);
});

it('20. Excel CSV export generates valid report with wallets, squads, and player lots', () => {
  const csv = Auction.exportToExcelCSV();
  assert.ok(typeof csv === 'string');
  assert.ok(csv.includes('LEGENDS WALK OFF 2026 - OFFICIAL AUCTION MASTER REPORT'));
  assert.ok(csv.includes('SECTION 1: FRANCHISE WALLETS & SALARY CAPS'));
  assert.ok(csv.includes('SECTION 2: COMPLETE TEAM SQUADS & ACQUISITIONS'));
  assert.ok(csv.includes('SECTION 3: AUCTION PLAYER POOL & OUTCOMES'));
});

it('21. Admin can directly put player into team and deduct amount from their wallet', () => {
  Auction.setActiveRole('admin');
  const teamId = 'team-cbit-cricket';
  const teamBefore = Auction.getTeam(teamId);
  const remainingBefore = teamBefore.remainingPurse;
  const deductionPrice = 2500000; // ₹25.00 Lakh

  const result = Auction.adminDirectAssignPlayer({
    teamId: teamId,
    playerName: 'Rishabh Pant (Guest Star)',
    playerCategory: 'Wicket-Keeper Batsman',
    institution: 'Delhi Capitals / Guest',
    battingStyle: 'Left-Handed Explosive',
    bowlingStyle: 'N/A',
    price: deductionPrice
  });

  assert.ok(result.success);
  const teamAfter = Auction.getTeam(teamId);
  assert.strictEqual(teamAfter.remainingPurse, remainingBefore - deductionPrice, 'Purse must be exactly deducted');
  assert.strictEqual(teamAfter.spentPurse, teamBefore.spentPurse + deductionPrice);

  const squad = Auction.getTeamAllMembers(teamId);
  const assigned = squad.find(m => m.name === 'Rishabh Pant (Guest Star)');
  assert.ok(assigned, 'Player must be present in squad');
  assert.strictEqual(assigned.price, deductionPrice);
});

it('22. Direct assignment strictly enforces purse limit', () => {
  Auction.setActiveRole('admin');
  const teamId = 'team-vnr-cricket';
  const team = Auction.getTeam(teamId);
  const excessivePrice = team.remainingPurse + 5000000; // 50L more than remaining

  assert.throws(() => {
    Auction.adminDirectAssignPlayer({
      teamId: teamId,
      playerName: 'Overpriced Star',
      price: excessivePrice
    });
  }, /Insufficient purse balance/);
});

it('23. Undo direct assignment refunds the franchise purse and removes player', () => {
  Auction.setActiveRole('admin');
  const teamId = 'team-cbit-cricket';
  const teamBeforeUndo = Auction.getTeam(teamId);
  const purseBeforeUndo = teamBeforeUndo.remainingPurse;

  const undoRes = Auction.undoLastAction();
  assert.ok(undoRes.success);
  assert.ok(undoRes.message.includes('Reverted direct assignment'));

  const teamAfterUndo = Auction.getTeam(teamId);
  assert.strictEqual(teamAfterUndo.remainingPurse, purseBeforeUndo + 2500000, 'Purse should be completely refunded');

  const squad = Auction.getTeamAllMembers(teamId);
  const found = squad.find(m => m.name === 'Rishabh Pant (Guest Star)');
  assert.strictEqual(found, undefined, 'Player should be removed from squad');
});

it('24. Non-admin users (captains and guests) are strictly blocked from direct player assignment', () => {
  Auction.setActiveRole('captain', 'team-nmims-cricket');
  assert.throws(() => {
    Auction.adminDirectAssignPlayer({
      teamId: 'team-nmims-cricket',
      playerName: 'Captain Self Assign',
      price: 1000000
    });
  }, /PERMISSION DENIED: Only Admin/);

  Auction.setActiveRole('guest');
  assert.throws(() => {
    Auction.adminDirectAssignPlayer({
      teamId: 'team-nmims-cricket',
      playerName: 'Guest Assign',
      price: 1000000
    });
  }, /PERMISSION DENIED: Only Admin/);
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
