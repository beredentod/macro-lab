/** Ramsey model in discrete time, per effective worker. Growth factors are gross. */
export const RAMSEY_DEFAULTS = Object.freeze({alpha:1/3,gamma:1.02,n:1.01,delta:.08,theta:1,beta:.96,sigma:2,tax:0});
export const f=(k,p)=>Math.pow(p.theta*k,p.alpha);
export const mpk=(k,p)=>p.alpha*f(k,p)/k;
export const netReturn=(k,p)=>1+(mpk(k,p)-p.delta)*(1-p.tax);
export const utility=(c,sigma)=>sigma===1?Math.log(c):(Math.pow(c,1-sigma)-1)/(1-sigma);
export function validateRamsey(p){
 if(!Object.values(p).every(Number.isFinite)||!(p.alpha>0&&p.alpha<1&&p.gamma>=1&&p.n>=1&&p.delta>0&&p.delta<1&&p.theta>0&&p.beta>0&&p.beta<1&&p.sigma>0&&p.tax>=0&&p.tax<=1))throw Error('Invalid Ramsey parameters');
 if(p.beta*p.n*Math.pow(p.gamma,1-p.sigma)>=1)throw Error('Discounted utility requires β n γ^(1−σ) < 1; lower β or n, or increase σ');
 if(!(Math.pow(p.gamma,p.sigma)/p.beta>1-p.delta))throw Error('No finite interior steady state');
}
export const nextK=(k,c,p)=>(f(k,p)+(1-p.delta)*k-c)/(p.gamma*p.n);
export const nextC=(c,kNext,p)=>c*Math.pow(p.beta*netReturn(kNext,p),1/p.sigma)/p.gamma;
export const kNull=(k,p)=>f(k,p)-(p.delta+p.gamma*p.n-1)*k;
export function steady(p){
 validateRamsey(p);
 if(p.tax===1)return {k:0,c:0,boundary:true};
 const target=p.delta+(Math.pow(p.gamma,p.sigma)/p.beta-1)/(1-p.tax);
 const k=Math.pow(p.alpha*Math.pow(p.theta,p.alpha)/target,1/(1-p.alpha));
 const c=kNull(k,p);
 if(!(c>0))throw Error('These parameters do not admit positive steady-state consumption');
 return {k,c,boundary:false};
}
/** Discrete-time consumption nullcline. It is curved because Euler uses k_(t+1). */
export const cNull=(k,p)=>{const s=steady(p);return s.boundary?NaN:f(k,p)+(1-p.delta)*k-p.gamma*p.n*s.k;};
function inverseResource(value,p){
 let lo=0,hi=Math.max(1,value);
 while(f(hi,p)+(1-p.delta)*hi<value)hi*=2;
 for(let j=0;j<65;j++){const mid=(lo+hi)/2;if(f(mid,p)+(1-p.delta)*mid<value)lo=mid;else hi=mid;}
 return (lo+hi)/2;
}
function backward(kNext,cNext,p){
 const c=p.gamma*cNext/Math.pow(p.beta*netReturn(kNext,p),1/p.sigma);
 const k=inverseResource(c+p.gamma*p.n*kNext,p);
 return {k,c};
}
/** Stable manifold by inverse dynamics, seeded along the stable eigenvector. */
export function saddle(p,minimum,maximum){
 const s=steady(p);if(s.boundary)return [];
 const R=netReturn(s.k,p),a=(mpk(s.k,p)+1-p.delta)/(p.gamma*p.n),b=-1/(p.gamma*p.n);
 const d=s.c*(1-p.tax)*(p.alpha-1)*mpk(s.k,p)/(s.k*p.sigma*R);
 const trace=a+1+d*b,det=a,disc=Math.max(0,trace*trace-4*det);
 const lambda=(trace-Math.sqrt(disc))/2,slope=(lambda-a)/b;
 // High taxes and large σ can make the stable root very close to one.
 // Resolve the requested capital range instead of stopping after a fixed 650 inverse steps.
 const distance=Math.max(maximum/s.k,s.k/Math.max(minimum,1e-12),2);
 const maxSteps=Math.min(20000,Math.max(650,3*Math.ceil(Math.log(distance/1e-5)/Math.max(1e-5,-Math.log(lambda)))));
 const points=[{k:s.k,c:s.c,slope}];
 for(const dir of [-1,1]){
  let point={k:s.k+dir*s.k*1e-5,c:s.c+dir*s.k*1e-5*slope,slope};
  const branch=[];
  for(let j=0;j<maxSteps && point.k>1e-12 && point.c>1e-12 && Number.isFinite(point.k+point.c);j++){
   branch.push(point);
   if((dir<0&&point.k<minimum)||(dir>0&&point.k>maximum))break;
   const older=backward(point.k,point.c,p);
   // Propagate the tangent through the inverse map for accurate Hermite interpolation.
   const derivative=(older.c/point.c)*point.slope-older.c*(1-p.tax)*(p.alpha-1)*mpk(point.k,p)/(point.k*p.sigma*netReturn(point.k,p));
   older.slope=(mpk(older.k,p)+1-p.delta)*derivative/(derivative+p.gamma*p.n);
   if(Math.abs(older.k-point.k)<1e-12*s.k)break;
   point=older;
  }
  points.push(...branch);
 }
 return points.sort((x,y)=>x.k-y.k);
}
function onManifold(k,points){
 let lo=0,hi=points.length-1;
 if(k<points[lo].k||k>points[hi].k)throw Error('Initial capital is outside the numerically resolved saddle path');
 if(k===points[lo].k)return points[lo].c;
 if(k===points[hi].k)return points[hi].c;
 while(hi-lo>1){const m=(lo+hi)>>1;if(points[m].k<k)lo=m;else hi=m;}
 const a=points[lo],b=points[hi],h=b.k-a.k,t=(k-a.k)/h,sec=(b.c-a.c)/h;
 // Cubic Hermite interpolation uses inverse-map tangents to reduce Euler error between samples.
 const slope=i=>{
  if(i<=0||i>=points.length-1)return sec;
  const left=(points[i].c-points[i-1].c)/(points[i].k-points[i-1].k);
  const right=(points[i+1].c-points[i].c)/(points[i+1].k-points[i].k);
  return left*right<=0?0:2*left*right/(left+right);
 };
 const m0=Number.isFinite(a.slope)?a.slope:slope(lo),m1=Number.isFinite(b.slope)?b.slope:slope(hi);
 return (2*t**3-3*t*t+1)*a.c+(t**3-2*t*t+t)*h*m0+(-2*t**3+3*t*t)*b.c+(t**3-t*t)*h*m1;
}
/** Boundary case at tax=100%: finite-horizon shooting approximates the path to zero. */
function boundaryConsumption(k,p,remaining){
 let lo=0,hi=f(k,p)+(1-p.delta)*k;
 const terminal=c0=>{
  let capital=k,consumption=c0;
  for(let j=0;j<remaining;j++){
   const next=nextK(capital,consumption,p);
   if(!(next>0))return -1;
   capital=next;consumption=nextC(consumption,next,p);
   if(!Number.isFinite(capital))return 1;
  }
  return capital;
 };
 // High consumption exhausts resources; search for the near-zero terminal stock.
 for(let j=0;j<65;j++){const m=(lo+hi)/2;if(terminal(m)>1e-8)lo=m;else hi=m;}
 return (lo+hi)/2;
}
function observation(t,k,c,A,N,p){
 const y=f(k,p),i=y-c;
 return {t,k,c,y,i,s:i/y,r:mpk(k,p),w:(1-p.alpha)*A*y,A,N,p};
}
function consumptionAt(k,p,manifold,remaining){
 return p.tax===1?boundaryConsumption(k,p,remaining+30):onManifold(k,manifold);
}
/** Solve the announced transition as a boundary-value problem, not unstable forward shooting.
 * Unknowns are k_1,...,k_T. Each Euler residual touches only adjacent capital stocks.
 * The terminal consumption is on the post-policy stable manifold. */
