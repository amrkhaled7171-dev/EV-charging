export type ChargerStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OFFLINE';
export type FaultType = 'OVER_TEMP' | 'OVER_CURRENT' | 'BAD_VOLTAGE';
export type AlertType = FaultType | 'OFFLINE' | 'OTHER';

export interface LatestValues {
  voltage: number;
  current: number;
  power: number;
  temperature: number;
  vehicle_connected: boolean;
  recorded_at: string;
}

/** Response item of GET /api/chargers (section 8.2). */
export interface ChargerSummary {
  charger_id: string;
  name: string | null;
  station_id: number;
  status: ChargerStatus;
  maintenance_flag: boolean;
  source: 'SIMULATOR' | 'ESP32';
  max_power_kw: number | null;
  last_seen: string | null;
  latest: LatestValues | null;
  active_alerts: number;
}

/** Response item of GET /api/chargers/:id/readings. */
export interface HistoryPoint {
  reading_id: number;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
  vehicle_connected: boolean;
  recorded_at: string;
}

/** Response item of GET /api/alerts. */
export interface AlertItem {
  alert_id: number;
  charger_id: string;
  type: AlertType;
  message: string | null;
  created_at: string;
  resolved_at: string | null;
}
