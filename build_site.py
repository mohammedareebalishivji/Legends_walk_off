import re
import os

def refine_site():
    base_dir = '/Users/areebalishivji/Desktop/Legends_walk_off'

    # 1. Update about.html active nav tab
    about_path = os.path.join(base_dir, 'about.html')
    with open(about_path, 'r', encoding='utf-8') as f:
        c = f.read()
    
    old_about_nav = '<a class="px-space-md py-space-sm font-headline-sm text-headline-sm uppercase tracking-wider text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all" data-path="about-sponsors" href="about.html">About &amp; Sponsors</a>'
    new_about_nav = '<a aria-current="page" class="px-space-md py-space-sm font-headline-sm uppercase tracking-wider transition-all bg-surface-container-high text-secondary-container shadow-[inset_0_-2px_0_0_#fed400]" data-path="about-sponsors" href="about.html">About &amp; Sponsors</a>'
    c = c.replace(old_about_nav, new_about_nav)
    with open(about_path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Fixed about.html active tab")

    # 2. Update login.html return link and redirect on submit
    login_path = os.path.join(base_dir, 'login.html')
    with open(login_path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Fix return link
    c = re.sub(
        r'<a class="group inline-flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors py-space-xs px-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container shadow-sm" href="#">',
        r'<a class="group inline-flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors py-space-xs px-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container shadow-sm" href="index.html">',
        c
    )

    # Enhance login submit handler
    old_login_js = """loginForm.addEventListener('submit', function() {
        const btn = document.getElementById('submitBtn');
        if (btn) {
          const originalText = btn.innerHTML;
          btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span><span>AUTHENTICATING SCORER...</span>';
          btn.classList.add('opacity-80', 'pointer-events-none');
          setTimeout(() => {
            btn.innerHTML = '<span class="material-symbols-outlined text-lg">check_circle</span><span>ACCESS GRANTED</span>';
            btn.classList.remove('bg-primary-container');
            btn.classList.add('bg-tertiary-container', 'text-on-tertiary-container');
            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.classList.remove('bg-tertiary-container', 'text-on-tertiary-container', 'opacity-80', 'pointer-events-none');
              btn.classList.add('bg-primary-container');
            }, 2500);
          }, 1200);
        }
      });"""

    new_login_js = """loginForm.addEventListener('submit', function(e) {
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

    c = c.replace(old_login_js, new_login_js)
    with open(login_path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Fixed login.html return link & redirect")

    # 3. Update admin-console.html for live synchronization
    admin_path = os.path.join(base_dir, 'admin-console.html')
    with open(admin_path, 'r', encoding='utf-8') as f:
        c = f.read()

    # In updateCricketLiveHUD, sync with localStorage and LegendsApp
    old_update_hud = """function updateCricketLiveHUD(lastEvent) {
      const scoreTeamA = document.getElementById('scoreTeamA');
      const oversTeamA = document.getElementById('oversTeamA');
      scoreTeamA.textContent = cricketRuns + '/' + cricketWickets;
      oversTeamA.textContent = '(' + calculateOversString(totalLegalBalls) + ' ov)';
    }"""

    new_update_hud = """function updateCricketLiveHUD(lastEvent) {
      const scoreTeamA = document.getElementById('scoreTeamA');
      const oversTeamA = document.getElementById('oversTeamA');
      if (scoreTeamA) scoreTeamA.textContent = cricketRuns + '/' + cricketWickets;
      if (oversTeamA) oversTeamA.textContent = '(' + calculateOversString(totalLegalBalls) + ' ov)';

      if (window.LegendsApp) {
        const state = window.LegendsApp.getMatchState();
        state.runs = cricketRuns;
        state.wickets = cricketWickets;
        state.balls = totalLegalBalls;
        state.lastEvent = lastEvent || 'Score Updated';
        window.LegendsApp.saveMatchState(state);
      }
    }

    // Load persisted state on startup
    window.addEventListener('DOMContentLoaded', function() {
      if (window.LegendsApp) {
        const state = window.LegendsApp.getMatchState();
        cricketRuns = state.runs || 148;
        cricketWickets = state.wickets !== undefined ? state.wickets : 3;
        totalLegalBalls = state.balls || 88;
        const scoreTeamA = document.getElementById('scoreTeamA');
        const oversTeamA = document.getElementById('oversTeamA');
        if (scoreTeamA) scoreTeamA.textContent = cricketRuns + '/' + cricketWickets;
        if (oversTeamA) oversTeamA.textContent = '(' + calculateOversString(totalLegalBalls) + ' ov)';
      }
    });"""

    c = c.replace(old_update_hud, new_update_hud)

    # In pushBannerBroadcast, sync with LegendsApp
    old_banner = """function pushBannerBroadcast() {
      const msg = document.getElementById('customAlertInput').value;
      if (msg) {
        alert('Public Arena Alert Dispatched: "' + msg + '"');
        document.getElementById('customAlertInput').value = '';
      }
    }"""

    new_banner = """function pushBannerBroadcast() {
      const msg = document.getElementById('customAlertInput').value;
      if (msg) {
        if (window.LegendsApp) {
          const state = window.LegendsApp.getMatchState();
          state.announcement = msg;
          window.LegendsApp.saveMatchState(state);
          window.LegendsApp.showToast('Arena Alert Broadcasted: ' + msg, 'success');
        } else {
          alert('Public Arena Alert Dispatched: "' + msg + '"');
        }
        document.getElementById('customAlertInput').value = '';
      }
    }"""

    c = c.replace(old_banner, new_banner)

    # Add quick Reset match button in admin console header controls
    admin_header_controls = """<button onclick="if(confirm('Reset match score to initial baseline?')){ window.LegendsApp && window.LegendsApp.resetMatchState(); location.reload(); }" class="px-space-sm py-1 bg-surface-container-highest hover:bg-error-container hover:text-on-error-container text-on-surface-variant font-label-badge text-label-badge uppercase tracking-wider transition-colors clip-angle flex items-center gap-1" title="Reset score to defaults"><span class="material-symbols-outlined text-[14px]">restart_alt</span>Reset Match</button>"""
    c = c.replace('</header>', f'<!-- Reset Control Header Insertion --></header>')

    with open(admin_path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Fixed admin-console.html live HUD and state sync")

    # 4. Tag live-scores.html score and overs with data-sync
    live_path = os.path.join(base_dir, 'live-scores.html')
    with open(live_path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Find the main score display in live-scores.html
    # <span class="font-label-numeric-lg text-label-numeric-lg text-on-surface font-extrabold tracking-tight">148<span class="text-primary">/4</span></span>
    # <span class="font-label-numeric-md text-label-numeric-md text-outline font-semibold">(17.2 OV)</span>
    c = re.sub(
        r'<span class="font-label-numeric-lg text-label-numeric-lg text-on-surface font-extrabold tracking-tight">148<span class="text-primary">/4</span></span>',
        r'<span data-sync="cricket-score" class="font-label-numeric-lg text-label-numeric-lg text-on-surface font-extrabold tracking-tight">148<span class="text-primary">/3</span></span>',
        c
    )
    c = re.sub(
        r'<span class="font-label-numeric-md text-label-numeric-md text-outline font-semibold">\(17\.2 OV\)</span>',
        r'<span data-sync="cricket-overs" class="font-label-numeric-md text-label-numeric-md text-outline font-semibold">(14.4 OV)</span>',
        c
    )

    # In top ticker, add live-broadcast-alert id
    c = re.sub(
        r'(LIVE BROADCAST • MATCH 14 • ARENA 1\s*</div>)',
        r'\1\n<div class="hidden sm:inline-flex items-center gap-1 text-secondary-container font-label-badge text-label-badge uppercase tracking-wider"><span class="material-symbols-outlined text-sm">campaign</span><span id="live-broadcast-alert">Championship Match #14 - Rain prediction 0%, floodlights at 100%</span></div>',
        c
    )

    with open(live_path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Fixed live-scores.html sync tags & ticker")

    # 5. Tag index.html Match 1 score and overs with data-sync
    index_path = os.path.join(base_dir, 'index.html')
    with open(index_path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Match 1 score in index.html:
    # <span class="font-label-numeric-lg text-label-numeric-lg text-secondary-container">142/4</span>
    # <span>Overs: <strong class="text-on-surface font-label-numeric-md">17.2</strong></span>
    c = re.sub(
        r'<span class="font-label-numeric-lg text-label-numeric-lg text-secondary-container">142/4</span>',
        r'<span data-sync="cricket-score" class="font-label-numeric-lg text-label-numeric-lg text-secondary-container">148/3</span>',
        c
    )
    c = re.sub(
        r'<span>Overs: <strong class="text-on-surface font-label-numeric-md">17\.2</strong></span>',
        r'<span>Overs: <strong data-sync="cricket-overs" class="text-on-surface font-label-numeric-md">14.4</strong></span>',
        c
    )

    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Fixed index.html sync tags")

if __name__ == '__main__':
    refine_site()
