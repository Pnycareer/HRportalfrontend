// src/utils/money.js
export function numberOrNull(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

export function formatRs(amount) {
  if (!Number.isFinite(amount)) return "--";
  return `Rs ${new Intl.NumberFormat().format(Math.round(amount))}`;
}
