/**
 * Legends Walk Off — Tournament Teams & Roster Management Engine
 * STME Impulse Committee • NMIMS Hyderabad 2026
 *
 * Full lifecycle team & squad player administration:
 * - Register new tournament teams (Cricket & Football)
 * - Remove teams with cascading roster management
 * - Draft / Add squad members with jersey numbers and tactical roles
 * - Remove squad members
 * - Real-time persistence and UI rendering in Admin Console and Standings
 */

(function () {
  'use strict';

  // 1. DEFAULT STARTER ROSTER DATA
  const DEFAULT_TEAMS = [
    {
      id: 'team-nmims-cricket',
      name: 'NMIMS STME Strikers',
      shortCode: 'STME',
      institution: 'School of Technology Management & Engineering, NMIMS Hyderabad',
      sport: 'cricket',
      pool: 'Group Alpha',
      color: '#e10600',
      captain: 'Vikramaditya',
      played: 3, won: 3, lost: 0, pts: 6, nrr: '+2.450',
      members: [
        { id: 'p-101', name: 'Vikramaditya (c)', number: 7, role: 'Captain & Top-order Batsman', style: 'Right-hand bat, Off-break' },
        { id: 'p-102', name: 'Arjun Sharma', number: 18, role: 'Opening Batsman', style: 'Right-hand bat' },
        { id: 'p-103', name: 'Rohan Verma', number: 45, role: 'Wicket-keeper Batsman', style: 'Right-hand bat' },
        { id: 'p-104', name: 'Siddharth Nair', number: 12, role: 'All-Rounder', style: 'Left-hand bat, Right-arm fast' },
        { id: 'p-105', name: 'K. Reddy', number: 99, role: 'Pace Bowler', style: 'Right-arm fast bowler' },
        { id: 'p-106', name: 'Dhruv Rao', number: 24, role: 'Spin Bowler', style: 'Left-arm orthodox' }
      ]
    },
    {
      id: 'team-cbit-cricket',
      name: 'CBIT Thunder',
      shortCode: 'CBIT',
      institution: 'Chaitanya Bharathi Institute of Technology, Gandipet',
      sport: 'cricket',
      pool: 'Group Alpha',
      color: '#ffd400',
      captain: 'Pranav K.',
      played: 3, won: 2, lost: 1, pts: 4, nrr: '+1.180',
      members: [
        { id: 'p-201', name: 'Pranav K. (c)', number: 10, role: 'Captain & Middle-order Batsman', style: 'Right-hand bat' },
        { id: 'p-202', name: 'Varun Teja', number: 3, role: 'Opening Batsman', style: 'Left-hand bat' },
        { id: 'p-203', name: 'Nikhil Kumar', number: 17, role: 'Pace Bowler', style: 'Right-arm fast medium' },
        { id: 'p-204', name: 'Abhishek Roy', number: 88, role: 'All-Rounder', style: 'Right-hand bat, Leg break' }
      ]
    },
    {
      id: 'team-vnr-cricket',
      name: 'VNR VJIET Warriors',
      shortCode: 'VNR',
      institution: 'VNR Vignana Jyothi Institute of Engineering, Bachupally',
      sport: 'cricket',
      pool: 'Group Bravo',
      color: '#4edea3',
      captain: 'Rahul Sen',
      played: 3, won: 2, lost: 1, pts: 4, nrr: '+0.890',
      members: [
        { id: 'p-301', name: 'Rahul Sen (c)', number: 1, role: 'Captain & Fast Bowler', style: 'Right-arm fast' },
        { id: 'p-302', name: 'Karthik Rao', number: 21, role: 'Top-order Batsman', style: 'Right-hand bat' },
        { id: 'p-303', name: 'Manish V.', number: 5, role: 'All-Rounder', style: 'Left-hand bat, Slow left-arm' }
      ]
    },
    {
      id: 'team-bits-cricket',
      name: 'BITS Hyderabad Titans',
      shortCode: 'BITS',
      institution: 'BITS Pilani Hyderabad Campus, Shamirpet',
      sport: 'cricket',
      pool: 'Group Bravo',
      color: '#38bdf8',
      captain: 'Anish Mathur',
      played: 3, won: 1, lost: 2, pts: 2, nrr: '-0.340',
      members: [
        { id: 'p-401', name: 'Anish Mathur (c)', number: 9, role: 'Captain & Batsman', style: 'Right-hand bat' },
        { id: 'p-402', name: 'Sameer Jha', number: 14, role: 'Wicket-keeper', style: 'Right-hand bat' },
        { id: 'p-403', name: 'Tanmay Saxena', number: 77, role: 'Pace Bowler', style: 'Right-arm fast' }
      ]
    },
    {
      id: 'team-bits-football',
      name: 'BITS Hyderabad Rovers',
      shortCode: 'BITS-FC',
      institution: 'BITS Pilani Hyderabad Campus',
      sport: 'football',
      pool: 'Conference Alpha',
      color: '#38bdf8',
      captain: 'Zeeshan Ali',
      played: 3, won: 3, lost: 0, pts: 9, nrr: '+7 GD',
      members: [
        { id: 'p-501', name: 'Zeeshan Ali (c)', number: 10, role: 'Captain & Centre Forward (ST)', style: 'Striker' },
        { id: 'p-502', name: 'Kabir Das', number: 1, role: 'Goalkeeper (GK)', style: 'Shot-stopper' },
        { id: 'p-503', name: 'Aditya Pillai', number: 4, role: 'Centre-Back (CB)', style: 'Defensive Anchor' },
        { id: 'p-504', name: 'Rishi Paul', number: 8, role: 'Central Midfielder (CM)', style: 'Playmaker' }
      ]
    },
    {
      id: 'team-nmims-football',
      name: 'NMIMS Impulse FC',
      shortCode: 'STME-FC',
      institution: 'NMIMS Hyderabad STME',
      sport: 'football',
      pool: 'Conference Alpha',
      color: '#e10600',
      captain: 'Farhan Shaikh',
      played: 3, won: 2, lost: 1, pts: 6, nrr: '+4 GD',
      members: [
        { id: 'p-601', name: 'Farhan Shaikh (c)', number: 7, role: 'Captain & Left Winger (LW)', style: 'Pacy Winger' },
        { id: 'p-602', name: 'Neil Mukherjee', number: 11, role: 'Right Winger (RW)', style: 'Cross Specialist' },
        { id: 'p-603', name: 'Surya Teja', number: 1, role: 'Goalkeeper (GK)', style: 'Sweeper Keeper' }
      ]
    }
  ];

  let currentSportFilter = 'all';
  let activeSelectedTeamId = 'team-nmims-cricket';

  // 2. ROSTER ENGINE OBJECT
  window.LegendsRoster = {
    // Get all teams from storage or defaults
    getTeams: function () {
      try {
        const saved = localStorage.getItem('legends_teams_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse teams data:', e);
      }
      return DEFAULT_TEAMS;
    },

    // Save teams to storage
    saveTeams: function (teams) {
      try {
        localStorage.setItem('legends_teams_data', JSON.stringify(teams));
        window.dispatchEvent(new CustomEvent('legends_teams_changed', { detail: teams }));
      } catch (e) {
        console.error('Failed to save teams:', e);
      }
    },

    // Get single team
    getTeam: function (teamId) {
      const teams = this.getTeams();
      return teams.find(t => t.id === teamId) || null;
    },

    // Add a new team
    addTeam: function (teamData) {
      if (!teamData || !teamData.name) {
        throw new Error('Team name is required');
      }

      const teams = this.getTeams();
      const id = 'team-' + teamData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString().slice(-4);
      
      const newTeam = {
        id: id,
        name: teamData.name.trim(),
        shortCode: (teamData.shortCode || teamData.name.slice(0, 4)).toUpperCase(),
        institution: (teamData.institution || 'Inter-Collegiate League').trim(),
        sport: teamData.sport || 'cricket',
        pool: teamData.pool || (teamData.sport === 'cricket' ? 'Group Alpha' : 'Conference Alpha'),
        color: teamData.color || '#e10600',
        captain: teamData.captain || 'To Be Announced',
        played: 0, won: 0, lost: 0, pts: 0, nrr: '+0.000',
        members: []
      };

      teams.push(newTeam);
      this.saveTeams(teams);
      activeSelectedTeamId = newTeam.id;

      if (window.LegendsApp) {
        window.LegendsApp.showToast(`Team Added: "${newTeam.name}" registered to ${newTeam.pool}!`, 'success');
      }
      return newTeam;
    },

    // Remove a team
    removeTeam: function (teamId) {
      let teams = this.getTeams();
      const targetTeam = teams.find(t => t.id === teamId);
      if (!targetTeam) return false;

      teams = teams.filter(t => t.id !== teamId);
      this.saveTeams(teams);

      if (activeSelectedTeamId === teamId) {
        activeSelectedTeamId = teams.length > 0 ? teams[0].id : null;
      }

      if (window.LegendsApp) {
        window.LegendsApp.showToast(`Team "${targetTeam.name}" removed from tournament.`, 'info');
      }
      return true;
    },

    // Add a member / player to a team
    addMember: function (teamId, memberData) {
      if (!memberData || !memberData.name) {
        throw new Error('Player name is required');
      }

      const teams = this.getTeams();
      const team = teams.find(t => t.id === teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      if (!Array.isArray(team.members)) {
        team.members = [];
      }

      const memberId = 'p-' + Date.now().toString().slice(-6);
      const newMember = {
        id: memberId,
        name: memberData.name.trim(),
        number: parseInt(memberData.number || (team.members.length + 1), 10),
        role: memberData.role || 'Squad Player',
        style: memberData.style || 'General Specialization'
      };

      if (memberData.isCaptain || newMember.name.toLowerCase().includes('(c)')) {
        team.captain = newMember.name;
      }

      team.members.push(newMember);
      this.saveTeams(teams);

      if (window.LegendsApp) {
        window.LegendsApp.showToast(`Player "${newMember.name}" (#${newMember.number}) added to ${team.name}!`, 'success');
      }
      return newMember;
    },

    // Remove a member / player from a team
    removeMember: function (teamId, memberId) {
      const teams = this.getTeams();
      const team = teams.find(t => t.id === teamId);
      if (!team || !Array.isArray(team.members)) return false;

      const targetMember = team.members.find(m => m.id === memberId);
      if (!targetMember) return false;

      team.members = team.members.filter(m => m.id !== memberId);
      this.saveTeams(teams);

      if (window.LegendsApp) {
        window.LegendsApp.showToast(`Player "${targetMember.name}" removed from ${team.name}.`, 'info');
      }
      return true;
    },

    // Reset teams to official baseline
    resetDefaults: function () {
      localStorage.removeItem('legends_teams_data');
      this.saveTeams(DEFAULT_TEAMS);
      activeSelectedTeamId = DEFAULT_TEAMS[0].id;
      if (window.LegendsApp) {
        window.LegendsApp.showToast('Tournament rosters reset to official baseline.', 'info');
      }
      return DEFAULT_TEAMS;
    }
  };

  // 3. UI RENDERING METHODS (Integrated into Admin Console)
  window.renderRosterUI = function () {
    const listContainer = document.getElementById('rosterTeamsListContainer');
    const squadContainer = document.getElementById('activeTeamSquadPanel');
    if (!listContainer || !squadContainer) return;

    const teams = window.LegendsRoster.getTeams();
    const searchInput = document.getElementById('rosterSearchInput');
    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();

    // Filter teams by sport & search term
    const filteredTeams = teams.filter(t => {
      const matchesSport = (currentSportFilter === 'all') || (t.sport === currentSportFilter);
      const matchesSearch = !searchTerm || t.name.toLowerCase().includes(searchTerm) || t.institution.toLowerCase().includes(searchTerm) || t.shortCode.toLowerCase().includes(searchTerm);
      return matchesSport && matchesSearch;
    });

    // Ensure valid activeSelectedTeamId
    if (!activeSelectedTeamId || !teams.some(t => t.id === activeSelectedTeamId)) {
      activeSelectedTeamId = filteredTeams.length > 0 ? filteredTeams[0].id : (teams.length > 0 ? teams[0].id : null);
    }

    // 1. Render Left Column: Teams List
    if (filteredTeams.length === 0) {
      listContainer.innerHTML = `
        <div class="bg-surface-container p-space-lg text-center flex flex-col items-center justify-center gap-space-xs text-on-surface-variant">
          <span class="material-symbols-outlined text-4xl text-outline">search_off</span>
          <p class="font-headline-sm uppercase text-sm">No Teams Found</p>
          <p class="font-body-sm text-xs">Try adjusting your search or register a new franchise.</p>
        </div>
      `;
    } else {
      listContainer.innerHTML = filteredTeams.map(t => {
        const isSelected = t.id === activeSelectedTeamId;
        const memberCount = Array.isArray(t.members) ? t.members.length : 0;
        const sportIcon = t.sport === 'football' ? 'sports_soccer' : 'sports_cricket';
        const sportColor = t.sport === 'football' ? 'text-secondary-container' : 'text-primary';

        return `
          <div class="bg-surface-container p-space-sm transition-all border-l-4 ${isSelected ? 'border-primary-container bg-surface-container-high shadow-lg' : 'border-transparent hover:bg-surface-container-high/60'} flex items-center justify-between gap-space-sm cursor-pointer" onclick="selectTeamForRoster('${t.id}')">
            <div class="flex items-center gap-space-sm min-w-0">
              <div class="w-10 h-10 shrink-0 bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-center font-headline-sm text-sm uppercase text-on-surface" style="border-top: 2px solid ${t.color || '#e10600'}">
                ${t.shortCode || 'TM'}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h4 class="font-title-md text-sm text-on-surface font-bold truncate">${t.name}</h4>
                  <span class="material-symbols-outlined text-[14px] ${sportColor}">${sportIcon}</span>
                </div>
                <div class="flex items-center gap-2 mt-0.5 text-xs text-on-surface-variant truncate">
                  <span class="font-label-badge text-[10px] uppercase text-outline">${t.pool}</span>
                  <span>•</span>
                  <span class="text-tertiary text-[10px] font-mono">${memberCount} Players</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0" onclick="event.stopPropagation()">
              <button onclick="selectTeamForRoster('${t.id}')" class="px-2 py-1 bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-label-badge uppercase tracking-wider transition-colors" title="Manage Squad">
                Manage
              </button>
              <button onclick="confirmRemoveTeam('${t.id}')" class="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors" title="Delete Team">
                <span class="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Render Right Column: Squad Roster of Active Team
    const selectedTeam = window.LegendsRoster.getTeam(activeSelectedTeamId);
    if (!selectedTeam) {
      squadContainer.innerHTML = `
        <div class="p-space-xl text-center flex flex-col items-center justify-center gap-space-sm text-on-surface-variant">
          <span class="material-symbols-outlined text-5xl text-outline">group_off</span>
          <h4 class="font-headline-md uppercase">No Team Selected</h4>
          <p class="font-body-sm text-sm max-w-sm">Select a team from the left column to view and manage its squad roster, or click "Register Team" to add a new franchise.</p>
          <button onclick="openAddTeamModal()" class="mt-space-sm px-space-md py-2 bg-primary-container text-on-primary font-headline-sm uppercase text-xs clip-angle">Register New Team</button>
        </div>
      `;
      return;
    }

    const members = Array.isArray(selectedTeam.members) ? selectedTeam.members : [];
    const sportIcon = selectedTeam.sport === 'football' ? 'sports_soccer' : 'sports_cricket';

    squadContainer.innerHTML = `
      <!-- Active Team Banner -->
      <div class="bg-surface-container-lowest p-space-md border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
        <div class="flex items-center gap-space-md">
          <div class="w-14 h-14 bg-surface-container-high border-2 flex items-center justify-center font-headline-lg text-xl uppercase font-bold text-on-surface" style="border-color: ${selectedTeam.color || '#e10600'}">
            ${selectedTeam.shortCode}
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-headline-lg text-xl uppercase text-on-surface">${selectedTeam.name}</h3>
              <span class="px-2 py-0.5 font-label-badge text-[10px] uppercase bg-surface-container-high text-secondary-container font-bold">${selectedTeam.pool}</span>
            </div>
            <p class="font-body-sm text-xs text-on-surface-variant mt-0.5">${selectedTeam.institution}</p>
            <p class="font-label-badge text-[11px] text-outline mt-1">CAPTAIN: <strong class="text-on-surface">${selectedTeam.captain || 'TBA'}</strong></p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button onclick="openAddMemberModal('${selectedTeam.id}')" class="flex-1 sm:flex-initial px-space-md py-2 bg-secondary-container hover:bg-secondary-container/90 text-on-secondary-container font-headline-sm text-xs uppercase tracking-wider clip-angle flex items-center justify-center gap-1 shadow-md font-bold">
            <span class="material-symbols-outlined text-[16px]">person_add</span>Add Player
          </button>
          <button onclick="confirmRemoveTeam('${selectedTeam.id}')" class="px-space-sm py-2 bg-error-container text-on-error-container hover:bg-error-container/80 text-xs font-label-badge uppercase clip-angle" title="Delete Franchise">
            Delete Team
          </button>
        </div>
      </div>

      <!-- Squad Header Count -->
      <div class="flex items-center justify-between px-space-xs text-xs font-label-badge text-on-surface-variant uppercase">
        <span>Squad Roster (${members.length} Registered Athletes)</span>
        <span>Sport: ${selectedTeam.sport.toUpperCase()}</span>
      </div>

      <!-- Squad Members Table / Grid -->
      <div class="bg-surface-container-lowest border border-outline-variant/20 overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="bg-surface-container-high text-outline uppercase font-label-badge border-b border-outline-variant/20">
              <th class="py-2.5 px-3 w-12 text-center">#</th>
              <th class="py-2.5 px-3">Player Name</th>
              <th class="py-2.5 px-3">Role / Position</th>
              <th class="py-2.5 px-3">Style / Spec</th>
              <th class="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/10 font-body-sm">
            ${members.length === 0 ? `
              <tr>
                <td colspan="5" class="py-8 text-center text-on-surface-variant">
                  <span class="material-symbols-outlined text-3xl text-outline block mb-1">person_search</span>
                  No players currently drafted. Click <strong>"Add Player"</strong> above to register athletes into this squad.
                </td>
              </tr>
            ` : members.map(m => `
              <tr class="hover:bg-surface-container-high/40 transition-colors">
                <td class="py-2.5 px-3 text-center font-label-numeric-md font-bold text-secondary-container">
                  #${m.number || '--'}
                </td>
                <td class="py-2.5 px-3 font-title-md text-sm text-on-surface font-semibold">
                  <div class="flex items-center gap-1.5">
                    <span>${m.name}</span>
                    ${(m.name.includes('(c)') || selectedTeam.captain === m.name) ? '<span class="px-1.5 py-0.2 bg-secondary-container text-on-secondary-container text-[9px] font-mono font-bold uppercase">CAPTAIN</span>' : ''}
                  </div>
                </td>
                <td class="py-2.5 px-3 text-on-surface-variant font-medium">
                  ${m.role}
                </td>
                <td class="py-2.5 px-3 text-outline text-[11px]">
                  ${m.style || '--'}
                </td>
                <td class="py-2.5 px-3 text-right">
                  <button onclick="confirmRemoveMember('${selectedTeam.id}', '${m.id}')" class="p-1 text-on-surface-variant hover:text-error transition-colors" title="Remove Player from Squad">
                    <span class="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  window.selectTeamForRoster = function (teamId) {
    activeSelectedTeamId = teamId;
    window.renderRosterUI();
  };

  window.filterRosterSport = function (sport, btn) {
    currentSportFilter = sport;
    document.querySelectorAll('.roster-filter-btn').forEach(b => {
      b.className = 'roster-filter-btn px-space-md py-1 font-headline-sm text-xs uppercase tracking-wider text-on-surface-variant hover:text-on-surface clip-angle';
    });
    if (btn) {
      btn.className = 'roster-filter-btn px-space-md py-1 font-headline-sm text-xs uppercase tracking-wider bg-surface-container-highest text-secondary-container clip-angle font-bold';
    }
    window.renderRosterUI();
  };

  window.confirmRemoveTeam = function (teamId) {
    const team = window.LegendsRoster.getTeam(teamId);
    if (!team) return;
    if (confirm(`Are you sure you want to remove franchise "${team.name}" and all its squad members from the tournament?`)) {
      window.LegendsRoster.removeTeam(teamId);
      window.renderRosterUI();
    }
  };

  window.confirmRemoveMember = function (teamId, memberId) {
    const team = window.LegendsRoster.getTeam(teamId);
    if (!team) return;
    const member = team.members ? team.members.find(m => m.id === memberId) : null;
    const memberName = member ? member.name : 'this athlete';

    if (confirm(`Remove "${memberName}" from ${team.name} roster?`)) {
      window.LegendsRoster.removeMember(teamId, memberId);
      window.renderRosterUI();
    }
  };

  // Modals management
  window.openAddTeamModal = function () {
    const modal = document.getElementById('addTeamModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  };

  window.closeAddTeamModal = function () {
    const modal = document.getElementById('addTeamModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  };

  window.submitAddTeamForm = function (e) {
    if (e) e.preventDefault();
    const name = document.getElementById('teamNameInput').value;
    const shortCode = document.getElementById('teamCodeInput').value;
    const institution = document.getElementById('teamInstInput').value;
    const sport = document.getElementById('teamSportInput').value;
    const pool = document.getElementById('teamPoolInput').value;
    const captain = document.getElementById('teamCaptainInput').value;
    const color = document.getElementById('teamColorInput').value;

    try {
      window.LegendsRoster.addTeam({
        name: name,
        shortCode: shortCode,
        institution: institution,
        sport: sport,
        pool: pool,
        captain: captain,
        color: color
      });
      closeAddTeamModal();
      document.getElementById('newTeamForm').reset();
      window.renderRosterUI();
    } catch (err) {
      alert(err.message);
    }
  };

  window.openAddMemberModal = function (teamId) {
    const modal = document.getElementById('addMemberModal');
    const targetTeamIdInput = document.getElementById('targetMemberTeamId');
    const teamTitle = document.getElementById('addMemberTeamTitle');
    const team = window.LegendsRoster.getTeam(teamId);

    if (modal && targetTeamIdInput && team) {
      targetTeamIdInput.value = teamId;
      if (teamTitle) teamTitle.textContent = team.name;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  };

  window.closeAddMemberModal = function () {
    const modal = document.getElementById('addMemberModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  };

  window.submitAddMemberForm = function (e) {
    if (e) e.preventDefault();
    const teamId = document.getElementById('targetMemberTeamId').value;
    const name = document.getElementById('memberNameInput').value;
    const number = document.getElementById('memberNumberInput').value;
    const role = document.getElementById('memberRoleInput').value;
    const style = document.getElementById('memberStyleInput').value;
    const isCaptain = document.getElementById('memberIsCaptain').checked;

    try {
      window.LegendsRoster.addMember(teamId, {
        name: isCaptain ? `${name} (c)` : name,
        number: number,
        role: role,
        style: style,
        isCaptain: isCaptain
      });
      closeAddMemberModal();
      document.getElementById('newMemberForm').reset();
      window.renderRosterUI();
    } catch (err) {
      alert(err.message);
    }
  };

  // 4. STANDINGS POINT TABLE SYNC
  window.syncStandingsPointsTable = function () {
    const cricketTbody = document.getElementById('cricketTableBody');
    const footballTbody = document.getElementById('footballTableBody');
    if (!cricketTbody && !footballTbody) return;

    const teams = window.LegendsRoster.getTeams();
    const cricketTeams = teams.filter(t => t.sport === 'cricket');
    const footballTeams = teams.filter(t => t.sport === 'football');

    if (cricketTbody && cricketTeams.length > 0) {
      cricketTbody.innerHTML = cricketTeams.map((t, idx) => `
        <tr class="hover:bg-surface-container-high transition-colors ${idx === 0 ? 'bg-secondary-container/10 font-bold' : ''}">
          <td class="py-space-sm px-space-md text-center font-label-numeric-md ${idx === 0 ? 'text-secondary-container font-extrabold' : 'text-outline'}">
            ${String(idx + 1).padStart(2, '0')}
          </td>
          <td class="py-space-sm px-space-md">
            <div class="flex items-center gap-space-sm">
              <div class="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center font-headline-sm text-xs" style="border-top: 2px solid ${t.color}">
                ${t.shortCode}
              </div>
              <div>
                <span class="font-title-md text-sm text-on-surface uppercase">${t.name}</span>
                <span class="block font-label-badge text-[10px] text-outline uppercase">${t.institution} // ${t.pool}</span>
              </div>
            </div>
          </td>
          <td class="py-space-sm px-space-md text-center font-label-numeric-md">${t.played}</td>
          <td class="py-space-sm px-space-md text-center font-label-numeric-md text-tertiary font-bold">${t.won}</td>
          <td class="py-space-sm px-space-md text-center font-label-numeric-md text-primary font-bold">${t.lost}</td>
          <td class="py-space-sm px-space-md text-center font-label-numeric-md text-secondary-container font-extrabold">${t.pts}</td>
          <td class="py-space-sm px-space-md text-center font-label-numeric-md text-outline font-mono">${t.nrr}</td>
        </tr>
      `).join('');
    }

    if (footballTbody && footballTeams.length > 0) {
      footballTbody.innerHTML = footballTeams.map((t, idx) => `
        <tr class="hover:bg-surface-container-high transition-colors ${idx === 0 ? 'bg-secondary-container/10 font-bold' : ''}">
          <td class="py-space-sm px-space-md text-center font-label-numeric-md ${idx === 0 ? 'text-secondary-container font-extrabold' : 'text-outline'}">
            ${String(idx + 1).padStart(2, '0')}
          </td>
          <td class="py-space-sm px-space-md">
            <div class="flex items-center gap-space-sm">
              <div class="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center font-headline-sm text-xs" style="border-top: 2px solid ${t.color}">
                ${t.shortCode}
              </div>
              <div>
                <span class="font-title-md text-sm text-on-surface uppercase">${t.name}</span>
                <span class="block font-label-badge text-[10px] text-outline uppercase">${t.institution} // ${t.pool}</span>
              </div>
            </div>
          </td>
          <td class="py-space-sm px-space-md text-center font-label-numeric-md">${t.played}</td>
          <td class="py-space-sm px-space-md text-center font-label-numeric-md text-tertiary font-bold">${t.won}</td>
          <td class="py-space-sm px-space-md text-center font-label-numeric-md text-primary font-bold">${t.lost}</td>
          <td class="py-space-sm px-space-md text-center font-label-numeric-md text-secondary-container font-extrabold">${t.pts}</td>
          <td class="py-space-sm px-space-md text-center font-label-numeric-md text-outline font-mono">${t.nrr}</td>
        </tr>
      `).join('');
    }
  };

  // 5. INITIALIZATION
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('rosterTeamsListContainer')) {
      window.renderRosterUI();
    }
    if (document.getElementById('cricketTableBody')) {
      window.syncStandingsPointsTable();
    }

    window.addEventListener('legends_teams_changed', function () {
      if (document.getElementById('rosterTeamsListContainer')) {
        window.renderRosterUI();
      }
      if (document.getElementById('cricketTableBody')) {
        window.syncStandingsPointsTable();
      }
    });

    window.addEventListener('storage', function (e) {
      if (e.key === 'legends_teams_data') {
        if (document.getElementById('rosterTeamsListContainer')) {
          window.renderRosterUI();
        }
        if (document.getElementById('cricketTableBody')) {
          window.syncStandingsPointsTable();
        }
      }
    });
  });

})();