function announcedPrefix(before,after,k0,shock,horizon,pre,post){
 const G=before.gamma*before.n;
 const capitals=[k0];
 for(let t=0;t<shock;t++){
  const c=consumptionAt(capitals[t],before,pre,horizon-t);
  capitals.push(nextK(capitals[t],c,before));
 }
 const terminal=k=>consumptionAt(k,after,post,horizon-shock);
 const evaluate=(ks,jacobian=false)=>{
  if(ks.some(k=>!(k>1e-14&&Number.isFinite(k))))return null;
  let tail;try{tail=terminal(ks[shock]);}catch{return null;}
  const cs=ks.slice(0,-1).map((k,t)=>f(k,before)+(1-before.delta)*k-G*ks[t+1]);cs.push(tail);
  if(cs.some(c=>!(c>1e-14&&Number.isFinite(c))))return null;
  const residual=[],lower=[],diagonal=[],upper=[];
  for(let t=0;t<shock;t++){
   const k=ks[t+1],R=netReturn(k,before);
   residual.push(Math.log(cs[t+1]/cs[t])-(Math.log(before.beta*R)/before.sigma-Math.log(before.gamma)));
   if(jacobian){
    let derivative;
    if(t===shock-1){
     const h=Math.max(1e-10,k*1e-5);
     derivative=(terminal(k+h)-terminal(Math.max(k*.5,k-h)))/(k+h-Math.max(k*.5,k-h));
    }else derivative=mpk(k,before)+1-before.delta;
    const eulerDerivative=(1-before.tax)*(before.alpha-1)*mpk(k,before)/(k*before.sigma*R);
    lower.push(t?-(mpk(ks[t],before)+1-before.delta)/cs[t]:0);
    diagonal.push(derivative/cs[t+1]+G/cs[t]-eulerDerivative);
    upper.push(t<shock-1?-G/cs[t+1]:0);
   }
  }
  return {cs,residual,lower,diagonal,upper,norm:Math.max(...residual.map(Math.abs))};
 };
 for(let iteration=0;iteration<75;iteration++){
  const state=evaluate(capitals,true);
  if(!state)throw Error('The announced transition has no feasible starting point');
  if(state.norm<2e-10)return {capitals,consumption:state.cs};
  const {lower,diagonal,upper}=state,rhs=state.residual.map(v=>-v);
  for(let j=1;j<shock;j++){
   const ratio=lower[j]/diagonal[j-1];diagonal[j]-=ratio*upper[j-1];rhs[j]-=ratio*rhs[j-1];
  }
  const step=Array(shock);step[shock-1]=rhs[shock-1]/diagonal[shock-1];
  for(let j=shock-2;j>=0;j--)step[j]=(rhs[j]-upper[j]*step[j+1])/diagonal[j];
  let accepted=false;
  for(let scale=1;scale>=2**-24;scale*=.5){
   const trial=[k0,...step.map((d,j)=>capitals[j+1]+scale*d)];
   const candidate=evaluate(trial);
   if(candidate&&candidate.norm<state.norm){capitals.splice(0,capitals.length,...trial);accepted=true;break;}
  }
  if(!accepted)throw Error('The announced transition could not be resolved; reduce the shock size');
 }
 throw Error('The announced transition did not reach numerical tolerance');
}
/** Forward Euler dynamics deliberately do not project deviations back onto the saddle path. */
export function unstableRamsey(before,after,optimal,shock,horizon,deviation=0,anticipated=false){
 const rows=[];let k=optimal[0].k,c=optimal[0].c*(1+deviation),A=1,N=1,termination=null;
 for(let t=0;t<=horizon;t++){
  const p=t<shock?before:after;
  if(!(k>0&&c>0&&Number.isFinite(k+c))){termination='Consumption approaches zero';break;}
  const capital=nextK(k,c,p);
  rows.push(observation(t,k,c,A,N,p));
  if(!(capital>0&&Number.isFinite(capital))){termination='Capital is exhausted';break;}
  if(t===horizon)break;
  let consumption=nextC(c,capital,p);
  if(!anticipated&&t+1===shock){
   const expected=nextC(optimal[t].c,optimal[t+1].k,before);
   consumption*=optimal[t+1].c/expected;
  }
  k=capital;c=consumption;A*=p.gamma;N*=p.n;
 }
 return {rows,termination};
}
/** TVC is an asymptotic condition. Interior stable paths satisfy it analytically:
 * (β n γ^(1−σ))^T k_(T+1)/c_T^σ tends to zero on the BGP.
 * Finite-horizon boundary paths are explicitly reported as approximations. */
