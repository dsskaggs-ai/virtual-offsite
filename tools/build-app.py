#!/usr/bin/env python3
"""Assemble the meeting app.
   src/head.html   styles and page shell (look tokens sit between /*LOOKS_START*/ and /*LOOKS_END*/)
   src/tools.css   styles for the newer tools
   src/js/*.js     the app, in file name order
   -> dist/app.html
Edit tools/looks.py to change a palette, then run this and tools/contrast.py."""
import os, re, sys, glob
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
sys.path.insert(0, here)
import looks
head = open(os.path.join(root, 'src', 'head.html'), encoding='utf8').read()
css = open(os.path.join(root, 'src', 'tools.css'), encoding='utf8').read()
new = '/*LOOKS_START*/\n' + looks.tokens_css(['field', 'cab', 'spec']) + '\n/*LOOKS_END*/'
head, n = re.subn(r'/\*LOOKS_START\*/.*?/\*LOOKS_END\*/', lambda m: new, head, count=1, flags=re.S)
assert n == 1, 'look markers not found'
assert head.count('</style>') >= 1
tour_css = open(os.path.join(root, 'src', 'tour.css'), encoding='utf8').read()
head = head.replace('</style>', css + tour_css + '</style>', 1)
js = ''.join(open(f, encoding='utf8').read().rstrip('\n') + '\n\n' for f in sorted(glob.glob(os.path.join(root, 'src', 'js', '*.js'))))
assert '</script' not in js.lower(), 'a script tag closes inside the app code'
out = head.rstrip('\n') + '\n\n<script>\n' + js + '</script>\n'
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
open(os.path.join(root, 'dist', 'app.html'), 'w', encoding='utf8').write(out)
print('dist/app.html', len(out), 'bytes,', out.count('\n'), 'lines')

# organizer console: one look (field), light/dark from the system
con = open(os.path.join(root, 'src', 'console.src.html'), encoding='utf8').read()
cnew = '/*LOOKS_START*/\n' + looks.tokens_css(['field']) + '\n/*LOOKS_END*/'
con, n = re.subn(r'/\*LOOKS_START\*/.*?/\*LOOKS_END\*/', lambda m: cnew, con, count=1, flags=re.S)
assert n == 1, 'console look markers not found'
assert '/*TOUR_CSS*/' in con and '/*TOUR_CORE*/' in con, 'console tour markers not found'
con = con.replace('/*TOUR_CSS*/', tour_css, 1).replace('/*TOUR_CORE*/', open(os.path.join(root, 'src', 'js', '01-tour-core.js'), encoding='utf8').read(), 1)
open(os.path.join(root, 'dist', 'console.html'), 'w', encoding='utf8').write(con)
print('dist/console.html', len(con), 'bytes')
