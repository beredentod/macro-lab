import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,production,nextCapital,steadyState,goldenCapital,simulate} from './model.js';
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
test('steady state solves the exact discrete law, including growth and theta',()=>{
 for(const alpha of [.1,1/3,.7])for(const s of [.02,.2,.8])for(const gamma of [1,1.02,1.06]){
 const p={...DEFAULTS,alpha,s,gamma,n:1.01,theta:1.4};const k=steadyState(p);close(nextCapital(k,p),k);
 }
});
test('savings shock has immediate consumption drop, predetermined capital, and eventual recovery',()=>{
 const b={...DEFAULTS},a={...b,s:.3},k=steadyState(b),r=simulate(b,a,k,20,1000);
 close(r[20].k,r[19].k);close(r[20].c/r[19].c,.7/.8);assert.ok(r[21].k>r[20].k);assert.ok(r[1000].c>r[19].c);close(r[1000].k,steadyState(a));
 for(const x of r)close(x.c+x.i,x.y);
});
test('technology and population changes affect next-period levels, with aggregate capital accounting',()=>{
 const b={...DEFAULTS},a={...b,gamma:1.02,n:1.01,theta:1.3};const r=simulate(b,a,steadyState(b),20,100);
 close(r[20].A,1);close(r[20].N,1);close(r[21].A,1.02);close(r[21].N,1.01);
 for(let t=0;t<100;t++){
 const x=r[t],z=r[t+1];close(z.k*z.A*z.N,((1-x.p.delta)*x.k+x.i)*x.A*x.N);
 close(x.mpk*x.k+x.mpl/x.A,x.y);
 }
});
test('marginal products match physical-capital and raw-labor derivatives',()=>{
 const p={...DEFAULTS,theta:1.4},K=8,A=2,N=3,h=1e-5;
 const F=(K,N)=>Math.pow(p.theta*K,p.alpha)*Math.pow(A*N,1-p.alpha);
 const k=K/(A*N),y=production(k,p);
 close((F(K+h,N)-F(K-h,N))/(2*h),p.alpha*y/k,1e-8);
 close((F(K,N+h)-F(K,N-h))/(2*h),(1-p.alpha)*A*y,1e-8);
});
test('golden rule and oversaving do not promise consumption gains',()=>{
 const p={...DEFAULTS,s:DEFAULTS.alpha};close(steadyState(p),goldenCapital(p));
 const over={...p,s:.7};assert.ok((1-over.s)*production(steadyState(over),over)<(1-p.s)*production(steadyState(p),p));
});
test('convergence from both sides and positive finite boundary paths',()=>{
 for(const p of [{...DEFAULTS},{alpha:.7,s:.8,delta:.01,gamma:1,n:1,theta:2},{alpha:.1,s:.02,delta:.25,gamma:1.06,n:1.04,theta:.5}]){
 for(const multiple of [.2,2]){
 const star=steadyState(p),r=simulate(p,p,star*multiple,20,320);
 r.forEach(x=>assert.ok(Number.isFinite(x.k)&&x.k>0&&Number.isFinite(x.mpk)&&Number.isFinite(x.mpl)));
 assert.ok(Math.abs(r.at(-1).k-star)<Math.abs(r[0].k-star));
 }
 }
});
