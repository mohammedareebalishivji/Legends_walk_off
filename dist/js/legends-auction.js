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

  // Which auction this page runs: cricket (default) or football (?sport=football).
  // Each sport keeps its own teams' wallets, squads, player pool and bids.
  const SPORT = (function () {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('sport');
      return (fromUrl || window.LEGENDS_AUCTION_SPORT || '').toLowerCase() === 'football' ? 'football' : 'cricket';
    } catch (e) {
      return 'cricket';
    }
  })();

  // Bumping a sport's key gives every browser that sport's new teams (cricket v2: League 2.0 franchises,
  // football v2: League 2.0 football clubs)
  const STORAGE_KEYS = { cricket: 'legends_auction_state_v2', football: 'legends_football_auction_state_v2' };
  const STORAGE_KEY_AUCTION = STORAGE_KEYS[SPORT];
  const STORAGE_KEY_ROLE = 'legends_auction_active_role_v1';

  let syncChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncChannel = new BroadcastChannel(SPORT === 'football' ? 'legends_football_auction_sync_channel' : 'legends_auction_sync_channel');
    }
  } catch (e) {}

  // 1. DEFAULT TEAMS & SALARY CAPS — Legends Walk Off League 2.0
  // Cricket and football have their own teams, wallets and squads.
  // (Admin can still edit, delete, or clear these from "Setup Teams & Purses")
  const DEFAULT_TEAM_PURSE = 500000000; // ₹50,00,00,000 (50.00 Crore) per team
  const PREVIOUS_DEFAULT_PURSE = 10000000; // ₹1.00 Crore — upgraded to 50 Cr on load (see getState)

  function leagueTeam(key, shortCode, name, captain, color, sport) {
    return {
      id: 'team-' + key,
      name: name,
      shortCode: shortCode,
      institution: 'Legends Walk Off League 2.0',
      sport: sport,
      captain: captain,
      captainId: 'cap-' + key,
      color: color,
      totalPurse: DEFAULT_TEAM_PURSE,
      spentPurse: 0,
      remainingPurse: DEFAULT_TEAM_PURSE,
      squadLimit: 15,
      retainedMembers: [
        { name: captain, role: 'Captain', type: 'Captain', jersey: 1 }
      ],
      acquiredPlayers: []
    };
  }

  const CRICKET_TEAMS = [
    leagueTeam('csk', 'CSK', 'Claude Super Kings', 'Krishna Patil', '#facc15', 'cricket'),
    leagueTeam('gt', 'GT', 'GitHub Titans', 'Anoushka Sarkar', '#d4a373', 'cricket'),
    leagueTeam('rcb', 'RCB', 'Royal Challengers Blockchain', 'Abhishek Rajput', '#ef4444', 'cricket'),
    leagueTeam('srh', 'SRH', 'Sunrisers Hotspot', 'Tanish Tiwari', '#fb923c', 'cricket'),
    leagueTeam('lsg', 'LSG', 'Linux Super Giants', 'Abhi Gupta', '#2dd4bf', 'cricket'),
    leagueTeam('dc', 'DC', 'Docker Capitals', 'Pranshu Sharma', '#3b82f6', 'cricket'),
    leagueTeam('pbks', 'PBKS', 'Power BI Kings', 'Yash Kavar', '#cbd5e1', 'cricket'),
    leagueTeam('rr', 'RR', 'React Royals', 'Vedanth Raj', '#f472b6', 'cricket'),
    leagueTeam('kkr', 'KKR', 'Kotlin Knight Riders', 'Ayaan Patel', '#a78bfa', 'cricket'),
    leagueTeam('mi', 'MI', 'Meta Indians', 'Yash Somwanshi', '#38bdf8', 'cricket'),
  ];

  const FOOTBALL_TEAMS = [
    leagueTeam('mun', 'MUN', 'Metaverse United', 'Krishna Patil', '#ef4444', 'football'),
    leagueTeam('atm', 'ATM', 'Atlético de Matlab', 'Vedant Raj', '#f472b6', 'football'),
    leagueTeam('mci', 'MCI', 'Manus City', 'Tanish Tiwari', '#7dd3fc', 'football'),
    leagueTeam('fcb', 'FCB', 'FC Backend', 'Abhi Gupta', '#a78bfa', 'football'),
    leagueTeam('psg', 'PSG', 'Python Saint-Germain', 'Utsav Baradwaj', '#3b82f6', 'football'),
    leagueTeam('rma', 'RMA', 'Real Mistral', 'Karnika Gupta', '#e2e8f0', 'football'),
  ];

  const DEFAULT_TEAMS = { cricket: CRICKET_TEAMS, football: FOOTBALL_TEAMS };
  const INITIAL_TEAMS = DEFAULT_TEAMS[SPORT];


  // 2c. CRICKET PLAYER POOL — League 2.0 registrations: [name, gender, year, role]
  const CRICKET_PLAYERS = [
    ["Tusshhar", 'Male', '3rd Year', 'Batsman'],
    ["Akhila", 'Female', '3rd Year', 'Bowler'],
    ["Anant", 'Male', '1st Year', 'Batsman'],
    ["Rishit Srivastava", 'Male', '2nd Year', 'Batsman'],
    ["Sri Vardhan", 'Male', '1st Year', 'Bowler'],
    ["Ujjwal Singh", 'Male', '2nd Year', 'Batsman'],
    ["Aditya Gupta", 'Male', '2nd Year', 'Bowler'],
    ["Prayag Garg", 'Male', '1st Year', 'Batsman'],
    ["Karnika Gupta", 'Female', '3rd Year', 'Batsman'],
    ["Harshitha", 'Female', '3rd Year', 'Batsman'],
    ["Jaami Haider", 'Male', '3rd Year', 'Batsman'],
    ["Zaid Ahmad", 'Male', '3rd Year', 'Bowler'],
    ["Ojas", 'Male', '3rd Year', 'Bowler'],
    ["Ayushman Padhy", 'Male', '3rd Year', 'Batsman'],
    ["Sachin", 'Male', '2nd Year', 'Batsman'],
    ["Harshit Rishabh", 'Male', '1st Year', 'Batsman'],
    ["Swapnil Patil", 'Male', '2nd Year', 'Batsman'],
    ["Manyaa", 'Female', '2nd Year', 'Batsman'],
    ["Kriday Mishra", 'Male', '2nd Year', 'Bowler'],
    ["Kavya Agrawal", 'Female', '1st Year', 'Bowler'],
    ["Arman Khan", 'Male', '1st Year', 'Batsman'],
    ["Almas Mandlik", 'Male', '2nd Year', 'Batsman'],
    ["Aditya Peddinty", 'Male', '2nd Year', 'Batsman'],
    ["Karthikeya Avasarala", 'Male', '2nd Year', 'Bowler'],
    ["Anubrat", 'Male', '2nd Year', 'Batsman'],
    ["Aman", 'Male', '3rd Year', 'Batsman'],
    ["Rishika Dhakate", 'Female', '2nd Year', 'Bowler'],
    ["Aditya Sinha", 'Male', '2nd Year', 'Batsman'],
    ["Harshavardhan Adelly", 'Male', '1st Year', 'Bowler'],
    ["Adarsh Mishra", 'Male', '1st Year', 'Batsman'],
    ["Ujjwal Anand", 'Male', '1st Year', 'Batsman'],
    ["Divyaraj", 'Male', '1st Year', 'Bowler'],
    ["Purushottam Jha", 'Male', '2nd Year', 'Batsman'],
    ["Karthik Suhaas", 'Male', '2nd Year', 'Batsman'],
    ["Akanksha Patil", 'Female', '3rd Year', 'Batsman'],
    ["Ananya Kolluru", 'Female', '3rd Year', 'Batsman'],
    ["Shreyansh Chatterjee", 'Male', '1st Year', 'Batsman'],
    ["Paridhi Talreja", 'Female', '3rd Year', 'Bowler'],
    ["Sahiti", 'Female', '2nd Year', 'Batsman'],
    ["Ampolu Utsav Baradwaj", 'Male', '2nd Year', 'Bowler'],
    ["Suhani Srivastava", 'Female', '2nd Year', 'Batsman'],
    ["Tanishq Prajapati", 'Male', '3rd Year', 'Bowler'],
    ["Tejas Srivastava", 'Male', '2nd Year', 'Batsman'],
    ["Soham Pawar", 'Male', '2nd Year', 'Batsman'],
    ["Harshit Singh", 'Male', '1st Year', 'Batsman'],
    ["Anaaya Akhlaque", 'Female', '3rd Year', 'Batsman'],
    ["Ranveersingh", 'Male', '1st Year', 'Bowler'],
    ["Kevindeep Singh Pannu", 'Male', '3rd Year', 'Bowler'],
    ["Rishab Sarda", 'Male', '3rd Year', 'Batsman'],
    ["Shalini Singare", 'Female', '2nd Year', 'Bowler'],
    ["Gurmehar Singh", 'Male', '1st Year', 'Bowler'],
    ["Jayesh Gupta", 'Male', '1st Year', 'Batsman'],
    ["Shanmukesh", 'Male', '1st Year', 'Bowler'],
    ["Saamarth Dev", 'Male', '1st Year', 'Batsman'],
    ["Riddhima Garg", 'Female', '2nd Year', 'Batsman'],
    ["THAKUR ANIRUDH SINGH", 'Male', '1st Year', 'Batsman'],
    ["V Sanjay Sai", 'Male', '2nd Year', 'Bowler'],
    ["Tirth", 'Male', '1st Year', 'Batsman'],
    ["Krishn Kumar Poddar", 'Male', '1st Year', 'Batsman'],
    ["Pinnamaraju Kaushik Varma", 'Male', '2nd Year', 'Bowler'],
    ["Manali Shailendra Patankar", 'Female', '1st Year', 'Bowler'],
    ["Lakshya Sharma", 'Male', '1st Year', 'Batsman'],
    ["Vishist Agrahari", 'Male', '2nd Year', 'Batsman'],
    ["Sukanya", 'Female', '2nd Year', 'Batsman'],
    ["Smriti Patel", 'Female', '1st Year', 'Batsman'],
    ["Shourya Singh", 'Male', '1st Year', 'Batsman'],
    ["Harshith Kadiveti", 'Male', '1st Year', 'Bowler'],
    ["Karan Singh Choudhary", 'Male', '1st Year', 'Bowler'],
    ["Amar Nath Ojha", 'Male', '1st Year', 'Batsman'],
    ["Daler", 'Male', '1st Year', 'Batsman'],
    ["Harshith Reddy P", 'Male', '1st Year', 'Batsman'],
    ["Yug Kant Singh", 'Male', '1st Year', 'Bowler'],
    ["Yutika Agarwal", 'Female', '1st Year', 'Batsman'],
    ["Tanmay", 'Male', '2nd Year', 'Batsman'],
    ["Aadi Srivastava", 'Male', '2nd Year', 'Bowler'],
    ["Syed Daniyal", 'Male', '2nd Year', 'Batsman'],
    ["Ryan Manvar", 'Male', '3rd Year', 'Bowler'],
    ["Vraddhi", 'Female', '2nd Year', 'Bowler'],
    ["Aryan Singh", 'Male', '2nd Year', 'Batsman'],
    ["Ashwin Shukla", 'Male', '2nd Year', 'Bowler'],
    ["Sanidhya Pandey", 'Male', '2nd Year', 'Batsman'],
    ["Sruthi Patro", 'Female', '3rd Year', 'Batsman'],
    ["Krishna", 'Male', '1st Year', 'Batsman'],
    ["Omkar Khandeparkar", 'Male', '3rd Year', 'Bowler'],
    ["Atharv Mahajan", 'Male', '1st Year', 'Batsman'],
    ["Drishti Shankar", 'Female', '2nd Year', 'Bowler'],
    ["Tejas Srivastav", 'Male', '1st Year', 'Batsman'],
    ["Shanmukhi Balakuntla", 'Female', '2nd Year', 'Bowler'],
    ["Harshith Reddy", 'Male', '2nd Year', 'Batsman'],
    ["Samya", 'Female', '2nd Year', 'Batsman'],
    ["Anju Jaslin", 'Female', '2nd Year', 'Bowler'],
    ["Aryan Kumar", 'Male', '2nd Year', 'Batsman'],
    ["Akhil Goud", 'Male', '3rd Year', 'Batsman'],
    ["Aarush Chaudhary", 'Male', '3rd Year', 'Batsman'],
    ["Sulakshana Sonavane", 'Female', '3rd Year', 'Batsman'],
    ["Nandini Devnani", 'Female', '3rd Year', 'Batsman'],
    ["Madhur Waghmare", 'Male', '3rd Year', 'Bowler'],
  ];

  // 2b. FOOTBALL PLAYER POOL — League 2.0 registrations: [name, gender, year, position]
  const FOOTBALL_PLAYERS = [
    ["Akhila", 'Female', '3rd Year', 'Midfielder'],
    ["Anant", 'Male', '1st Year', 'Goalkeeper'],
    ["Tejas Srivastava", 'Male', '2nd Year', 'Midfielder'],
    ["Ayush Yadav", 'Male', '2nd Year', 'Midfielder'],
    ["Ayushman Datta", 'Male', '1st Year', 'Forward'],
    ["Jaami Haider", 'Male', '3rd Year', 'Midfielder'],
    ["Rishit Srivastava", 'Male', '2nd Year', 'Midfielder'],
    ["Ayushman Padhy", 'Male', '3rd Year', 'Forward'],
    ["Swapnil Patil", 'Male', '2nd Year', 'Forward'],
    ["Kriday Mishra", 'Male', '2nd Year', 'Defender'],
    ["Tanishi Shukla", 'Female', '3rd Year', 'Midfielder'],
    ["Arman Khan", 'Male', '1st Year', 'Defender'],
    ["Almas Mandlik", 'Male', '2nd Year', 'Defender'],
    ["Riddhima Garg", 'Female', '2nd Year', 'Forward'],
    ["Kavya Agrawal", 'Female', '1st Year', 'Midfielder'],
    ["Aadi Srivastava", 'Male', '2nd Year', 'Midfielder'],
    ["Adarsh Mishra", 'Male', '1st Year', 'Midfielder'],
    ["Shalini", 'Female', '2nd Year', 'Defender'],
    ["Pinnamaraju Kaushik Varma", 'Male', '2nd Year', 'Midfielder'],
    ["Abhishek Rajput", 'Male', '2nd Year', 'Defender'],
    ["Purushottam Jha", 'Male', '2nd Year', 'Midfielder'],
    ["Harshitha", 'Female', '3rd Year', 'Goalkeeper'],
    ["Harshith Kadiveti", 'Male', '1st Year', 'Forward'],
    ["Soham Pawar", 'Male', '2nd Year', 'Defender'],
    ["Kevindeep Singh Pannu", 'Male', '3rd Year', 'Goalkeeper'],
    ["Zaid Ahmad", 'Male', '3rd Year', 'Defender'],
    ["Aditya Peddinty", 'Male', '2nd Year', 'Defender'],
    ["Aadit Animesh", 'Male', '1st Year', 'Midfielder'],
    ["Gurmehar Singh", 'Male', '1st Year', 'Defender'],
    ["Thakur Anirudh Singh", 'Male', '1st Year', 'Defender'],
    ["Smriti Patel", 'Female', '1st Year', 'Midfielder'],
    ["Bhavya Sharma", 'Female', '2nd Year', 'Defender'],
    ["Kunal Yadav", 'Male', '1st Year', 'Defender'],
    ["Shreyansh Chatterjee", 'Male', '1st Year', 'Defender'],
    ["Amar Nath Ojha", 'Male', '1st Year', 'Forward'],
    ["Sachin", 'Male', '2nd Year', 'Forward'],
    ["Daler", 'Male', '1st Year', 'Forward'],
    ["Ujjwal Singh", 'Male', '2nd Year', 'Defender'],
    ["T.Sri Vardhan", 'Male', '1st Year', 'Midfielder'],
    ["Harshith Reddy P", 'Male', '1st Year', 'Defender'],
    ["Harshavardhan Adelly", 'Male', '1st Year', 'Midfielder'],
    ["Tusshhar", 'Male', '3rd Year', 'Defender'],
    ["Tanmay Anand", 'Male', '2nd Year', 'Defender'],
    ["Divyaraj", 'Male', '1st Year', 'Midfielder'],
    ["Karan Singh Choudhary", 'Male', '1st Year', 'Midfielder'],
    ["Prayag Garg", 'Male', '1st Year', 'Midfielder'],
    ["Ujjwal Anand", 'Male', '1st Year', 'Midfielder'],
    ["Yug Kant Singh", 'Male', '1st Year', 'Defender'],
    ["Aditya Gupta", 'Male', '2nd Year', 'Goalkeeper'],
    ["Yutika Agarwal", 'Female', '1st Year', 'Midfielder'],
    ["Ranveer", 'Male', '1st Year', 'Forward'],
    ["Aman", 'Male', '3rd Year', 'Midfielder'],
    ["Pranshu Sharma", 'Male', '2nd Year', 'Defender'],
    ["Navneet Roy", 'Male', '1st Year', 'Forward'],
    ["Syed Daniyal", 'Male', '2nd Year', 'Forward'],
    ["Harshit Singh", 'Male', '1st Year', 'Midfielder'],
    ["Aryan Singh", 'Male', '2nd Year', 'Goalkeeper'],
    ["Ashwin Shukla", 'Male', '2nd Year', 'Defender'],
    ["Sruthi Patro", 'Female', '3rd Year', 'Defender'],
    ["Anumeet Prakash", 'Male', '2nd Year', 'Defender'],
    ["Manyaa", 'Female', '2nd Year', 'Forward'],
    ["Shanmukesh", 'Male', '1st Year', 'Defender'],
    ["Suhani Srivastava", 'Female', '2nd Year', 'Defender'],
    ["Krishna", 'Male', '1st Year', 'Defender'],
    ["Aryan Kumar", 'Male', '2nd Year', 'Midfielder'],
    ["Ryan", 'Male', '3rd Year', 'Midfielder'],
    ["Rishit Paitandy", 'Male', '1st Year', 'Defender'],
    ["Rajveer", 'Male', '1st Year', 'Goalkeeper'],
    ["Ekansh Bansal", 'Male', '2nd Year', 'Goalkeeper'],
    ["Karthikeya Avasarala", 'Male', '2nd Year', 'Midfielder'],
    ["Pranjal Pathak", 'Male', '2nd Year', 'Midfielder'],
    ["Yash Kavar", 'Male', '3rd Year', 'Forward'],
    ["Aarav Shah", 'Male', '2nd Year', 'Defender'],
    ["Sourya Singh", 'Male', '1st Year', 'Midfielder'],
    ["Krishn Kumar Poddar", 'Male', '1st Year', 'Forward'],
    ["Sulakshana Sonavane", 'Female', '3rd Year', 'Defender'],
    ["Ayaan Patel", 'Male', '2nd Year', 'Forward']
  ];

  function cricketLot(player, index) {
    const [name, gender, year, role] = player;
    return {
      id: 'lot-' + String(index + 201),
      lotNumber: 'LOT #' + (index + 1),
      name: name,
      nickname: name.split(' ')[0],
      jersey: null,
      sport: 'cricket',
      badge: role,
      category: 'Cricket \u2022 ' + role,
      specialism: role,
      gender: gender,
      year: year,
      battingStyle: role === 'Batsman' ? 'Right-Handed Batter' : 'Right-Handed Tail-End Batter',
      bowlingStyle: role === 'Bowler' ? 'Right-Arm Fast-Medium' : 'Right-Arm Part-Time Off-Break',
      institution: year + ' \u2022 ' + gender,
      state: '',
      tournamentExp: '',
      scoutingNotes: '',
      avatar: initialsAvatar(name),
      stats: {},
      basePrice: 1000000, // ₹10.00 Lakh
      currentBid: 1000000,
      highestBidderTeamId: null,
      highestBidderTeamName: 'No Active Bid',
      highestBidderCaptain: '-',
      status: index === 0 ? 'active' : 'upcoming'
    };
  }

  function footballLot(player, index) {
    const [name, gender, year, position] = player;
    return {
      id: 'fb-' + String(index + 1).padStart(3, '0'),
      lotNumber: 'LOT #' + (index + 1),
      name: name,
      nickname: name.split(' ')[0],
      jersey: null,
      sport: 'football',
      badge: position,
      category: 'Football • ' + position,
      specialism: position,
      gender: gender,
      year: year,
      battingStyle: '',
      bowlingStyle: '',
      institution: year + ' • ' + gender,
      state: '',
      tournamentExp: '',
      scoutingNotes: '',
      avatar: initialsAvatar(name),
      stats: {},
      basePrice: 1000000, // ₹10.00 Lakh, same as cricket
      currentBid: 1000000,
      highestBidderTeamId: null,
      highestBidderTeamName: 'No Active Bid',
      highestBidderCaptain: '-',
      status: index === 0 ? 'active' : 'upcoming'
    };
  }

  // Starting player pool for this page's sport
  const SEED_LOTS = SPORT === 'football'
    ? FOOTBALL_PLAYERS.map(footballLot)
    : CRICKET_PLAYERS.map(cricketLot);

  // Seed lots are the official League 2.0 registrations — the import modal uses this
  // to pre-tick \'replace\' only while the pool holds nothing beyond official entries.
  const SEED_LOT_IDS = SEED_LOTS.map(l => l.id);

  // 3. INITIAL BID LOG
  const INITIAL_BID_LOG = [];

  // 4. PLAYER POOL HELPERS (manual add + mass import)
  const DEFAULT_BASE_PRICE = 1000000; // ₹10.00 Lakh

  // Spreadsheet header names we recognise for each player field (compared lowercase, punctuation stripped)
  const IMPORT_COLUMNS = {
    name: ['name', 'player', 'player name', 'full name', 'athlete'],
    sport: ['sport', 'game', 'discipline'],
    role: ['role', 'playing role', 'category', 'position', 'type', 'skill', 'speciality', 'specialty', 'specialization', 'specialisation'],
    basePrice: ['base price', 'baseprice', 'base', 'price', 'base amount'],
    institution: ['institution', 'college', 'university', 'school', 'branch', 'department'],
    photo: ['photo', 'photo url', 'photo link', 'image', 'image url', 'picture', 'pic', 'avatar'],
    batting: ['batting', 'batting style', 'batting hand'],
    bowling: ['bowling', 'bowling style', 'bowling type'],
    notes: ['notes', 'scouting notes', 'bio', 'remarks', 'about', 'achievements']
  };
  // When no header matches exactly, the more specific fields claim a column first
  // (so "College Name" becomes the college, not the player name).
  const IMPORT_FUZZY_ORDER = ['photo', 'institution', 'basePrice', 'batting', 'bowling', 'sport', 'role', 'notes', 'name'];

  function matchImportColumns(headerRow) {
    const headers = headerRow.map(h => h.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim());
    const columns = {};
    const claimed = new Set();
    Object.keys(IMPORT_COLUMNS).forEach(field => {
      const idx = headers.findIndex((h, i) => !claimed.has(i) && IMPORT_COLUMNS[field].includes(h));
      if (idx !== -1) { columns[field] = idx; claimed.add(idx); }
    });
    IMPORT_FUZZY_ORDER.forEach(field => {
      if (columns[field] !== undefined) return;
      const idx = headers.findIndex((h, i) => !claimed.has(i) && IMPORT_COLUMNS[field].some(alias => h.includes(alias)));
      if (idx !== -1) { columns[field] = idx; claimed.add(idx); }
    });
    return columns;
  }

  function normalizeSport(sportText, roleText) {
    const sport = (sportText || '').toLowerCase();
    if (sport.includes('foot') || sport.includes('soccer')) return 'football';
    if (sport.includes('cric')) return 'cricket';
    return /goal ?keeper|\bgk\b|striker|defender|midfield|winger|forward|centre.?back|full.?back/i.test(roleText || '')
      ? 'football'
      : 'cricket';
  }

  // Accept direct image links, and turn Google Drive share links (e.g. Google Form uploads) into viewable images.
  // Drive files must be shared as "Anyone with the link" for the image to load.
  function normalizePhotoUrl(url) {
    const clean = (url || '').trim();
    const driveMatch = clean.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?id=)([\w-]+)/);
    if (driveMatch) return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
    if (/^https?:\/\//i.test(clean) || /^data:image\//i.test(clean)) return clean;
    if (/\.(png|jpe?g|webp|gif|avif)$/i.test(clean)) return clean; // relative path, e.g. assets/players/x.jpg
    return '';
  }

  // Team a signed-in captain leads in this sport: by team id, or by captain name when the same person
  // captains in both sports (e.g. Krishna Patil: CSK in cricket, MUN in football)
  function findCaptainTeam(teams, auth) {
    const byId = teams.find(t => t.id === auth.teamId);
    if (byId) return byId;
    const normalize = value => String(value || '').replace(/\(captain\)/i, '').toLowerCase().replace(/[^a-z]/g, '');
    const captainName = normalize(auth.name);
    return captainName ? (teams.find(t => normalize(t.captain) === captainName) || null) : null;
  }

  // Neutral placeholder portrait showing the player's initials (used when no photo is given)
  function initialsAvatar(name) {
    const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2)
      .map(word => word[0].toUpperCase()).join('').replace(/[<>&"']/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#1d2541"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="Anton, Impact, sans-serif" font-size="170" fill="#82a2e1">${initials}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Build a new upcoming lot. Fields that are passed in (even as empty strings) are kept as given,
  // so imported players never get made-up styles or notes.
  function buildLot(playerData, state) {
    const pick = (value, fallback) => (value !== undefined && value !== null ? value : fallback);
    const lastLotNum = state.lots.reduce((max, l) => Math.max(max, parseInt(String(l.lotNumber).replace(/\D/g, ''), 10) || 0), 0);
    const name = playerData.name.trim();
    const basePrice = Number(playerData.basePrice) || DEFAULT_BASE_PRICE;
    return {
      id: 'lot-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
      lotNumber: 'LOT #' + (lastLotNum + 1),
      name: name,
      nickname: playerData.nickname || name.split(' ')[0],
      jersey: playerData.jersey || (state.lots.length + 1),
      sport: playerData.sport || 'cricket',
      badge: playerData.badge || 'AUCTION SQUAD DRAFT',
      category: playerData.category || 'Cricket • Squad Player',
      specialism: playerData.specialism || 'Varsity Player',
      battingStyle: pick(playerData.battingStyle, 'Right-Handed'),
      bowlingStyle: pick(playerData.bowlingStyle, 'Right-Arm Medium'),
      institution: pick(playerData.institution, 'NMIMS Hyderabad STME'),
      state: pick(playerData.state, 'Telangana Collegiate Circuit'),
      tournamentExp: pick(playerData.tournamentExp, 'College Premier League'),
      scoutingNotes: pick(playerData.scoutingNotes, 'Impressive performance in collegiate trials.'),
      avatar: playerData.avatar || initialsAvatar(name),
      stats: playerData.stats || {},
      basePrice: basePrice,
      currentBid: basePrice,
      highestBidderTeamId: null,
      highestBidderTeamName: 'No Active Bid',
      highestBidderCaptain: '-',
      status: 'upcoming'
    };
  }

  // 5. AUCTION ENGINE CORE
  window.LegendsAuction = {
    sport: SPORT,

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

            // One-time upgrade: team purses went from ₹1 Cr to ₹50 Cr. Keeps players, bids and spend;
            // purses the admin set to anything other than the old default are left alone.
            if (!parsed.purse50CrApplied) {
              parsed.teams.forEach(t => {
                if (t.totalPurse === PREVIOUS_DEFAULT_PURSE) {
                  t.totalPurse = DEFAULT_TEAM_PURSE;
                  t.remainingPurse = Math.max(0, t.totalPurse - t.spentPurse);
                }
              });
              parsed.purse50CrApplied = true;
              this.saveState(parsed);
            }
            return parsed;
          }
        }
      } catch (e) {
        console.error('Error reading auction state from localStorage', e);
      }

      const baseline = {
        teams: JSON.parse(JSON.stringify(INITIAL_TEAMS)),
        lots: JSON.parse(JSON.stringify(SEED_LOTS)),
        activeLotId: SEED_LOTS[0].id,
        bidLog: JSON.parse(JSON.stringify(INITIAL_BID_LOG)),
        timerSeconds: 0,
        elapsedSeconds: 45,
        isTimerRunning: true,
        lastSold: null,
        bidHistory: [],
        actionHistory: [],
        adminOnlyBidding: true,
        purse50CrApplied: true,
        recentAnnouncements: [
          `Legends Walk Off League 2.0 ${SPORT} auction room is ready`
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
        if (typeof window !== 'undefined' && window.LegendsRealtime && typeof window.LegendsRealtime.broadcast === 'function') {
          window.LegendsRealtime.broadcast('AUCTION_STATE_UPDATED', { sport: SPORT, state: state });
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
    // ROLES & AUTH (LOGIN-BASED CONTROL SYSTEM)
    // -------------------------------------------------------------
    getActiveRole: function () {
      const state = this.getState();

      // 1. Primary Authority: Authenticated Login Session (LegendsRBAC)
      try {
        const rbacSession = localStorage.getItem('legends_auth_session');
        if (rbacSession) {
          const auth = JSON.parse(rbacSession);
          if (auth && (auth.role === 'committee' || auth.role === 'cricket' || auth.role === 'football' || auth.role === 'referees')) {
            return {
              role: 'admin',
              title: auth.name || 'Official Auctioneer Admin',
              teamId: null,
              isLoggedIn: true,
              email: auth.email
            };
          } else if (auth && auth.role === 'captain') {
            const team = findCaptainTeam(state.teams, auth);
            if (team) {
              return {
                role: 'captain',
                title: `${team.captain} (Captain • ${team.shortCode})`,
                teamId: team.id,
                teamName: team.name,
                captainName: team.captain,
                isLoggedIn: true,
                email: auth.email
              };
            }
            // Captain with no team in this sport's auction (e.g. a cricket-only captain on the football page): view-only
            return { role: 'guest', title: 'Guest Spectator (View-Only)', teamId: null, isLoggedIn: false };
          }
        }
      } catch (e) {}

      // 2. Secondary / Explicit Override (for programmatic test compatibility)
      try {
        const customRole = localStorage.getItem(STORAGE_KEY_ROLE);
        if (customRole) {
          const parsed = JSON.parse(customRole);
          const teamExists = parsed && (parsed.role !== 'captain' || state.teams.some(t => t.id === parsed.teamId));
          if (parsed && parsed.role !== 'guest' && teamExists) {
            return { ...parsed, isLoggedIn: true };
          }
        }
      } catch (e) {}

      // 3. Default: Unauthenticated Guest (Strict View-Only)
      return {
        role: 'guest',
        title: 'Guest Spectator (View-Only)',
        teamId: null,
        isLoggedIn: false
      };
    },

    setActiveRole: function (roleType, teamId) {
      // Scorer / referee logins keep the session LegendsRBAC just created (getActiveRole already treats them as admin)
      if (roleType && !['admin', 'captain', 'guest'].includes(roleType)) {
        return this.getActiveRole();
      }

      let roleObj = { role: 'guest', title: 'Guest Spectator (View-Only)', teamId: null, isLoggedIn: false };
      const state = this.getState();

      if (roleType === 'admin') {
        roleObj = {
          role: 'admin',
          title: 'Official Auctioneer & Committee Admin',
          teamId: null,
          isLoggedIn: true
        };
        const session = {
          role: 'committee',
          email: 'admin@nmims.edu.in',
          name: 'Committee Admin',
          institution: 'NMIMS Hyderabad STME Impulse',
          token: 'AUTH-ADMIN-MOCK'
        };
        localStorage.setItem('legends_auth_session', JSON.stringify(session));
        localStorage.setItem('legends_admin_logged_in', 'true');
        localStorage.setItem('legends_admin_email', session.email);
      } else if (roleType === 'captain') {
        // The team may belong to the other sport (e.g. signing in as a football captain on a cricket page)
        const team = state.teams.find(t => t.id === teamId)
          || ['cricket', 'football'].map(sport => this.getTeamsForSport(sport).find(t => t.id === teamId)).find(Boolean)
          || state.teams[0];
        if (!team) throw new Error('No teams are registered yet, so there is no captain to sign in as.');
        roleObj = {
          role: 'captain',
          title: `${team.captain} (Captain • ${team.shortCode})`,
          teamId: team.id,
          teamName: team.name,
          captainName: team.captain,
          isLoggedIn: true
        };
        const session = {
          role: 'captain',
          teamId: team.id,
          email: `captain.${team.shortCode.toLowerCase()}@nmims.edu.in`,
          name: `${team.captain} (Captain)`,
          institution: `${team.name} Franchise`,
          token: 'AUTH-CAP-MOCK'
        };
        localStorage.setItem('legends_auth_session', JSON.stringify(session));
        localStorage.setItem('legends_admin_logged_in', 'true');
        localStorage.setItem('legends_admin_email', session.email);
      } else {
        localStorage.removeItem(STORAGE_KEY_ROLE);
        localStorage.removeItem('legends_auth_session');
        localStorage.removeItem('legends_admin_logged_in');
        localStorage.removeItem('legends_admin_email');
      }

      localStorage.setItem(STORAGE_KEY_ROLE, JSON.stringify(roleObj));
      return roleObj;
    },

    // Login-based permission helpers
    canAdmin: function () {
      const active = this.getActiveRole();
      return active.role === 'admin';
    },

    canBid: function () {
      const active = this.getActiveRole();
      return active.role === 'captain' || active.role === 'admin';
    },

    isAuthenticated: function () {
      const active = this.getActiveRole();
      return active.role !== 'guest' && !!active.isLoggedIn;
    },

    // -------------------------------------------------------------
    // LOT ACCESSORS
    // -------------------------------------------------------------
    getActiveLot: function () {
      const state = this.getState();
      const active = state.lots.find(l => l.id === state.activeLotId);
      if (active) return active;
      // Safety net for a stale activeLotId: never put an already-sold player back on the hammer
      return state.lots.find(l => l.status !== 'sold') || null;
    },

    getSeedLotIds: function () {
      return SEED_LOT_IDS.slice();
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
      const totalPurse = Number(teamData.totalPurse) || DEFAULT_TEAM_PURSE; // default 50 Cr
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

    // Admin empties the player pool so nothing is left to bid on.
    // options.keepSold (default true): players already sold stay with the franchises that bought them,
    //                            pass { keepSold: false } to wipe those records too.
    // The removed lots are pushed onto the hammer action history, so "Undo Hammer" brings them all back.
    clearPlayerPool: function (options) {
      const role = this.getActiveRole();
      if (role.role !== 'admin') {
        throw new Error('PERMISSION DENIED: Only the official Committee Auctioneer / Admin can empty the player pool.');
      }

      const keepSold = !(options && options.keepSold === false);
      const state = this.getState();

      const kept = [];
      const removed = [];
      state.lots.forEach(lot => (keepSold && lot.status === 'sold' ? kept : removed).push(lot));

      if (!removed.length) {
        throw new Error('The player pool is already empty — there is nothing to clear.');
      }

      state.lots = kept;
      if (!Array.isArray(state.actionHistory)) state.actionHistory = [];
      state.actionHistory.push({
        action: 'clear_pool',
        removedLots: removed,
        previousActiveLotId: state.activeLotId,
        keptSold: keepSold
      });

      // Put the next lot that can still be bid on under the hammer, or leave the board empty
      const nextUp = state.lots.find(l => l.status !== 'sold') || null;
      state.activeLotId = nextUp ? nextUp.id : null;
      if (nextUp) nextUp.status = 'active';
      state.bidHistory = [];
      state.elapsedSeconds = 0;
      state.lastSold = null;

      this.saveState(state);
      return {
        success: true,
        removed: removed.length,
        keptSold: kept.length,
        message: `Pool cleared: ${removed.length} player lot(s) removed from bidding. Use "Undo Hammer" to bring them back.`
      };
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
      if (!this.canAdmin()) {
        throw new Error('PERMISSION DENIED: You must be logged in as an official Tournament Admin to log bids.');
      }

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
      if (typeof window !== 'undefined' && window.LegendsRealtime && typeof window.LegendsRealtime.broadcast === 'function') {
        window.LegendsRealtime.broadcast('BID_PLACED', {
          lotId: lot.id,
          playerName: lot.name,
          teamId: team.id,
          teamName: team.name,
          shortCode: team.shortCode,
          amount: nextBidAmount,
          amountFormatted: this.formatCurrency(nextBidAmount),
          sport: SPORT
        });
      }
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
      if (typeof window !== 'undefined' && window.LegendsRealtime && typeof window.LegendsRealtime.broadcast === 'function') {
        window.LegendsRealtime.broadcast('BID_PLACED', {
          lotId: lot.id,
          playerName: lot.name,
          teamId: team.id,
          teamName: team.name,
          shortCode: team.shortCode,
          amount: nextBidAmount,
          amountFormatted: this.formatCurrency(nextBidAmount),
          sport: SPORT
        });
      }
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
    hammerSold: function (options) {
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

      // 5. If autoAdvance is enabled, automatically nominate and bring the next player to hammer
      let nextLot = null;
      if (options && (options.autoAdvance || options.next)) {
        const currIdx = state.lots.findIndex(l => l.id === lot.id);
        for (let i = currIdx + 1; i < state.lots.length; i++) {
          if (state.lots[i].status !== 'sold') {
            nextLot = state.lots[i];
            break;
          }
        }
        if (!nextLot) {
          nextLot = state.lots.find(l => l.id !== lot.id && l.status !== 'sold');
        }
        if (nextLot) {
          state.activeLotId = nextLot.id;
          nextLot.status = 'active';
          state.elapsedSeconds = 0;
          state.bidHistory = [];
        }
      }

      this.saveState(state);
      if (typeof window !== 'undefined' && window.LegendsRealtime && typeof window.LegendsRealtime.broadcast === 'function') {
        window.LegendsRealtime.broadcast('HAMMER_ACTION', {
          action: 'sold',
          playerName: lot.name,
          teamName: team.name,
          shortCode: team.shortCode,
          price: lot.currentBid,
          priceFormatted: this.formatCurrency(lot.currentBid),
          sport: SPORT,
          nextLot: nextLot ? { id: nextLot.id, name: nextLot.name } : null
        });
      }
      return {
        success: true,
        lot: lot,
        team: team,
        price: lot.currentBid,
        nextLot: nextLot
      };
    },

    hammerSoldAndNext: function () {
      return this.hammerSold({ autoAdvance: true });
    },

    hammerUnsold: function (options) {
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

      let nextLot = null;
      if (options && (options.autoAdvance || options.next)) {
        const currIdx = state.lots.findIndex(l => l.id === lot.id);
        for (let i = currIdx + 1; i < state.lots.length; i++) {
          if (state.lots[i].status !== 'sold') {
            nextLot = state.lots[i];
            break;
          }
        }
        if (!nextLot) {
          nextLot = state.lots.find(l => l.id !== lot.id && l.status !== 'sold');
        }
        if (nextLot) {
          state.activeLotId = nextLot.id;
          if (nextLot.status !== 'sold') nextLot.status = 'active';
          state.elapsedSeconds = 0;
          state.bidHistory = [];
        }
      }

      this.saveState(state);
      if (typeof window !== 'undefined' && window.LegendsRealtime && typeof window.LegendsRealtime.broadcast === 'function') {
        window.LegendsRealtime.broadcast('HAMMER_ACTION', {
          action: 'unsold',
          playerName: lot.name,
          sport: SPORT,
          nextLot: nextLot ? { id: nextLot.id, name: nextLot.name } : null
        });
      }
      return {
        success: true,
        lot: lot,
        nextLot: nextLot
      };
    },

    hammerUnsoldAndNext: function () {
      return this.hammerUnsold({ autoAdvance: true });
    },

    // Admin directly puts a player into a franchise squad and deducts amount from their wallet
    // (Requested: "allow admin to put players in the team and deduct amount from their wallet")
    adminDirectAssignPlayer: function (options) {
      const role = this.getActiveRole();
      if (role.role !== 'admin') {
        throw new Error('PERMISSION DENIED: Only Admin can directly assign players and deduct purse.');
      }

      if (!options || typeof options !== 'object') {
        throw new Error('Assignment options are required.');
      }

      const { teamId, playerName, playerCategory, institution, battingStyle, bowlingStyle, price, lotId, notes } = options;

      if (!teamId) throw new Error('Target franchise team must be selected.');
      const state = this.getState();
      const team = state.teams.find(t => t.id === teamId);
      if (!team) throw new Error(`Franchise team '${teamId}' not found.`);

      if (!playerName || !playerName.trim()) throw new Error('Player name is required.');
      const cleanName = playerName.trim();

      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        throw new Error('A valid non-negative purchase price / deduction amount is required.');
      }

      // Check remaining purse
      const remaining = Math.max(0, team.totalPurse - team.spentPurse);
      if (numPrice > remaining) {
        throw new Error(`Insufficient purse balance! ${team.name} has only ${this.formatCurrency(remaining)} remaining, but requested deduction is ${this.formatCurrency(numPrice)}.`);
      }

      // Check squad limit
      const currentSquad = this.getTeamAllMembers(team.id);
      if (currentSquad.length >= team.squadLimit) {
        throw new Error(`Squad limit reached! ${team.name} already has ${currentSquad.length}/${team.squadLimit} players.`);
      }

      // 1. Deduct amount from team wallet
      team.spentPurse += numPrice;
      team.remainingPurse = Math.max(0, team.totalPurse - team.spentPurse);

      // 2. Put player in team acquiredPlayers
      if (!Array.isArray(team.acquiredPlayers)) team.acquiredPlayers = [];
      const assignedId = lotId || ('direct-' + Date.now());
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const squadMember = {
        id: assignedId,
        name: cleanName,
        role: playerCategory || 'Assigned Player',
        price: numPrice,
        time: timeStr,
        institution: institution || 'STME Registered',
        battingStyle: battingStyle || 'Right-Handed',
        bowlingStyle: bowlingStyle || 'Right-Arm Pacer',
        notes: notes || 'Admin Direct Assignment',
        directAssignment: true
      };
      team.acquiredPlayers.push(squadMember);

      // 3. If lotId provided or matched an existing lot, mark it sold
      let matchedLot = null;
      if (lotId) {
        matchedLot = state.lots.find(l => l.id === lotId);
      } else {
        matchedLot = state.lots.find(l => l.name.toLowerCase() === cleanName.toLowerCase());
      }

      if (matchedLot) {
        matchedLot.status = 'sold';
        matchedLot.currentBid = numPrice;
        matchedLot.highestBidderTeamId = team.id;
        matchedLot.highestBidderTeamName = team.name;
        matchedLot.highestBidderCaptain = team.captain;
        
        // If this was the active lot, advance activeLotId
        if (state.activeLotId === matchedLot.id) {
          const nextActive = state.lots.find(l => l.id !== matchedLot.id && l.status === 'active');
          if (nextActive) {
            state.activeLotId = nextActive.id;
          }
        }
      }

      // 4. Record action in actionHistory for undo
      if (!Array.isArray(state.actionHistory)) state.actionHistory = [];
      state.actionHistory.push({
        action: 'direct_assign',
        teamId: team.id,
        playerId: assignedId,
        price: numPrice,
        lotId: matchedLot ? matchedLot.id : null,
        playerName: cleanName
      });

      // 5. Record in bidLog
      state.bidLog.unshift({
        time: timeStr,
        team: team.name,
        shortCode: team.shortCode,
        captain: team.captain,
        amount: numPrice,
        type: 'sold',
        player: `${cleanName} (Direct Assigned)`
      });

      state.lastSold = {
        player: cleanName,
        team: team.name,
        shortCode: team.shortCode,
        price: numPrice,
        category: squadMember.role
      };

      this.saveState(state);
      return {
        success: true,
        team: team,
        player: squadMember,
        remainingPurse: team.remainingPurse
      };
    },

    // Undo last hammer action (reverts Sold, Unsold, or Direct Assignment)
    undoLastAction: function () {
      const role = this.getActiveRole();
      if (role.role !== 'admin') throw new Error('PERMISSION DENIED: Admin only.');

      const state = this.getState();
      if (!Array.isArray(state.actionHistory) || state.actionHistory.length === 0) {
        throw new Error('No previous hammer action to undo.');
      }

      const last = state.actionHistory.pop();

      if (last.action === 'sold') {
        const lot = state.lots.find(l => l.id === last.lotId);
        const team = state.teams.find(t => t.id === last.teamId);
        if (team) {
          team.spentPurse = Math.max(0, team.spentPurse - last.price);
          team.remainingPurse = Math.max(0, team.totalPurse - team.spentPurse);
          team.acquiredPlayers = (team.acquiredPlayers || []).filter(p => p.id !== last.lotId);
        }
        if (lot) {
          lot.status = 'active';
          state.activeLotId = lot.id;
        }
        this.saveState(state);
        return { success: true, message: `Reverted SOLD for ${lot ? lot.name : 'player'}` };
      } else if (last.action === 'unsold') {
        const lot = state.lots.find(l => l.id === last.lotId);
        if (lot) {
          lot.status = 'active';
          state.activeLotId = lot.id;
        }
        this.saveState(state);
        return { success: true, message: `Reverted UNSOLD for ${lot ? lot.name : 'lot'}` };
      } else if (last.action === 'direct_assign') {
        const team = state.teams.find(t => t.id === last.teamId);
        if (team) {
          team.spentPurse = Math.max(0, team.spentPurse - last.price);
          team.remainingPurse = Math.max(0, team.totalPurse - team.spentPurse);
          if (Array.isArray(team.acquiredPlayers)) {
            team.acquiredPlayers = team.acquiredPlayers.filter(p => p.id !== last.playerId);
          }
        }
        if (last.lotId) {
          const lot = state.lots.find(l => l.id === last.lotId);
          if (lot) {
            lot.status = 'active';
          }
        }
        this.saveState(state);
        return { success: true, message: `Reverted direct assignment of ${last.playerName || 'player'} and refunded ${this.formatCurrency(last.price)} to ${team ? team.name : 'team'}.` };
      } else if (last.action === 'clear_pool') {
        const restored = Array.isArray(last.removedLots) ? last.removedLots : [];
        state.lots = restored.concat(state.lots);
        const previous = last.previousActiveLotId
          ? state.lots.find(l => l.id === last.previousActiveLotId)
          : null;
        const restoreTo = previous || state.lots.find(l => l.status !== 'sold') || state.lots[0] || null;
        if (restoreTo) {
          restoreTo.status = 'active';
          state.activeLotId = restoreTo.id;
        }
        state.bidHistory = [];
        state.elapsedSeconds = 0;
        this.saveState(state);
        return { success: true, message: `Pool restored: ${restored.length} player lot(s) are back on the board.` };
      }

      this.saveState(state);
      return { success: true, message: 'Action undone.' };
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
      const newLot = buildLot(playerData, state);

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

    // Parse a price typed by a human: 1000000, "10L", "10 Lakh", "1.5 Cr", "₹12,00,000".
    // Bare numbers under 1000 are read as lakhs ("10" -> ₹10.00 Lakh).
    parsePriceInput: function (value) {
      const raw = String(value === undefined || value === null ? '' : value)
        .toLowerCase()
        .replace(/₹|rs\.?|inr|,|\s/g, '');
      const num = parseFloat(raw);
      if (!isFinite(num) || num <= 0) return null;
      if (raw.includes('cr')) return Math.round(num * 10000000);
      if (/l(akh|ac)?s?$/.test(raw)) return Math.round(num * 100000);
      return num < 1000 ? Math.round(num * 100000) : Math.round(num);
    },

    // Split CSV / TSV / semicolon text into rows of cells.
    // Handles quoted cells containing delimiters, doubled quotes and line breaks.
    parseSpreadsheetText: function (text) {
      const firstLine = text.split(/\r?\n/, 1)[0] || '';
      const delimiter = firstLine.includes('\t')
        ? '\t'
        : (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');

      const rows = [];
      let row = [];
      let cell = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
          if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
          else if (ch === '"') inQuotes = false;
          else cell += ch;
        } else if (ch === '"' && cell.trim() === '') {
          inQuotes = true;
          cell = '';
        } else if (ch === delimiter) {
          row.push(cell.trim());
          cell = '';
        } else if (ch === '\n' || ch === '\r') {
          if (ch === '\r' && text[i + 1] === '\n') i++;
          row.push(cell.trim());
          rows.push(row);
          row = [];
          cell = '';
        } else {
          cell += ch;
        }
      }
      row.push(cell.trim());
      rows.push(row);
      return rows.filter(r => r.some(c => c !== ''));
    },

    // Read-only look at pasted / uploaded rows: how many players and which columns were recognised
    previewImport: function (text) {
      const rows = this.parseSpreadsheetText(String(text || ''));
      if (!rows.length) return { playerRows: 0, columns: {} };
      const matched = matchImportColumns(rows[0]);
      const columns = {};
      Object.keys(matched).forEach(field => { columns[field] = rows[0][matched[field]]; });
      return { playerRows: Math.max(0, rows.length - 1), columns: columns };
    },

    // Admin Action: Mass import players from spreadsheet text (CSV, TSV, or rows pasted from Excel / Google Sheets).
    // The first row must be headers. Recognised columns: Name, Role, Sport, Base Price, Photo, College,
    // Batting, Bowling, Notes. Only Name is required.
    // options.replacePool: remove every unsold / upcoming player first (sold players stay with their teams).
    importPlayers: function (text, options) {
      const role = this.getActiveRole();
      if (role.role !== 'admin') {
        throw new Error('PERMISSION DENIED: Only the official Committee Auctioneer / Admin can import players.');
      }
      if (!text || !String(text).trim()) {
        throw new Error('Nothing to import. Upload a file or paste player rows first.');
      }

      const rows = this.parseSpreadsheetText(String(text));
      if (rows.length < 2) {
        throw new Error('Add a header row (e.g. Name, Role, Base Price, Photo) and at least one player row.');
      }
      const columns = matchImportColumns(rows[0]);
      if (columns.name === undefined) {
        throw new Error('Could not find a "Name" column. The first row must be headers such as: Name, Role, Base Price, Photo.');
      }

      const replacePool = !!(options && options.replacePool);
      const state = this.getState();
      if (replacePool) {
        state.lots = state.lots.filter(l => l.status === 'sold');
      }

      const seenNames = new Set(state.lots.map(l => l.name.trim().toLowerCase()));
      const added = [];
      const skipped = [];

      rows.slice(1).forEach((row, idx) => {
        const rowNumber = idx + 2;
        const get = key => (columns[key] === undefined ? '' : (row[columns[key]] || '').trim());

        const name = get('name');
        if (!name) {
          skipped.push({ row: rowNumber, name: '', reason: 'Missing name' });
          return;
        }
        if (seenNames.has(name.toLowerCase())) {
          skipped.push({ row: rowNumber, name: name, reason: 'Already in the player pool' });
          return;
        }

        const priceText = get('basePrice');
        const basePrice = priceText ? this.parsePriceInput(priceText) : DEFAULT_BASE_PRICE;
        if (!basePrice) {
          skipped.push({ row: rowNumber, name: name, reason: `Base price "${priceText}" not understood` });
          return;
        }

        const playerRole = get('role');
        const sport = normalizeSport(get('sport'), playerRole);
        const sportLabel = sport === 'football' ? 'Football' : 'Cricket';
        const lot = buildLot({
          name: name,
          sport: sport,
          badge: playerRole || 'Auction Pool',
          category: playerRole.includes('•') ? playerRole : `${sportLabel} • ${playerRole || 'Player'}`,
          specialism: playerRole || `${sportLabel} Player`,
          battingStyle: get('batting'),
          bowlingStyle: get('bowling'),
          institution: get('institution'),
          scoutingNotes: get('notes'),
          avatar: normalizePhotoUrl(get('photo')),
          basePrice: basePrice
        }, state);

        state.lots.push(lot);
        seenNames.add(name.toLowerCase());
        added.push(lot);
      });

      if (!added.length) {
        const reason = skipped.length ? ` First problem: row ${skipped[0].row} — ${skipped[0].reason}.` : '';
        throw new Error(`No players were imported, so nothing was changed.${reason}`);
      }

      // Put the first imported player on the hammer if the previous active lot was removed
      if (!state.lots.some(l => l.id === state.activeLotId)) {
        state.activeLotId = added[0].id;
        added[0].status = 'active';
        state.bidHistory = [];
        state.elapsedSeconds = 0;
      }

      this.saveState(state);
      return { added: added.length, skipped: skipped, players: added };
    },

    // Import players from CSV text (kept for existing callers; see importPlayers)
    importPlayersFromCSV: function (csvContent) {
      if (!csvContent || typeof csvContent !== 'string') {
        throw new Error('Invalid CSV file content.');
      }
      return this.importPlayers(csvContent).players;
    }
  };

  // 6. SPORT-AWARE LINKS & CRICKET / FOOTBALL SWITCH
  // Moving between the auction page, MPH screen and captain dashboard keeps the current sport.
  // Football links use clean URLs (auction?sport=football, not auction.html?...): the dev server used to
  // 301-redirect *.html and drop the query string, and browsers cache those redirects.
  const SPORT_PAGES = /^(auction|mph-screen|captain-dashboard)(\.html)?$/;

  function linkForSport(href, sport) {
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return href;
      const page = url.pathname.split('/').pop();
      if (SPORT_PAGES.test(page)) {
        if (sport === 'football') url.searchParams.set('sport', 'football');
        else url.searchParams.delete('sport');
      } else if (/^login(\.html)?$/.test(page) && url.searchParams.get('redirect')) {
        url.searchParams.set('redirect', linkForSport(url.searchParams.get('redirect'), sport));
      } else {
        return href;
      }
      const target = sport === 'football' ? page.replace(/\.html$/, '') : page;
      return target + url.search + url.hash;
    } catch (e) {
      return href;
    }
  }

  // Teams of either sport as saved in this browser (defaults if that auction hasn't been opened here yet).
  // Used by the login page, which lists cricket and football captains together.
  window.LegendsAuction.getTeamsForSport = function (sport) {
    const key = STORAGE_KEYS[sport];
    if (!key) return [];
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && Array.isArray(saved.teams)) return saved.teams;
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_TEAMS[sport]));
  };

  window.LegendsAuction.withSport = function (href) {
    return linkForSport(href, SPORT);
  };

  // Fills every <div data-sport-switch></div> with a 🏏 Cricket / ⚽ Football toggle for the current page
  function renderSportSwitch(container) {
    const page = window.location.pathname.split('/').pop() || 'auction.html';
    const option = (sport, label) => {
      const active = sport === SPORT;
      return `<a href="${linkForSport(page, sport)}" data-sport-target="${sport}" class="px-2.5 py-1 rounded font-headline-sm uppercase text-xs tracking-wider transition-all ${active ? 'bg-secondary-container text-on-secondary shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}">${label}</a>`;
    };
    container.innerHTML = `<div class="inline-flex items-center gap-1 p-1 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/40" title="Switch auction">${option('cricket', '🏏 Cricket')}${option('football', '⚽ Football')}</div>`;
  }

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    // Rewrite links as they are clicked, so links rendered later (role panels, modals) are covered too
    document.addEventListener('click', (e) => {
      const link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (link && SPORT === 'football' && !link.hasAttribute('data-sport-target')) {
        link.setAttribute('href', linkForSport(link.getAttribute('href'), SPORT));
      }
    }, true);

    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-sport-switch]').forEach(renderSportSwitch);
      if (SPORT === 'football') {
        document.querySelectorAll('a[href]:not([data-sport-target])').forEach(link => {
          link.setAttribute('href', linkForSport(link.getAttribute('href'), SPORT));
        });
        if (!/football/i.test(document.title)) document.title = 'Football • ' + document.title;
      }
    });
  }

  // Auto-initialize state on script load
  window.LegendsAuction.getState();
})();
