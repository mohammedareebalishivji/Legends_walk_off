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

it('1. Auction engine initializes with the 10 League 2.0 teams, purses and player lots', () => {
  const state = Auction.getState();
  assert.strictEqual(state.teams.length, 10, 'Should load the 10 League 2.0 franchises');
  assert(state.lots && state.lots.length >= 5, 'Should load auction player pool');
  assert(state.activeLotId, 'Should have an active lot ID on the hammer');

  const teams = Auction.getTeams();
  const stme = teams.find(t => t.id === 'team-csk');
  assert(stme, 'Claude Super Kings must exist');
  assert.strictEqual(stme.captain, 'Krishna Patil');
  assert.strictEqual(stme.spentPurse, 0, 'New league teams start with a full purse');
  assert.strictEqual(stme.totalPurse, 500000000, 'Total purse should be ₹50.00 Crore');
  assert.strictEqual(Auction.formatCurrency(stme.totalPurse), '₹50.00 Cr');
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
  // Switch to Captain of GitHub Titans
  Auction.setActiveRole('captain', 'team-gt');
  const role = Auction.getActiveRole();
  assert.strictEqual(role.role, 'captain');
  assert.strictEqual(role.teamId, 'team-gt');

  const beforeLot = Auction.getActiveLot();
  const prevBid = beforeLot.currentBid;
  const increment = 200000; // ₹2 Lakhs

  const res = Auction.placeBid(increment);
  assert(res.success);
  assert.strictEqual(res.newBid, prevBid + increment);

  const updatedLot = Auction.getActiveLot();
  assert.strictEqual(updatedLot.currentBid, prevBid + increment);
  assert.strictEqual(updatedLot.highestBidderTeamId, 'team-gt');
  assert.strictEqual(updatedLot.highestBidderTeamName, 'GitHub Titans');
});

it('5. Team captain cannot bid consecutively if already the highest bidder', () => {
  Auction.setActiveRole('captain', 'team-gt');
  assert.throws(() => {
    Auction.placeBid(100000);
  }, /already the current highest bidder/);
});

it('6. Captain cannot bid more than their remaining team purse', () => {
  // Switch to Royal Challengers Blockchain captain
  Auction.setActiveRole('captain', 'team-rcb');
  const team = Auction.getTeam('team-rcb');
  const hugeIncrement = team.remainingPurse + 5000000; // Way above budget

  assert.throws(() => {
    Auction.placeBid(hugeIncrement);
  }, /INSUFFICIENT TEAM PURSE/);
});

it('7. Non-admin users cannot strike hammer (SOLD or UNSOLD)', () => {
  Auction.setActiveRole('captain', 'team-rcb');
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
  const res = Auction.nominateLot('lot-203');
  assert(res.success);
  assert.strictEqual(res.lot.id, 'lot-203');
  assert.strictEqual(res.lot.status, 'active');

  const active = Auction.getActiveLot();
  assert.strictEqual(active.id, 'lot-203');
  assert.strictEqual(active.name, 'Anant');
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
  const members = Auction.getTeamAllMembers('team-csk');
  assert.ok(Array.isArray(members));
  assert.ok(members.some(m => m.name === 'Krishna Patil' && m.type === 'Captain' && m.isRetained), 'Captain is the first squad member');
});

it('14. getOpponents returns all 9 opponent franchises with wallets, differences and squad members', () => {
  const opponents = Auction.getOpponents('team-csk');
  assert.strictEqual(opponents.length, 9, 'Should have exactly 9 opponents');
  assert.ok(!opponents.some(t => t.id === 'team-csk'), 'Should not include my own team');
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
  Auction.nominateLot('lot-205');
  const lot = Auction.getActiveLot();
  assert.strictEqual(lot.id, 'lot-205');
  const startBid = lot.currentBid;

  // Place dynamic tier bid for CSK
  const res1 = Auction.placeAdminBid('team-csk');
  assert.ok(res1.success);
  assert.strictEqual(res1.newBid, startBid + 1000000); // +10L
  assert.strictEqual(res1.lot.highestBidderTeamId, 'team-csk');

  // Place exact custom bid for GT
  const res2 = Auction.placeAdminBid('team-gt', 3500000, true);
  assert.ok(res2.success);
  assert.strictEqual(res2.newBid, 3500000);
  assert.strictEqual(res2.lot.highestBidderTeamId, 'team-gt');
});

