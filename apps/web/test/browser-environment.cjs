const { TestEnvironment } = require('jest-environment-jsdom');

// React Router navigation uses Fetch APIs absent from jsdom. Use Node's real APIs.
const { Request, Response, Headers } = globalThis;
module.exports = class BrowserEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    Object.assign(this.global, { Request, Response, Headers });
  }
};
