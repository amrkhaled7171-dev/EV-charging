import { z } from 'zod';
import { config } from './config';

// Section 8.1. The upper bound of `power` is the charger's max_power_kw,
// which needs the database, so the route handler checks it.
export const readingSchema = z.object({
  charger_id: z.string().min(1).max(20),
  voltage: z.number().min(0).max(config.limits.voltageMax),
  current: z.number().min(0).max(config.limits.currentMax),
  power: z.number().min(0),
  temperature: z.number().min(config.limits.temperatureMin).max(config.limits.temperatureMax),
  vehicle_connected: z.boolean(),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

export type ReadingInput = z.infer<typeof readingSchema>;

export const maintenanceSchema = z.object({ maintenance: z.boolean() });

export function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => ({
    field: i.path.join('.') || '(body)',
    message: i.message,
  }));
}