it('17. Undo last bid reverts bid amount and previous highest bidder', () => {
  Auction.setActiveRole('admin');
  const lotBefore = Auction.getActiveLot();
  assert.strictEqual(lotBefore.currentBid, 3500000);

  // Undo the 35L bid
  const undoRes = Auction.undoLastBid();
  assert.ok(undoRes.success);
  const lotAfter = Auction.getActiveLot();
  assert.strictEqual(lotAfter.highestBidderTeamId, 'team-csk');
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
  const teamId = 'team-gt';
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
  const teamId = 'team-rcb';
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
  const teamId = 'team-gt';
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
  Auction.setActiveRole('captain', 'team-csk');
  assert.throws(() => {
    Auction.adminDirectAssignPlayer({
      teamId: 'team-csk',
      playerName: 'Captain Self Assign',
      price: 1000000
    });
  }, /PERMISSION DENIED: Only Admin/);

  Auction.setActiveRole('guest');
  assert.throws(() => {
    Auction.adminDirectAssignPlayer({
      teamId: 'team-csk',
      playerName: 'Guest Assign',
      price: 1000000
    });
  }, /PERMISSION DENIED: Only Admin/);
});

it('25. Admin mass-imports players pasted from Google Sheets (tabs, mixed headers, lakh/crore prices, Drive photos)', () => {
  Auction.setActiveRole('admin');
  const sheet = [
    'Timestamp\tPlayer Name\tCollege Name\tPlaying Role\tBase Price\tUpload your photo',
    '1/10/2026\tRahul Mehta\tNMIMS STME\tBatsman\t10L\thttps://drive.google.com/open?id=1AbC_dEf-123',
    '1/10/2026\tSahil Khan\tNMIMS SBM\tFast Bowler\t1.5 Cr\t',
    '1/10/2026\tRahul Mehta\tNMIMS STME\tBatsman\t10L\t',
    '1/10/2026\tAmit Roy\tNMIMS\tBowler\tabc\t',
    '1/10/2026\t\tNMIMS\tBowler\t10\t'
  ].join('\n');

  const preview = Auction.previewImport(sheet);
  assert.strictEqual(preview.playerRows, 5);
  assert.strictEqual(preview.columns.name, 'Player Name');
  assert.strictEqual(preview.columns.institution, 'College Name');

  const res = Auction.importPlayers(sheet);
  assert.strictEqual(res.added, 2);
  assert.deepStrictEqual(res.skipped.map(s => s.row), [4, 5, 6], 'Duplicate, bad price and blank name rows are skipped');

  const [rahul, sahil] = res.players;
  assert.strictEqual(rahul.category, 'Cricket • Batsman');
  assert.strictEqual(rahul.institution, 'NMIMS STME');
  assert.strictEqual(rahul.basePrice, 1000000);
  assert.strictEqual(rahul.currentBid, 1000000);
  assert.strictEqual(rahul.avatar, 'https://drive.google.com/thumbnail?id=1AbC_dEf-123&sz=w800');
  assert.strictEqual(sahil.basePrice, 15000000);
  assert.ok(sahil.avatar.startsWith('data:image/svg+xml'), 'Players without a photo get an initials placeholder');
  assert.notStrictEqual(rahul.id, sahil.id, 'Each imported lot gets a unique id');
});

