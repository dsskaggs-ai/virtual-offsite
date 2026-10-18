# Token sets for the three looks. Each look has light and dark palettes plus type and shape.
import urllib.parse

def noise(white, op):
    c = '1 1 1' if white else '0 0 0'
    r = c.split()
    svg = ("<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/>"
           "<feColorMatrix values='%s 0 0  0 %s 0 0 0 %s 0 0 0 %s 0  0 0 0 1 0' type='matrix'/></filter><rect width='100%%' height='100%%' filter='url(#n)' opacity='%s'/></svg>")
    # simple: colorize to a flat color, keep turbulence alpha
    svg = ("<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/>"
           "<feColorMatrix values='0 0 0 0 %s  0 0 0 0 %s  0 0 0 0 %s  0 0 0 .9 0'/></filter><rect width='100%%' height='100%%' filter='url(#n)' opacity='%s'/></svg>") % (r[0], r[1], r[2], op)
    return 'url("data:image/svg+xml,%s")' % urllib.parse.quote(svg, safe="/:=' ,.")

def dots(color):
    svg = "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='1' cy='1' r='1' fill='%s'/></svg>" % color
    return 'url("data:image/svg+xml,%s")' % urllib.parse.quote(svg, safe="/:=' ,.")

LOOKS = {
 'field': dict(
  name='Field', fonts_display='Fraunces',
  type=dict(disp='"Fraunces","Iowan Old Style","Palatino Linotype",Georgia,serif', stretch='100%', wt='600', h1wt='600', case='none', track='-.012em', h1='clamp(1.95rem,2.9vw,2.8rem)', h2='1.3rem', h1lh='1.06', brand='1.3rem', brandcase='none'),
  shape=dict(r='.6rem', rl='.95rem'),
  light=dict(bg='#F2EFE6', surface='#FFFEFA', surface2='#F7F4EB', ink='#1B241D', ink2='#475046', ink3='#5E665B', line='#DAD4C3', line2='#E9E4D6',
             accent='#2C5E3B', accent_ink='#FFFFFF', accent_soft='#DDE9DA', gain='#8A5800', gain_soft='#F6E8C3', ok='#2A6A3D', ok_soft='#D9EBDA', warn='#8F5509', warn_soft='#F7E4C2', bad='#A3322A', bad_soft='#F5D9D3',
             av_l='36%', av_fg='#FFFFFF', hl='rgba(255,255,255,.55)', sh='0 1px 0 rgba(255,255,255,.7) inset,0 1px 2px rgba(48,40,20,.08),0 12px 26px -10px rgba(48,40,20,.16)', shs='0 1px 2px rgba(48,40,20,.1)', bgimg=noise(False, '.07')),
  dark=dict(bg='#111611', surface='#182018', surface2='#1E271E', ink='#EDEBDF', ink2='#BBC2B2', ink3='#8E978A', line='#2C372C', line2='#232D23',
            accent='#8CCB8C', accent_ink='#0C170C', accent_soft='#1F3A22', gain='#E8B64C', gain_soft='#382D10', ok='#7FD39A', ok_soft='#173323', warn='#EBA94E', warn_soft='#3A2A10', bad='#F2958A', bad_soft='#422420',
            av_l='60%', av_fg='#0A1210', hl='rgba(255,255,255,.05)', sh='0 1px 0 rgba(255,255,255,.04) inset,0 1px 2px rgba(0,0,0,.5),0 14px 28px -12px rgba(0,0,0,.6)', shs='0 1px 2px rgba(0,0,0,.5)', bgimg=noise(True, '.05'))),
 'cab': dict(
  name='Cab', fonts_display='Barlow Condensed',
  type=dict(disp='"Barlow Condensed","Arial Narrow",Arial,sans-serif', stretch='100%', wt='700', h1wt='700', case='uppercase', track='.025em', h1='clamp(2.2rem,3.4vw,3.3rem)', h2='1.4rem', h1lh='1', brand='1.45rem', brandcase='uppercase'),
  shape=dict(r='.35rem', rl='.55rem'),
  light=dict(bg='#E7EBED', surface='#FFFFFF', surface2='#F0F3F4', ink='#0E171B', ink2='#3C4B53', ink3='#546670', line='#C9D2D7', line2='#DCE3E6',
             accent='#0B6F80', accent_ink='#FFFFFF', accent_soft='#D3ECF0', gain='#8A5200', gain_soft='#F8E4BA', ok='#1F6B45', ok_soft='#D5ECDF', warn='#8A5200', warn_soft='#F8E4BA', bad='#A3322A', bad_soft='#F5D9D3',
             av_l='36%', av_fg='#FFFFFF', hl='rgba(255,255,255,.6)', sh='0 1px 0 rgba(255,255,255,.8) inset,0 1px 2px rgba(10,30,40,.1),0 10px 22px -10px rgba(10,30,40,.2)', shs='0 1px 2px rgba(10,30,40,.12)', bgimg=noise(False, '.06')),
  dark=dict(bg='#0A0E10', surface='#11171A', surface2='#172024', ink='#EEF3F0', ink2='#B3C0BB', ink3='#84938D', line='#22303A', line2='#1A252B',
            accent='#52C7D6', accent_ink='#04171B', accent_soft='#0F2F36', gain='#F2A93B', gain_soft='#35260C', ok='#5FD18A', ok_soft='#12301F', warn='#F2A93B', warn_soft='#35260C', bad='#FF7B6B', bad_soft='#3D1F1B',
            av_l='60%', av_fg='#071013', hl='rgba(255,255,255,.04)', sh='0 1px 0 rgba(255,255,255,.05) inset,0 0 0 1px rgba(255,255,255,.02),0 16px 30px -14px rgba(0,0,0,.8)', shs='0 1px 2px rgba(0,0,0,.6)', bgimg=noise(True, '.07'))),
 'spec': dict(
  name='Spec', fonts_display='Archivo',
  type=dict(disp='"Archivo","Arial Narrow",system-ui,sans-serif', stretch='80%', wt='750', h1wt='800', case='none', track='-.005em', h1='clamp(1.9rem,2.9vw,2.8rem)', h2='1.2rem', h1lh='1.05', brand='1.2rem', brandcase='uppercase'),
  shape=dict(r='.45rem', rl='.7rem'),
  light=dict(bg='#EDF0F5', surface='#FFFFFF', surface2='#F4F6FA', ink='#0F1A2B', ink2='#3F4D63', ink3='#566580', line='#D3D9E3', line2='#E3E8EF',
             accent='#1B4F9C', accent_ink='#FFFFFF', accent_soft='#DCE6F6', gain='#8D5B00', gain_soft='#F6E9C8', ok='#1F6B45', ok_soft='#D6EDE0', warn='#8F5509', warn_soft='#F7E4C2', bad='#A3322A', bad_soft='#F5D9D3',
             av_l='36%', av_fg='#FFFFFF', hl='rgba(255,255,255,.5)', sh='0 1px 2px rgba(15,26,43,.08),0 8px 20px -8px rgba(15,26,43,.14)', shs='0 1px 2px rgba(15,26,43,.1)', bgimg=dots('#C9D1DE')),
  dark=dict(bg='#0C121C', surface='#131B28', surface2='#192233', ink='#E8EEF7', ink2='#B3BFD0', ink3='#8795AB', line='#263248', line2='#1E293B',
            accent='#7FB0F0', accent_ink='#07111F', accent_soft='#1A2E4D', gain='#E6B84F', gain_soft='#37300F', ok='#72C794', ok_soft='#173326', warn='#E8A84F', warn_soft='#3A2A10', bad='#F09286', bad_soft='#41211D',
            av_l='60%', av_fg='#0A1214', hl='rgba(255,255,255,.04)', sh='0 1px 2px rgba(0,0,0,.5),0 10px 24px -10px rgba(0,0,0,.6)', shs='0 1px 2px rgba(0,0,0,.5)', bgimg=dots('#223049'))),
}

