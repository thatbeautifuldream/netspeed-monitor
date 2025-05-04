export type SpeedDisplayMode = "both" | "up" | "down";

export function formatMenuTitle(
  rxSpeed: number,
  txSpeed: number,
  mode: SpeedDisplayMode = "both"
): string {
  function formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond <= 0) return "--";
    const bitsPerSecond = bytesPerSecond * 8;
    if (bitsPerSecond < 1024) return `${bitsPerSecond} b/s`;
    if (bitsPerSecond < 1024 * 1024)
      return `${Math.round(bitsPerSecond / 1024)} Kb/s`;
    if (bitsPerSecond < 1024 * 1024 * 1024)
      return `${Math.round(bitsPerSecond / 1024 / 1024)} Mb/s`;
    return `${Math.round(bitsPerSecond / 1024 / 1024 / 1024)} Gb/s`;
  }
  if (mode === "up") return `↑ ${formatSpeed(txSpeed)}`;
  if (mode === "down") return `↓ ${formatSpeed(rxSpeed)}`;
  return `↓ ${formatSpeed(rxSpeed)} ↑ ${formatSpeed(txSpeed)}`;
}
