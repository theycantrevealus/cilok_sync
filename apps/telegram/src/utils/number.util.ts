export function formatNumber(num?: number): string {
  return typeof num === 'number' ? num.toLocaleString() : '-';
}
