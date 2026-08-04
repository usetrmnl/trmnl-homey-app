'use strict';

// Normalizes raw HomeyAPI devices + zones into the TRMNL "Snapshot" wire format —
// the EXACT shape that Plugins::Homey::Snapshot.from_h consumes on the Rails side.
//
// KEEP IN LOCKSTEP with app/services/plugins/homey/snapshot.rb (Snapshot.from_raw):
// same field names, same zone-name resolution, same alarm-prefix stripping. The
// Ruby round-trip spec + companion_contract_spec guard the contract.

// Wire field -> Homey capability id; values and titles both derive from here, so a new reading is one line, not three.
const READINGS = {
  power: 'measure_power',
  temperature: 'measure_temperature',
  humidity: 'measure_humidity',
  wind: 'measure_wind_strength',
  energy: 'meter_power',
};

const capability = (device, name) => device.capabilitiesObj?.[name] ?? null;
const numeric = (value) => (typeof value === 'number' ? value : null);
const boolish = (value) => (typeof value === 'boolean' ? value : null);

const activeAlarms = (device) =>
  Object.entries(device.capabilitiesObj ?? {})
    .filter(([name, cap]) => name.startsWith('alarm_') && cap?.value === true)
    .map(([name]) => name.replace(/^alarm_/, ''));

// Homey localizes every capability title, so carrying them lets a screen show it in the user's language, not hardcoded English.
const readingTitles = (device) => {
  const titles = {};
  for (const [field, name] of Object.entries(READINGS)) {
    const title = capability(device, name)?.title;
    if (title) titles[field] = title;
  }
  return titles;
};

function buildSnapshot(devices, zones) {
  const zoneNames = {};
  for (const [id, zone] of Object.entries(zones ?? {})) {
    if (zone?.name) zoneNames[id] = zone.name;
  }

  const mapped = Object.values(devices ?? {}).map((device) => {
    const readings = {};
    for (const [field, name] of Object.entries(READINGS)) {
      readings[field] = numeric(capability(device, name)?.value ?? null);
    }

    return {
      name: device.name ?? 'Unknown',
      zone: (device.zone && zoneNames[device.zone]) || 'Unzoned',
      klass: device.class ?? null,
      available: device.available !== false,
      ...readings,
      titles: readingTitles(device),
      on: boolish(capability(device, 'onoff')?.value ?? null),
      alarms: activeAlarms(device),
    };
  });

  return { source: 'companion', zone_names: zoneNames, devices: mapped };
}

module.exports = { buildSnapshot };
