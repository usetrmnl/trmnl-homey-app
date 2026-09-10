'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// HomeyScript wraps the file in an async function and hands it Homey, log and
// fetch as globals, so running it means reproducing that wrapper.
async function runScript() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'homeyscript', 'push.js'), 'utf8');
  const calls = [];
  const Homey = {
    devices: {
      getDevices: async () => ({
        d1: {
          name: 'Floor lamp',
          zone: 'z1',
          class: 'light',
          available: true,
          capabilitiesObj: {
            onoff: { value: true },
            measure_power: { value: 11, title: 'Vermogen' },
            measure_battery: { value: 37 },
          },
        },
      }),
    },
    zones: { getZones: async () => ({ z1: { name: 'Living room' } }) },
  };
  const fetchStub = async (url, options) => {
    calls.push({ url, options });
    return { status: 200, text: async () => 'ok' };
  };
  const run = new Function('Homey', 'log', 'fetch', `return (async () => { ${source} })();`);
  const result = await run(Homey, () => {}, fetchStub);
  return { calls, result };
}

test('the HomeyScript runs end to end and posts once', async () => {
  const { calls } = await runScript();
  assert.equal(calls.length, 1);
});

test('the HomeyScript sends the capability bag', async () => {
  const { calls } = await runScript();
  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(Object.keys(body.devices[0].capabilities).sort(), ['measure_battery', 'measure_power', 'onoff']);
});

test('the HomeyScript keeps Homey localized titles', async () => {
  const { calls } = await runScript();
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.devices[0].capabilities.measure_power.title, 'Vermogen');
});

// The two producers post the same shape, or a screen renders differently depending
// on whether someone installed the app or pasted the script.
test('the HomeyScript and the app produce the same device shape', async () => {
  const { calls } = await runScript();
  const scripted = JSON.parse(calls[0].options.body).devices[0];
  const { buildSnapshot } = require('../lib/snapshot');
  const built = buildSnapshot(
    { d1: { name: 'Floor lamp', zone: 'z1', class: 'light', available: true,
            capabilitiesObj: { onoff: { value: true }, measure_power: { value: 11, title: 'Vermogen' }, measure_battery: { value: 37 } } } },
    { z1: { name: 'Living room' } },
  ).devices[0];
  assert.deepEqual(Object.keys(scripted).sort(), Object.keys(built).sort());
  assert.deepEqual(scripted.capabilities, built.capabilities);
});
