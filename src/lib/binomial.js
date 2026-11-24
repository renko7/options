// Cox-Ross-Rubinstein binomial tree. Supports American exercise and discrete cash dividends
// (escrowed-dividend model: the tree runs on S minus the PV of dividends paid before expiry).

/**
 * @param {object} o
 * @param {number} o.S @param {number} o.K @param {number} o.T years @param {number} o.r
 * @param {number} [o.q] continuous yield @param {number} o.sigma @param {'call'|'put'} o.type
 * @param {boolean} [o.american] @param {number} [o.steps]
 * @param {{t:number, amount:number}[]} [o.dividends] discrete cash dividends, t in years
 * @returns {{price:number, earlyExercise:boolean[][]|undefined, tree?:object}}
 */
export function price(o) {
  const { S, K, T, r = 0, q = 0, sigma, type, american = false, steps = 200, dividends = [], keepTree = false } = o;
  const dt = T / steps;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const disc = Math.exp(-r * dt);
  const p = (Math.exp((r - q) * dt) - d) / (u - d);
  if (!(p > 0 && p < 1)) throw new Error('binomial: risk-neutral probability out of (0,1); increase steps');
  const divs = dividends.filter((x) => x.t > 0 && x.t <= T);
  const pvDivs = (t) => divs.reduce((acc, x) => acc + (x.t > t + 1e-12 ? x.amount * Math.exp(-r * (x.t - t)) : 0), 0);
  const Sstar = S - pvDivs(0);
  const payoff = (s) => (type === 'call' ? Math.max(s - K, 0) : Math.max(K - s, 0));
  let v = new Array(steps + 1);
  for (let j = 0; j <= steps; j++) v[j] = payoff(Sstar * u ** j * d ** (steps - j));
  const tree = keepTree ? [v.slice()] : null;
  const early = keepTree ? [] : null;
  for (let i = steps - 1; i >= 0; i--) {
    const t = i * dt;
    const add = pvDivs(t);
    const nv = new Array(i + 1);
    const ex = keepTree ? new Array(i + 1).fill(false) : null;
    for (let j = 0; j <= i; j++) {
      let cont = disc * (p * v[j + 1] + (1 - p) * v[j]);
      if (american) {
        const ie = payoff(Sstar * u ** j * d ** (i - j) + add);
        if (ie > cont + 1e-12) { cont = ie; if (ex) ex[j] = true; }
      }
      nv[j] = cont;
    }
    v = nv;
    if (keepTree) { tree.unshift(v.slice()); early.unshift(ex); }
  }
  return keepTree ? { price: v[0], tree, early, u, d, p, dt } : { price: v[0] };
}
