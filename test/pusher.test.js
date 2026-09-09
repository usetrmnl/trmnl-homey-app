'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pushSnapshot } = require('../lib/pusher');

function recordingFetch(status = 200) {
  const calls = [];
  const fetchStub = async (url, options) => {
    calls.push({ url, options });
    return { ok: status >= 200 && status < 300, status };
  };
  return { calls, fetchStub };
}

async function withFetch(stub, run) {
  const original = global.fetch;
  global.fetch = stub;
  try {
    return await run();
  } finally {
    global.fetch = original;
  }
}

const snapshot = { source: 'companion', zone_names: {}, devices: [{ name: 'Lamp', capabilities: { onoff: { value: true } } }] };

test('posts the snapshot as JSON', async () => {
  const { calls, fetchStub } = recordingFetch();
  await withFetch(fetchStub, () => pushSnapshot('https://trmnl.test/data', snapshot));
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
});

test('sends the capability bag through the wire', async () => {
  const { calls, fetchStub } = recordingFetch();
  await withFetch(fetchStub, () => pushSnapshot('https://trmnl.test/data', snapshot));
  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(body.devices[0].capabilities, { onoff: { value: true } });
});

// One body has to satisfy both the native endpoint and the private-plugin one.
test('repeats the snapshot under merge_variables for the private-plugin endpoint', async () => {
  const { calls, fetchStub } = recordingFetch();
  await withFetch(fetchStub, () => pushSnapshot('https://trmnl.test/data', snapshot));
  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(body.merge_variables.devices[0].capabilities, { onoff: { value: true } });
});

test('raises on a rejected push so the caller can report it', async () => {
  const { fetchStub } = recordingFetch(413);
  await withFetch(fetchStub, async () => {
    await assert.rejects(() => pushSnapshot('https://trmnl.test/data', snapshot), /HTTP 413/);
  });
});
