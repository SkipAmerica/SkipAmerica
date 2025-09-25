export function hudLog(label: string, ...args: any[]) {
  console.log(`[HUD] ${label}`, ...args);
}

export function hudError(label: string, error: any) {
  console.error(`[HUD] ${label} ERROR:`, error);
}