it('26. Import handles quoted CSV cells, infers football roles, and can replace the unsold pool', () => {
  Auction.setActiveRole('admin');
  const soldBefore = Auction.getLots().filter(l => l.status === 'sold').length;
  const csv = 'name,role,price\n"Dsouza, Neil","Striker, left foot",1200000\nVikram Rao,All-Rounder,\n';

  const res = Auction.importPlayers(csv, { replacePool: true });
  assert.strictEqual(res.added, 2);
  const lots = Auction.getLots();
  assert.strictEqual(lots.filter(l => l.status !== 'sold').length, 2, 'Only the imported players remain unsold');
  assert.strictEqual(lots.filter(l => l.status === 'sold').length, soldBefore, 'Sold players stay with their teams');

  const neil = lots.find(l => l.name === 'Dsouza, Neil');
  assert.strictEqual(neil.sport, 'football');
  assert.strictEqual(neil.category, 'Football • Striker, left foot');
  assert.strictEqual(lots.find(l => l.name === 'Vikram Rao').basePrice, 1000000, 'Blank price uses the ₹10 Lakh default');
  assert.strictEqual(Auction.getActiveLot().name, 'Dsouza, Neil', 'First imported player goes on the hammer');
});

it('27. Failed imports change nothing, and only admins can import', () => {
  Auction.setActiveRole('admin');
  const before = JSON.stringify(Auction.getState());
  assert.throws(() => Auction.importPlayers('Role,Price\nBatsman,10L', { replacePool: true }), /Could not find a "Name" column/);
  assert.throws(() => Auction.importPlayers('Name,Price\n,10L', { replacePool: true }), /No players were imported/);
  assert.strictEqual(JSON.stringify(Auction.getState()), before);

  Auction.setActiveRole('captain', 'team-csk');
  assert.throws(() => Auction.importPlayers('Name\nSneaky Player'), /PERMISSION DENIED/);
});

it('28. Browsers holding the old ₹1 Cr purses are upgraded to ₹50 Cr without losing players or spend', () => {
  const key = 'legends_auction_state_v2';
  const state = JSON.parse(localStorage.getItem(key));
  delete state.purse50CrApplied;
  state.teams[0].totalPurse = 10000000;
  state.teams[0].spentPurse = 2500000;
  state.teams[0].acquiredPlayers = [{ id: 'sold-x', name: 'Kept Player', role: 'Batsman', price: 2500000, time: '1:00 PM' }];
  state.teams[1].totalPurse = 70000000; // admin-customised purse stays as it is
  localStorage.setItem(key, JSON.stringify(state));

  const upgraded = Auction.getTeams();
  assert.strictEqual(upgraded[0].totalPurse, 500000000);
  assert.strictEqual(upgraded[0].spentPurse, 2500000);
  assert.strictEqual(upgraded[0].remainingPurse, 497500000);
  assert.ok(upgraded[0].acquiredPlayers.some(p => p.name === 'Kept Player'));
  assert.strictEqual(upgraded[1].totalPurse, 70000000);
  assert.strictEqual(Auction.getState().purse50CrApplied, true);
});

it('37. Admin empties the player pool; sold players stay with the franchises that bought them', () => {
  Auction.setActiveRole('admin');
  const before = Auction.getLots();
  const soldBefore = before.filter(l => l.status === 'sold');
  const bidableBefore = before.filter(l => l.status !== 'sold');
  assert(bidableBefore.length > 0, 'Pool starts with players up for bidding');

  const res = Auction.clearPlayerPool();
  assert.strictEqual(res.removed, bidableBefore.length);
  assert.strictEqual(res.keptSold, soldBefore.length);

  const after = Auction.getLots();
  assert.strictEqual(after.filter(l => l.status !== 'sold').length, 0, 'Nothing is left to bid on');
  after.forEach(l => assert.strictEqual(l.status, 'sold', 'Only already-sold lots survive'));
  assert.strictEqual(Auction.getActiveLot(), null, 'Hammer is empty');
  assert.throws(() => Auction.hammerSold(), /No player lot found on hammer/);
  assert.throws(() => Auction.placeAdminBid('team-csk'), /No player lot is currently under the hammer/);
});

