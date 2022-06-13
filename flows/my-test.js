const api = require('lighthouse/lighthouse-core/fraggle-rock/api.js');

class whateverYouWant {
  async connect(browser) {
    // return new Promise(async (resolve, reject) => {
    const page = await browser.newPage();
    const flow = await api.startFlow(page, {name: 'Single Navigation'});
    await flow.navigate('http://google.com/');

    await browser.close();

    const report = await flow.generateReport();
    return report;
  }
}
module.exports = new whateverYouWant();