def block(pal, typ=None, shape=None):
    o = []
    m = dict(bg='--bg', surface='--surface', surface2='--surface2', ink='--ink', ink2='--ink2', ink3='--ink3', line='--line', line2='--line2', accent='--accent', accent_ink='--accent-ink', accent_soft='--accent-soft',
             gain='--gain', gain_soft='--gain-soft', ok='--ok', ok_soft='--ok-soft', warn='--warn', warn_soft='--warn-soft', bad='--bad', bad_soft='--bad-soft', av_l='--av-l', av_fg='--av-fg', hl='--hl', sh='--shadow', shs='--shadow-s', bgimg='--bgimg')
    for k, v in pal.items(): o.append('%s:%s' % (m[k], v))
    if typ:
        o += ['--f-display:%s' % typ['disp'], '--d-stretch:%s' % typ['stretch'], '--d-wt:%s' % typ['wt'], '--d-h1wt:%s' % typ['h1wt'], '--d-case:%s' % typ['case'], '--d-track:%s' % typ['track'],
              '--h1:%s' % typ['h1'], '--h2:%s' % typ['h2'], '--h1lh:%s' % typ['h1lh'], '--brand:%s' % typ['brand'], '--brand-case:%s' % typ['brandcase']]
    if shape: o += ['--r:%s' % shape['r'], '--r-lg:%s' % shape['rl']]
    return ';'.join(o)

def tokens_css(keys, default_look=None):
    """If one key: tokens apply to bare :root. If several: scoped by [data-look]."""
    out = []
    shared = ('--f-body:"Public Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--f-mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;')
    multi = len(keys) > 1
    for k in keys:
        L = LOOKS[k]
        first = multi and k == keys[0]
        sel = (':root,:root[data-look="%s"]' % k) if first else (':root[data-look="%s"]' % k if multi else ':root')
        sel_dm = (':root:not([data-look]):not([data-theme="light"]),:root[data-look="%s"]:not([data-theme="light"])' % k) if first else (':root[data-look="%s"]:not([data-theme="light"])' % k if multi else ':root:not([data-theme="light"])')
        sel_d = (':root[data-theme="dark"]:not([data-look]),:root[data-theme="dark"][data-look="%s"]' % k) if first else (':root[data-theme="dark"][data-look="%s"]' % k if multi else ':root[data-theme="dark"]')
        out.append('%s{%s}' % (sel, (shared if not multi else '') + block(L['light'], L['type'], L['shape']) + ';color-scheme:light'))
        d = block(L['dark']) + ';color-scheme:dark'
        out.append('@media (prefers-color-scheme: dark){%s{%s}}' % (sel_dm, d))
        out.append('%s{%s}' % (sel_d, d))
    if multi:  # shared fonts for every look
        out.insert(0, ':root{%s}' % shared)
    return '\n'.join(out)