it('38. Undo Hammer brings every cleared player lot back, in order and on the hammer', () => {
  const res = Auction.undoLastAction();
  assert(/Pool restored/.test(res.message));

  const lots = Auction.getLots();
  const bidable = lots.filter(l => l.status !== 'sold');
  assert.strictEqual(bidable.length, 2, 'Both imported players are back');
  assert.deepStrictEqual(bidable.map(l => l.name), ['Dsouza, Neil', 'Vikram Rao'], 'Original pool order preserved');
  assert.strictEqual(Auction.getActiveLot().status, 'active', 'A lot is back on the hammer');

  // Clearing and restoring repeatedly must not lose or duplicate lots
  const total = lots.length;
  Auction.clearPlayerPool();
  Auction.undoLastAction();
  assert.strictEqual(Auction.getLots().length, total, 'Restore is repeatable');
});

it('39. Only admins can empty the pool, and an already-empty pool is refused', () => {
  Auction.setActiveRole('captain', 'team-csk');
  assert.throws(() => Auction.clearPlayerPool(), /PERMISSION DENIED/);
  Auction.setActiveRole('guest');
  assert.throws(() => Auction.clearPlayerPool(), /PERMISSION DENIED/);

  Auction.setActiveRole('admin');
  Auction.clearPlayerPool();
  assert.throws(() => Auction.clearPlayerPool(), /already empty/);
  Auction.undoLastAction();
});

// ---------------------------------------------------------------
// FOOTBALL AUCTION: same engine loaded the way football pages load it (?sport=football)
// ---------------------------------------------------------------
const cricketStateBefore = localStorage.getItem('legends_auction_state_v2');
delete require.cache[require.resolve('../js/legends-auction.js')];
global.window = { location: { search: '?sport=football', href: 'http://localhost:3001/auction?sport=football', origin: 'http://localhost:3001' } };
require('../js/legends-auction.js');
const Football = global.window.LegendsAuction;

it('29. Football auction loads the 6 League 2.0 football clubs and captains with ₹50 Cr wallets', () => {
  assert.strictEqual(Football.sport, 'football');
  const teams = Football.getTeams();
  assert.deepStrictEqual(teams.map(t => `${t.shortCode}:${t.captain}`), [
    'MUN:Krishna Patil', 'ATM:Vedant Raj', 'MCI:Tanish Tiwari', 'FCB:Abhi Gupta', 'PSG:Utsav Baradwaj', 'RMA:Karnika Gupta'
  ]);
  const psg = Football.getTeam('team-psg');
  assert.strictEqual(psg.name, 'Python Saint-Germain');
  assert.strictEqual(psg.sport, 'football');
  assert.strictEqual(psg.totalPurse, 500000000);
  assert.strictEqual(psg.spentPurse, 0);
});

