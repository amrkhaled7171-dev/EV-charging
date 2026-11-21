/**
 * Data simulator (section 12). Sends exactly the JSON of section 8.1 to POST /api/readings,
 * so the ESP32 can replace it later with no backend change.
 *
 * npm run simulate
 * npm run simulate -- --scenario overtemp --target CH-001
 *
 * Flags: --url  --key  --chargers CH-001,CH-002  --interval 3  --scenario  --target
 * Scenarios: normal, session, overtemp, overcurrent, voltagedrop, disconnect, recovery, invalid
 */
const SCENARIOS = [
  'normal', 'session', 'overtemp', 'overcurrent', 'voltagedrop', 'disconnect', 'recovery', 'invalid',
] as const;
type Scenario = (typeof SCENARIOS)[number];

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : fallback;
}

const baseUrl = arg('url', 'http://localhost:3000');
const apiKey = arg('key', process.env.API_KEY ?? '');
const ids = arg('chargers', 'CH-001,CH-002,CH-003').split(',').map((s) => s.trim()).filter(Boolean);
const intervalMs = Math.max(500, Number(arg('interval', '3')) * 1000);
const scenario = arg('scenario', 'normal') as Scenario;
const target = arg('target', ids[0]);

if (!SCENARIOS.includes(scenario)) {
  console.error(`Unknown scenario "${scenario}". Use one of: ${SCENARIOS.join(', ')}`);
  process.exit(1);
}
if (!apiKey) console.warn('Warning: no API key (use --key or set API_KEY). Requests will get 401.');

interface Payload {
  charger_id: string;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
  vehicle_connected: boolean;
  timestamp: string;
}

interface State { inSession: boolean; ticksLeft: number; goalCurrent: number; current: number; temp: number }

const states = new Map<string, State>(
  ids.map((id) => [id, { inSession: false, ticksLeft: 0, goalCurrent: 0, current: 0, temp: 30 }]),
);

const round2 = (n: number) => Math.round(n * 100) / 100;
const noise = (amp: number) => (Math.random() * 2 - 1) * amp;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// silent period must be longer than the 15 s stale timeout
const silentTicks = Math.ceil(25000 / intervalMs);

function nextReading(id: string, tick: number): Payload | null {
  const s = states.get(id)!;
  const isTarget = id === target && scenario !== 'normal';

  if (isTarget && scenario === 'disconnect' && tick >= 5) return null;
  if (isTarget && scenario === 'recovery' && tick >= 5 && tick < 5 + silentTicks) return null;

  // vehicle session: random start, ramp up, taper at the end
  if (!s.inSession && ((isTarget && scenario !== 'voltagedrop') || Math.random() < 0.06)) {
    s.inSession = true;
    s.ticksLeft = 25 + Math.floor(Math.random() * 40);
    s.goalCurrent = 12 + Math.random() * 18; // 12-30 A, within every charger's rated power
  }
  if (s.inSession) {
    const goal = s.ticksLeft <= 5 ? s.goalCurrent * (s.ticksLeft / 5) : s.goalCurrent;
    s.current += (goal - s.current) * 0.4;
    if (!(isTarget && scenario !== 'normal')) s.ticksLeft -= 1;
    if (s.ticksLeft <= 0) s.inSession = false;
  } else {
    s.current *= 0.5;
    if (s.current < 0.5) s.current = 0;
  }
  s.temp += (28 + s.current * 0.7 - s.temp) * 0.15 + noise(0.2);

  let voltage = 230 + noise(1.5);
  let current = s.current;
  let temperature = s.temp;
  let connected = s.inSession;

  if (isTarget && tick >= 3) {
    if (scenario === 'overtemp') { temperature = 75 + noise(1.5); connected = true; current = Math.max(current, 14); }
    if (scenario === 'overcurrent') { current = 44 + noise(1); connected = true; }
    if (scenario === 'voltagedrop') { voltage = 185 + noise(2); }
  }

  return {
    charger_id: id,
    voltage: round2(voltage),
    current: round2(current),
    power: round2((voltage * current) / 1000),
    temperature: round2(temperature),
    vehicle_connected: connected,
    timestamp: new Date().toISOString(),
  };
}

// invalid mode: cycles through bad payloads to exercise validation (400 / 404)
function invalidBody(id: string, tick: number): { body: string; note: string } {
  const good = nextReading(id, tick)!;
  switch (tick % 5) {
    case 0: { const { voltage: _v, ...rest } = good; return { body: JSON.stringify(rest), note: 'missing voltage' }; }
    case 1: return { body: JSON.stringify({ ...good, voltage: 999 }), note: 'voltage out of range' };
    case 2: return { body: JSON.stringify({ ...good, charger_id: 'CH-999' }), note: 'unknown charger' };
    case 3: return { body: '{"charger_id": ', note: 'malformed JSON' };
    default: return { body: JSON.stringify({ ...good, temperature: 'hot' }), note: 'wrong type' };
  }
}

async function post(body: string): Promise<number> {
  const res = await fetch(`${baseUrl}/api/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey, 'X-Data-Source': 'SIMULATOR' },
    body,
  });
  return res.status;
}

// section 8.4: on a non-2xx response retry up to 3 times, then move on
async function send(body: string, retry: boolean): Promise<string> {
  const attempts = retry ? 4 : 1;
  let last = 'no response';
  for (let i = 1; i <= attempts; i++) {
    try {
      const status = await post(body);
      last = String(status);
      if (status >= 200 && status < 300) return last;
    } catch (e) {
      last = e instanceof Error ? `error (${e.message})` : 'error';
    }
    if (i < attempts) await sleep(500);
  }
  return last;
}

async function main() {
  console.log(`Simulator -> ${baseUrl}  chargers=${ids.join(',')}  scenario=${scenario}  target=${target}  every ${intervalMs / 1000}s`);
  for (let tick = 0; ; tick++) {
    for (const id of ids) {
      if (scenario === 'invalid' && id === target) {
        const { body, note } = invalidBody(id, tick);
        console.log(`[${tick}] ${id} INVALID (${note}) -> ${await send(body, false)}`);
        continue;
      }
      const r = nextReading(id, tick);
      if (!r) { console.log(`[${tick}] ${id} (silent)`); continue; }
      const result = await send(JSON.stringify(r), true);
      console.log(`[${tick}] ${id} ${r.voltage}V ${r.current}A ${r.power}kW ${r.temperature}C ${r.vehicle_connected ? 'plugged' : 'idle'} -> ${result}`);
    }
    await sleep(intervalMs);
  }
}

main();
