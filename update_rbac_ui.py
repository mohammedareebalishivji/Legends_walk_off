import re
import os

base_dir = '/Users/areebalishivji/Desktop/Legends_walk_off'

# 1. UPDATE admin-console.html
admin_path = os.path.join(base_dir, 'admin-console.html')
with open(admin_path, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace security ribbon
old_ribbon_regex = r'<section class="w-full bg-error-container text-on-error-container px-gutter py-space-sm shadow-xl">.*?</section>'
new_ribbon = '''<!-- RBAC Diagnostic Header / Security Ribbon -->
<section class="w-full bg-surface-container border-b border-outline-variant/30 px-gutter py-2.5 shadow-xl">
<div class="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-space-sm font-label-badge text-label-badge uppercase tracking-wider">
  <div class="flex flex-wrap items-center gap-space-sm">
    <div class="flex items-center gap-1.5 text-secondary-container">
      <span class="material-symbols-outlined text-[18px]">verified_user</span>
      <span class="font-bold text-on-surface">OFFICIAL:</span>
      <span id="rbac-user-name" class="text-secondary-container font-mono">Rajesh K. (NMIMS STME Impulse)</span>
    </div>
    <span class="text-outline">|</span>
    <span id="rbac-role-badge" class="px-space-sm py-0.5 font-label-badge text-label-badge uppercase font-bold clip-angle bg-secondary-container text-on-secondary-container">Committee Executive Admin</span>
  </div>
  
  <div class="flex flex-wrap items-center gap-space-md">
    <!-- Live RBAC Role Switcher (Ideal for review & demo) -->
    <div class="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1 border border-outline-variant/40">
      <span class="material-symbols-outlined text-xs text-outline">tune</span>
      <label for="rbac-role-switcher" class="text-[10px] text-outline uppercase font-semibold">Active Role:</label>
      <select id="rbac-role-switcher" onchange="window.LegendsRBAC && window.LegendsRBAC.switchRole(this.value)" class="bg-transparent text-secondary-container font-bold text-xs uppercase focus:outline-none cursor-pointer">
        <option value="committee" class="bg-surface-container-high text-on-surface">Committee Admin (Full Access)</option>
        <option value="cricket" class="bg-surface-container-high text-on-surface">Cricket Scorer (Cricket Only)</option>
        <option value="football" class="bg-surface-container-high text-on-surface">Football Scorer (Football Only)</option>
        <option value="referees" class="bg-surface-container-high text-on-surface">Referees Panel (Judge / Review)</option>
      </select>
    </div>

    <!-- Live Telemetry Status -->
    <span class="hidden sm:flex items-center gap-1 font-label-numeric-md text-label-numeric-md">
      <span class="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
      Relay: <span class="text-tertiary-fixed font-bold">ONLINE</span>
    </span>

    <!-- Reset Match Button -->
    <button onclick="if(confirm('Reset match score to initial baseline?')){ window.LegendsApp && window.LegendsApp.resetMatchState(); location.reload(); }" class="px-2.5 py-1 bg-surface-container-highest hover:bg-error-container hover:text-on-error-container text-on-surface-variant font-label-badge text-xs uppercase transition-colors clip-angle flex items-center gap-1" data-rbac-perm="match:reset" title="Reset score to defaults">
      <span class="material-symbols-outlined text-[14px]">restart_alt</span>Reset Match
    </button>

    <!-- Logout Button -->
    <button onclick="window.LegendsRBAC && window.LegendsRBAC.logout()" class="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container-highest hover:bg-primary-container hover:text-on-primary-container text-on-surface-variant transition-colors font-label-badge text-xs uppercase" title="Sign Out">
      <span class="material-symbols-outlined text-[14px]">logout</span>
      <span>Exit Portal</span>
    </button>
  </div>
</div>
</section>'''

c = re.sub(old_ribbon_regex, new_ribbon, c, count=1, flags=re.DOTALL)

# Add deck locks
cricket_lock = '''<div id="cricket-deck-lock" class="hidden p-space-md bg-error-container text-on-error-container border border-primary font-bold flex flex-wrap items-center justify-between gap-space-sm clip-angle mb-space-md">
  <div class="flex items-center gap-2">
    <span class="material-symbols-outlined text-xl">lock</span>
    <span>RESTRICTED VIEW: You are logged in with Football / Referee credentials. Cricket scoring controls are locked in read-only mode.</span>
  </div>
  <button onclick="window.LegendsRBAC && window.LegendsRBAC.switchRole('cricket')" class="px-space-sm py-1 bg-surface-container-highest text-on-surface hover:bg-primary-container hover:text-on-primary font-label-badge text-xs uppercase clip-angle">Switch to Cricket Scorer</button>
</div>'''

football_lock = '''<div id="football-deck-lock" class="hidden p-space-md bg-error-container text-on-error-container border border-primary font-bold flex flex-wrap items-center justify-between gap-space-sm clip-angle mb-space-md">
  <div class="flex items-center gap-2">
    <span class="material-symbols-outlined text-xl">lock</span>
    <span>RESTRICTED VIEW: You are logged in with Cricket / Referee credentials. Football scoring controls are locked in read-only mode.</span>
  </div>
  <button onclick="window.LegendsRBAC && window.LegendsRBAC.switchRole('football')" class="px-space-sm py-1 bg-surface-container-highest text-on-surface hover:bg-tertiary-container hover:text-on-tertiary font-label-badge text-xs uppercase clip-angle">Switch to Football Scorer</button>
</div>'''

c = c.replace('<div class="flex flex-col gap-space-lg" id="cricketConsole">', f'<div class="flex flex-col gap-space-lg" id="cricketConsole">\n{cricket_lock}')
c = c.replace('id="footballConsole">', f'id="footballConsole">\n{football_lock}')

# Add data-rbac-perm attributes to buttons
c = re.sub(r'(onclick="recordCricketDelivery\([^)]+\)")', r'data-rbac-perm="cricket:score" \1', c)
c = re.sub(r'(onclick="recordCricketExtra\([^)]+\)")', r'data-rbac-perm="cricket:score" \1', c)
c = re.sub(r'(onclick="openWicketModal\(\)")', r'data-rbac-perm="cricket:wicket" \1', c)
c = re.sub(r'(onclick="undoLastDelivery\(\)")', r'data-rbac-perm="cricket:undo" \1', c)
c = re.sub(r'(onclick="swapStrike\(\)")', r'data-rbac-perm="cricket:score" \1', c)
c = re.sub(r'(onclick="openChangeBowlerModal\(\)")', r'data-rbac-perm="cricket:score" \1', c)
c = re.sub(r'(onclick="recordFootballEvent\([^)]+\)")', r'data-rbac-perm="football:score" \1', c)
c = re.sub(r'(onclick="toggleFootballClock\(\)")', r'data-rbac-perm="football:clock" \1', c)
c = re.sub(r'(onclick="undoFootballEvent\(\)")', r'data-rbac-perm="football:undo" \1', c)
c = re.sub(r'(onclick="setFootballPeriod\([^)]+\)")', r'data-rbac-perm="football:score" \1', c)
c = re.sub(r'(onclick="editAuditEntry\(this\)")', r'data-rbac-perm="referee:override" \1', c)
c = re.sub(r'(onclick="openDlsModal\(\)")', r'data-rbac-perm="dls:calculate" \1', c)
c = re.sub(r'(onclick="pushBannerBroadcast\(\)")', r'data-rbac-perm="alerts:broadcast" \1', c)
c = re.sub(r'(onclick="openEndMatchModal\(\)")', r'data-rbac-perm="match:finalize" \1', c)

# Ensure js/legends-rbac.js is included
if 'js/legends-rbac.js' not in c:
    c = c.replace('<script src="js/legends-core.js"></script>', '<script src="js/legends-core.js"></script>\n<script src="js/legends-rbac.js"></script>')

with open(admin_path, 'w', encoding='utf-8') as f:
    f.write(c)
print("Updated admin-console.html with RBAC UI & permissions")


# 2. UPDATE login.html
login_path = os.path.join(base_dir, 'login.html')
with open(login_path, 'r', encoding='utf-8') as f:
    c = f.read()

# Enhance login script to use LegendsRBAC.login
old_login_js = """loginForm.addEventListener('submit', function(e) {
        if (e) e.preventDefault();
        const btn = document.getElementById('submitBtn');
        const emailInput = document.getElementById('adminEmail');
        const email = emailInput ? emailInput.value : 'officer@nmims.edu.in';
        if (btn) {
          btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span><span>AUTHENTICATING SCORER...</span>';
          btn.classList.add('opacity-80', 'pointer-events-none');
          setTimeout(() => {
            btn.innerHTML = '<span class="material-symbols-outlined text-lg">check_circle</span><span>ACCESS GRANTED • ENTERING ARENA</span>';
            btn.classList.remove('bg-primary-container');
            btn.classList.add('bg-tertiary-container', 'text-on-tertiary-container');
            localStorage.setItem('legends_admin_logged_in', 'true');
            localStorage.setItem('legends_admin_email', email);
            if (window.LegendsApp) {
              window.LegendsApp.showToast('Authentication Successful! Welcome, Scorer.', 'success');
            }
            setTimeout(() => {
              window.location.href = 'admin-console.html';
            }, 800);
          }, 1000);
        }
      });"""

new_login_js = """loginForm.addEventListener('submit', function(e) {
        if (e) e.preventDefault();
        const btn = document.getElementById('submitBtn');
        const emailInput = document.getElementById('adminEmail');
        const roleSelect = document.getElementById('adminRole');
        const email = emailInput ? emailInput.value : 'officer@nmims.edu.in';
        const role = roleSelect ? roleSelect.value : 'committee';

        if (btn) {
          btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span><span>AUTHENTICATING ' + role.toUpperCase() + '...</span>';
          btn.classList.add('opacity-80', 'pointer-events-none');
          setTimeout(() => {
            if (window.LegendsRBAC) {
              window.LegendsRBAC.login(email, role);
            }
            btn.innerHTML = '<span class="material-symbols-outlined text-lg">check_circle</span><span>ACCESS GRANTED • ROLE VERIFIED</span>';
            btn.classList.remove('bg-primary-container');
            btn.classList.add('bg-tertiary-container', 'text-on-tertiary-container');
            if (window.LegendsApp) {
              window.LegendsApp.showToast('Logged in as ' + role.toUpperCase(), 'success');
            }
            setTimeout(() => {
              window.location.href = 'admin-console.html';
            }, 700);
          }, 900);
        }
      });"""

c = c.replace(old_login_js, new_login_js)

# Add role description preview under adminRole select
role_preview = '''
<div id="roleDescriptionBox" class="mt-2 p-space-xs bg-surface-container-high border-l-2 border-secondary-container text-xs text-on-surface-variant flex items-start gap-2">
  <span class="material-symbols-outlined text-sm text-secondary-container mt-0.5">info</span>
  <span id="roleDescriptionText">Field official authorized for cricket ball-by-ball scoring, wickets, and extras.</span>
</div>
'''

if 'id="roleDescriptionBox"' not in c:
    c = c.replace('</select>', '</select>\n' + role_preview)

# Add listener for role select change
role_change_js = '''
    const roleSelect = document.getElementById('adminRole');
    const roleDesc = document.getElementById('roleDescriptionText');
    const roleDescriptions = {
      cricket: 'Official Field Scorer: Real-time ball-by-ball delivery, wicket recording, extras, and striker swap.',
      football: 'Official Match Scorer: Goals, penalty cards, fouls, half-time clock management, and substitutions.',
      committee: 'Executive Super-Admin: Unrestricted arena control, emergency broadcast announcements, sponsor curation, and match finalization.',
      referees: 'Match Referees Panel: Audit log adjudication, referee override, DLS target calculations, and match verification.'
    };
    if (roleSelect && roleDesc) {
      roleSelect.addEventListener('change', function() {
        roleDesc.textContent = roleDescriptions[this.value] || '';
      });
    }
'''

c = c.replace('const loginForm = document.getElementById(\'adminLoginForm\');', role_change_js + '\n    const loginForm = document.getElementById(\'adminLoginForm\');')

# Ensure js/legends-rbac.js is included
if 'js/legends-rbac.js' not in c:
    c = c.replace('<script src="js/legends-core.js"></script>', '<script src="js/legends-core.js"></script>\n<script src="js/legends-rbac.js"></script>')

with open(login_path, 'w', encoding='utf-8') as f:
    f.write(c)
print("Updated login.html with dynamic RBAC login & role preview")

# 3. UPDATE mobile-admin.html
mobile_path = os.path.join(base_dir, 'mobile-admin.html')
if os.path.exists(mobile_path):
    with open(mobile_path, 'r', encoding='utf-8') as f:
        c = f.read()
    if 'js/legends-rbac.js' not in c:
        c = c.replace('<script src="js/legends-core.js"></script>', '<script src="js/legends-core.js"></script>\n<script src="js/legends-rbac.js"></script>')
        with open(mobile_path, 'w', encoding='utf-8') as f:
            f.write(c)
        print("Updated mobile-admin.html with RBAC script")
