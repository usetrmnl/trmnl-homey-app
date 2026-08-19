# TRMNL companion for Homey

A [Homey](https://homey.app) app that pushes a snapshot of your smart home to a
[TRMNL](https://trmnl.com) e-ink display. It runs on the Homey itself, reads
devices and zones over the local API, and POSTs to your TRMNL plugin. No account
linking, no OAuth. The plugin setting's UUID is the only credential.

It pushes on a timer, every 5 minutes by default. You can also turn on pushing
whenever a device changes, which is off by default: TRMNL accepts a limited
number of pushes per hour, and a home with power metering emits device events
every few seconds, so it would spend the hour's allowance in minutes. When it is
on, change-driven pushes are spaced at least a minute apart.

It only ever reads. There is no code here that controls a device.

## Install

Search for **TRMNL** in the Homey App Store on your Homey, or install from
source with the [Homey CLI](https://apps.developer.homey.app/the-basics/getting-started):

```
npm install -g homey
homey login
homey app install
```

Then open the app's settings on your Homey and paste your push URL. Get it from
the **Homey** plugin in TRMNL, where it is called the Push URL:

```
https://trmnl.com/api/plugin_settings/<uuid>/data
```

A private plugin on the Webhook strategy (`/api/custom_plugins/<uuid>`) accepts
the same body, but that endpoint needs Developer Edition and caps the payload at
2 kB, which about twenty devices already exceed. Use the native plugin.

The settings page has a **Test push now** button and a diagnostics readout so
you can confirm the loop without leaving the page.

## No-install alternative: HomeyScript

If you would rather not install an app, `homeyscript/push.js` does the same
push from Athom's official [HomeyScript](https://homey.app/en-us/app/com.athom.homeyscript/HomeyScript/)
app: paste the script, set `PUSH_URL`, and trigger it from a Flow on an
interval. Same payload, no review process, no CLI. You lose the on-change
pushes and the diagnostics page, which is the trade.

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
`lib/snapshot.js` and the server's `Plugins::Homey::Snapshot` in sync. A field
added on one side only is dropped by the other.

## Why plain JavaScript

The Homey CLI's TypeScript build can report success while packaging no runnable
`app.js`, which presents as an app that installs but never starts. This app is
plain JavaScript on purpose; if you convert it to TypeScript, verify the
packaged archive actually contains compiled output before trusting a green
build.

## License

MIT
