/* ---------- generic form, stored as one document ---------- */
function Form(cfg){
  var syncs=[],grid=h('div',{class:'fgrid'});
  cfg.rows.forEach(function(r){
    if(r.type==='head'){grid.append(h('h3',{class:'fhead',text:r.label}));return}
    var id='f-'+cfg.id+'-'+r.k,ctl;
    if(r.type==='pair'){
      var v=opts(h('select',{id:id+'_v','aria-label':r.label+' decision'}),['Reaffirm','Reset']),t=h('input',{type:'text',id:id+'_t',placeholder:'New wording if it resets'});
      syncs.push(bind(v,'forms',cfg.id,r.k+'_v',true));syncs.push(bind(t,'forms',cfg.id,r.k+'_t',true));
      v.firstChild.textContent='Undecided';
      grid.append(h('div',{class:'fld wide'},h('span',{text:r.label}),r.help?h('p',{class:'help',text:r.help}):'',h('div',{class:'pair'},v,t)));return;
    }
    if(r.type==='select'){ctl=opts(h('select',{id:id}),Array.isArray(r.choices)?r.choices:ROSTER);if(r.blank)ctl.firstChild.textContent=r.blank}
    else if(r.type==='area')ctl=h('textarea',{id:id,rows:2,placeholder:r.ph||''});
    else ctl=h('input',{id:id,type:r.type==='date'?'date':'text',placeholder:r.ph||''});
    syncs.push(bind(ctl,'forms',cfg.id,r.k,true));
    grid.append(h('label',{class:'fld'+(r.wide?' wide':''),for:id},h('span',{text:r.label}),ctl));
  });
  on(['forms'],function(){syncs.forEach(function(s){s()})});
  return h('section',{class:'panel'},h('h2',{text:cfg.title}),cfg.help?h('p',{class:'help',text:cfg.help}):'',grid);
}
