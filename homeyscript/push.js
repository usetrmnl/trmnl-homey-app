// TRMNL companion — HomeyScript producer.
//
// Runs ON the Homey Pro via the (official Athom) HomeyScript app — no custom app
// install, no CLI. Reads the home over the pre-connected `Homey` global and POSTs
// a Snapshot to TRMNL's native data endpoint. Same wire shape as
// lib/snapshot.js (and Snapshot.from_h on the Rails side).
//
// SETUP (one-time):
//   1. Install the "HomeyScript" app from the Homey App Store.
//   2. In TRMNL, add the Homey plugin; copy your plugin-setting UUID.
//   3. Paste this script into HomeyScript and set PUSH_URL below to one of:
//        https://trmnl.com/api/plugin_settings/<YOUR-UUID>/data   (native Homey plugin)
//        https://trmnl.com/api/custom_plugins/<YOUR-UUID>         (private plugin, webhook strategy)
//   4. Run it once to test, then add a Flow: "every 5 minutes" -> run this script.
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
