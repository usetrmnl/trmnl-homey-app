# TRMNL companion for Homey

> **Alpha.** Working end-to-end on a real Homey Pro, but not yet in the Homey
> App Store and still subject to change. Install is via the Homey CLI for now.

A [Homey](https://homey.app) app that pushes a snapshot of your smart home to a
[TRMNL](https://trmnl.com) e-ink display. It runs on the Homey itself, reads
devices and zones over the local API, and POSTs to your TRMNL plugin — no
account linking needed, the plugin setting's UUID is the only credential.

It pushes on a timer (default every 5 minutes) and immediately when a device
changes, so the screen follows the home instead of a polling schedule.

## Install

```
npm install -g homey
homey login
homey app install
```

Then open the app's settings on your Homey and set the push URL:

- TRMNL native Homey plugin: `https://trmnl.com/api/plugin_settings/<uuid>/data`
- TRMNL private plugin (webhook strategy): `https://trmnl.com/api/custom_plugins/<uuid>`

The settings page has a **Test push now** button and a diagnostics readout so
you can confirm the loop without leaving the page.

## No-install alternative: HomeyScript

If you would rather not install an app, `homeyscript/push.js` does the same
push from Athom's official [HomeyScript](https://homey.app/en-us/app/com.athom.homeyscript/HomeyScript/)
app: paste the script, set `PUSH_URL`, and trigger it from a Flow on an
interval. Same payload, no review process, no CLI.

## What it sends

One JSON snapshot per push:

```
source        "companion"
zone_names    { zoneId: zone name }
devices[]     name, zone, klass, available, power (W), temperature (°C),
              humidity (%), wind (km/h), energy (kWh),
              titles { field: localized label }, on, alarms ["smoke", ...]
```

The same shape the TRMNL Homey plugin's cloud poller produces, so recipes and
the [trmnl-liquid-components](https://github.com/usetrmnl/trmnl-liquid-components)
library render either source without caring which one supplied the data. Keep
`lib/snapshot.js` and the server's `Plugins::Homey::Snapshot` in sync — a field
added on one side only is dropped by the other.

## Why plain JavaScript

The Homey CLI's TypeScript build can report success while packaging no runnable
`app.js`, which presents as an app that installs but never starts. This app is
plain JavaScript on purpose; if you convert it to TypeScript, verify the
packaged archive actually contains compiled output before trusting a green
build.

## License

MIT
