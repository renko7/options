// Number formatting used everywhere a number reaches the Learner. US conventions.

const MINUS = '−';

function fixed(x, dp) {
  return Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** $1,234.56 ; negative as −$1,234.56 */
export function usd(x, dp = 2) {
  if (!Number.isFinite(x)) return x > 0 ? 'unlimited' : x < 0 ? `${MINUS}unlimited` : '—';
  const r = Number(x.toFixed(dp));
  return (r < 0 ? MINUS : '') + '$' + fixed(r, dp);
}

/** Signed dollars: +$12.00 / −$12.00 */
export function signedUsd(x, dp = 2) {
  const r = Number(x.toFixed(dp));
  return (r > 0 ? '+' : '') + usd(r, dp);
}

/** 0.3 -> 30.0% */
export function pct(x, dp = 1) {
  const r = Number((x * 100).toFixed(dp));
  return (r < 0 ? MINUS : '') + fixed(r, dp) + '%';
}

/** Plain number with grouping. */
export function num(x, dp = 2) {
  const r = Number(x.toFixed(dp));
  return (r < 0 ? MINUS : '') + fixed(r, dp);
}

/** Signed plain number: +0.52 / −0.52 */
export function signed(x, dp = 2) {
  const r = Number(x.toFixed(dp));
  return (r > 0 ? '+' : '') + num(r, dp);
}

/** Integer with grouping. */
export function int(x) {
  return num(Math.round(x), 0);
}
