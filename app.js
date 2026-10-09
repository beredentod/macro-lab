import {DEFAULTS,production,nextCapital,steadyState,goldenCapital,simulate,observe} from './model.js';
const $=id=>document.getElementById(id);
const C={teal:'#087d73',ink:'#263d36',muted:'#82918c',grid:'#edf1ef',base:'#8d9fa6',amber:'#be7a24',faint:'#b5d2cb',golden:'#7956a3'};
const specs=[
 ['alpha','\\alpha','Capital share',.1,.7,.01],
 ['gamma','\\gamma','Technology growth',1,1.06,.001],
 ['n','n','Population growth',1,1.04,.001],
 ['delta','\\delta','Depreciation',.01,.9,.005],
 ['s','s','Saving rate',.02,.9,.01],
 ['theta','\\theta','Capital augmentation',.5,2,.05]
];
const START_PARAMS={...DEFAULTS,gamma:1.02,n:1.01};
let before={...START_PARAMS},after={...START_PARAMS},k0=steadyState(before),lockInitial=true;
let tau=20,horizon=160,mode='after',time=0,playing=false,lastFrame=0;
let rows=[],baseline=[],benchmarks=[],maxK=1,needsDraw=true,zoomType='phase',zoomKey=null,showGolden=false;
const chartKeys=['k','K','y','Y','c','C','r','w','i'];
const chartValue=(row,key)=>{
 if(key==='K')return row.k*row.A*row.N;
 if(key==='C')return row.c*row.A*row.N;
 if(key==='Y')return row.y*row.A*row.N;
 if(key==='r')return row.mpk;
 if(key==='w')return row.mpl;
 return row[key];
};
function goldenBenchmark(row){
 return observe(row.t,goldenCapital(row.p),row.A,row.N,{...row.p,s:row.p.alpha});
}
function convergenceStats(p){
 const lambda=(1-p.alpha)*(1-(1-p.delta)/(p.gamma*p.n));
 return {lambda,halfLife:Math.log(.5)/Math.log1p(-lambda)};
}
const fmt=(v,d=3)=>Math.abs(v)>=1e5?v.toExponential(2):v.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const tickFmt=v=>v===0?'0':Math.abs(v)>=10000?v.toExponential(1):Math.abs(v)>=100?String(Math.round(v)):Math.abs(v)>=10?v.toFixed(1):v.toFixed(2);
const pct=v=>`${(100*v).toFixed(1)}%`;
function tex(el,s){window.katex.render(s,el,{throwOnError:false});}
function allTex(root=document){root.querySelectorAll('[data-tex]').forEach(el=>tex(el,el.dataset.tex));}
function rangeFill(input){input.style.setProperty('--fill',`${100*(+input.value-+input.min)/(+input.max-+input.min)}%`);}
function different(){return specs.some(([key])=>Math.abs(before[key]-after[key])>1e-10);}
function buildSliders(){
 $('sliders').innerHTML=specs.map(([id,symbol,label,min,max,step])=>`<div class="slider"><div class="slider-head"><label for="param-${id}"><span data-tex="${symbol}"></span><span>${label}</span></label><output id="out-${id}" for="param-${id}"></output></div><input type="range" id="param-${id}" min="${min}" max="${max}" step="${step}" aria-label="${label}"><small id="hint-${id}"></small></div>`).join('');
 specs.forEach(([id])=>$(`param-${id}`).addEventListener('input',e=>{
   pause();const target=mode==='before'?before:after;target[id]=+e.target.value;
   if(mode==='before' && lockInitial)k0=steadyState(before);
   // Inspect the moment of the shock when editing its new regime.
   time=mode==='after'?tau:0;recompute();syncControls();
 }));
 allTex($('sliders'));syncControls();
}
function syncControls(){
 const p=mode==='before'?before:after;
 specs.forEach(([id])=>{
   const input=$(`param-${id}`);input.value=p[id];rangeFill(input);
   const growth=id==='gamma'||id==='n';
   $(`out-${id}`).textContent=growth?fmt(p[id]):id==='theta'?fmt(p[id],2):pct(p[id]);
   $(`hint-${id}`).textContent=growth?`${pct(p[id]-1)} per period · initial ${fmt(before[id])}`:mode==='after'?`Initial: ${id==='theta'?fmt(before[id],2):pct(before[id])}`:id==='theta'?'1 = standard Cobb–Douglas':'Before the permanent shock';
   input.setAttribute('aria-valuetext',growth?`${fmt(p[id])}, ${pct(p[id]-1)} growth`:fmt(p[id]));
 });
 for(const [id,selected] of [['growth-none',p.gamma===1&&p.n===1],['growth-positive',Math.abs(p.gamma-1.02)<1e-10&&Math.abs(p.n-1.01)<1e-10]]){
 $(id).classList.toggle('selected',selected);$(id).setAttribute('aria-pressed',String(selected));
 }
 $('initial-k').value=Number(k0.toPrecision(8));$('steady').textContent=lockInitial?'✓ At initial steady state':'Set to initial steady state';
 $('edit-before').classList.toggle('selected',mode==='before');$('edit-after').classList.toggle('selected',mode==='after');
 $('edit-before').setAttribute('aria-pressed',mode==='before');$('edit-after').setAttribute('aria-pressed',mode==='after');
 $('tau').value=tau;$('tau').max=horizon-1;$('horizon').value=horizon;
 $('golden-rule').classList.toggle('selected',showGolden);$('golden-rule').setAttribute('aria-pressed',String(showGolden));
 $('golden-rule').title=`Turn the golden-rule benchmark ${showGolden?'off':'on'} in every graph`;
 $('macro-app').classList.toggle('golden-off',!showGolden);
 $('time').max=horizon;$('shock-date').textContent=`Shock at ${tau}`;
 needsDraw=true;
}
function recompute(){
 rows=simulate(before,after,k0,tau,horizon);baseline=simulate(before,before,k0,tau,horizon);
 benchmarks=rows.map(goldenBenchmark);
 maxK=Math.max(steadyState(before),steadyState(after),goldenCapital(before),goldenCapital(after),...rows.map(r=>r.k),...baseline.map(r=>r.k))*1.23;
 time=Math.min(time,horizon);needsDraw=true;updateInsight();
}
function updateInsight(){
 if(!different()){$('insight').textContent='Start with “Higher saving” or move an After shock slider. The amber path traces the economy toward its steady state.';return;}
 const oldC=(1-before.s)*production(steadyState(before),before),newC=(1-after.s)*production(steadyState(after),after);
 const deltaC=100*(newC/oldC-1);
 const onlySaving=specs.every(([key])=>key==='s'||before[key]===after[key]);
 if(onlySaving && after.s>before.s){
   $('insight').textContent=`Higher saving lowers consumption on impact; capital then accumulates and consumption recovers. New steady-state consumption is ${Math.abs(deltaC).toFixed(1)}% ${deltaC>=0?'above':'below'} the initial steady state${after.s>after.alpha?' (saving exceeds the golden rule, s = α).':'.'}`;
 }else{
   $('insight').textContent=`At t = ${tau}, parameters change permanently. Capital is predetermined; the new law of motion governs the transition. Steady-state consumption: ${deltaC>=0?'+':''}${deltaC.toFixed(1)}% versus the initial steady state.`;
 }
}
function ctxFor(id){
 const canvas=$(id),rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
 const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.lineCap='round';ctx.lineJoin='round';
 return {ctx,w,h};
}
function path(ctx,pts,color,width=1.5,dash=[]){if(!pts.length)return;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);pts.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);}
function dot(ctx,x,y,color,r=4){ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=1.5;ctx.stroke();}
function text(ctx,value,x,y,color=C.muted,align='left',size=10){ctx.fillStyle=color;ctx.textAlign=align;ctx.font=`${size}px Arial, sans-serif`;ctx.fillText(value,x,y);}
function arrow(ctx,x1,y1,x2,y2,color){path(ctx,[[x1,y1],[x2,y2]],color,1.8);if(Math.hypot(x2-x1,y2-y1)<10)return;const angle=Math.atan2(y2-y1,x2-x1),x=x1+.67*(x2-x1),y=y1+.67*(y2-y1);path(ctx,[[x-5*Math.cos(angle-.5),y-5*Math.sin(angle-.5)],[x,y],[x-5*Math.cos(angle+.5),y-5*Math.sin(angle+.5)]],color,1.6);}
function phase(canvasId='phase'){
 const {ctx,w,h}=ctxFor(canvasId);
 // A square plot area makes y=x a true 45-degree line at every viewport.
 const side=Math.max(1,Math.min(w-68,h-54)),left=43+(w-68-side)/2,top=20+(h-54-side)/2;
 const X=x=>left+x/maxK*side,Y=y=>top+side-y/maxK*side;
 for(let j=0;j<=4;j++){const v=maxK*j/4;path(ctx,[[X(v),Y(0)],[X(v),Y(maxK)]],C.grid,1);path(ctx,[[X(0),Y(v)],[X(maxK),Y(v)]],C.grid,1);text(ctx,tickFmt(v),X(v),Y(0)+17,C.muted,'center');text(ctx,tickFmt(v),X(0)-8,Y(v)+3,C.muted,'right');}
 path(ctx,[[X(0),Y(maxK)],[X(0),Y(0)],[X(maxK),Y(0)]],'#b6c6c0',1);
 ctx.save();ctx.beginPath();ctx.rect(left,top,side,side);ctx.clip();
 path(ctx,[[X(0),Y(0)],[X(maxK),Y(maxK)]],'#bdc9c4',1.4);
 const curve=(fn,p)=>Array.from({length:241},(_,i)=>{const k=maxK*(i/240)**1.5;return [X(k),Y(fn(k,p))];});
 const activeParams=time<tau?before:after,grParams={...activeParams,s:activeParams.alpha},kGR=goldenCapital(activeParams);
 if(showGolden){path(ctx,curve(nextCapital,grParams),C.golden,1.6,[8,4,2,4]);
 path(ctx,[[X(kGR),Y(0)],[X(kGR),Y(kGR)]],C.golden,1,[2,4]);}
 if($('production').checked){path(ctx,curve(production,activeParams),C.faint,1.3);const at=.88*maxK;const fy=production(at,activeParams);if(fy<maxK)text(ctx,'f(k)',X(at),Y(fy)-7,'#82a99e','center',11);}
 path(ctx,curve(nextCapital,before),C.base,time<tau?2.5:1.7,[5,5]);
 if(different()){ctx.globalAlpha=time<tau?.45:1;path(ctx,curve(nextCapital,after),C.teal,time<tau?1.5:2.5,time<tau?[3,4]:[]);ctx.globalAlpha=1;}
 else path(ctx,curve(nextCapital,after),C.teal,2.1);
 const kOld=steadyState(before),kNew=steadyState(after);
 path(ctx,[[X(kOld),Y(0)],[X(kOld),Y(kOld)]],C.base,1,[3,4]);
 if(different())path(ctx,[[X(kNew),Y(0)],[X(kNew),Y(kNew)]],C.teal,1,[3,4]);
 const whole=Math.floor(time),frac=time-whole;
 // Retain a short, readable cobweb tail. Each dated transition uses its regime.
 for(let j=Math.max(0,whole-13);j<whole && j<horizon;j++){
   const a=rows[j].k,b=rows[j+1].k;
   ctx.globalAlpha=.2+.65*(j-Math.max(0,whole-13)+1)/Math.min(14,whole+1);
   arrow(ctx,X(a),Y(a),X(a),Y(b),C.amber);arrow(ctx,X(a),Y(b),X(b),Y(b),C.amber);
 }
 ctx.globalAlpha=1;
 const r=rows[whole],next=rows[Math.min(whole+1,horizon)];
 let px=r.k,py=r.k;
 if(whole<horizon){
   if(frac<.5){py=r.k+2*frac*(next.k-r.k);arrow(ctx,X(r.k),Y(r.k),X(px),Y(py),C.amber);}
   else{py=next.k;px=r.k+(2*frac-1)*(next.k-r.k);arrow(ctx,X(r.k),Y(r.k),X(r.k),Y(next.k),C.amber);arrow(ctx,X(r.k),Y(next.k),X(px),Y(py),C.amber);}
 }
 dot(ctx,X(kOld),Y(kOld),C.base,4);
 if(different())dot(ctx,X(kNew),Y(kNew),C.teal,5);
 if(showGolden)dot(ctx,X(kGR),Y(kGR),C.golden,6);
 dot(ctx,X(px),Y(py),C.amber,5);
 ctx.restore();
 // Steady-state labels are offset in opposite directions to avoid collisions.
 text(ctx,different()?'Initial k̄':'Steady state',X(kOld)-8,Y(kOld)-11,C.base,'right',11);
 if(different())text(ctx,'New k̄',X(kNew)+8,Y(kNew)+18,C.teal,'left',11);
 if(showGolden)text(ctx,'kᴳᴿ',X(kGR),Y(0)-8,C.golden,'center',11);
 text(ctx,'45°',X(maxK)-3,Y(maxK)+14,'#92a69d','right',11);
}
function series(id,key){
 const {ctx,w,h}=ctxFor(id),left=['K','C','Y'].includes(key)?49:41,right=16,top=7,bottom=18;
 const pw=Math.max(1,w-left-right),ph=Math.max(1,h-top-bottom);
 const values=rows.map(r=>chartValue(r,key)).concat(baseline.map(r=>chartValue(r,key)),showGolden?benchmarks.map(r=>chartValue(r,key)):[]);
 const hi=Math.max(...values),lo=Math.min(...values),span=Math.max(hi-lo,hi*.18,.01);
 const min=Math.max(0,lo-span*.17),max=hi+span*.17;
 const X=t=>left+t/horizon*pw,Y=v=>top+(max-v)/(max-min)*ph;
 const tickCount=ph<60?2:3;
 for(let j=0;j<tickCount;j++){const v=min+(max-min)*j/(tickCount-1);path(ctx,[[left,Y(v)],[left+pw,Y(v)]],C.grid,1);text(ctx,tickFmt(v),left-6,Y(v)+3,C.muted,'right',9);}
 for(const t of [0,horizon/2,horizon])text(ctx,String(t),X(t),h-7,C.muted,'center',9);
 text(ctx,'t',w-1,h-7,C.muted,'right',10);
 ctx.save();ctx.beginPath();ctx.rect(left,top,pw,ph);ctx.clip();
 if(different()){
   ctx.fillStyle='#f8f4eb';ctx.fillRect(X(tau),top,pw*(1-tau/horizon),ph);
   path(ctx,[[X(tau),top],[X(tau),top+ph]],'#d6bc91',1,[2,3]);
 }
 path(ctx,baseline.map(r=>[X(r.t),Y(chartValue(r,key))]),C.base,1.3,[4,4]);
 // Draw the discrete impact as a vertical jump at tau, with a left-limit point.
 if(showGolden){const goldenPoints=benchmarks.map(r=>[r.t,chartValue(r,key)]);
 // Draw benchmark regime changes at the shock date, with no sloped interpolation.
 if(different())goldenPoints.splice(tau,0,[tau,chartValue(goldenBenchmark({...rows[tau],p:before}),key)]);
 path(ctx,goldenPoints.map(([t,y])=>[X(t),Y(y)]),C.golden,1.5,[8,4,2,4]);}
 const points=rows.map(r=>[r.t,chartValue(r,key)]);
 if(different()){
   const r=rows[tau];
   const pre=chartValue(observe(r.t,r.k,r.A,r.N,before),key);
   points.splice(tau,0,[tau,pre]);
 }
 path(ctx,points.map(([t,y])=>[X(t),Y(y)]),C.teal,1.5,[3,4]);
 const past=points.filter(([t])=>t<=time);
 // Visual interpolation only; readouts remain exact integer-period observations.
 const a=rows[Math.floor(time)],b=rows[Math.min(Math.ceil(time),horizon)],v=chartValue(a,key)+(chartValue(b,key)-chartValue(a,key))*(time-Math.floor(time));
 if(time%1 && Math.ceil(time)!==tau)past.push([time,v]);
 path(ctx,past.map(([t,y])=>[X(t),Y(y)]),C.teal,2.2);
 path(ctx,[[X(time),top],[X(time),top+ph]],'#c49c61',1);
 dot(ctx,X(Math.floor(time)),Y(chartValue(a,key)),C.amber,3.5);
 ctx.restore();

}
function draw(){
 phase();for(const key of chartKeys)series(`chart-${key}`,key);if($('zoom-dialog').open){if(zoomType==='phase')phase('phase-zoom');else series('phase-zoom',zoomKey);}
 const t=Math.min(horizon,Math.floor(time)),r=rows[t];
 $('time').value=time;rangeFill($('time'));$('time-value').textContent=t;$('live-t').textContent=`t = ${t}`;
 $('current-k').textContent=fmt(r.k);$('old-k').textContent=fmt(steadyState(before));$('new-k').textContent=fmt(steadyState(after));$('golden-k').textContent=fmt(goldenCapital(r.p));
 for(const key of chartKeys)$(`value-${key}`).textContent=fmt(chartValue(r,key));
 $('level-a').textContent=fmt(r.A);$('level-n').textContent=fmt(r.N);
 $('growth').textContent=`γ = ${fmt(r.p.gamma)} (${pct(r.p.gamma-1)}) · n = ${fmt(r.p.n)} (${pct(r.p.n-1)}) · s = ${pct(r.s)}`;
 const stats=convergenceStats(r.p);
 $('convergence-speed').textContent=`${(stats.lambda*100).toFixed(2)}%`;
 $('half-life').textContent=fmt(stats.halfLife,1);
 $('convergence-regime').textContent=t<tau?'Initial':'After shock';
 const shocked=different()&&t>=tau;
 $('regime').textContent=shocked?'After the shock':different()?`Shock in ${tau-t} periods`:'Initial economy';$('regime').classList.toggle('shocked',shocked);
 $('step').disabled=t>=horizon;
 needsDraw=false;
}
function pause(){playing=false;$('play').textContent='▶ Play';$('play').setAttribute('aria-label','Play animation');$('zoom-play').textContent='▶ Play';$('zoom-play').setAttribute('aria-label','Play animation');}
function play(){if(time>=horizon)time=0;playing=true;lastFrame=performance.now();$('play').textContent='Ⅱ Pause';$('play').setAttribute('aria-label','Pause animation');$('zoom-play').textContent='Ⅱ Pause';$('zoom-play').setAttribute('aria-label','Pause animation');}
function frame(now){if(playing){time=Math.min(horizon,time+Math.min((now-lastFrame)/1000,.1)*+$('speed').value);needsDraw=true;if(time>=horizon)pause();}lastFrame=now;if(needsDraw)draw();requestAnimationFrame(frame);}
$('play').onclick=()=>playing?pause():play();
$('replay').onclick=()=>{time=0;play();};
$('step').onclick=()=>{pause();time=Math.min(horizon,Math.floor(time+1+1e-8));needsDraw=true;};
$('time').oninput=e=>{pause();time=+e.target.value;needsDraw=true;};
$('production').onchange=()=>needsDraw=true;
$('edit-before').onclick=()=>{mode='before';syncControls();};$('edit-after').onclick=()=>{mode='after';syncControls();};
$('initial-k').onchange=e=>{
 const value=+e.target.value;if(!Number.isFinite(value)||value<=0||value>1e9){e.target.value=Number(k0.toPrecision(8));return;}
 pause();k0=value;lockInitial=false;time=0;recompute();syncControls();
};
$('golden-rule').onclick=()=>{showGolden=!showGolden;syncControls();needsDraw=true;};
function setGrowth(gamma,n){
 pause();const p=mode==='before'?before:after;p.gamma=gamma;p.n=n;
 if(mode==='before'&&lockInitial)k0=steadyState(before);
 time=mode==='after'?Math.max(0,tau-2):0;recompute();syncControls();
}
$('growth-none').onclick=()=>setGrowth(1,1);
$('growth-positive').onclick=()=>setGrowth(1.02,1.01);
$('steady').onclick=()=>{pause();lockInitial=true;k0=steadyState(before);time=0;recompute();syncControls();};
$('tau').onchange=e=>{pause();tau=Math.min(horizon-1,Math.max(1,Math.round(+e.target.value)||20));time=Math.max(0,tau-2);recompute();syncControls();};
$('horizon').onchange=e=>{pause();horizon=+e.target.value;tau=Math.min(tau,horizon-1);recompute();syncControls();};
$('reset').onclick=()=>{pause();before={...START_PARAMS};after={...START_PARAMS};lockInitial=true;k0=steadyState(before);tau=20;horizon=160;time=0;mode='after';$('production').checked=true;$('speed').value='8';recompute();syncControls();};
document.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>{
 pause();after={...before};
 if(button.dataset.preset==='saving')after.s=Math.min(.8,before.s+.1);
 if(button.dataset.preset==='tech')after.gamma=Math.min(1.06,before.gamma+.02);
 if(button.dataset.preset==='capital')after.theta=Math.min(2,before.theta+.3);
 if(button.dataset.preset==='depreciation')after.delta=Math.min(.25,before.delta+.05);
 if(button.dataset.preset==='share')after.alpha=Math.min(.7,before.alpha+.10);
 mode='after';time=Math.max(0,tau-2);recompute();syncControls();play();
});
const dialog=$('model-dialog');$('help').onclick=$('help-footer').onclick=()=>dialog.showModal();$('close-help').onclick=()=>dialog.close();
const zoomDialog=$('zoom-dialog');
const chartTitles={k:'Capital per effective worker',K:'Total capital',y:'Output per effective worker',Y:'Total output',c:'Consumption per effective worker',C:'Total consumption',r:'Capital return',w:'Wage',i:'Saving per effective worker'};
const chartSymbols={k:'k_t',K:'K_t',y:'y_t',Y:'Y_t',c:'c_t',C:'C_t',r:'r_t',w:'w_t',i:'i_t'};
function openZoom(type,title,key=null){
 zoomType=type;zoomKey=key;zoomDialog.dataset.zoomType=type;$('zoom-title').textContent=title;
 $('zoom-axis-y').dataset.tex=type==='phase'?'k_{t+1}':chartSymbols[key];$('zoom-axis-x').dataset.tex=type==='phase'?'k_t':'';
 $('zoom-axis-x').hidden=type!=='phase';$('zoom-axis-y').hidden=false;allTex(zoomDialog);
 zoomDialog.showModal();needsDraw=true;requestAnimationFrame(()=>{if(type==='phase')phase('phase-zoom');else series('phase-zoom',key);});
}
$('zoom-open').onclick=()=>openZoom('phase','Law of motion');$('zoom-play').onclick=()=>playing?pause():play();
$('zoom-close').onclick=()=>zoomDialog.close();
document.querySelectorAll('[data-zoom-key]').forEach(button=>button.onclick=()=>openZoom('time',chartTitles[button.dataset.zoomKey],button.dataset.zoomKey));
const workspace=document.querySelector('.workspace');
function setPanelHidden(hidden){workspace.classList.toggle('controls-hidden',hidden);$('panel-expand').hidden=!hidden;$('panel-collapse').setAttribute('aria-expanded',String(!hidden));needsDraw=true;requestAnimationFrame(()=>draw());}
$('panel-collapse').onclick=()=>setPanelHidden(true);$('panel-expand').onclick=()=>setPanelHidden(false);
zoomDialog.addEventListener('click',e=>{if(e.target===zoomDialog){const r=zoomDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)zoomDialog.close();}});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
const resizeObserver=new ResizeObserver(()=>needsDraw=true);resizeObserver.observe(workspace);resizeObserver.observe(zoomDialog);
document.addEventListener('macro-model-change',event=>{if(event.detail.model!=='solow')pause();needsDraw=true;});
allTex();buildSliders();recompute();requestAnimationFrame(frame);
