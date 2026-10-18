import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import looks
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    la,lb=lum(a),lum(b);
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
bad=0
for k,L in looks.LOOKS.items():
    for mode in ('light','dark'):
        p=L[mode]
        checks=[('ink/bg',p['ink'],p['bg'],4.5),('ink2/bg',p['ink2'],p['bg'],4.5),('ink3/bg',p['ink3'],p['bg'],4.5),('ink3/surface',p['ink3'],p['surface'],4.5),('ink3/surface2',p['ink3'],p['surface2'],4.5),
                ('ink/surface',p['ink'],p['surface'],7),('accent-ink/accent',p['accent_ink'],p['accent'],4.5),('accent/accent-soft',p['accent'],p['accent_soft'],4.5),('accent/surface',p['accent'],p['surface'],4.5),
                ('gain/gain-soft',p['gain'],p['gain_soft'],4.5),('ok/ok-soft',p['ok'],p['ok_soft'],4.5),('warn/warn-soft',p['warn'],p['warn_soft'],4.5),('bad/bad-soft',p['bad'],p['bad_soft'],4.5),('bad/surface',p['bad'],p['surface'],4.5),('ink2/surface',p['ink2'],p['surface'],4.5),('ink/gain-soft',p['ink'],p['gain_soft'],7)]
        for n,a,b,t in checks:
            r=cr(a,b)
            if r<t: bad+=1; print('LOW',k,mode,n,round(r,2),'need',t)
print('done, issues:',bad)
