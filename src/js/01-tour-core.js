/* ============================ first-login tour engine ============================
   Shared by the room and by the organizer console (tools/build-app.py puts this file in both).
   Tour.start({key, steps, force, onStep, onEnd})
     step: { sel, title, body: [lines], opt, before }
       sel     CSS selector of the thing to point at. No selector, or an element that is not on screen, shows a centered card.
       body    array of lines. A line that starts with "- " becomes a bullet.
       opt     drop the step when the element is missing or hidden
       before  function to run before the step is measured (switch a pane, scroll a list)
   The tour shows once per browser per key. Tour.seen(key) says whether it has. Tour.start({force:true}) replays it.
   Storage is optional. If the browser refuses it, the tour just shows each time. */
var Tour=(function(){
  var run=null,KEYP='mr.tour.',KEYS='.v1';
  function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
  function seen(key){return !!store(KEYP+key+KEYS)}
  function mk(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
  function onScreen(el){if(!el||el.hidden)return false;var r=el.getBoundingClientRect();return r.width>2&&r.height>2}
  function reduce(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
  function stop(){
    if(!run)return;var r=run;run=null;
    document.removeEventListener('keydown',r.keys,true);window.removeEventListener('resize',r.place);window.removeEventListener('scroll',r.place,true);
    r.root.remove();
    try{if(r.prev&&r.prev.focus&&document.contains(r.prev))r.prev.focus()}catch(e){}
    if(r.o.onEnd){try{r.o.onEnd()}catch(e){}}
  }
  function start(o){
    if(run)return false;
    if(!o.force&&seen(o.key))return false;
    var steps=(o.steps||[]).filter(function(s){if(!s.opt)return true;var el=s.sel&&document.querySelector(s.sel);return !!el&&!el.hidden});
    if(!steps.length)return false;
    store(KEYP+o.key+KEYS,String(Date.now()));
    var i=0,root=mk('div','tour'),shade=mk('div','tour-shade'),hole=mk('div','tour-hole'),card=mk('div','tour-card');
    var tk=mk('div','tk'),title=mk('h2','tour-h'),body=mk('div','tour-b'),dots=mk('div','tour-dots'),acts=mk('div','tour-actions');
    var uid='tour'+Math.floor(Math.random()*1e6);
    title.id=uid+'t';body.id=uid+'b';
    card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby',title.id);card.setAttribute('aria-describedby',body.id);card.tabIndex=-1;
    var skip=mk('button','btn link tour-skip','Skip tour'),back=mk('button','btn','Back'),next=mk('button','btn pri','Next');
    skip.type=back.type=next.type='button';
    acts.append(skip,back,next);card.append(tk,title,body,dots,acts);root.append(shade,hole,card);
    var prev=document.activeElement;
    function target(){var s=steps[i];if(!s.sel)return null;var el=document.querySelector(s.sel);return onScreen(el)?el:null}
    function place(){
      if(!run)return;
      var el=target(),vw=window.innerWidth,vh=window.innerHeight,m=12,gap=14;
      var cw=card.offsetWidth,ch=card.offsetHeight,x,y;
      if(!el){
        shade.className='tour-shade on';hole.style.display='none';
        x=(vw-cw)/2;y=Math.max(m,(vh-ch)/2.4);
      }else{
        var r=el.getBoundingClientRect();
        shade.className='tour-shade';hole.style.display='block';
        var pad=4,hx=Math.max(0,r.left-pad),hy=Math.max(0,r.top-pad),hw=Math.min(vw-hx,r.width+pad*2),hh=Math.min(vh-hy,r.height+pad*2);
        hole.style.left=hx+'px';hole.style.top=hy+'px';hole.style.width=hw+'px';hole.style.height=hh+'px';
        var spaceB=vh-(hy+hh)-gap-m,spaceA=hy-gap-m,spaceR=vw-(hx+hw)-gap-m,spaceL=hx-gap-m;
        var cx=Math.min(Math.max(m,hx+hw/2-cw/2),vw-cw-m),cy=Math.min(Math.max(m,hy+hh/2-ch/2),vh-ch-m);
        if(spaceB>=ch){x=cx;y=hy+hh+gap}
        else if(spaceA>=ch){x=cx;y=hy-gap-ch}
        else if(spaceR>=cw){x=hx+hw+gap;y=cy}
        else if(spaceL>=cw){x=hx-gap-cw;y=cy}
        else{x=Math.max(m,(vw-cw)/2);y=vh-ch-m}
      }
      card.style.left=Math.max(m,x)+'px';card.style.top=Math.max(m,y)+'px';
    }
    function show(){
      var s=steps[i];
      if(s.before){try{s.before()}catch(e){}}
      if(o.onStep){try{o.onStep(s,i)}catch(e){}}
      tk.textContent='Step '+(i+1)+' of '+steps.length;title.textContent=s.title||'';
      body.replaceChildren();
      var ul=null;
      (s.body||[]).forEach(function(line){
        if(/^- /.test(line)){if(!ul){ul=mk('ul');body.append(ul)}ul.append(mk('li',null,line.slice(2)))}
        else{ul=null;body.append(mk('p',null,line))}
      });
      dots.replaceChildren();
      steps.forEach(function(_,k){var d=mk('i',k===i?'on':'');d.setAttribute('aria-hidden','true');dots.append(d)});
      back.hidden=i===0;next.textContent=i===steps.length-1?'Done':'Next';
      skip.hidden=i===steps.length-1;
      var el=s.sel?document.querySelector(s.sel):null;
      if(onScreen(el)){try{el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'})}catch(e){}}
      place();
      requestAnimationFrame(function(){place();try{card.focus({preventScroll:true})}catch(e){}});
    }
    function go(d){var n=i+d;if(n<0)return;if(n>=steps.length){stop();return}i=n;show()}
    skip.addEventListener('click',stop);back.addEventListener('click',function(){go(-1)});next.addEventListener('click',function(){go(1)});
    shade.addEventListener('click',function(e){e.stopPropagation()});
    var tabs=function(e){
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();stop();return}
      if(e.key==='ArrowRight'){e.preventDefault();go(1);return}
      if(e.key==='ArrowLeft'){e.preventDefault();go(-1);return}
      if(e.key!=='Tab')return;
      var f=[].filter.call(card.querySelectorAll('button'),function(b){return !b.hidden&&!b.disabled});
      if(!f.length)return;
      var first=f[0],last=f[f.length-1],a=document.activeElement;
      if(!card.contains(a)){e.preventDefault();(e.shiftKey?last:first).focus();return}
      if(e.shiftKey&&(a===first||a===card)){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&a===last){e.preventDefault();first.focus()}
    };
    run={root:root,o:o,keys:tabs,place:place,prev:prev};
    if(reduce())root.classList.add('still');
    document.body.append(root);
    document.addEventListener('keydown',tabs,true);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    show();
    return true;
  }
  return {start:start,stop:stop,seen:seen,active:function(){return !!run}};
})();
