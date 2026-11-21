import { describe, expect, it } from 'vitest';
import { readingSchema } from '../lib/validation';

const valid = {
  charger_id: 'CH-001', voltage: 230.4, current: 16.2, power: 3.73,
  temperature: 38.5, vehicle_connected: true, timestamp: '2026-10-19T10:15:30Z',
};

describe('readingSchema (section 8.1)', () => {
  it('accepts the example payload from the design document', () => {
    expect(readingSchema.safeParse(valid).success).toBe(true);
  });
  it('accepts a payload without timestamp', () => {
    const { timestamp: _t, ...rest } = valid;
    expect(readingSchema.safeParse(rest).success).toBe(true);
  });
  it('rejects a missing field', () => {
    const { voltage: _v, ...rest } = valid;
    expect(readingSchema.safeParse(rest).success).toBe(false);
  });
  it.each([
    ['voltage', 301], ['voltage', -1], ['current', 81], ['temperature', 121], ['temperature', -21],
  ])('rejects %s = %s', (field, value) => {
    expect(readingSchema.safeParse({ ...valid, [field]: value }).success).toBe(false);
  });
  it('rejects wrong types and a bad timestamp', () => {
    expect(readingSchema.safeParse({ ...valid, temperature: 'hot' }).success).toBe(false);
    expect(readingSchema.safeParse({ ...valid, vehicle_connected: 'yes' }).success).toBe(false);
    expect(readingSchema.safeParse({ ...valid, timestamp: 'yesterday' }).success).toBe(false);
  });
});
