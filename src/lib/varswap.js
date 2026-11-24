// Variance-swap replication from a strip of out-of-the-money options, using the Cboe VIX
// discretization: σ² = (2/T) Σ (ΔK_i / K_i²) e^{rT} Q(K_i) − (1/T)(F/K0 − 1)².

/**
 * @param {{strike:number, call:number, put:number}[]} quotes sorted by strike; option mid prices
 * @param {{T:number, r:number, F?:number}} opts
 * @returns {{variance:number, vol:number, K0:number, F:number, contributions:{strike:number, Q:number, weight:number, contribution:number, type:string}[]}}
 */
export function fairVariance(quotes, { T, r, F }) {
  const qs = [...quotes].sort((a, b) => a.strike - b.strike);
  if (F === undefined) {
    // forward from the strike where |call − put| is smallest (put-call parity)
    let best = qs[0];
    for (const x of qs) if (Math.abs(x.call - x.put) < Math.abs(best.call - best.put)) best = x;
    F = best.strike + Math.exp(r * T) * (best.call - best.put);
  }
  let K0 = qs[0].strike;
  for (const x of qs) if (x.strike <= F) K0 = x.strike;
  const contributions = qs.map((x, i) => {
    const prev = qs[Math.max(i - 1, 0)].strike, next = qs[Math.min(i + 1, qs.length - 1)].strike;
    const dK = i === 0 ? next - x.strike : i === qs.length - 1 ? x.strike - prev : (next - prev) / 2;
    let Q, type;
    if (x.strike < K0) { Q = x.put; type = 'put'; }
    else if (x.strike > K0) { Q = x.call; type = 'call'; }
    else { Q = (x.call + x.put) / 2; type = 'both'; }
    const weight = dK / (x.strike * x.strike);
    return { strike: x.strike, Q, weight, type, contribution: (2 / T) * weight * Math.exp(r * T) * Q };
  });
  const variance = contributions.reduce((a, c) => a + c.contribution, 0) - (1 / T) * (F / K0 - 1) ** 2;
  return { variance, vol: Math.sqrt(Math.max(variance, 0)), K0, F, contributions };
}

/** Variance-swap P&L for a long position: notional_var × (σ²_realized − K_var). Inputs in vol terms. */
export function varSwapPnL({ vegaNotional, strikeVol, realizedVol }) {
  const varianceNotional = vegaNotional / (2 * strikeVol * 100);
  return varianceNotional * ((realizedVol * 100) ** 2 - (strikeVol * 100) ** 2);
}
