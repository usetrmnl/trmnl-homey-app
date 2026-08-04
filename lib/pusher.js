'use strict';

// POSTs a Snapshot to the configured TRMNL endpoint — a self-hosted/BYOS server
// or a plugin webhook URL. Uses the Homey runtime's global fetch (Node 18+).
//
// The Rails side ingests this with Plugins::Homey#process_webhook_data
// (Snapshot.from_h), so the JSON body must stay identical to that contract.
async function pushSnapshot(url, snapshot) {
  // Dual-format so ONE body satisfies both TRMNL ingestion paths:
  //  - native `homey` plugin `/plugin_settings/:uuid/data` reads snapshot keys at top level
  //  - generic private-plugin `/custom_plugins/:uuid` reads the `merge_variables` key
  const body = { ...snapshot, merge_variables: snapshot };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`TRMNL push failed: HTTP ${response.status}`);
  }
}

module.exports = { pushSnapshot };
