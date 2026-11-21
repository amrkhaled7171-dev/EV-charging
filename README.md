# EV Charging Monitor (Next.js, TypeScript)

Built from *EV Charging Monitoring System: System Design (Next.js edition)*.
Simulation-first: the simulator posts to the same API the ESP32 will use in phase 10.

## 1. Database (MySQL 8)

```bash
mysql -u root -p < sql/01_ev_charging_db.sql          # original dump (creates ev_charging_db)
mysql -u root -p < sql/02_migration_chargers.sql      # run ONCE: adds the columns section 7.2 requires
```

`02` is needed because the dump's `chargers` table lacks `max_power_kw`, `status`,
`maintenance_flag`, `last_seen` and `source`.

## 2. Run

```bash
npm install
copy .env.example .env.local        # Windows (use cp on macOS/Linux), then set DATABASE_URL and API_KEY
npm run dev                         # http://localhost:3000, listens on 0.0.0.0
npm run simulate                    # second terminal: sends a reading per charger every 3 s
npm test                            # unit tests: status rules + validation
```

Production like the document (NFR4): `npm run build` then `npm start`.
Allow port 3000 in the Windows firewall so the ESP32 can reach the laptop.

Simulator scenarios: `npm run simulate -- --scenario overtemp --target CH-001`
(`normal, session, overtemp, overcurrent, voltagedrop, disconnect, recovery, invalid`).

Quick API check (PowerShell):

```powershell
curl.exe -X POST http://localhost:3000/api/readings -H "Content-Type: application/json" -H "X-API-Key: change-me" -d "{\"charger_id\":\"CH-001\",\"voltage\":230.4,\"current\":16.2,\"power\":3.73,\"temperature\":38.5,\"vehicle_connected\":true}"
```

## Switching from the simulator to the ESP32 (phase 10)

Two separate applications share one API contract: this Next.js app, and the simulator
(`scripts/simulator.ts`, started with `npm run simulate`). The backend does not care who sends.

Every POST may carry an optional header that records where the data comes from:

| Sender | Header | Effect |
|---|---|---|
| Simulator | `X-Data-Source: SIMULATOR` (sent automatically) | `chargers.source = 'SIMULATOR'` |
| ESP32 firmware | `X-Data-Source: ESP32` | `chargers.source = 'ESP32'` |

The ESP32 sends the same JSON as section 8.1 plus the headers `X-API-Key` and `X-Data-Source: ESP32`.
The dashboard card shows "Simulated" or "ESP32". A wrong header value returns 400; no header leaves the value unchanged.

To retire the simulator, stop it (Ctrl+C), or keep it for the other chargers only:
`npm run simulate -- --chargers CH-001,CH-002` while the ESP32 uses CH-003.
Never let both send the same `charger_id`.

## 3. Where each part of the design document lives

| Design document | File |
|---|---|
| 5.1 structure, 8.1 POST /api/readings (201/400/401/404/500) | `app/api/readings/route.ts` |
| 8.2 GET /api/chargers | `app/api/chargers/route.ts` |
| 8.3 history, alerts, health, maintenance | `app/api/chargers/[id]/readings`, `app/api/alerts`, `app/api/health`, `app/api/chargers/[id]/maintenance` |
| 5.2 API key | `middleware.ts` |
| 5.2, 9.4 background jobs, 7.3 retention | `instrumentation.ts`, `lib/jobs.ts` |
| 9 status rules (pure function) | `lib/status.ts` (+ `tests/status.test.ts`) |
| 8.1 validation (zod) | `lib/validation.ts` |
| NFR6 config in one place | `lib/config.ts` + `.env.local` |
| NFR7 shared types | `lib/types.ts` |
| 7 DB pool, UTC | `lib/db.ts` |
| 11 dashboard, SWR 3 s, banner, cards | `components/*`, `app/page.tsx`, `app/chargers/[id]/page.tsx` |
| 12 simulator | `scripts/simulator.ts` |

## 4. Decisions to confirm with the team

1. **`max_power_kw` values** (11 / 18.4 / 7.4 kW) in `sql/02` are assumptions. Confirm with the database owner.
2. **CH-002 seed readings use 400 V**, which is outside the 200-250 V normal range and the 0-300 V validation range of the document. Confirm with the status-logic and database owners.
3. **Faults do not latch `maintenance_flag`.** A fault makes the status MAINTENANCE while it lasts; the flag is only set manually.
4. **`last_seen` is the server's receive time**, so a wrong clock on the device cannot cause false OFFLINE.
5. **Dashboard maintenance button** sends the API key from `NEXT_PUBLIC_API_KEY` (visible in the browser). Prototype level only, as in NFR3.
6. **Seed readings older than 7 days are deleted** by the retention job (section 7.3).

## 5. Not included

Phase 10 (ESP32 firmware), the diagrams (ERD, DFD, UML) and the test plan documents.