it('30. Football pool has all 77 registered players, first one on the hammer', () => {
  const lots = Football.getLots();
  assert.strictEqual(lots.length, 77);
  assert.ok(lots.every(l => l.sport === 'football' && ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'].includes(l.specialism)));
  ['Abhishek Rajput', 'Pranshu Sharma', 'Yash Kavar', 'Ayaan Patel'].forEach(name => {
    assert.ok(lots.some(l => l.name === name), `${name} is a cricket captain but a football player`);
  });
  const smriti = lots.find(l => l.name === 'Smriti Patel');
  assert.strictEqual(smriti.category, 'Football • Midfielder');
  assert.strictEqual(smriti.institution, '1st Year • Female');
  assert.strictEqual(smriti.basePrice, 1000000);
  assert.strictEqual(Football.getActiveLot().name, 'Akhila');
});

it('31. Football uses the same bidding rules, and its wallets never touch the cricket auction', () => {
  Football.setActiveRole('admin');
  Football.placeAdminBid('team-psg');
  assert.strictEqual(Football.getActiveLot().currentBid, 2000000, 'Same +10L tier step as cricket');
  const sold = Football.hammerSold();
  assert.strictEqual(sold.team.id, 'team-psg');
  assert.strictEqual(Football.getTeam('team-psg').spentPurse, 2000000);
  assert.ok(Football.getTeamAllMembers('team-psg').some(m => m.name === 'Akhila'));

  assert.ok(localStorage.getItem('legends_football_auction_state_v2'), 'Football has its own saved state');
  assert.strictEqual(localStorage.getItem('legends_auction_state_v2'), cricketStateBefore, 'Cricket state is untouched');
});

it('33. Captains land on their own team in each sport; cricket-only captains are view-only in football', () => {
  const signIn = (teamId, name) => localStorage.setItem('legends_auth_session', JSON.stringify({ role: 'captain', teamId, name: `${name} (Captain)` }));

  signIn('team-psg', 'Utsav Baradwaj');
  assert.strictEqual(Football.getActiveRole().teamId, 'team-psg');

  signIn('team-csk', 'Krishna Patil'); // signed in with the cricket team, captains MUN in football
  assert.strictEqual(Football.getActiveRole().teamId, 'team-mun');

  signIn('team-dc', 'Pranshu Sharma'); // DC cricket captain, only a player in football
  assert.strictEqual(Football.getActiveRole().role, 'guest');
  assert.throws(() => Football.placeBid(1000000), /GUEST ACCESS IS VIEW-ONLY/);
  localStorage.removeItem('legends_auth_session');
});

it('34. Login page can list both sports’ teams', () => {
  assert.strictEqual(Football.getTeamsForSport('cricket').length, 10);
  assert.strictEqual(Football.getTeamsForSport('football').length, 6);
  assert.strictEqual(Football.getTeamsForSport('football')[0].name, 'Metaverse United');
  assert.deepStrictEqual(Football.getTeamsForSport('hockey'), []);
});

it('32. Links between auction pages keep the football sport', () => {
  assert.strictEqual(Football.withSport('mph-screen.html'), 'mph-screen?sport=football');
  assert.strictEqual(Football.withSport('captain-dashboard.html#squad'), 'captain-dashboard?sport=football#squad');
  assert.strictEqual(Football.withSport('login.html?redirect=auction.html'), 'login?redirect=auction%3Fsport%3Dfootball');
  assert.strictEqual(Football.withSport('standings.html'), 'standings.html', 'Non-auction pages are left alone');
});

it('35. Signing a captain in from the other sport keeps their real team (login page runs the cricket engine)', () => {
  Football.setActiveRole('captain', 'team-csk'); // a cricket team, set while the football engine is loaded
  const session = JSON.parse(localStorage.getItem('legends_auth_session'));
  assert.strictEqual(session.teamId, 'team-csk');
  assert.strictEqual(session.name, 'Krishna Patil (Captain)');
  assert.strictEqual(Football.getActiveRole().teamId, 'team-mun', 'Krishna Patil captains MUN in football');
  localStorage.removeItem('legends_auth_session');
});

it('36. Scorer logins are not wiped when the session is synced into the auction engine', () => {
  localStorage.setItem('legends_auth_session', JSON.stringify({ role: 'cricket', email: 'cricket@nmims.edu.in', name: 'Arun Varma' }));
  Football.setActiveRole('cricket');
  assert.ok(localStorage.getItem('legends_auth_session'), 'Session survives');
  assert.strictEqual(Football.getActiveRole().role, 'admin');
  localStorage.removeItem('legends_auth_session');
});

it('40. Football pool empties independently, leaving the cricket auction untouched', () => {
  Football.setActiveRole('admin');
  const cricketLots = Auction.getLots().length;
  const footballLots = Football.getLots().length;
  assert.strictEqual(footballLots, 77);

  const res = Football.clearPlayerPool();
  assert.strictEqual(res.removed, 76);
  assert.strictEqual(res.keptSold, 1, 'Akhila already went to PSG in test 31');
  assert.strictEqual(Football.getLots().filter(l => l.status !== 'sold').length, 0, 'Football has nothing left to bid on');
  assert.strictEqual(Football.getActiveLot(), null);
  assert.strictEqual(Auction.getLots().length, cricketLots, 'Cricket pool is unaffected');

  Football.undoLastAction();
  assert.strictEqual(Football.getLots().length, footballLots, 'Football pool fully restored');
  assert.strictEqual(Football.getActiveLot().status, 'active');
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
