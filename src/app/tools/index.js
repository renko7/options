// Tool registry. Each tool module exports mount(el, config).
export const TOOLS = {
  'position-builder': { title: 'Position builder', track: 'Core', blurb: 'Build any combination of calls, puts and stock and see its P&L at expiration and before it, with break-evens and position Greeks.' },
  pricer: { title: 'Black-Scholes pricer', track: 'Core', blurb: 'Price a call or put and see every Greek move as you change spot, strike, time, volatility, rates and dividends.' },
  'greeks-explorer': { title: 'Greeks explorer', track: 'Core', blurb: 'See how delta, gamma, theta and vega change across strikes and as expiration approaches.' },
  chain: { title: 'Options chain', track: 'Core', blurb: 'Read a full ACME or HBR chain: quotes, implied volatility, Greeks, volume and open interest, with OCC symbols.' },
  'hedge-sim': { title: 'Delta-hedging simulator', track: 'Advanced', blurb: 'Delta-hedge an option along simulated price paths and watch P&L follow the gap between realized and implied volatility.' },
  'vol-surface': { title: 'Volatility surface', track: 'Advanced', blurb: 'Explore smiles and term structure, and fit an SVI slice while checking it for arbitrage.' },
  varswap: { title: 'Variance-swap replicator', track: 'Advanced', blurb: 'Replicate a variance swap from a strip of options and see which strikes carry the price.' },
};

const loaders = {
  'position-builder': () => import('./position-builder.js'),
  pricer: () => import('./pricer.js'),
  'greeks-explorer': () => import('./greeks-explorer.js'),
  chain: () => import('./chain.js'),
  'hedge-sim': () => import('./hedge-sim.js'),
  'vol-surface': () => import('./vol-surface.js'),
  varswap: () => import('./varswap.js'),
};

export async function mountTool(el, name, config) {
  if (!loaders[name]) { el.textContent = `Unknown tool: ${name}`; return; }
  try {
    const mod = await loaders[name]();
    mod.mount(el, config || {});
  } catch (e) {
    el.textContent = `This tool did not load (${e.message}).`;
    console.error(e);
  }
}
