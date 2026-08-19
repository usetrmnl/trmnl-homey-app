'use strict';

// The widget calls this from the browser via Homey.api('GET', '/').
// It returns the same Snapshot the app already builds for TRMNL, so the
// dashboard widget and the e-ink screen render from one source of truth.
module.exports = {
  async getSnapshot({ homey }) {
    return homey.app.getSnapshot();
  },
};
