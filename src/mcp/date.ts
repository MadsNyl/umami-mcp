export function dateToMs(date: string): number {
  const ms = new Date(date).getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid date string: "${date}"`);
  }
  return ms;
}
