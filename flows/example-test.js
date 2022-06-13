const api = require('lighthouse/lighthouse-core/fraggle-rock/api.js');

class exampleUserFlow {
  async connect(browser) {
    // return new Promise(async (resolve, reject) => {
    const page = await browser.newPage();

    const testUrl = 'https://web.dev/performance-scoring/';
    const flow = await api.startFlow(page, {name: 'Cold and warm navigations'});
    await flow.navigate(testUrl, {
      stepName: 'Cold navigation',
    });
    await flow.navigate(testUrl, {
      stepName: 'Warm navigation',
      configContext: {
        settingsOverrides: {disableStorageReset: true},
      },
    });

    await browser.close();

    await browser.close();

    const report = await flow.generateReport();
    return report;
  }
}
module.exports = new exampleUserFlow();
