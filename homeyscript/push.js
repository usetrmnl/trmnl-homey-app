// TRMNL companion — HomeyScript producer.
//
// Runs ON the Homey Pro via the (official Athom) HomeyScript app — no custom app
// install, no CLI. Reads the home over the pre-connected `Homey` global and POSTs
// a Snapshot to TRMNL's native data endpoint. Same wire shape as
// lib/snapshot.js (and Snapshot.from_h on the Rails side).
//
// SETUP (one-time):
//   1. Install the "HomeyScript" app from the Homey App Store.
//   2. In TRMNL, add the Homey plugin and copy its Push URL.
//   3. Paste this script into HomeyScript and set PUSH_URL below to that URL.
//   4. Run it once to test, then add a Flow: "every 5 minutes" -> run this script.
//
// Use the native Homey plugin's Push URL:
//   https://trmnl.com/api/plugin_settings/<YOUR-UUID>/data
// It takes a snapshot of any size and needs no Developer Edition.
//
// A private plugin on the Webhook strategy accepts the same body:
//   https://trmnl.com/api/custom_plugins/<YOUR-UUID>
// but that endpoint requires Developer Edition and caps the payload at 2 kB
// (5 kB on TRMNL+) — a home of roughly twenty devices already exceeds it.
//
// The UUID is the secret — no OAuth, no API key. Keep the script private.
const PUSH_URL = 'https://trmnl.com/api/plugin_settings/YOUR-PLUGIN-SETTING-UUID/data';

// Wire field -> Homey capability id. Keep in sync with lib/snapshot.js.
const READINGS = {
  power: 'measure_power',
  temperature: 'measure_temperature',
  humidity: 'measure_humidity',
  wind: 'measure_wind_strength',
  energy: 'meter_power',
};

const cap = (d, name) => (d.capabilitiesObj && d.capabilitiesObj[name] ? d.capabilitiesObj[name].value : null);
const num = (v) => (typeof v === 'number' ? v : null);
const boo = (v) => (typeof v === 'boolean' ? v : null);
const titlesOf = (d) => {
  const titles = {};
  for (const [field, name] of Object.entries(READINGS)) {
    const t = d.capabilitiesObj && d.capabilitiesObj[name] && d.capabilitiesObj[name].title;
    if (t) titles[field] = t;
  }
  return titles;
};
// Every capability the device reports. Only the value and Homey's localized
// title travel; TRMNL derives unit, decimals and render component from the id.
const capsOf = (d) => {
  const out = {};
  for (const [id, c] of Object.entries(d.capabilitiesObj || {})) {
    if (!c) continue;
    out[id] = c.title ? { value: c.value ?? null, title: c.title } : { value: c.value ?? null };
  }
  return out;
};
const alarmsOf = (d) =>
  Object.entries(d.capabilitiesObj || {})
    .filter(([n, c]) => n.startsWith('alarm_') && c && c.value === true)
    .map(([n]) => n.replace(/^alarm_/, ''));

const devices = await Homey.devices.getDevices();
const zones = await Homey.zones.getZones();

const zoneNames = {};
for (const [id, z] of Object.entries(zones)) if (z && z.name) zoneNames[id] = z.name;

const snapshot = {
  source: 'companion',
  zone_names: zoneNames,
  devices: Object.values(devices).map((d) => ({
    name: d.name || 'Unknown',
    zone: (d.zone && zoneNames[d.zone]) || 'Unzoned',
    klass: d.class || null,
    available: d.available !== false,
    power: num(cap(d, 'measure_power')),
    temperature: num(cap(d, 'measure_temperature')),
    humidity: num(cap(d, 'measure_humidity')),
    wind: num(cap(d, 'measure_wind_strength')),
    energy: num(cap(d, 'meter_power')),
    titles: titlesOf(d),
    on: boo(cap(d, 'onoff')),
    alarms: alarmsOf(d),
    capabilities: capsOf(d),
  })),
};

// Top-level keys serve the native endpoint; the merge_variables copy serves the
// private-plugin endpoint. One body works against either PUSH_URL.
const res = await fetch(PUSH_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...snapshot, merge_variables: snapshot }),
});

log(`TRMNL push -> HTTP ${res.status}, ${snapshot.devices.length} devices`);
return await res.text();
