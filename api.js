'use strict';

// Homey Web API handlers, invoked on demand from the settings page via
// Homey.api(). Route names map to the "api" block in app.json.
module.exports = {
  async diag({ homey }) {
    return homey.app.diag();
  },

  async pushNow({ homey }) {
    return homey.app.pushNow();
  },
};
