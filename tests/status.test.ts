import { describe, expect, it } from 'vitest';
import { computeStatus, detectFaults, type StatusOptions } from '../lib/status';

const options: StatusOptions = {
  staleTimeoutSec: 15,
  thresholds: { overTempC: 70, overCurrentA: 40, voltageMinV: 200, voltageMaxV: 250, inUseCurrentA: 0.5 },
};
const now = new Date('2026-11-21T10:00:00Z');
const seen = (secondsAgo: number) => new Date(now.getTime() - secondsAgo * 1000);
const ok = { voltage: 230, current: 16, temperature: 40, vehicle_connected: true };

describe('computeStatus (section 9.3)', () => {
  it('OFFLINE when never seen', () => {
    expect(computeStatus({ lastSeen: null, now, maintenanceFlag: false, reading: null }, options).status).toBe('OFFLINE');
  });
  it('OFFLINE when last reading is older than the timeout', () => {
    expect(computeStatus({ lastSeen: seen(16), now, maintenanceFlag: false, reading: ok }, options).status).toBe('OFFLINE');
  });
  it('not OFFLINE exactly at the timeout', () => {
    expect(computeStatus({ lastSeen: seen(15), now, maintenanceFlag: false, reading: ok }, options).status).toBe('IN_USE');
  });
  it('OFFLINE wins over maintenance flag and faults (precedence 1)', () => {
    const r = computeStatus({ lastSeen: seen(60), now, maintenanceFlag: true, reading: { ...ok, temperature: 99 } }, options);
    expect(r.status).toBe('OFFLINE');
  });
  it('MAINTENANCE when the flag is set', () => {
    expect(computeStatus({ lastSeen: seen(1), now, maintenanceFlag: true, reading: ok }, options).status).toBe('MAINTENANCE');
  });
  it('MAINTENANCE on over-temperature, over-current and bad voltage', () => {
    for (const [patch, fault] of [
      [{ temperature: 71 }, 'OVER_TEMP'],
      [{ current: 41 }, 'OVER_CURRENT'],
      [{ voltage: 199 }, 'BAD_VOLTAGE'],
      [{ voltage: 251 }, 'BAD_VOLTAGE'],
    ] as const) {
      const r = computeStatus({ lastSeen: seen(1), now, maintenanceFlag: false, reading: { ...ok, ...patch } }, options);
      expect(r.status).toBe('MAINTENANCE');
      expect(r.faults).toContain(fault);
    }
  });
  it('fault wins over IN_USE (precedence 2 before 3)', () => {
    expect(computeStatus({ lastSeen: seen(1), now, maintenanceFlag: false, reading: { ...ok, temperature: 80 } }, options).status).toBe('MAINTENANCE');
  });
  it('IN_USE when a vehicle is connected and current is above 0.5 A', () => {
    expect(computeStatus({ lastSeen: seen(1), now, maintenanceFlag: false, reading: { ...ok, current: 0.6 } }, options).status).toBe('IN_USE');
  });
  it('AVAILABLE when connected but current is at or below the threshold', () => {
    expect(computeStatus({ lastSeen: seen(1), now, maintenanceFlag: false, reading: { ...ok, current: 0.5 } }, options).status).toBe('AVAILABLE');
  });
  it('AVAILABLE when no vehicle is connected', () => {
    expect(computeStatus({ lastSeen: seen(1), now, maintenanceFlag: false, reading: { ...ok, vehicle_connected: false, current: 0 } }, options).status).toBe('AVAILABLE');
  });
});

describe('detectFaults', () => {
  it('returns nothing for normal values', () => {
    expect(detectFaults(ok, options.thresholds)).toEqual([]);
  });
  it('can return several faults at once', () => {
    expect(detectFaults({ ...ok, temperature: 90, current: 50 }, options.thresholds)).toEqual(['OVER_TEMP', 'OVER_CURRENT']);
  });
});
