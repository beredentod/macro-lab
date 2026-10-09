import test from 'node:test';
import assert from 'node:assert/strict';
import {RAMSEY_DEFAULTS as p,steady,f,mpk,kNull,cNull,nextK,nextC,utility,simulateRamsey} from './ramsey-model.js';
const near=(x,y,tol=1e-5)=>assert.ok(Math.abs(x-y)<=tol*Math.max(1,Math.abs(x),Math.abs(y)),`${x} != ${y}`);

test('steady states satisfy the exact resource constraint and after-tax Euler equation',()=>{
 for(const tax of [0,.1,.5,.99])for(const sigma of [.5,1,2,5]){
  const q={...p,tax,sigma},s=steady(q);
  near(nextK(s.k,s.c,q),s.k,1e-10);near(nextC(s.c,s.k,q),s.c,1e-10);
  near(kNull(s.k,q),s.c,1e-10);near(cNull(s.k,q),s.c,1e-10);
 }
 near(utility(2,1),Math.log(2),1e-12);
});

test('the consumption nullcline is concave and the capital tax lowers steady capital',()=>{
 const s=steady(p),taxed=steady({...p,tax:.25});
 assert.ok(taxed.k<s.k);assert.ok(taxed.c<s.c);
 const h=s.k*.1;assert.ok(cNull(s.k-h,p)+cNull(s.k+h,p)<2*cNull(s.k,p));
 near(mpk(s.k,p),p.alpha*f(s.k,p)/s.k);
});

test('unanticipated tax shocks jump consumption at predetermined capital and follow the new saddle arm',()=>{
 const taxed={...p,tax:.25},star=steady(p),{rows}=simulateRamsey(p,taxed,star.k,20,160);
 near(rows[19].k,rows[20].k);assert.ok(rows[20].c>rows[19].c);
 assert.ok(rows[21].k<rows[20].k);near(rows.at(-1).k,steady(taxed).k,1e-5);
 for(let t=0;t<160;t++){
  const x=rows[t],z=rows[t+1];near(z.k,nextK(x.k,x.c,x.p),1e-11);
  near(x.y,x.c+x.i,1e-12);near(x.s,x.i/x.y,1e-12);
  near(z.A,x.A*x.p.gamma,1e-12);near(z.N,x.N*x.p.n,1e-12);
  if(t!==19)near(z.c,nextC(x.c,z.k,x.p),2e-5);
 }
});

test('100% tax has a zero boundary rather than a fabricated positive steady state',()=>{
 const q={...p,tax:1};assert.deepEqual(steady(q),{k:0,c:0,boundary:true});
 const {rows}=simulateRamsey(p,q,steady(p).k,20,160);
 assert.ok(rows.every(x=>x.k>0&&x.c>0));
 assert.ok(rows.at(-1).k<1e-5);
 for(let t=20;t<160;t++)near(rows[t+1].c,nextC(rows[t].c,rows[t+1].k,q),1e-8);
});

test('initial capital on either side of the saddle path converges',()=>{
 const target=steady(p).k;
 for(const factor of [.25,.5,1.5,3]){
  const {rows}=simulateRamsey(p,p,target*factor,20,160);
  assert.ok(Math.abs(rows.at(-1).k-target)<Math.abs(rows[0].k-target));
  assert.ok(rows.every(x=>Number.isFinite(x.k)&&x.k>0&&x.c>0));
 }
 assert.throws(()=>simulateRamsey(p,{...p,tax:1.1},target));
});
