/* UI source. build-ramsey.mjs combines this with ramsey-model.js for the browser. */
function initializeRamsey() {
 const $ = id => {
  const node = document.getElementById(id);
  if (!node) throw Error(`Missing Ramsey element: ${id}`);
  return node;
 };
 const workspace = $('ramsey-workspace');
 const colors = {teal:'#087d73',base:'#8d9fa6',amber:'#be7a24',grid:'#e9efed',muted:'#82918c',k:'#467da0',c:'#7956a3',unstable:'#bd5866'};
 const specs = [
  ['beta','\\beta','Discount factor',.85,.995,.001,'r-preferences'],
  ['sigma','\\sigma','Utility curvature',.5,5,.05,'r-preferences'],
  ['alpha','\\alpha','Capital share',.15,.65,.01,'r-technology'],
  ['gamma','\\gamma','Technology growth',1,1.06,.001,'r-technology'],
  ['n','n','Population growth',1,1.04,.001,'r-technology'],
  ['delta','\\delta','Depreciation',.01,.25,.005,'r-technology'],
  ['theta','\\theta','Capital augmentation',.5,2,.05,'r-technology'],
  ['tax','\\tau','Capital income tax',0,1,.01,'r-policy']
 ];
 const charts = [['k','Capital','k_t'],['K','Total capital','K_t'],['y','Output','y_t'],['Y','Total output','Y_t'],['c','Consumption','c_t'],['C','Total consumption','C_t'],['r','Capital return','r_t'],['w','Wage','w_t'],['s','Saving rate','s_t=i_t/y_t'],['i','Investment','i_t=y_t-c_t'],['u','Utility','u(\\tilde c_t)']];
 const pairs = [['Capital','k','K'],['Output','y','Y'],['Consumption','c','C'],['Returns & wages','r','w'],['Savings','s','i'],['Utility & economy','u',null]];
 let before={...RAMSEY_DEFAULTS},after={...RAMSEY_DEFAULTS},k0=steady(before).k,locked=true;
 let mode='after',tau=20,horizon=160,time=0,playing=false,lastFrame=0,dirty=true,zoomKey='phase';
 let rows=[],optimal=[],baseline=[],pre=[],post=[],impact=null,bounds={k:1,c:1},diagnostic=null;
 let anticipated=false,showUnstable=false,consumptionDeviation=0,unstablePaths=[],endTime=horizon;
 let jumpActive=false,jumpProgress=1;
 const different = () => specs.some(([key])=>Math.abs(before[key]-after[key])>1e-10);
 const format = v => Math.abs(v)>=1e5?v.toExponential(2):v.toLocaleString('en-US',{maximumFractionDigits:3,minimumFractionDigits:3});
 const tick = v => Math.abs(v)>=1e4?v.toExponential(1):Math.abs(v)>=100?String(Math.round(v)):Math.abs(v)>=10?v.toFixed(1):v.toFixed(2);
 const chartValue = (r,key) => key==='u'?utility(r.A*r.c,r.p.sigma):['K','Y','C'].includes(key)?r[key.toLowerCase()]*r.A*r.N:r[key];
 const hasJump = () => different()&&!anticipated;
 const displayValue = (value,key) => key==='s'?`${(100*value).toFixed(1)}%`:format(value);
 const fill = node => node.style.setProperty('--fill',`${100*(+node.value-+node.min)/(+node.max-+node.min)}%`);
 function typeset(root) {
  if (!window.katex) return;
  root.querySelectorAll('[data-tex]').forEach(node=>window.katex.render(node.dataset.tex,node,{throwOnError:false}));
 }
 function listen(id,event,callback) {
  $(id).addEventListener(event,e=>{
   try { callback(e); }
   catch(error) { pause(); $('r-insight').textContent=error.message; console.error(error); }
  });
 }
 function pause() {
  playing=false;jumpActive=false;jumpProgress=1;dirty=true;
  $('r-play').textContent=$('r-zoom-play').textContent='▶ Play';
 }
 function play() {
  if(time>=endTime)time=0;
  playing=true;lastFrame=performance.now();
  $('r-play').textContent=$('r-zoom-play').textContent='Ⅱ Pause';
 }
 function build() {
  $('r-rows').replaceChildren();
  for(const [name,left,right] of pairs) {
   const section=document.createElement('details');section.className='r-row';
   section.open=name==='Capital'||name==='Consumption';
   const card=key=>{
    if(!key)return '<section class="response r-live"><div class="plot-heading"><h2>Live economy</h2><span id="r-live-t"></span></div><div class="metrics"><div><span data-tex="A_t"></span><strong id="r-A"></strong></div><div><span data-tex="N_t"></span><strong id="r-N"></strong></div></div><div id="r-growth" class="growth-readout"></div></section>';
    const [,title,symbol]=charts.find(x=>x[0]===key);
    return `<section class="response"><div class="plot-heading"><h2>${title} <span data-tex="${symbol}"></span></h2><output id="r-value-${key}"></output><button type="button" class="chart-zoom" data-r-zoom="${key}" aria-label="Enlarge ${title} graph">↗</button></div><div class="mini-frame"><canvas id="r-chart-${key}" role="img" aria-label="${title} over time"></canvas></div></section>`;
   };
   section.innerHTML=`<summary>${name}<span>⌄</span></summary><div class="r-row-content">${card(left)}${card(right)}</div>`;
   $('r-rows').append(section);
   section.addEventListener('toggle',()=>dirty=true);
  }
  for(const group of ['r-preferences','r-technology','r-policy'])$(group).replaceChildren();
  for(const [key,symbol,title,min,max,step,group] of specs) {
   const div=document.createElement('div');div.className='slider';
   div.innerHTML=`<div class="slider-head"><label for="r-param-${key}"><span data-tex="${symbol}"></span><span>${title}</span></label><output id="r-out-${key}"></output></div><input id="r-param-${key}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${title}">`;
   $(group).append(div);
   listen(`r-param-${key}`,'input',e=>change(()=>{(mode==='before'?before:after)[key]=+e.target.value;},mode==='before'||anticipated?0:tau-1));
  }
  workspace.querySelectorAll('[data-r-zoom]').forEach(button=>button.addEventListener('click',()=>openZoom(button.dataset.rZoom)));
  typeset(workspace);typeset($('r-zoom'));typeset($('r-model-dialog'));
 }
 function recompute() {
  const shocked=simulateRamsey(before,after,k0,tau,horizon,{anticipated,consumptionDeviation});
  const control=simulateRamsey(before,before,k0,tau,horizon);
  rows=shocked.rows;optimal=shocked.optimal;baseline=control.rows;pre=shocked.pre;post=shocked.post;diagnostic=shocked.diagnostic;endTime=rows.at(-1).t;
  impact=baseline[tau];
  if(consumptionDeviation&&hasJump()&&rows[tau]){
   const x=rows[tau-1];impact={...rows[tau],c:nextC(x.c,rows[tau].k,before),p:before};
   impact.y=f(impact.k,before);impact.i=impact.y-impact.c;impact.s=impact.i/impact.y;impact.r=mpk(impact.k,before);impact.w=(1-before.alpha)*impact.A*impact.y;
  }
  unstablePaths=[-.025,.025].map(deviation=>({deviation,...unstableRamsey(before,after,optimal,tau,horizon,deviation,anticipated)}));
  // Keep a useful phase scale even when a deliberately unstable path leaves the neighborhood.
  bounds.k=Math.max(k0,steady(before).k,steady(after).k,...optimal.map(r=>r.k))*1.42;
  bounds.c=Math.max(...optimal.map(r=>r.c),...baseline.map(r=>r.c),kNull(bounds.k*.6,before),kNull(bounds.k*.6,after))*1.4;
  $('r-tvc').textContent=diagnostic.label;$('r-tvc').dataset.status=diagnostic.status;$('r-tvc').title=diagnostic.detail;
  $('r-insight').textContent=consumptionDeviation?`${diagnostic.label}. ${diagnostic.detail}`:after.tax===1?'100% tax removes the positive interior steady state. The path approaches the zero-capital boundary.':different()?anticipated?`Policy is announced at t = 0: consumption adjusts immediately. The nullclines change only when policy takes effect at t = ${tau}.`:`At t = ${tau}, consumption jumps while capital is predetermined, then the economy follows the new saddle path.`:'The stable saddle path pins down c₀ given k₀. Toggle nearby paths or adjust c₀ to see why the other Euler paths do not converge.';
  dirty=true;
 }
 function sync() {
  const p=mode==='before'?before:after;
  for(const [key] of specs) {
   const slider=$(`r-param-${key}`);slider.value=p[key];fill(slider);
   $(`r-out-${key}`).textContent=['alpha','delta','tax'].includes(key)?`${(100*p[key]).toFixed(1)}%`:format(p[key]);
   slider.setAttribute('aria-valuetext',$(`r-out-${key}`).textContent);
  }
  for(const [id,selected] of [['r-before',mode==='before'],['r-after',mode==='after'],['r-growth-none',p.gamma===1&&p.n===1],['r-growth-positive',Math.abs(p.gamma-1.02)<1e-10&&Math.abs(p.n-1.01)<1e-10]]) {
   $(id).classList.toggle('selected',selected);$(id).setAttribute('aria-pressed',String(selected));
  }
  $('r-k0').value=Number(k0.toPrecision(8));
  $('r-steady').textContent=locked?'✓ At initial steady state':'Set to initial steady state';
  $('r-steady').disabled=before.tax===1;
  $('r-tau').value=tau;$('r-tau').max=horizon-1;$('r-horizon').value=horizon;
  $('r-time').max=endTime;$('r-shock-date').textContent=`Policy at ${tau}`;
  for(const [id,selected] of [['r-unanticipated',!anticipated],['r-anticipated',anticipated],['r-unstable',showUnstable]]){
   $(id).classList.toggle('selected',selected);$(id).setAttribute('aria-pressed',String(selected));
  }
  $('r-c0-deviation').value=100*consumptionDeviation;fill($('r-c0-deviation'));
  $('r-c0-offset').textContent=`${consumptionDeviation>0?'+':''}${(100*consumptionDeviation).toFixed(1)}%`;
  $('r-optimal-c0').textContent=format(optimal[0].c);dirty=true;
 }
 function change(edit,at=0) {
  pause();const saved={before:{...before},after:{...after},k0,locked,mode,tau,horizon,time,anticipated,consumptionDeviation,showUnstable};
  try {
   edit();if(locked){const initial=steady(before);if(initial.boundary)locked=false;else k0=initial.k;}
   recompute();time=Math.min(endTime,Math.max(0,at));sync();return true;
  } catch(error) {
   ({before,after,k0,locked,mode,tau,horizon,time,anticipated,consumptionDeviation,showUnstable}=saved);recompute();sync();
   $('r-insight').textContent=`${error.message}. Your previous feasible setting is retained.`;return false;
  }
 }
 function blend(a,b,fraction) {
  const result={...a};
  for(const key of ['k','c','y','i','s','r','w','A','N'])result[key]=a[key]+fraction*(b[key]-a[key]);
  return result;
 }
 function current() {
  if(jumpActive)return blend(impact,rows[tau],jumpProgress);
  const whole=Math.min(endTime,Math.floor(time)),a=rows[whole];
  const b=hasJump()&&whole+1===tau?impact:rows[Math.min(endTime,whole+1)];
  return blend(a,b,time-whole);
 }
 function surface(id) {
  const node=$(id),rect=node.getBoundingClientRect();
  if(rect.width<2||rect.height<2)return null;
  const dpr=window.devicePixelRatio||1,w=rect.width,h=rect.height;
  if(node.width!==Math.round(w*dpr)||node.height!==Math.round(h*dpr)){node.width=Math.round(w*dpr);node.height=Math.round(h*dpr);}
  const ctx=node.getContext('2d');if(!ctx)return null;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.lineJoin='round';ctx.lineCap='round';
  return {ctx,w,h};
 }
 function line(ctx,points,color,width=1.5,dash=[]) {
  ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);
  let started=false;
  for(const [x,y] of points){if(!Number.isFinite(x+y)){started=false;continue;}if(started)ctx.lineTo(x,y);else ctx.moveTo(x,y);started=true;}
  ctx.stroke();ctx.setLineDash([]);
 }
 function dot(ctx,x,y,color,r=4) {ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();}
 function label(ctx,text,x,y,color=colors.muted,align='left',size=10) {ctx.fillStyle=color;ctx.font=`${size}px Arial`;ctx.textAlign=align;ctx.fillText(text,x,y);}
 function arrow(ctx,x1,y1,x2,y2,color,width=1.5) {
  line(ctx,[[x1,y1],[x2,y2]],color,width);
  const length=Math.hypot(x2-x1,y2-y1);if(length<6)return;
  const angle=Math.atan2(y2-y1,x2-x1),x=x1+.76*(x2-x1),y=y1+.76*(y2-y1),size=Math.min(5,length*.35);
  line(ctx,[[x-size*Math.cos(angle-.55),y-size*Math.sin(angle-.55)],[x,y],[x-size*Math.cos(angle+.55),y-size*Math.sin(angle+.55)]],color,width);
 }
 function phase(id='r-phase') {
  const canvas=surface(id);if(!canvas)return;
  const {ctx,w,h}=canvas,L=44,T=18,pw=Math.max(1,w-L-15),ph=Math.max(1,h-T-30);
  const X=k=>L+k/bounds.k*pw,Y=c=>T+ph-c/bounds.c*ph;
  for(let j=0;j<=4;j++){const k=j*bounds.k/4,c=j*bounds.c/4;line(ctx,[[X(k),T],[X(k),T+ph]],colors.grid,1);line(ctx,[[L,Y(c)],[L+pw,Y(c)]],colors.grid,1);label(ctx,tick(k),X(k),h-9,colors.muted,'center');label(ctx,tick(c),L-7,Y(c)+3,colors.muted,'right');}
  line(ctx,[[L,T],[L,T+ph],[L+pw,T+ph]],'#bccac5',1);
  ctx.save();ctx.beginPath();ctx.rect(L,T,pw,ph);ctx.clip();
  const regime=(p,arm,color,opacity)=>{
   const target=steady(p),sample=fn=>Array.from({length:240},(_,j)=>{const k=bounds.k*j/239;return [X(k),Y(fn(k))];});
   ctx.globalAlpha=opacity;
   line(ctx,sample(k=>kNull(k,p)),colors.k,1.8,[7,4]);
   if(!target.boundary)line(ctx,sample(k=>f(k,p)+(1-p.delta)*k-p.gamma*p.n*target.k),colors.c,1.8,[2,4]);
   line(ctx,arm.map(r=>[X(r.k),Y(r.c)]),color,2.9);ctx.globalAlpha=1;
  };
  const active=time<tau?before:after;
  const policyEffective=different()&&time>=tau;
  regime(before,pre,policyEffective?colors.base:colors.teal,policyEffective?.25:1);
  if(policyEffective)regime(after,post,colors.teal,1);
  if(showUnstable)for(const path of unstablePaths){
   const visible=path.rows.filter(r=>policyEffective?r.t>=tau:true);
   line(ctx,visible.map(r=>[X(r.k),Y(r.c)]),colors.unstable,1.5,[5,4]);
   for(let j=1;j<visible.length;j+=6)arrow(ctx,X(visible[j-1].k),Y(visible[j-1].c),X(visible[j].k),Y(visible[j].c),colors.unstable,1.4);
  }
  for(let col=1;col<=8;col++)for(let row=1;row<=6;row++) {
   const k=bounds.k*col/9,c=bounds.c*row/7,k1=nextK(k,c,active);if(!(k1>0))continue;
   const c1=nextC(c,k1,active),vx=(k1-k)/bounds.k*pw,vy=-(c1-c)/bounds.c*ph,length=Math.hypot(vx,vy);
   if(length<1e-6||!Number.isFinite(length))continue;
   const dx=vx/length*16,dy=vy/length*16;
   arrow(ctx,X(k)-dx/2,Y(c)-dy/2,X(k)+dx/2,Y(c)+dy/2,'#a5b5ad',1.2);
  }
  const whole=Math.floor(time),start=Math.max(0,whole-30),points=[];
  for(let t=start;t<=whole;t++){if(t===tau&&hasJump())points.push(impact);if(t===tau&&jumpActive)break;points.push(rows[t]);}
  points.push(current());
  for(let j=1;j<points.length;j++){ctx.globalAlpha=.25+.65*j/points.length;arrow(ctx,X(points[j-1].k),Y(points[j-1].c),X(points[j].k),Y(points[j].c),colors.amber,2.2);}
  ctx.globalAlpha=1;
  const old=steady(before),target=steady(after);
  if(!old.boundary)dot(ctx,X(old.k),Y(old.c),different()?colors.base:colors.teal,5);
  if(policyEffective)dot(ctx,X(target.k),Y(target.c),colors.teal,5);
  const now=current();dot(ctx,X(now.k),Y(now.c),colors.amber,5.5);ctx.restore();
  if(X(old.k)<L+pw&&Y(old.c)>T)label(ctx,different()?'Initial steady state':'Steady state',X(old.k)-8,Y(old.c)-11,policyEffective?colors.base:colors.teal,'right');
  if(policyEffective)label(ctx,target.boundary?'Zero-capital boundary':'New steady state',Math.min(L+pw-6,X(target.k)+8),Math.min(T+ph-6,Y(target.c)+18),colors.teal);
  const arm=policyEffective?post:pre;
  const anchor=arm.filter(r=>r.k>bounds.k*.42&&r.k<bounds.k*.65&&r.c<bounds.c*.8).at(0);
  if(anchor)label(ctx,'Stable saddle path',X(anchor.k)+5,Y(anchor.c)-10,colors.teal,'left',11);
  if(showUnstable)label(ctx,'Nearby Euler paths: c₀ ± 2.5%',L+8,T+14,colors.unstable,'left',10);
 }
 function series(id,key) {
  const canvas=surface(id);if(!canvas)return;
  const {ctx,w,h}=canvas,L=['K','Y','C'].includes(key)?48:42,T=8,pw=Math.max(1,w-L-15),ph=Math.max(1,h-T-20);
  const values=rows.map(r=>chartValue(r,key)).concat(baseline.map(r=>chartValue(r,key)));
  const lo=Math.min(...values),hi=Math.max(...values),span=Math.max(hi-lo,Math.abs(hi)*.15,.01);
  const min=lo<0?lo-span*.15:Math.max(0,lo-span*.15),max=hi+span*.15,X=t=>L+t/horizon*pw,Y=v=>T+(max-v)/(max-min)*ph;
  for(let j=0;j<(ph<60?2:3);j++){const v=min+(max-min)*j/(ph<60?1:2);line(ctx,[[L,Y(v)],[L+pw,Y(v)]],colors.grid,1);label(ctx,key==='s'?`${(100*v).toFixed(0)}%`:tick(v),L-6,Y(v)+3,colors.muted,'right',9);}
  for(const t of [0,horizon/2,horizon])label(ctx,String(t),X(t),h-5,colors.muted,'center',9);label(ctx,'t',w-1,h-5,colors.muted,'right');
  ctx.save();ctx.beginPath();ctx.rect(L,T,pw,ph);ctx.clip();
  if(different()){ctx.fillStyle='#f8f4eb';ctx.fillRect(X(tau),T,pw*(1-tau/horizon),ph);}
  line(ctx,baseline.map(r=>[X(r.t),Y(chartValue(r,key))]),colors.base,1.3,[4,4]);
  const points=rows.map(r=>[r.t,chartValue(r,key)]);if(hasJump()&&tau<=endTime)points.splice(tau,0,[tau,chartValue(impact,key)]);
  line(ctx,points.map(([t,v])=>[X(t),Y(v)]),colors.teal,1.4,[3,4]);
  const past=points.filter(([t])=>jumpActive?t<time:t<=time);
  if(jumpActive)past.push([tau,chartValue(impact,key)]);
  past.push([time,chartValue(current(),key)]);
  line(ctx,past.map(([t,v])=>[X(t),Y(v)]),colors.teal,2.2);
  line(ctx,[[X(time),T],[X(time),T+ph]],'#c49c61',1);dot(ctx,X(time),Y(chartValue(current(),key)),colors.amber,3.5);ctx.restore();
 }
 function draw() {
  if(!rows.length)return;dirty=false;
  const sections=Array.from($('r-rows').children),openCount=sections.filter(row=>row.open).length;
  if(openCount){
   const height=$('r-rows').getBoundingClientRect().height;
   const chartHeight=Math.min(116,Math.max(36,(height-sections.length*28-(sections.length-1)*5-openCount*35)/openCount));
   $('r-rows').style.setProperty('--r-chart-height',`${chartHeight}px`);
  }
  phase();
  for(const [key] of charts)series(`r-chart-${key}`,key);
  if($('r-zoom').open){if(zoomKey==='phase')phase('r-zoom-canvas');else series('r-zoom-canvas',zoomKey);}
  const currentRow=current(),t=Math.floor(time);
  $('r-time').value=time;fill($('r-time'));$('r-time-value').textContent=t;
  $('r-regime').textContent=jumpActive?'Shock: consumption jumps':different()?t<tau?anticipated?`Announced · policy in ${tau-t}`:`Shock in ${tau-t} periods`:'After the shock':'Initial economy';
  $('r-regime').classList.toggle('shocked',different()&&time>=tau);
  for(const [key] of charts)$(`r-value-${key}`).textContent=displayValue(chartValue(currentRow,key),key);
  for(const [id,v] of [['current-k',currentRow.k],['current-c',currentRow.c],['old-k',steady(before).k],['new-k',steady(after).k],['A',currentRow.A],['N',currentRow.N]])$(`r-${id}`).textContent=format(v);
  $('r-live-t').textContent=`t = ${t}`;
  const p=time<tau?before:after;$('r-growth').textContent=`γ = ${format(p.gamma)} · n = ${format(p.n)}`;
  $('r-step').disabled=time>=endTime;
 }
 function frame(now) {
  const elapsed=Math.max(0,Math.min(.1,(now-lastFrame)/1000));lastFrame=now;
  if(playing) {
   if(jumpActive){jumpProgress=Math.min(1,jumpProgress+elapsed/.8);if(jumpProgress>=1)jumpActive=false;}
   else {const next=Math.min(endTime,time+elapsed*+$('r-speed').value);if(hasJump()&&time<tau&&next>=tau){time=tau;jumpActive=true;jumpProgress=0;}else time=next;}
   dirty=true;if(time>=endTime)pause();
  }
  try {if(dirty&&!workspace.hidden)draw();}
  catch(error){pause();$('r-insight').textContent=`Could not draw the Ramsey graphs: ${error.message}`;console.error(error);}
  requestAnimationFrame(frame);
 }
 function openZoom(key) {
  zoomKey=key;const entry=charts.find(x=>x[0]===key);
  $('r-zoom-title').textContent=key==='phase'?'Phase diagram':entry[1];
  $('r-zoom-y').dataset.tex=key==='phase'?'c_t':entry[2];$('r-zoom-x').hidden=key!=='phase';
  typeset($('r-zoom'));$('r-zoom').showModal();dirty=true;
 }
 build();
 listen('r-play','click',()=>playing?pause():play());listen('r-zoom-play','click',()=>playing?pause():play());
 listen('r-replay','click',()=>{pause();time=0;play();});
 listen('r-step','click',()=>{pause();time=Math.min(endTime,Math.floor(time+1));dirty=true;});
 listen('r-time','input',e=>{pause();time=Math.max(0,Math.min(endTime,+e.target.value));dirty=true;});
 listen('r-before','click',()=>{mode='before';sync();});listen('r-after','click',()=>{mode='after';sync();});
 for(const [id,g,n] of [['r-growth-none',1,1],['r-growth-positive',1.02,1.01]])listen(id,'click',()=>change(()=>{const p=mode==='before'?before:after;p.gamma=g;p.n=n;},mode==='before'||anticipated?0:tau-1));
 listen('r-k0','change',e=>change(()=>{const k=+e.target.value;if(!(k>0&&k<=1000))throw Error('Initial capital must be between zero and 1000');k0=k;locked=false;},0));
 listen('r-steady','click',()=>change(()=>{if(before.tax===1)throw Error('100% tax has no positive initial steady state');locked=true;},0));
 listen('r-tau','change',e=>{const t=Math.max(1,Math.min(horizon-1,Math.round(+e.target.value)||20));change(()=>tau=t,t-1);});
 listen('r-horizon','change',e=>change(()=>{horizon=+e.target.value;tau=Math.min(tau,horizon-1);},0));
 listen('r-anticipated','click',()=>change(()=>anticipated=true,0));
 listen('r-unanticipated','click',()=>change(()=>anticipated=false,Math.min(time,tau-1)));
 listen('r-unstable','click',()=>{showUnstable=!showUnstable;sync();});
 listen('r-c0-deviation','input',e=>change(()=>consumptionDeviation=+e.target.value/100,0));
 listen('r-c0-restore','click',()=>change(()=>consumptionDeviation=0,0));
 listen('r-reset','click',()=>change(()=>{before={...RAMSEY_DEFAULTS};after={...RAMSEY_DEFAULTS};locked=true;mode='after';tau=20;horizon=160;anticipated=false;consumptionDeviation=0;showUnstable=false;},0));
 workspace.querySelectorAll('[data-r-preset]').forEach(button=>button.addEventListener('click',()=>{
  const accepted=change(()=>{
   after={...before};mode='after';
   switch(button.dataset.rPreset){
    case 'tax':after.tax=Math.min(1,before.tax+.25);break;
    case 'tax-cut':before.tax=Math.max(.25,before.tax);after={...before,tax:Math.max(0,before.tax-.25)};break;
    case 'patience':after.beta=Math.min(.995,before.beta+.02);break;
    case 'depreciation':after.delta=Math.min(.25,before.delta+.05);break;
    case 'share':after.alpha=Math.min(.65,before.alpha+.08);break;
   }
  },anticipated?0:tau-1);if(accepted)play();
 }));
 listen('r-phase-zoom','click',()=>openZoom('phase'));listen('r-zoom-close','click',()=>$('r-zoom').close());
 listen('r-help','click',()=>$('r-model-dialog').showModal());listen('r-help-close','click',()=>$('r-model-dialog').close());
 listen('r-panel-hide','click',()=>{workspace.classList.add('controls-hidden');$('r-panel-show').hidden=false;dirty=true;});
 listen('r-panel-show','click',()=>{workspace.classList.remove('controls-hidden');$('r-panel-show').hidden=true;dirty=true;});
 document.addEventListener('macro-model-change',event=>{if(event.detail.model!=='ramsey')pause();dirty=true;});
 $('help-footer').addEventListener('click',e=>{if(!workspace.hidden){e.stopImmediatePropagation();$('r-model-dialog').showModal();}},true);
 if(window.ResizeObserver){const observer=new ResizeObserver(()=>dirty=true);observer.observe(workspace);observer.observe($('r-zoom'));}
 window.addEventListener('resize',()=>dirty=true);
 recompute();sync();document.body.dataset.ramseyStatus='ready';requestAnimationFrame(frame);
}
function startRamsey() {
 try { initializeRamsey(); }
 catch(error) {
  document.body.dataset.ramseyStatus='error';
  const status=document.getElementById('r-insight');
  if(status)status.textContent=`Ramsey could not start: ${error.message}`;
  console.error(error);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startRamsey,{once:true});
else startRamsey();
