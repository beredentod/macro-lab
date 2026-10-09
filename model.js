/** Discrete-time Solow model, in units per effective worker (A_t N_t).
 * gamma and n are GROSS growth factors, following Broer's lecture.
 * A capital-augmenting level theta enters as (theta K)^alpha.
 */
export const DEFAULTS = Object.freeze({alpha: 1/3, gamma: 1, n: 1, delta: .75, s: .33, theta: 1});
export function validate(p) {
  if (!(p.alpha>0 && p.alpha<1 && p.gamma>=1 && p.n>=1 && p.delta>0 && p.delta<1 && p.s>0 && p.s<1 && p.theta>0)) throw Error('Invalid Solow parameters');
}
export const production = (k,p) => Math.pow(p.theta*k,p.alpha);
export const nextCapital = (k,p) => ((1-p.delta)*k+p.s*production(k,p))/(p.gamma*p.n);
export const steadyState = p => Math.pow(p.s*Math.pow(p.theta,p.alpha)/(p.gamma*p.n-1+p.delta),1/(1-p.alpha));
export const goldenCapital = p => Math.pow(p.alpha*Math.pow(p.theta,p.alpha)/(p.gamma*p.n-1+p.delta),1/(1-p.alpha));
export function observe(t,k,A,N,p) {
  const y=production(k,p);
  return {t,k,A,N,y,c:(1-p.s)*y,i:p.s*y,s:p.s,mpk:p.alpha*y/k,mpl:(1-p.alpha)*A*y,p};
}
/** A shock applies at the START of tau: k,A,N predetermined;
 * c,y,i,MPK,MPL use the new parameters immediately. New growth factors
 * govern tau -> tau+1. The no-shock counterfactual has the same k0.
 */
export function simulate(before,after,k0,tau=20,horizon=160) {
  validate(before); validate(after);
  if (!(k0>0) || !Number.isInteger(tau) || tau<0 || horizon<tau) throw Error('Invalid initial condition or dates');
  let k=k0,A=1,N=1;
  const rows=[];
  for(let t=0;t<=horizon;t++){
    const p=t<tau?before:after;
    rows.push(observe(t,k,A,N,p));
    k=nextCapital(k,p); A*=p.gamma; N*=p.n;
  }
  return rows;
}
