import re
import os
import glob

base_dir = '/Users/areebalishivji/Desktop/Legends_walk_off'

# 1. IMMEDIATE BLOCKING REDIRECT SCRIPT IN HEAD FOR ADMIN PAGES
head_guard_script = '''<script>
  (function() {
    try {
      var session = localStorage.getItem('legends_auth_session');
      if (!session) {
        window.location.replace('login.html');
        return;
      }
      var user = JSON.parse(session);
      if (!user || !user.role || user.role === 'viewer') {
        window.location.replace('login.html');
        return;
      }
    } catch (e) {
      window.location.replace('login.html');
    }
  })();
</script>'''

for admin_file in ['admin-console.html', 'mobile-admin.html']:
    p = os.path.join(base_dir, admin_file)
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            c = f.read()
        if 'window.location.replace(\'login.html\')' not in c:
            c = c.replace('<head>', f'<head>\n{head_guard_script}')
            with open(p, 'w', encoding='utf-8') as f:
                f.write(c)
            print(f'Added instant head guard redirect to {admin_file}')

# 2. HIDE ALL ADMIN CONSOLE LINKS IN STATIC HTML OF PUBLIC PAGES
# Pages: index.html, standings.html, live-scores.html, about.html, mobile-live.html
public_pages = ['index.html', 'standings.html', 'live-scores.html', 'about.html', 'mobile-live.html']

for page in public_pages:
    p = os.path.join(base_dir, page)
    if not os.path.exists(p):
        continue
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()

    # Desktop nav link:
    # <a ... data-path="admin-console" href="admin-console.html">Admin Console</a>
    # Wrap/tag with hidden and style="display: none !important;"
    def hide_nav_link(match):
        tag = match.group(0)
        if 'data-admin-only' in tag:
            return tag
        # Add data-admin-only="true" style="display: none !important;" and class="hidden"
        tag = tag.replace('data-path="admin-console"', 'data-path="admin-console" data-admin-only="true" style="display: none !important;"')
        if 'hidden' not in tag:
            tag = tag.replace('class="', 'class="hidden ')
        return tag

    c = re.sub(r'<a[^>]+data-path=[\'\"]admin-console[\'\"][^>]*>.*?</a>', hide_nav_link, c, flags=re.DOTALL)

    # Mobile menu drawer link:
    # <a ... href="admin-console.html"><span>Official Admin Console</span>...</a>
    def hide_drawer_link(match):
        tag = match.group(0)
        if 'data-admin-only' in tag:
            return tag
        tag = tag.replace('href="admin-console.html"', 'href="admin-console.html" data-admin-only="true" style="display: none !important;"')
        if 'hidden' not in tag:
            tag = tag.replace('class="', 'class="hidden ')
        return tag

    c = re.sub(r'<a[^>]+href=[\'\"]admin-console\.html[\'\"][^>]*>.*?Official Admin Console.*?</a>', hide_drawer_link, c, flags=re.DOTALL)

    # Footer link:
    # <a class="font-body-sm ... data-path="admin-console" ...>Admin Console Portal</a>
    # We can hide it or replace with Admin Login link for officials
    def hide_footer_link(match):
        tag = match.group(0)
        if 'data-admin-only' in tag:
            return tag
        tag = tag.replace('href="admin-console.html"', 'href="admin-console.html" data-admin-only="true" style="display: none !important;"')
        if 'hidden' not in tag:
            tag = tag.replace('class="', 'class="hidden ')
        return tag

    c = re.sub(r'<a[^>]+data-path=[\'\"]admin-console[\'\"][^>]*>.*?Admin Console Portal.*?</a>', hide_footer_link, c, flags=re.DOTALL)

    # In mobile-live.html, update bottom nav admin-portal link to login.html for guests
    if page == 'mobile-live.html':
        c = re.sub(
            r'<a class="w-11 h-11[^"]*" data-path="admin-portal" href="admin-console.html">',
            r'<a class="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container-high text-secondary-container hover:bg-surface-container-highest transition-colors active:scale-95" data-path="admin-portal" data-admin-only="true" style="display: none !important;" href="admin-console.html">',
            c
        )
        c = re.sub(
            r'<a class="flex flex-col items-center justify-center min-w-\[56px\] h-12 text-on-surface-variant hover:text-on-surface transition-colors active:scale-95" data-path="admin-portal" href="admin-console.html">',
            r'<a class="flex flex-col items-center justify-center min-w-[56px] h-12 text-on-surface-variant hover:text-on-surface transition-colors active:scale-95" data-path="admin-portal" data-admin-only="true" style="display: none !important;" href="admin-console.html">',
            c
        )

    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f'Hidden admin-console links in static HTML of {page}')

