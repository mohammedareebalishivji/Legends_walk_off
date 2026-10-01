/**
 * Legends Walk Off — Tournament Player Auction Engine & Purse Management System
 * STME Impulse Committee • NMIMS Hyderabad 2026
 *
 * Core Features:
 * - Dynamic Bidding Tier:
 *   • Base Price: ₹10.00 Lakh
 *   • 10L till ₹1.00 Crore (< 1,00,00,000 -> +10L)
 *   • 20L till ₹3.00 Crore from 1Cr (1,00,00,000 to 3,00,00,000 -> +20L)
 *   • 25L above ₹3.00 Crore (> 3,00,00,000 -> +25L)
 *   • Custom Bid input for direct figures
 * - Admin-Operated Bidding (Captains raise physical paddles, Admin logs bids)
 * - No Time Limit / Auto-Expiry: Gavel ends only when Admin clicks Sold, Unsold, or Next
 * - Full Undo Support (Undo Last Bid & Undo Hammer Sold/Unsold)
 * - Manual Admin Team & Purse Entry (Add/Edit teams and custom purses)
 * - Excel / CSV Import & Export for squads, wallets, and player pool
 * - Extra Player Details (Batting/bowling style, stats, scouting notes, university representation)
 */

(function () {
  'use strict';

  const STORAGE_KEY_AUCTION = 'legends_auction_state_v1';
  const STORAGE_KEY_ROLE = 'legends_auction_active_role_v1';

  let syncChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncChannel = new BroadcastChannel('legends_auction_sync_channel');
    }
  } catch (e) {}

  // 1. DEFAULT TEAMS & SALARY CAPS (Can be edited or entered fresh by Admin)
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
      totalPurse: 10000000, // ₹1,00,00,000 (1.00 Crore)
      spentPurse: 2850000,  // ₹28.50 L
      remainingPurse: 7150000, // ₹71.50 L
      squadLimit: 15,
      retainedMembers: [
        { name: 'Vikramaditya', role: 'Captain & Top-Order Batsman', type: 'Captain', jersey: 7 },
        { name: 'Rohan Verma', role: 'Wicket-Keeper Batsman', type: 'Retained Squad', jersey: 45 },
        { name: 'Siddharth Nair', role: 'Fast-Bowling All-Rounder', type: 'Retained Squad', jersey: 12 },
        { name: 'Dhruv Rao', role: 'Spin Bowler (Left-Arm)', type: 'Retained Squad', jersey: 24 }
      ],
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
      retainedMembers: [
        { name: 'Pranav K.', role: 'Captain & Middle-Order Batsman', type: 'Captain', jersey: 10 },
        { name: 'Nikhil Kumar', role: 'Pace Bowler (Right-Arm Fast)', type: 'Retained Squad', jersey: 17 }
      ],
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
      retainedMembers: [
        { name: 'Rahul Sen', role: 'Captain & Fast Bowler', type: 'Captain', jersey: 1 },
        { name: 'Manish V.', role: 'Slow Left-Arm All-Rounder', type: 'Retained Squad', jersey: 5 }
      ],
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
      retainedMembers: [
        { name: 'Anish Mathur', role: 'Captain & Top-Order Batsman', type: 'Captain', jersey: 9 }
      ],
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
      retainedMembers: [
        { name: 'Farhan Shaikh', role: 'Captain & Left Winger (LW)', type: 'Captain', jersey: 7 },
        { name: 'Surya Teja', role: 'Goalkeeper (GK)', type: 'Retained Squad', jersey: 1 }
      ],
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
      retainedMembers: [
        { name: 'Zeeshan Ali', role: 'Captain & Centre Forward (ST)', type: 'Captain', jersey: 10 },
        { name: 'Aditya Pillai', role: 'Centre-Back (CB)', type: 'Retained Squad', jersey: 4 },
        { name: 'Rishi Paul', role: 'Central Midfielder (CM)', type: 'Retained Squad', jersey: 8 }
      ],
      acquiredPlayers: [
        { id: 'sold-9', name: 'Kabir Das', role: 'Goalkeeper (GK)', price: 3100000, time: '12:22 PM' }
      ]
    }
  ];

  // 2. DEFAULT PLAYER LOTS WITH RICH EXTRA DETAILS (Base Price: ₹10.00 Lakhs default)
  const INITIAL_LOTS = [
    {
      id: 'lot-101',
      lotNumber: 'LOT #14',
      name: 'Kavish Malhotra',
      nickname: 'The Express Train',
      jersey: 18,
      sport: 'cricket',
      badge: 'MARQUEE PACER',
      category: 'Cricket • Express Fast Bowler',
      specialism: 'Right-arm Fast (144.2 km/h) • Death Over Yorker Specialist',
      battingStyle: 'Right-Handed Lower Order',
      bowlingStyle: 'Right-Arm Express Fast (140-145 km/h)',
      institution: 'IIT Hyderabad (Kandi Campus)',
      state: 'Telangana State U-23 Represent',
      tournamentExp: 'Varsity Premier League 2025, All-India Inter-University',
      scoutingNotes: 'Terrific pace off the deck. Consistently hits 142+ km/h with an unplayable toe-crusher yorker in death overs. Clean fielder at long-on.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      stats: {
        matches: 18,
        wickets: 34,
        economy: '6.12',
        best: '5/18',
        strikeRate: '14.2',
        dotBallPct: '58.4%'
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
      nickname: 'Pocket Dynamo',
      jersey: 7,
      sport: 'cricket',
      badge: 'EXPLOSIVE OPENER & KEEPER',
      category: 'Cricket • Explosive Opener & Wicket-Keeper',
      specialism: 'Left-hand Wicket-keeper Batsman • 360° Powerplay Striker',
      battingStyle: 'Left-Handed Aggressive Opener',
      bowlingStyle: 'Wicket-Keeper (Right-Arm Off-Break part-time)',
      institution: 'Chaitanya Bharathi Institute of Technology (CBIT)',
      state: 'Hyderabad District League Div A',
      tournamentExp: 'HCA League 2024-25, State T20 Championship',
      scoutingNotes: 'Left-handed dasher who destroys pace bowling in first 6 overs. Quick reflexes behind the stumps with 19 dismissals last season.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      stats: {
        matches: 22,
        runs: 840,
        average: '46.6',
        strikeRate: '168.4',
        catches: 19,
        fifties: 6
      },
      basePrice: 1000000, // ₹10.00 L
      currentBid: 1000000,
      highestBidderTeamId: null,
      highestBidderTeamName: 'No Active Bid',
      highestBidderCaptain: '-',
      status: 'upcoming'
    },
    {
      id: 'lot-103',
      lotNumber: 'LOT #16',
      name: 'Tariq Mansoor',
      nickname: 'The Target Man',
      jersey: 9,
      sport: 'football',
      badge: 'GOLDEN BOOT CONTENDER',
      category: 'Football • Centre Forward / Striker',
      specialism: 'Clinical Finisher • Aerial Target Man • Top Speed 33.8 km/h',
      battingStyle: 'Striker / Centre-Forward',
      bowlingStyle: 'Strong Both Feet • High Aerial Dominance',
      institution: 'Osmania University, Hyderabad',
      state: 'South Zone Inter-University Finalist',
      tournamentExp: 'Telangana Football League, Reliance Foundation Youth Championship',
      scoutingNotes: 'Unstoppable in the 18-yard box. 21 goals in 16 appearances. Lethal header conversion on corner kicks.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
      stats: {
        matches: 16,
        goals: 21,
        assists: 8,
        conversionRate: '28.4%',
        minutesPerGoal: '68 min',
        shotsOnTarget: '74%'
      },
      basePrice: 1000000, // ₹10.00 L
      currentBid: 1000000,
      highestBidderTeamId: null,
      highestBidderTeamName: 'No Active Bid',
      highestBidderCaptain: '-',
      status: 'upcoming'
    },
    {
      id: 'lot-104',
      lotNumber: 'LOT #17',
      name: 'Harshith Reddy',
      nickname: 'The Professor',
      jersey: 11,
      sport: 'cricket',
      badge: 'SPIN ALL-ROUNDER',
      category: 'Cricket • Spin All-Rounder',
      specialism: 'Left-arm Orthodox & Middle Order Finisher (Death Over SR 182)',
      battingStyle: 'Right-Handed Finisher',
      bowlingStyle: 'Slow Left-Arm Orthodox (Arm ball & Slider)',
      institution: 'VNR Vignana Jyothi Institute of Engineering (VNR VJIET)',
      state: 'Varsity Premier League MVP 2025',
      tournamentExp: 'Inter-College Cup Gold Medalist, Hyderabad Club League',
      scoutingNotes: 'Complete package. Economic bowling in middle overs (5.88 rpo) combined with power hitting in final 4 overs.',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80',
      stats: {
        matches: 15,
        wickets: 22,
        runs: 310,
        economy: '5.88',
        average: '38.7',
        strikeRate: '154.2'
      },
      basePrice: 1000000, // ₹10.00 L
      currentBid: 1000000,
      highestBidderTeamId: null,
      highestBidderTeamName: 'No Active Bid',
      highestBidderCaptain: '-',
      status: 'upcoming'
    },
    {
      id: 'lot-105',
      lotNumber: 'LOT #18',
      name: 'Amanpreet Singh',
      nickname: 'Maestro #10',
      jersey: 10,
      sport: 'football',
      badge: 'PLAYMAKER #10',
      category: 'Football • Central Midfield Playmaker',
      specialism: 'Deep-lying Playmaker • Set-Piece Maestro • 91.2% Pass Accuracy',
      battingStyle: 'Central Midfielder / Attacking Midfield',
      bowlingStyle: 'Right-Footed Curler • Free-Kick Specialist',
      institution: 'BITS Pilani Hyderabad Campus',
      state: 'All-India Inter-Engineering Tournament Best Midfielder',
      tournamentExp: 'BITS Arena Champion 2025, All-India Invitational Trophy',
      scoutingNotes: 'Incredible vision and passing range. Controls the tempo of the game. Scored 4 direct free kicks last season.',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80',
      stats: {
        matches: 19,
        assists: 17,
        keyPasses: 44,
        tacklesWon: '78%',
        interceptions: 36,
        goals: 6
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
    { time: '11:42:10 AM', team: 'CBIT Thunder', captain: 'Pranav K.', amount: 1000000, type: 'bid' },
    { time: '11:42:25 AM', team: 'NMIMS STME Strikers', captain: 'Vikramaditya', amount: 1500000, type: 'bid' },
    { time: '11:42:48 AM', team: 'BITS Hyderabad Titans', captain: 'Anish Mathur', amount: 2000000, type: 'bid' },
    { time: '11:43:15 AM', team: 'NMIMS STME Strikers', captain: 'Vikramaditya', amount: 2800000, type: 'bid' }
  ];

  // 4. AUCTION ENGINE CORE
  window.LegendsAuction = {
    // -------------------------------------------------------------
    // CURRENCY & FORMATTING
    // -------------------------------------------------------------
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

    formatShort: function (num) {
      const n = Number(num);
      if (n >= 10000000) return (n / 10000000).toFixed(1) + ' Cr';
      if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
      return (n / 1000).toFixed(0) + 'k';
    },

    // -------------------------------------------------------------
    // DYNAMIC BIDDING INCREMENT RULES (USER REQUIREMENT)
    // • 10L till 1 Crore (< 1,00,00,000 -> +10L)
    // • 20L till 3 Crore from 1 Crore (1,00,00,000 to 3,00,00,000 -> +20L)
    // • 25L above 3 Crore (> 3,00,00,000 -> +25L)
    // -------------------------------------------------------------
    getDynamicIncrement: function (currentBid) {
      const b = Number(currentBid) || 0;
      if (b < 10000000) {
        // Less than 1 Crore: step is 10 Lakhs
        return 1000000;
      } else if (b < 30000000) {
        // 1 Crore to 3 Crore: step is 20 Lakhs
        return 2000000;
      } else {
        // Above 3 Crore: step is 25 Lakhs
        return 2500000;
      }
    },

    getDynamicIncrementLabel: function (currentBid) {
      const inc = this.getDynamicIncrement(currentBid);
      return this.formatCurrency(inc);
    },

    // -------------------------------------------------------------
    // STATE PERSISTENCE & INITIALIZATION
    // -------------------------------------------------------------
    getState: function () {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_AUCTION);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.teams) && Array.isArray(parsed.lots)) {
            // Ensure undo stacks exist
            if (!Array.isArray(parsed.bidHistory)) parsed.bidHistory = [];
            if (!Array.isArray(parsed.actionHistory)) parsed.actionHistory = [];
            if (typeof parsed.elapsedSeconds !== 'number') parsed.elapsedSeconds = 0;
            return parsed;
          }
        }
      } catch (e) {
        console.error('Error reading auction state from localStorage', e);
      }

      const baseline = {
        teams: JSON.parse(JSON.stringify(INITIAL_TEAMS)),
        lots: JSON.parse(JSON.stringify(INITIAL_LOTS)),
        activeLotId: 'lot-101',
        bidLog: JSON.parse(JSON.stringify(INITIAL_BID_LOG)),
        timerSeconds: 0,
        elapsedSeconds: 45,
        isTimerRunning: true,
        lastSold: null,
        bidHistory: [
          { amount: 1000000, teamId: 'team-cbit-cricket', teamName: 'CBIT Thunder' },
          { amount: 1500000, teamId: 'team-nmims-cricket', teamName: 'NMIMS STME Strikers' },
          { amount: 2000000, teamId: 'team-bits-cricket', teamName: 'BITS Hyderabad Titans' },
          { amount: 2800000, teamId: 'team-nmims-cricket', teamName: 'NMIMS STME Strikers' }
        ],
        actionHistory: [],
        adminOnlyBidding: true,
        recentAnnouncements: [
          'Hammer active for LOT #14: Kavish Malhotra (Base: ₹10.0L)',
          'High bid: ₹28.00 Lakhs by NMIMS STME Strikers (Vikramaditya)'
        ]
      };
      this.saveState(baseline);
      return baseline;
    },

    saveState: function (state) {
      try {
        localStorage.setItem(STORAGE_KEY_AUCTION, JSON.stringify(state));
        if (syncChannel) {
          syncChannel.postMessage({ type: 'AUCTION_STATE_UPDATED', timestamp: Date.now() });
        }
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('legends_auction_updated', { detail: state }));
        }
      } catch (e) {
        console.error('Error saving auction state', e);
      }
    },

    resetToDefaults: function () {
      localStorage.removeItem(STORAGE_KEY_AUCTION);
      return this.getState();
    },

    // -------------------------------------------------------------
    // ROLES & AUTH
    // -------------------------------------------------------------
    getActiveRole: function () {
      try {
        const customRole = localStorage.getItem(STORAGE_KEY_ROLE);
        if (customRole) {
          return JSON.parse(customRole);
        }
      } catch (e) {}

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

      return {
        role: 'guest',
        title: 'Guest / Spectator (View-Only)',
        teamId: null
      };
    },

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

    // -------------------------------------------------------------
    // LOT ACCESSORS
    // -------------------------------------------------------------
    getActiveLot: function () {
      const state = this.getState();
      return state.lots.find(l => l.id === state.activeLotId) || state.lots[0];
    },

    getLots: function () {
      return this.getState().lots;
    },

    // -------------------------------------------------------------
    // TEAM & PURSE MANAGEMENT (ADMIN CAN MANUALLY ENTER OR EDIT)
    // -------------------------------------------------------------
    getTeam: function (teamId) {
      const state = this.getState();
      return state.teams.find(t => t.id === teamId) || null;
    },

    getTeamAllMembers: function (teamId) {
      const team = this.getTeam(teamId);
      if (!team) return [];
      const list = [];
      if (team.retainedMembers && Array.isArray(team.retainedMembers)) {
        team.retainedMembers.forEach(m => list.push({
          id: 'ret-' + m.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: m.name,
          role: m.role,
          type: m.type || 'Retained Squad',
          jersey: m.jersey || null,
          price: 0,
          isRetained: true
        }));
      }
      if (team.acquiredPlayers && Array.isArray(team.acquiredPlayers)) {
        team.acquiredPlayers.forEach(p => list.push({
          id: p.id,
          name: p.name,
          role: p.role,
          type: 'Auction Drafted',
          jersey: null,
          price: p.price,
          time: p.time,
          isRetained: false
        }));
      }
      return list;
    },

    getOpponents: function (myTeamId) {
      const teams = this.getTeams();
      const myTeam = teams.find(t => t.id === myTeamId);
      return teams
        .filter(t => t.id !== myTeamId)
        .map(t => {
          const allMembers = this.getTeamAllMembers(t.id);
          return {
            ...t,
            membersCount: allMembers.length,
            allMembers: allMembers,
            purseDifference: myTeam ? (myTeam.remainingPurse - t.remainingPurse) : 0
          };
        });
    },

    getTeams: function () {
      const state = this.getState();
      return state.teams.map(t => {
        const remaining = Math.max(0, t.totalPurse - t.spentPurse);
        const pctRemaining = Math.max(0, Math.min(100, (remaining / t.totalPurse) * 100));
        const allMembers = this.getTeamAllMembers(t.id);
        return {
          ...t,
          remainingPurse: remaining,
          pctRemaining: pctRemaining.toFixed(1),
          allMembers: allMembers,
          squadCount: allMembers.length
        };
      });
    },

    // Admin adds a brand new team manually
    createTeam: function (teamData) {
      if (!teamData.name || !teamData.name.trim()) {
        throw new Error('Team Name is required.');
      }
      const state = this.getState();
      const id = 'team-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const totalPurse = Number(teamData.totalPurse) || 10000000; // default 1 Cr
      const newTeam = {
        id: id,
        name: teamData.name.trim(),
        shortCode: (teamData.shortCode || teamData.name.substring(0, 4)).trim().toUpperCase(),
        institution: teamData.institution || 'Collegiate Arena',
        sport: teamData.sport || 'cricket',
        captain: teamData.captain || 'Team Captain',
        captainId: 'cap-' + id,
        color: teamData.color || '#82a2e1',
        totalPurse: totalPurse,
        spentPurse: 0,
        remainingPurse: totalPurse,
        squadLimit: Number(teamData.squadLimit) || 15,
        retainedMembers: Array.isArray(teamData.retainedMembers) ? teamData.retainedMembers : [
          { name: teamData.captain || 'Team Captain', role: 'Captain', type: 'Captain', jersey: 1 }
        ],
        acquiredPlayers: []
      };

      state.teams.push(newTeam);
      this.saveState(state);
      return newTeam;
    },

    // Admin updates an existing team (name, captain, purse, etc.)
    updateTeam: function (teamId, updates) {
      const state = this.getState();
      const team = state.teams.find(t => t.id === teamId);
      if (!team) throw new Error('Team not found for update.');

      if (updates.name) team.name = updates.name.trim();
      if (updates.shortCode) team.shortCode = updates.shortCode.trim().toUpperCase();
      if (updates.captain) team.captain = updates.captain.trim();
      if (updates.color) team.color = updates.color;
      if (updates.sport) team.sport = updates.sport;
      if (updates.institution) team.institution = updates.institution;
      if (updates.squadLimit) team.squadLimit = Number(updates.squadLimit);
      if (updates.totalPurse !== undefined) {
        team.totalPurse = Number(updates.totalPurse);
        team.remainingPurse = Math.max(0, team.totalPurse - team.spentPurse);
      }

      this.saveState(state);
      return team;
    },

    // Admin deletes a team
    deleteTeam: function (teamId) {
      const state = this.getState();
      const idx = state.teams.findIndex(t => t.id === teamId);
      if (idx === -1) return false;
      state.teams.splice(idx, 1);
      this.saveState(state);
      return true;
    },

    // Admin clears all teams so they can be entered fresh
    clearTeams: function () {
      const state = this.getState();
      state.teams = [];
      this.saveState(state);
      return true;
    },

    // -------------------------------------------------------------
    // REALTIME SUBSCRIPTION
    // -------------------------------------------------------------
    subscribe: function (callback) {
      if (typeof window === 'undefined' || typeof callback !== 'function') return () => {};

      const handleStorage = (ev) => {
        if (ev.key === STORAGE_KEY_AUCTION) {
          callback(this.getState());
        }
      };

      const handleCustom = (ev) => {
        callback(ev.detail || this.getState());
      };

      const handleBroadcast = () => {
        callback(this.getState());
      };

      window.addEventListener('storage', handleStorage);
      window.addEventListener('legends_auction_updated', handleCustom);
      if (syncChannel) {
        syncChannel.addEventListener('message', handleBroadcast);
      }

      return function unsubscribe() {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('legends_auction_updated', handleCustom);
        if (syncChannel) {
          syncChannel.removeEventListener('message', handleBroadcast);
        }
      };
    },

    // -------------------------------------------------------------
    // BIDDING ENGINE: ADMIN BID & GENERIC BID
    // -------------------------------------------------------------
    // Admin directly places a bid on behalf of any team
    // targetTeamId: ID of team raising paddle
    // amountOrIncrement: number (e.g. 1000000 for +10L, or custom exact amount)
    // isExactAmount: boolean (if true, sets lot.currentBid directly to amountOrIncrement)
    placeAdminBid: function (targetTeamId, amountOrIncrement, isExactAmount) {
      const state = this.getState();
      const lot = state.lots.find(l => l.id === state.activeLotId);
      if (!lot) throw new Error('No player lot is currently under the hammer.');
      if (lot.status !== 'active') throw new Error(`Lot is currently ${lot.status}. Bidding closed.`);

      const team = state.teams.find(t => t.id === targetTeamId);
      if (!team) throw new Error('Selected franchise team was not found.');

      let nextBidAmount;
      if (isExactAmount) {
        nextBidAmount = Number(amountOrIncrement);
        if (nextBidAmount <= lot.currentBid && lot.highestBidderTeamId) {
          throw new Error(`Custom bid must be strictly higher than current bid (${this.formatCurrency(lot.currentBid)}).`);
        }
      } else {
        const inc = Number(amountOrIncrement) || this.getDynamicIncrement(lot.currentBid);
        nextBidAmount = Number(lot.currentBid) + inc;
      }

      // Check remaining purse
      const remainingPurse = team.totalPurse - team.spentPurse;
      if (nextBidAmount > remainingPurse) {
        throw new Error(`INSUFFICIENT TEAM PURSE: ${team.name} has only ${this.formatCurrency(remainingPurse)} remaining.`);
      }

      // Check self outbid
      if (lot.highestBidderTeamId === team.id) {
        throw new Error(`${team.name} is already the current highest bidder at ${this.formatCurrency(lot.currentBid)}!`);
      }

      // Save previous state to bidHistory for UNDO
      if (!Array.isArray(state.bidHistory)) state.bidHistory = [];
      state.bidHistory.push({
        amount: lot.currentBid,
        teamId: lot.highestBidderTeamId,
        teamName: lot.highestBidderTeamName,
        captain: lot.highestBidderCaptain
      });

      // Update lot
      lot.currentBid = nextBidAmount;
      lot.highestBidderTeamId = team.id;
      lot.highestBidderTeamName = team.name;
      lot.highestBidderCaptain = team.captain;

      // Add to log
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      state.bidLog.unshift({
        time: timeStr,
        team: team.name,
        shortCode: team.shortCode,
        captain: team.captain,
        amount: nextBidAmount,
        type: 'bid'
      });

      if (state.bidLog.length > 50) state.bidLog = state.bidLog.slice(0, 50);

      this.saveState(state);
      return {
        success: true,
        newBid: nextBidAmount,
        team: team,
        lot: lot
      };
    },

    // Standard placeBid (used by test suites & backwards compatibility)
    placeBid: function (increment) {
      const role = this.getActiveRole();

      if (role.role === 'guest') {
        throw new Error('GUEST ACCESS IS VIEW-ONLY: Only registered team captains or authorized officials can place auction bids.');
      }

      const state = this.getState();
      const lot = state.lots.find(l => l.id === state.activeLotId);
      if (!lot) throw new Error('No player lot is currently under the hammer.');
      if (lot.status !== 'active') throw new Error(`This player lot is currently ${lot.status.toUpperCase()}. Bidding is closed.`);

      let biddingTeamId = role.teamId;
      if (role.role === 'admin' && !biddingTeamId) {
        const otherTeam = state.teams.find(t => t.id !== lot.highestBidderTeamId) || state.teams[0];
        biddingTeamId = otherTeam ? otherTeam.id : null;
      }

      if (!biddingTeamId) {
        throw new Error('Valid registered franchise team not found for bidding.');
      }

      const team = state.teams.find(t => t.id === biddingTeamId);
      if (!team) throw new Error('Valid registered franchise team not found for bidding.');

      const inc = Number(increment) || this.getDynamicIncrement(lot.currentBid);
      const nextBidAmount = Number(lot.currentBid) + inc;

      const remainingPurse = team.totalPurse - team.spentPurse;
      if (nextBidAmount > remainingPurse) {
        throw new Error(`INSUFFICIENT TEAM PURSE: ${team.name} has only ${this.formatCurrency(remainingPurse)} remaining. Cannot bid ${this.formatCurrency(nextBidAmount)}.`);
      }

      if (lot.highestBidderTeamId === team.id) {
        throw new Error(`${team.name} is already the current highest bidder at ${this.formatCurrency(lot.currentBid)}!`);
      }

      // Record to bid history for UNDO
      if (!Array.isArray(state.bidHistory)) state.bidHistory = [];
      state.bidHistory.push({
        amount: lot.currentBid,
        teamId: lot.highestBidderTeamId,
        teamName: lot.highestBidderTeamName,
        captain: lot.highestBidderCaptain
      });

      lot.currentBid = nextBidAmount;
      lot.highestBidderTeamId = team.id;
      lot.highestBidderTeamName = team.name;
      lot.highestBidderCaptain = team.captain;

      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      state.bidLog.unshift({
        time: timeStr,
        team: team.name,
        shortCode: team.shortCode,
        captain: team.captain,
        amount: nextBidAmount,
        type: 'bid'
      });

      if (state.bidLog.length > 50) state.bidLog = state.bidLog.slice(0, 50);

      this.saveState(state);
      return {
        success: true,
        newBid: nextBidAmount,
        team: team,
        lot: lot
      };
    },

    // -------------------------------------------------------------
    // UNDO ENGINE: UNDO LAST BID & UNDO HAMMER (USER REQUIREMENT)
    // -------------------------------------------------------------
    undoLastBid: function () {
      const role = this.getActiveRole();
      if (role.role !== 'admin') {
        throw new Error('PERMISSION DENIED: Only Admin can undo a bid.');
      }

      const state = this.getState();
      const lot = state.lots.find(l => l.id === state.activeLotId);
      if (!lot) throw new Error('No active lot found.');

      if (!Array.isArray(state.bidHistory) || state.bidHistory.length === 0) {
        // Reset to base price
        lot.currentBid = lot.basePrice;
        lot.highestBidderTeamId = null;
        lot.highestBidderTeamName = 'No Active Bid';
        lot.highestBidderCaptain = '-';
        this.saveState(state);
        return { success: true, message: 'Reset to base price.', currentBid: lot.basePrice };
      }

      const prev = state.bidHistory.pop();
      lot.currentBid = prev.amount;
      lot.highestBidderTeamId = prev.teamId || null;
      lot.highestBidderTeamName = prev.teamName || 'No Active Bid';
      lot.highestBidderCaptain = prev.captain || '-';

      // Remove last bid from log if it matches
      if (state.bidLog && state.bidLog.length > 0 && state.bidLog[0].type === 'bid') {
        state.bidLog.shift();
      }

      this.saveState(state);
      return {
        success: true,
        revertedBid: lot.currentBid,
        revertedTeam: lot.highestBidderTeamName
      };
    },

    // -------------------------------------------------------------
    // HAMMER CONTROLS: SOLD, UNSOLD, NEXT & PREV LOTS
    // -------------------------------------------------------------
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

      // 1. Deduct purse
      team.spentPurse += lot.currentBid;
      team.remainingPurse = Math.max(0, team.totalPurse - team.spentPurse);

      // 2. Add player to squad
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      team.acquiredPlayers.push({
        id: lot.id,
        name: lot.name,
        role: lot.category,
        price: lot.currentBid,
        time: timeStr
      });

      // 3. Mark sold
      lot.status = 'sold';
      state.lastSold = {
        player: lot.name,
        team: team.name,
        shortCode: team.shortCode,
        price: lot.currentBid,
        category: lot.category
      };

      // 4. Save to action history for hammer undo
      if (!Array.isArray(state.actionHistory)) state.actionHistory = [];
      state.actionHistory.push({
        action: 'sold',
        lotId: lot.id,
        teamId: team.id,
        price: lot.currentBid
      });

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

      if (!Array.isArray(state.actionHistory)) state.actionHistory = [];
      state.actionHistory.push({
        action: 'unsold',
        lotId: lot.id
      });

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

    // Undo last hammer action (reverts Sold or Unsold)
    undoLastAction: function () {
      const role = this.getActiveRole();
      if (role.role !== 'admin') throw new Error('PERMISSION DENIED: Admin only.');

      const state = this.getState();
      if (!Array.isArray(state.actionHistory) || state.actionHistory.length === 0) {
        throw new Error('No previous hammer action to undo.');
      }

      const last = state.actionHistory.pop();
      const lot = state.lots.find(l => l.id === last.lotId);
      if (!lot) throw new Error('Associated lot not found.');

      if (last.action === 'sold') {
        const team = state.teams.find(t => t.id === last.teamId);
        if (team) {
          team.spentPurse = Math.max(0, team.spentPurse - last.price);
          team.remainingPurse = Math.max(0, team.totalPurse - team.spentPurse);
          team.acquiredPlayers = team.acquiredPlayers.filter(p => p.id !== last.lotId);
        }
        lot.status = 'active';
        state.activeLotId = lot.id;
      } else if (last.action === 'unsold') {
        lot.status = 'active';
        state.activeLotId = lot.id;
      }

      this.saveState(state);
      return { success: true, message: `Reverted ${last.action.toUpperCase()} for ${lot.name}` };
    },

    // Next Lot Navigation (Requested: "Next click karne pe next aane chaiye")
    nextLot: function () {
      const state = this.getState();
      const currIdx = state.lots.findIndex(l => l.id === state.activeLotId);
      let nextLot = null;

      // Find next lot in list
      if (currIdx >= 0 && currIdx + 1 < state.lots.length) {
        nextLot = state.lots[currIdx + 1];
      } else {
        // Circle back to first non-sold lot
        nextLot = state.lots.find(l => l.status !== 'sold') || state.lots[0];
      }

      if (nextLot) {
        state.activeLotId = nextLot.id;
        if (nextLot.status !== 'sold') {
          nextLot.status = 'active';
        }
        state.elapsedSeconds = 0;
        state.bidHistory = [];
        this.saveState(state);
        return { success: true, lot: nextLot };
      }
      return { success: false, message: 'No more lots available.' };
    },

    // Previous Lot Navigation
    prevLot: function () {
      const state = this.getState();
      const currIdx = state.lots.findIndex(l => l.id === state.activeLotId);
      if (currIdx > 0) {
        const prev = state.lots[currIdx - 1];
        state.activeLotId = prev.id;
        state.elapsedSeconds = 0;
        state.bidHistory = [];
        this.saveState(state);
        return { success: true, lot: prev };
      }
      return { success: false, message: 'Already at the first lot.' };
    },

    // Nominate specific lot
    nominateLot: function (lotId) {
      const role = this.getActiveRole();
      if (role.role !== 'admin') {
        throw new Error('PERMISSION DENIED: Only the official Committee Auctioneer / Admin can nominate player lots.');
      }

      const state = this.getState();
      const lot = state.lots.find(l => l.id === lotId);
      if (!lot) throw new Error('Player lot ID not found in pool.');

      state.activeLotId = lot.id;
      lot.status = 'active';
      state.elapsedSeconds = 0;
      state.bidHistory = [];

      this.saveState(state);
      return {
        success: true,
        lot: lot
      };
    },

    // Admin Action: Add custom player to auction pool with rich extra details
    addPlayerLot: function (playerData) {
      const role = this.getActiveRole();
      if (role.role !== 'admin') {
        throw new Error('PERMISSION DENIED: Only the official Committee Auctioneer / Admin can add new players to the auction pool.');
      }

      if (!playerData.name) throw new Error('Player name is required.');
      const state = this.getState();
      const newLotId = 'lot-' + Date.now();
      const nextLotNum = 'LOT #' + (state.lots.length + 14);

      // Default base price: ₹10.00 Lakhs (1000000)
      const basePrice = Number(playerData.basePrice) || 1000000;
      const newLot = {
        id: newLotId,
        lotNumber: nextLotNum,
        name: playerData.name.trim(),
        nickname: playerData.nickname || playerData.name.split(' ')[0],
        jersey: playerData.jersey || (state.lots.length + 1),
        sport: playerData.sport || 'cricket',
        badge: playerData.badge || 'AUCTION SQUAD DRAFT',
        category: playerData.category || 'Cricket • Squad Player',
        specialism: playerData.specialism || 'Varsity Player',
        battingStyle: playerData.battingStyle || 'Right-Handed',
        bowlingStyle: playerData.bowlingStyle || 'Right-Arm Medium',
        institution: playerData.institution || 'NMIMS Hyderabad STME',
        state: playerData.state || 'Telangana Collegiate Circuit',
        tournamentExp: playerData.tournamentExp || 'College Premier League',
        scoutingNotes: playerData.scoutingNotes || 'Impressive performance in collegiate trials.',
        avatar: playerData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=600&q=80',
        stats: playerData.stats || { matches: 10, runs: 180, wickets: 8, strikeRate: '135.0' },
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
    },

    // -------------------------------------------------------------
    // EXCEL / CSV IMPORT & EXPORT (USER REQUIREMENT)
    // -------------------------------------------------------------
    // Generate clean CSV report ready for Excel / Google Sheets
    exportToExcelCSV: function () {
      const state = this.getState();
      const lines = [];

      // 1. HEADER
      lines.push('"LEGENDS WALK OFF 2026 - OFFICIAL AUCTION MASTER REPORT"');
      lines.push(`"Generated On:","${new Date().toLocaleString()}"`);
      lines.push('');

      // 2. FRANCHISE WALLETS & PURSES TABLE
      lines.push('"SECTION 1: FRANCHISE WALLETS & SALARY CAPS"');
      lines.push('"Team Name","Short Code","Captain","Sport","Total Purse (₹)","Spent Purse (₹)","Remaining Purse (₹)","Purse Spent %","Squad Count"');
      state.teams.forEach(t => {
        const remaining = Math.max(0, t.totalPurse - t.spentPurse);
        const pct = ((t.spentPurse / t.totalPurse) * 100).toFixed(1);
        const members = this.getTeamAllMembers(t.id);
        lines.push(`"${t.name}","${t.shortCode}","${t.captain}","${t.sport}","${t.totalPurse}","${t.spentPurse}","${remaining}","${pct}%","${members.length}"`);
      });
      lines.push('');

      // 3. FULL SQUADS ROSTER
      lines.push('"SECTION 2: COMPLETE TEAM SQUADS & ACQUISITIONS"');
      lines.push('"Franchise","Player Name","Type","Role","Jersey","Acquisition Price (₹)","Price In Lakhs"');
      state.teams.forEach(t => {
        const members = this.getTeamAllMembers(t.id);
        members.forEach(m => {
          const priceLakhs = m.price ? (m.price / 100000).toFixed(2) + 'L' : 'Retained';
          lines.push(`"${t.name}","${m.name}","${m.type}","${m.role}","${m.jersey || '-'}","${m.price || 0}","${priceLakhs}"`);
        });
      });
      lines.push('');

      // 4. AUCTION LOTS MASTER STATUS
      lines.push('"SECTION 3: AUCTION PLAYER POOL & OUTCOMES"');
      lines.push('"Lot Number","Player Name","Sport","Category","Institution","Base Price (₹)","Final Bid (₹)","Status","Winning Franchise"');
      state.lots.forEach(l => {
        lines.push(`"${l.lotNumber}","${l.name}","${l.sport}","${l.category}","${l.institution}","${l.basePrice}","${l.currentBid}","${l.status.toUpperCase()}","${l.highestBidderTeamName || 'None'}"`);
      });

      return lines.join('\n');
    },

    // Trigger browser download of CSV file
    downloadExcelCSV: function (filename) {
      if (typeof window === 'undefined') return;
      const csv = this.exportToExcelCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `legends_auction_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // Import players from CSV text
    importPlayersFromCSV: function (csvContent) {
      if (!csvContent || typeof csvContent !== 'string') {
        throw new Error('Invalid CSV file content.');
      }
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) throw new Error('CSV must contain header and at least one data row.');

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      const addedLots = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (row.length === 0 || !row[0]) continue;

        // Try mapping common column names
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const sportIdx = headers.findIndex(h => h.includes('sport'));
        const catIdx = headers.findIndex(h => h.includes('category') || h.includes('role'));
        const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('base'));
        const instIdx = headers.findIndex(h => h.includes('institution') || h.includes('college'));

        const name = nameIdx >= 0 ? row[nameIdx] : row[0];
        if (!name) continue;

        const lotData = {
          name: name,
          sport: sportIdx >= 0 ? row[sportIdx] : 'cricket',
          category: catIdx >= 0 ? row[catIdx] : 'Cricket • Player',
          basePrice: priceIdx >= 0 ? Number(row[priceIdx]) : 1000000,
          institution: instIdx >= 0 ? row[instIdx] : 'NMIMS Hyderabad'
        };

        const created = this.addPlayerLot(lotData);
        addedLots.push(created);
      }

      return addedLots;
    }
  };

  // Auto-initialize state on script load
  window.LegendsAuction.getState();
})();