export function ramseyDiagnostic(after,deviation,termination=null){
 if(Math.abs(deviation)>1e-10)return {
  status:deviation<0?'violated':'diverging',
  label:deviation<0?'TVC violated: excess accumulation':'Path does not converge',
  detail:termination||'Initial consumption misses the unique stable path; the Euler trajectory is not projected back.'
 };
 if(after.tax===1)return {status:'boundary',label:'Boundary path: TVC is approximated',detail:'100% tax has no positive steady state. This is a finite-horizon boundary solution.'};
 return {status:'satisfied',label:`${after.tax>0?'Equilibrium':'Optimal'} path: TVC satisfied ✓`,detail:'The stable continuation converges to the balanced-growth path, where β n γ^(1−σ) < 1. The diagnostic uses this asymptotic continuation, not a finite endpoint alone.'};
}
export function simulateRamsey(before,after,k0,shock=20,horizon=160,options={}){
 validateRamsey(before);validateRamsey(after);
 if(!(k0>0&&Number.isFinite(k0)&&Number.isInteger(shock)&&shock>=1&&Number.isInteger(horizon)&&horizon>=shock))throw Error('Invalid dates or initial capital');
 const lower=Math.max(1e-5,Math.min(k0,steady(before).k||k0,steady(after).k||k0)*.15);
 const upper=Math.max(k0,steady(before).k,steady(after).k)*2.5;
 const pre=saddle(before,lower,upper),post=saddle(after,lower,upper);
 const anticipated=Boolean(options.anticipated),deviation=options.consumptionDeviation??0;
 if(!(Number.isFinite(deviation)&&deviation>=-.5&&deviation<=.5))throw Error('Initial consumption deviation must be between −50% and 50%');
 const changed=Object.keys(before).some(key=>Math.abs(before[key]-after[key])>1e-12);
 const prefix=anticipated&&changed?announcedPrefix(before,after,k0,shock,horizon,pre,post):null;
 let k=k0,A=1,N=1;
 const rows=[];
 for(let t=0;t<=horizon;t++){
  const p=t<shock?before:after,manifold=t<shock?pre:post;
  if(prefix&&t<=shock)k=prefix.capitals[t];
  const c=prefix&&t<shock?prefix.consumption[t]:consumptionAt(k,p,manifold,horizon-t);
  if(!(c>0&&c<f(k,p)+(1-p.delta)*k))throw Error('Capital outside the feasible saddle path');
  rows.push(observation(t,k,c,A,N,p));
  if(t<horizon){k=nextK(k,c,p);if(!(k>0&&Number.isFinite(k)))throw Error('Capital path is infeasible');A*=p.gamma;N*=p.n;}
 }
 const alternative=deviation?unstableRamsey(before,after,rows,shock,horizon,deviation,anticipated):null;
 return {rows:alternative?alternative.rows:rows,optimal:rows,pre,post,
  termination:alternative?.termination||null,diagnostic:ramseyDiagnostic(after,deviation,alternative?.termination)};
}
