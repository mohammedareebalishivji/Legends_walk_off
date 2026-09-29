/**
 * Legends Walk Off — Tournament Player Auction Engine & Purse Management System
 * STME Impulse Committee • NMIMS Hyderabad 2026
 *
 * RBAC Rules:
 * - GUEST / PUBLIC: View-only access to live hammer, upcoming lots, sold feeds,
 *   and remaining team purse balances. Bidding and auctioneer controls are strictly locked.
 * - TEAM CAPTAIN: Can place competitive bids for their franchise within remaining purse limit.
 * - ADMIN / AUCTIONEER: Unrestricted gavel control to nominate players, run the hammer,
 *   declare SOLD / UNSOLD, adjust base prices, and manage team salary caps.
 */

(function () {
  'use strict';

  const STORAGE_KEY_AUCTION = 'legends_auction_state_v1';
  const STORAGE_KEY_ROLE = 'legends_auction_active_role_v1';

  // 1. DEFAULT TEAMS & SALARY CAPS (Total Purse: ₹1.00 Crore / 100 Lakhs per team)
  const INITIAL_TEAMS = [
    {
      id: 'team-nmims-cricket',
      name: 'NMIMS STME Strikers',
      shortCode: 'STME',
      institution: 'School of Technology Management & Engineering, NMIMS Hyderabad',
      sport: 'cricket',
      captain: 'Vikramaditya',
      captainId: 'cap-stme',
      color: '#82a2e1',
      totalPurse: 10000000, // ₹1,00,00,000 (100 Lakhs)
      spentPurse: 2850000,  // ₹28.50 L
      remainingPurse: 7150000, // ₹71.50 L
      squadLimit: 15,
      acquiredPlayers: [
        { id: 'sold-1', name: 'Arjun Sharma', role: 'Opening Batsman', price: 1850000, time: '10:14 AM' },
        { id: 'sold-2', name: 'K. Reddy', role: 'Pace Bowler', price: 1000000, time: '10:32 AM' }
      ]
    },
    {
      id: 'team-cbit-cricket',
      name: 'CBIT Thunder',
      shortCode: 'CBIT',
      institution: 'Chaitanya Bharathi Institute of Technology, Gandipet',
      sport: 'cricket',
      captain: 'Pranav K.',
      captainId: 'cap-cbit',
      color: '#a87559',
      totalPurse: 10000000,
      spentPurse: 3400000, // ₹34.00 L
      remainingPurse: 6600000, // ₹66.00 L
      squadLimit: 15,
      acquiredPlayers: [
        { id: 'sold-3', name: 'Abhishek Roy', role: 'All-Rounder', price: 2200000, time: '10:45 AM' },
        { id: 'sold-4', name: 'Varun Teja', role: 'Opening Batsman', price: 1200000, time: '11:02 AM' }
      ]
    },
    {
      id: 'team-vnr-cricket',
      name: 'VNR VJIET Warriors',
      shortCode: 'VNR',
      institution: 'VNR Vignana Jyothi Institute, Bachupally',
      sport: 'cricket',
      captain: 'Rahul Sen',
      captainId: 'cap-vnr',
      color: '#d1b3a1',
      totalPurse: 10000000,
      spentPurse: 1900000, // ₹19.00 L
      remainingPurse: 8100000, // ₹81.00 L
      squadLimit: 15,
      acquiredPlayers: [
        { id: 'sold-5', name: 'Karthik Rao', role: 'Top-order Batsman', price: 1900000, time: '11:20 AM' }
      ]
    },
    {
      id: 'team-bits-cricket',
      name: 'BITS Hyderabad Titans',
      shortCode: 'BITS',
      institution: 'BITS Pilani Hyderabad Campus, Shamirpet',
      sport: 'cricket',
      captain: 'Anish Mathur',
      captainId: 'cap-bits',
      color: '#24438c',
      totalPurse: 10000000,
      spentPurse: 4200000, // ₹42.00 L
      remainingPurse: 5800000, // ₹58.00 L
      squadLimit: 15,
      acquiredPlayers: [
        { id: 'sold-6', name: 'Sameer Jha', role: 'Wicket-keeper Batsman', price: 2600000, time: '11:35 AM' },
        { id: 'sold-7', name: 'Tanmay Saxena', role: 'Pace Bowler', price: 1600000, time: '11:48 AM' }
      ]
    },
    {
      id: 'team-nmims-football',
      name: 'NMIMS Impulse FC',
      shortCode: 'STME-FC',
      institution: 'NMIMS Hyderabad STME',
      sport: 'football',
      captain: 'Farhan Shaikh',
      captainId: 'cap-stme-fc',
      color: '#82a2e1',
      totalPurse: 10000000,
      spentPurse: 2500000,
      remainingPurse: 7500000,
      squadLimit: 18,
      acquiredPlayers: [
        { id: 'sold-8', name: 'Neil Mukherjee', role: 'Right Winger (RW)', price: 2500000, time: '12:05 PM' }
      ]
    },
    {
      id: 'team-bits-football',
      name: 'BITS Hyderabad Rovers',
      shortCode: 'BITS-FC',
      institution: 'BITS Pilani Hyderabad Campus',
      sport: 'football',
      captain: 'Zeeshan Ali',
      captainId: 'cap-bits-fc',
      color: '#24438c',
      totalPurse: 10000000,
      spentPurse: 3100000,
      remainingPurse: 6900000,
      squadLimit: 18,
      acquiredPlayers: [
        { id: 'sold-9', name: 'Kabir Das', role: 'Goalkeeper (GK)', price: 3100000, time: '12:22 PM' }
      ]
    }
  ];

  // 2. DEFAULT PLAYER LOTS IN THE AUCTION POOL
  const INITIAL_LOTS = [
    {
      id: 'lot-101',
      lotNumber: 'LOT #14',
      name: 'Kavish Malhotra',
      sport: 'cricket',
      badge: 'MARQUEE PACER',
      category: 'Cricket • Express Fast Bowler',
      specialism: 'Right-arm Fast (144.2 km/h) • Death Over Yorker Specialist',
      institution: 'IIT Hyderabad (Kandi Campus)',
      state: 'Telangana State U-23 Represent',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      stats: {
        matches: 18,
        wickets: 34,
        economy: '6.12',
        best: '5/18',
        strikeRate: '14.2'
      },
      basePrice: 1000000, // ₹10.00 L
      currentBid: 2800000, // ₹28.00 L
      highestBidderTeamId: 'team-nmims-cricket',
      highestBidderTeamName: 'NMIMS STME Strikers',
      highestBidderCaptain: 'Vikramaditya',
      status: 'active'
    },
    {
      id: 'lot-102',
      lotNumber: 'LOT #15',
      name: 'Devansh Singhal',
      sport: 'cricket',
      badge: 'TOP ORDER WICKET-KEEPER',
      category: 'Cricket • Explosive Opener & Keeper',
      specialism: 'Left-hand Wicket-keeper Batsman • Powerplay Hitter',
      institution: 'Chaitanya Bharathi Institute of Technology (CBIT)',
      state: 'Hyderabad District League Div A',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      stats: {
        matches: 22,
        runs: 840,
        average: '46.6',
        strikeRate: '168.4',
        catches: 19
      },
      basePrice: 1500000, // ₹15.00 L
      currentBid: 1500000,
      highestBidderTeamId: null,
      highestBidderTeamName: 'No Active Bid',
      highestBidderCaptain: '-',
      status: 'upcoming'
    },
    {
      id: 'lot-103',
      lotNumber: 'LOT #16',
      name: 'Tariq Mansoor',
      sport: 'football',
      badge: 'GOLDEN BOOT CONTENDER',
      category: 'Football • Centre Forward / Striker',
      specialism: 'Clinical Finisher • Aerial Target Man • Top Speed 33.8 km/h',
      institution: 'Osmania University, Hyderabad',
      state: 'South Zone Inter-University Finalist',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      stats: {
        matches: 16,
        goals: 21,
        assists: 8,
        conversionRate: '28.4%',
        minutesPerGoal: '68 min'
      },
      basePrice: 1200000, // ₹12.00 L
      currentBid: 1200000,
      highestBidderTeamId: null,
      highestBidderTeamName: 'No Active Bid',
      highestBidderCaptain: '-',
      status: 'upcoming'
    },
    {
      id: 'lot-104',
      lotNumber: 'LOT #17',
      name: 'Harshith Reddy',
      sport: 'cricket',
      badge: 'SPIN ALL-ROUNDER',
      category: 'Cricket • Spin All-Rounder',
      specialism: 'Left-arm Orthodox & Middle Order Finisher (Death Over SR 182)',
      institution: 'VNR Vignana Jyothi Institute of Engineering (VNR VJIET)',
      state: 'Varsity Premier League MVP 2025',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
      stats: {
        matches: 15,
        wickets: 22,
        runs: 310,
        economy: '5.88',
        average: '38.7'
      },
      basePrice: 800000, // ₹8.00 L
      currentBid: 800000,
      highestBidderTeamId: null,
      highestBidderTeamName: 'No Active Bid',
      highestBidderCaptain: '-',
      status: 'upcoming'
    },
    {
      id: 'lot-105',
      lotNumber: 'LOT #18',
      name: 'Amanpreet Singh',
      sport: 'football',
      badge: 'PLAYMAKER #10',
      category: 'Football • Central Midfield Playmaker',
      specialism: 'Deep-lying Playmaker • Set-Piece Maestro • 91.2% Pass Accuracy',
      institution: 'BITS Pilani Hyderabad Campus',
      state: 'All-India Inter-Engineering Tournament Best Midfielder',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
      stats: {
        matches: 19,
        assists: 17,
        keyPasses: 44,
        tacklesWon: '78%',
        interceptions: 36
      },
      basePrice: 1000000, // ₹10.00 L
      currentBid: 1000000,
      highestBidderTeamId: null,
      highestBidderTeamName: 'No Active Bid',
      highestBidderCaptain: '-',
      status: 'upcoming'
    }
  ];

  // 3. INITIAL BID LOG
  const INITIAL_BID_LOG = [
    { time: '11:42:10 AM', team: 'CBIT Thunder', captain: 'Pranav K.', amount: 2000000, type: 'bid' },
    { time: '11:42:25 AM', team: 'NMIMS STME Strikers', captain: 'Vikramaditya', amount: 2200000, type: 'bid' },
    { time: '11:42:48 AM', team: 'BITS Hyderabad Titans', captain: 'Anish Mathur', amount: 2500000, type: 'bid' },
    { time: '11:43:15 AM', team: 'NMIMS STME Strikers', captain: 'Vikramaditya', amount: 2800000, type: 'bid' }
  ];

  // 4. AUCTION ENGINE CORE
  window.LegendsAuction = {
    // Currency formatter (e.g. ₹28.50 Lakhs or ₹1.00 Crore)
    formatCurrency: function (num) {
      if (num === null || num === undefined) return '₹0';
      const n = Number(num);
      if (n >= 10000000) {
        return '₹' + (n / 10000000).toFixed(2) + ' Cr';
      } else if (n >= 100000) {
        return '₹' + (n / 100000).toFixed(2) + ' Lakh';
      }
      return '₹' + n.toLocaleString('en-IN');
    },

    // Format raw rupees to abbreviated badge string
    formatShort: function (num) {
      const n = Number(num);
      if (n >= 10000000) return (n / 10000000).toFixed(1) + ' Cr';
      if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
      return (n / 1000).toFixed(0) + 'k';
    },

    // Retrieve full auction state from localStorage or load baseline
    getState: function () {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_AUCTION);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Error reading auction state from localStorage', e);
      }
      const baseline = {
        teams: JSON.parse(JSON.stringify(INITIAL_TEAMS)),
        lots: JSON.parse(JSON.stringify(INITIAL_LOTS)),
        activeLotId: 'lot-101',
        bidLog: JSON.parse(JSON.stringify(INITIAL_BID_LOG)),
        timerSeconds: 20,
        isTimerRunning: false,
        lastSold: null,
        recentAnnouncements: [
          'Hammer active for LOT #14: Kavish Malhotra (Base: ₹10.0L)',
          'High bid: ₹28.00 Lakhs by NMIMS STME Strikers (Vikramaditya)'
        ]
      };
      this.saveState(baseline);
      return baseline;
    },

    // Persist auction state to localStorage
    saveState: function (state) {
      try {
        localStorage.setItem(STORAGE_KEY_AUCTION, JSON.stringify(state));
      } catch (e) {
        console.error('Error saving auction state', e);
      }
    },

    // Reset entire auction system to fresh defaults
    resetToDefaults: function () {
      localStorage.removeItem(STORAGE_KEY_AUCTION);
      return this.getState();
    },

    // Retrieve active role
    // Return: { role: 'guest' | 'admin' | 'captain', teamId: string | null }
    getActiveRole: function () {
      // Check dedicated auction role selector first
      try {
        const customRole = localStorage.getItem(STORAGE_KEY_ROLE);
        if (customRole) {
          return JSON.parse(customRole);
        }
      } catch (e) {}

      // Fallback: check RBAC official login session
      try {
        const rbacSession = localStorage.getItem('legends_auth_session');
        if (rbacSession) {
          const auth = JSON.parse(rbacSession);
          if (auth && (auth.role === 'committee' || auth.role === 'cricket' || auth.role === 'football' || auth.role === 'referees')) {
            return {
              role: 'admin',
              title: auth.name || 'Official Auctioneer Admin',
              teamId: null
            };
          }
        }
      } catch (e) {}

      // Default role: GUEST (Read-only)
      return {
        role: 'guest',
        title: 'Guest / Spectator (View-Only)',
        teamId: null
      };
    },

    // Set active role for interactive session testing
    setActiveRole: function (roleType, teamId) {
      let roleObj = { role: 'guest', title: 'Guest / Spectator (View-Only)', teamId: null };
      const state = this.getState();

      if (roleType === 'admin') {
        roleObj = {
          role: 'admin',
          title: 'Official Auctioneer & Committee Admin',
          teamId: null
        };
      } else if (roleType === 'captain') {
        const team = state.teams.find(t => t.id === teamId) || state.teams[0];
        roleObj = {
          role: 'captain',
          title: `${team.captain} (Captain • ${team.shortCode})`,
          teamId: team.id,
          teamName: team.name,
          captainName: team.captain
        };
      }

      localStorage.setItem(STORAGE_KEY_ROLE, JSON.stringify(roleObj));
      return roleObj;
    },

    // Get current active lot
    getActiveLot: function () {
      const state = this.getState();
      return state.lots.find(l => l.id === state.activeLotId) || state.lots[0];
    },

    // Get team by ID
    getTeam: function (teamId) {
      const state = this.getState();
      return state.teams.find(t => t.id === teamId) || null;
    },

    // Get all registered teams with current purse statuses
    getTeams: function () {
      const state = this.getState();
      return state.teams.map(t => {
        const remaining = Math.max(0, t.totalPurse - t.spentPurse);
        const pctRemaining = Math.max(0, Math.min(100, (remaining / t.totalPurse) * 100));
        return {
          ...t,
          remainingPurse: remaining,
          pctRemaining: pctRemaining.toFixed(1)
        };
      });
    },

    // Place a bid on the active lot
    // increment: number in rupees (e.g. 50000, 100000, 200000, 500000)
    placeBid: function (increment) {
      const role = this.getActiveRole();

      // Rule 1: Guests cannot bid
      if (role.role === 'guest') {
        throw new Error('GUEST ACCESS IS VIEW-ONLY: Only registered team captains or authorized officials can place auction bids.');
      }

      const state = this.getState();
      const lot = state.lots.find(l => l.id === state.activeLotId);
      if (!lot) {
        throw new Error('No player lot is currently under the hammer.');
      }

      if (lot.status !== 'active') {
        throw new Error(`This player lot is currently ${lot.status.toUpperCase()}. Bidding is closed.`);
      }

      let biddingTeamId = role.teamId;
      if (role.role === 'admin' && !biddingTeamId) {
        // If admin is placing bid on behalf of a team, default to first non-highest bidder
        const otherTeam = state.teams.find(t => t.id !== lot.highestBidderTeamId) || state.teams[0];
        biddingTeamId = otherTeam.id;
      }

      const team = state.teams.find(t => t.id === biddingTeamId);
      if (!team) {
        throw new Error('Valid registered franchise team not found for bidding.');
      }

      const inc = Number(increment) || 100000;
      const nextBidAmount = Number(lot.currentBid) + inc;

      // Rule 2: Captain cannot exceed remaining team purse
      const remainingPurse = team.totalPurse - team.spentPurse;
      if (nextBidAmount > remainingPurse) {
        throw new Error(`INSUFFICIENT TEAM PURSE: ${team.name} has only ${this.formatCurrency(remainingPurse)} remaining. Cannot bid ${this.formatCurrency(nextBidAmount)}.`);
      }

      // Rule 3: Cannot outbid oneself consecutively
      if (lot.highestBidderTeamId === team.id) {
        throw new Error(`${team.name} is already the current highest bidder at ${this.formatCurrency(lot.currentBid)}!`);
      }

      // Execute bid
      lot.currentBid = nextBidAmount;
      lot.highestBidderTeamId = team.id;
      lot.highestBidderTeamName = team.name;
      lot.highestBidderCaptain = team.captain;

      // Add to bid log
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      state.bidLog.unshift({
        time: timeStr,
        team: team.name,
        shortCode: team.shortCode,
        captain: team.captain,
        amount: nextBidAmount,
        type: 'bid'
      });

      // Keep log bounded
      if (state.bidLog.length > 50) {
        state.bidLog = state.bidLog.slice(0, 50);
      }

      // Reset hammer countdown to 20 seconds for fair bidding window
      state.timerSeconds = 20;

      this.saveState(state);
      return {
        success: true,
        newBid: nextBidAmount,
        team: team,
        lot: lot
      };
    },

    // Admin Action: Declare active player SOLD to highest bidder
    hammerSold: function () {
      const role = this.getActiveRole();
      if (role.role !== 'admin') {
        throw new Error('PERMISSION DENIED: Only the official Committee Auctioneer / Admin can strike the hammer.');
      }

      const state = this.getState();
      const lot = state.lots.find(l => l.id === state.activeLotId);
      if (!lot) throw new Error('No player lot found on hammer.');
      if (lot.status !== 'active') throw new Error(`Lot is already marked as ${lot.status}.`);

      if (!lot.highestBidderTeamId) {
        throw new Error('Cannot mark SOLD without at least one valid franchise bid. Use "Unsold" instead.');
      }

      const team = state.teams.find(t => t.id === lot.highestBidderTeamId);
      if (!team) throw new Error('Winning franchise not found.');

      // 1. Deduct purse from winning team
      team.spentPurse += lot.currentBid;
      team.remainingPurse = Math.max(0, team.totalPurse - team.spentPurse);

      // 2. Add player to team roster
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      team.acquiredPlayers.push({
        id: lot.id,
        name: lot.name,
        role: lot.category,
        price: lot.currentBid,
        time: timeStr
      });

      // 3. Mark lot SOLD
      lot.status = 'sold';
      state.lastSold = {
        player: lot.name,
        team: team.name,
        shortCode: team.shortCode,
        price: lot.currentBid,
        category: lot.category
      };

      // 4. Log event
      state.bidLog.unshift({
        time: timeStr,
        team: team.name,
        shortCode: team.shortCode,
        captain: team.captain,
        amount: lot.currentBid,
        type: 'sold',
        player: lot.name
      });

      this.saveState(state);
      return {
        success: true,
        lot: lot,
        team: team,
        price: lot.currentBid
      };
    },

    // Admin Action: Declare active player UNSOLD
    hammerUnsold: function () {
      const role = this.getActiveRole();
      if (role.role !== 'admin') {
        throw new Error('PERMISSION DENIED: Only the official Committee Auctioneer / Admin can strike the hammer.');
      }

      const state = this.getState();
      const lot = state.lots.find(l => l.id === state.activeLotId);
      if (!lot) throw new Error('No player lot found on hammer.');

      lot.status = 'unsold';
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      state.bidLog.unshift({
        time: timeStr,
        team: 'Auction Block',
        shortCode: 'HAMMER',
        captain: 'Auctioneer',
        amount: lot.basePrice,
        type: 'unsold',
        player: lot.name
      });

      this.saveState(state);
      return {
        success: true,
        lot: lot
      };
    },

    // Admin Action: Nominate a new lot to the active hammer
    nominateLot: function (lotId) {
      const role = this.getActiveRole();
      if (role.role !== 'admin') {
        throw new Error('PERMISSION DENIED: Only the official Committee Auctioneer / Admin can nominate player lots.');
      }

      const state = this.getState();
      const lot = state.lots.find(l => l.id === lotId);
      if (!lot) throw new Error('Player lot ID not found in pool.');

      // Set previous active to pending or keep its status
      state.activeLotId = lot.id;
      lot.status = 'active';
      state.timerSeconds = 20;

      this.saveState(state);
      return {
        success: true,
        lot: lot
      };
    },

    // Admin Action: Add custom player to auction pool
    addPlayerLot: function (playerData) {
      const role = this.getActiveRole();
      if (role.role !== 'admin') {
        throw new Error('PERMISSION DENIED: Only the official Committee Auctioneer / Admin can add new players to the auction pool.');
      }

      if (!playerData.name) throw new Error('Player name is required.');
      const state = this.getState();
      const newLotId = 'lot-' + Date.now();
      const nextLotNum = 'LOT #' + (state.lots.length + 14);

      const basePrice = Number(playerData.basePrice) || 500000;
      const newLot = {
        id: newLotId,
        lotNumber: nextLotNum,
        name: playerData.name.trim(),
        sport: playerData.sport || 'cricket',
        badge: playerData.badge || 'VAR SQUAD DRAFT',
        category: playerData.category || 'Cricket • Squad Player',
        specialism: playerData.specialism || 'Varsity Player',
        institution: playerData.institution || 'NMIMS Hyderabad STME',
        state: playerData.state || 'Collegiate Arena League',
        avatar: playerData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
        stats: playerData.stats || { matches: 10, runs: 180, wickets: 8 },
        basePrice: basePrice,
        currentBid: basePrice,
        highestBidderTeamId: null,
        highestBidderTeamName: 'No Active Bid',
        highestBidderCaptain: '-',
        status: 'upcoming'
      };

      state.lots.push(newLot);
      this.saveState(state);
      return newLot;
    }
  };

  // Auto-initialize state on script load
  window.LegendsAuction.getState();
})();
