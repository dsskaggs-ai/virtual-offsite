/* ============================ boot ============================ */
function meetingUse(n){try{return Promise.resolve(window.meetingServices&&window.meetingServices.use?window.meetingServices.use(n):null).then(function(x){return x||null},function(){return null})}catch(e){return Promise.resolve(null)}}
(function boot(){
  var whoSel=$('#whoSel');
  var typers=ROSTER.slice();if(HOST.who&&typers.indexOf(HOST.who)<0)typers.push(HOST.who);typers.push('Guest');
  opts(whoSel,typers,me.who);whoSel.firstChild.textContent='Pick your name';
  whoSel.addEventListener('change',function(){me.who=whoSel.value;try{localStorage.setItem(LS+'who',me.who)}catch(e){}$('#whoWrap').classList.remove('need');if(window.__room)window.__room.presence({who:me.who||null})});
  $('#brandTitle').textContent=ROOM.title;
  var d0=(ROOM.dates||[])[0];
  $('#brandSub').textContent=ROOM.tname+(d0?' · '+dayLong(d0):'')+(ROOM.recurring?' · Session '+ROOM.sess:'')+(ROOM.org?' · '+ROOM.org:'');
  try{document.title=ROOM.title}catch(e){}
  $('#bigBtn').addEventListener('click',function(){var on_=document.documentElement.classList.toggle('big');this.setAttribute('aria-pressed',String(on_));try{localStorage.setItem(LS+'big',on_?'1':'')}catch(e){}});
  $('#focusBtn').addEventListener('click',function(){var on_=$('#app').classList.toggle('focus');this.setAttribute('aria-pressed',String(on_))});
  document.querySelectorAll('.panes .btn').forEach(function(b){b.addEventListener('click',function(){$('#app').dataset.pane=b.dataset.pane;syncPanes()})});
  try{if(localStorage.getItem(LS+'big')){document.documentElement.classList.add('big');$('#bigBtn').setAttribute('aria-pressed','true')}}catch(e){}
  (function(){var mode=ROOM.theme||'light',btn=$('#themeBtn'),root=document.documentElement;
    try{mode=localStorage.getItem(LS+'theme')||mode}catch(e){}
    function apply(){if(mode==='light'||mode==='dark')root.setAttribute('data-theme',mode);else root.removeAttribute('data-theme');btn.textContent='Theme: '+(mode==='auto'?'Auto':mode==='light'?'Light':'Dark')}
    apply();
    btn.addEventListener('click',function(){mode=mode==='light'?'dark':mode==='dark'?'auto':'light';try{localStorage.setItem(LS+'theme',mode)}catch(e){}apply()});
  })();
  renderAgenda();renderProg();renderLog();

  window.__mrSess=function(s){ if(s&&s!==ROOM.sess&&!window.__reloading){window.__reloading=true;toast('A new session has started. Reloading...');setTimeout(function(){location.reload()},1200)} };

  Promise.all(['db','user','room','downloads'].map(meetingUse)).then(function(r){
    var dbx=r[0],userx=r[1],roomx=r[2],dl=r[3];
    if(dbx){db=dbx}else{db=memoryDb();localOnly=true;$('#brandSub').textContent='Single-screen mode. Live sharing is not available in this view.'}
    var chain=Promise.resolve();
    if(userx){chain=Promise.all([userx.canEdit(),userx.can('data.write')]).then(function(v){isAdmin=!!v[0];leading=isAdmin;if(v[1]===false)canWrite=false}).catch(function(){})}
    else if(localOnly){isAdmin=true;leading=false}
    return chain.then(function(){
      if(!canWrite)showBanner();
      subscribe();
      on(COLS,renderProg,true);
      on(['decisions'],renderLog,true);
      on(['live'],function(){
        renderAgenda();
        var st=S.live.state;
        if(st&&st.scene&&!isAdmin&&follow&&st.scene!==cur&&SCENE[st.scene])go(st.scene,false);
      },true);
      var start=(location.hash||'').slice(1);
      if(!SCENE[start])start=nowScene()||(SCENES[0]&&SCENES[0].id);
      if(start)go(start,false);
      renderFollow();
      $('#helpBtn').addEventListener('click',function(){startRoomTour(true)});
      setTimeout(function(){startRoomTour(false)},1200);
      $('#followBtn').addEventListener('click',function(){
        if(isAdmin){leading=!leading;renderFollow();if(leading&&canWrite&&cur)setDoc('live','state',{scene:cur,ts:Date.now()})}
        else{follow=!follow;renderFollow();if(follow&&S.live.state&&SCENE[S.live.state.scene])go(S.live.state.scene,false)}
      });
      var fname=(slug(ROOM.title)+'-record.md').replace(/_/g,'-');
      $('#saveBtn').hidden=false;
      $('#saveBtn').addEventListener('click',function(){
        var md=buildRecord();
        if(dl){dl.save({filename:fname,data:md}).then(function(){toast('Record saved')}).catch(function(e){if(!e||e.code!=='declined')copyText(md)})}
        else copyText(md,$('#saveBtn'));
      });
      if(HOST.role==='lead'&&ROOM.code){
        var sb=$('#shareBtn');sb.hidden=false;
        sb.addEventListener('click',function(ev){copyText('Join at '+location.origin+'/r/'+RID+' with the room code '+ROOM.code,sb);toast('Copied. Room code '+ROOM.code)});
      }
      if(HOST.role==='lead'&&ROOM.recurring&&window.__mr){
        var nb=$('#nextBtn'),armed=false,t0;nb.hidden=false;
        nb.addEventListener('click',function(){
          if(!armed){armed=true;nb.textContent='Click again to end this session';clearTimeout(t0);t0=setTimeout(function(){armed=false;nb.textContent='Next session'},4000);return}
          armed=false;nb.disabled=true;nb.textContent='Saving...';
          window.__mr.post('/api/session',{a:'next',sess:ROOM.sess,record:buildRecord()}).then(function(){toast('Record saved. Starting the next session...');setTimeout(function(){location.reload()},900)}).catch(function(e){nb.disabled=false;nb.textContent='Next session';toast((e&&e.message)||'That did not work.')});
        });
      }
      if(roomx){
        window.__room=roomx;
        roomx.presence({scene:cur,who:me.who||null}).catch(function(){});
        roomx.onPeers(function(c){peersNow=c.peers.slice();renderHere();renderAgenda()},function(){});
        roomx.on('react',function(m){float(m.data||{})},function(){});
        document.querySelectorAll('#react').forEach(function(b){b.replaceChildren();buildReactions(b)});
      }
    });
  });
})();
