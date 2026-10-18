/* ---------- notes ---------- */
function Notes(sceneId){
  var ta=h('textarea',{id:'note-'+sceneId,rows:2,placeholder:'Capture a note for this session. Ctrl or Cmd + Enter to post.'});
  function post(){var t=txt(ta.value);if(!t||!needWho())return;addDoc('notes',{scene:sceneId,text:t,who:me.who});ta.value=''}
  ta.addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();post()}});
  var feed=h('div',{class:'feed'});
  var box=h('section',{class:'panel'},h('div',{class:'ph'},h('h2',{text:'Session notes'}),h('span',{class:'meter',id:'nc-'+sceneId})),
    h('div',{class:'composer'},ta,h('div',{class:'crow'},h('button',{class:'btn pri',type:'button',text:'Add note',onclick:post}))),feed);
  on(['notes'],function(){
    var items=list('notes',function(n){return n.scene===sceneId}).sort(function(a,b){return b.ts-a.ts});
    $('#nc-'+sceneId,box).textContent=items.length+' notes';
    feed.replaceChildren();
    if(!items.length)feed.append(h('div',{class:'empty',text:'No notes yet.'}));
    items.forEach(function(n){feed.append(h('div',{class:'note'+(n.ai?' ai':'')},h('div',{class:'meta'},h('span',{text:(n.who||'Someone')+' · '+fmtTime(n.ts)}),h('button',{class:'x','aria-label':'Remove note',onclick:function(){delDoc('notes',n.id)},text:'×'})),h('p',{text:n.text})))});
  });
  return box;
}

/* ---------- wall of stickies ---------- */
function voteKey(){return me.vk}
function Wall(cfg,sc){
  var sceneKey=sc.id+':'+cfg.id,sortVotes=false;
  var main=h('textarea',{id:'wall-'+sceneKey,rows:2,placeholder:cfg.ph||'Add an idea'});
  var extras=(cfg.extras||[]).map(function(x){return {x:x,el:h('input',{id:'wall-'+sceneKey+'-'+x.k,type:'text',placeholder:x.ph||''})}});
  var tag=cfg.tags?opts(h('select',{id:'wall-'+sceneKey+'-tag','aria-label':'Type'}),cfg.tags,cfg.tags[0]):null;
  if(tag)tag.firstChild.remove();
  function post(){
    var t=txt(main.value);if(!t||!needWho())return;
    var d={scene:sceneKey,text:t,who:me.who};
    extras.forEach(function(e){d[e.x.k]=txt(e.el.value)});
    if(tag)d.tag=tag.selectedIndex;
    addDoc('ideas',d);main.value='';extras.forEach(function(e){e.el.value=''});main.focus();
  }
  main.addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();post()}});
  var grid=h('div',{class:'stickies'}),wcount=h('span',{class:'meter'});
  var sortBtn=h('button',{class:'btn sm',type:'button',text:'Sort by votes',onclick:function(){sortVotes=!sortVotes;sortBtn.classList.toggle('on',sortVotes);draw()}});
  var box=h('section',{class:'panel'},
    h('div',{class:'ph'},h('h2',{text:cfg.title}),h('div',{class:'crow',style:'flex:0 0 auto'},wcount,sortBtn)),
    cfg.prompt?h('p',{class:'help',text:cfg.prompt}):'',
    h('div',{class:'composer'},tag?h('div',{class:'crow'},tag):'',main,extras.length?h('div',{class:'crow'},extras.map(function(e){return e.el})):'',h('div',{class:'crow'},h('button',{class:'btn pri',type:'button',text:'Post',onclick:post}))),grid);
  function draw(){
    var items=list('ideas',function(i){return i.scene===sceneKey});
    var vc={};list('votes').forEach(function(v){vc[v.idea]=(vc[v.idea]||0)+1});
    items.sort(sortVotes?function(a,b){return (vc[b.id]||0)-(vc[a.id]||0)||b.ts-a.ts}:function(a,b){return b.ts-a.ts});
    wcount.textContent=items.length+' cards';
    grid.replaceChildren();
    if(!items.length)grid.append(h('div',{class:'empty',style:'grid-column:1/-1',text:'Nothing posted yet. Anyone in the room can add a card from their own screen.'}));
    items.forEach(function(i){
      var vid=i.id+'_'+voteKey(),mine=!!S.votes[vid];
      var vb=h('button',{class:'vote'+(mine?' on':''),type:'button','aria-pressed':String(mine),text:'+1 '+(vc[i.id]||0),onclick:function(){
        if(!guard())return;
        if(mine)delDoc('votes',vid);else setDoc('votes',vid,{idea:i.id,v:voteKey(),ts:Date.now()});
      }});
      grid.append(h('div',{class:'sticky','data-tag':String(i.tag||0)},
        cfg.tags?h('div',{class:'tg',text:cfg.tags[i.tag||0]||''}):'',
        h('p',{text:i.text}),
        (cfg.extras||[]).map(function(x){return i[x.k]?h('div',{class:'xl'},h('i',{text:x.label}),i[x.k]):''}),
        h('div',{class:'ft'},h('span',{text:i.who||''}),vb,h('button',{class:'x','aria-label':'Remove card',onclick:function(){delDoc('ideas',i.id)},text:'×'}))));
    });
  }
  on(['ideas','votes'],draw);
  return box;
}
