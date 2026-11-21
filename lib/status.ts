import { config, type Thresholds } from './config';
import type { ChargerStatus, FaultType } from './types';

export interface StatusReading {
  voltage: number;
  current: number;
  temperature: number;
  vehicle_connected: boolean;
}

export interface StatusInput {
  lastSeen: Date | null;
  now: Date;
  maintenanceFlag: boolean;
  reading: StatusReading | null;
}

export interface StatusOptions {
  staleTimeoutSec: number;
  thresholds: Thresholds;
}

const defaults: StatusOptions = {
  staleTimeoutSec: config.staleTimeoutSec,
  thresholds: config.thresholds,
};

export function detectFaults(
  reading: StatusReading,
  t: Thresholds = config.thresholds,
): FaultType[] {
  const faults: FaultType[] = [];
  if (reading.temperature > t.overTempC) faults.push('OVER_TEMP');
  if (reading.current > t.overCurrentA) faults.push('OVER_CURRENT');
  if (reading.voltage < t.voltageMinV || reading.voltage > t.voltageMaxV) faults.push('BAD_VOLTAGE');
  return faults;
}

/**
 * Section 9.3, first match wins:
 * 1. stale -> OFFLINE
 * 2. maintenance flag or any fault -> MAINTENANCE
 * 3. vehicle connected and current above threshold -> IN_USE
 * 4. otherwise AVAILABLE
 */
export function computeStatus(
  input: StatusInput,
  options: StatusOptions = defaults,
): { status: ChargerStatus; faults: FaultType[] } {
  const { lastSeen, now, maintenanceFlag, reading } = input;

  const stale =
    lastSeen === null || now.getTime() - lastSeen.getTime() > options.staleTimeoutSec * 1000;
  if (stale) return { status: 'OFFLINE', faults: [] };

  const faults = reading ? detectFaults(reading, options.thresholds) : [];
  if (maintenanceFlag || faults.length > 0) return { status: 'MAINTENANCE', faults };

  if (reading && reading.vehicle_connected && reading.current > options.thresholds.inUseCurrentA) {
    return { status: 'IN_USE', faults };
  }
  return { status: 'AVAILABLE', faults };
}
