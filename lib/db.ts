import mysql, { type Pool } from 'mysql2/promise';
import { config } from './config';

// One pool per process (survives hot reload). All timestamps are handled in UTC.
const g = globalThis as unknown as { __evPool?: Pool };

export const pool: Pool =
  g.__evPool ??
  mysql.createPool({
    uri: config.databaseUrl,
    timezone: 'Z',
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
  });

g.__evPool = pool;
