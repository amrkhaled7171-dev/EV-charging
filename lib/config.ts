// Single place for thresholds, timeouts and intervals (NFR6). Values come from .env.local.
function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  thresholds: {
    overTempC: num('OVER_TEMP_C', 70),
    overCurrentA: num('OVER_CURRENT_A', 40),
    voltageMinV: num('VOLTAGE_MIN_V', 200),
    voltageMaxV: num('VOLTAGE_MAX_V', 250),
    inUseCurrentA: num('IN_USE_CURRENT_A', 0.5),
  },
  staleTimeoutSec: num('STALE_TIMEOUT_SEC', 15),
  offlineJobIntervalSec: num('OFFLINE_JOB_INTERVAL_SEC', 5),
  retentionDays: num('RETENTION_DAYS', 7),
  purgeIntervalMin: num('PURGE_INTERVAL_MIN', 60),
  // Validation ranges for incoming readings (section 8.1)
  limits: {
    voltageMax: 300,
    currentMax: 80,
    temperatureMin: -20,
    temperatureMax: 120,
  },
};

export type Thresholds = typeof config.thresholds;
