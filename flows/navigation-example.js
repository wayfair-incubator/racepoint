class navigationExampleUserFlow {
  async connect(browser, api) {
    // return new Promise(async (resolve, reject) => {
    const page = await browser.newPage();

    // Array of third-party domains to block
    const blockedDomains = ['https://www.google-analytics.com/'];
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (blockedDomains.some((d) => url.startsWith(d))) {
        request.abort();
      } else {
        request.continue();
      }
    });

    const testUrl = 'https://web.dev';
    const flow = await api.startFlow(page, {name: 'Navigate through website'});
    await flow.navigate(testUrl, {
      stepName: 'Start on homepage',
    });

    await flow.startTimespan({stepName: 'Open menu'});
    const buttonSelector = 'button[data-open-drawer-button]';
    await page.click(buttonSelector);
    const drawerSelector = 'nav[data-drawer-container]';
    await page.waitForSelector(drawerSelector);
    // Wait for animation to complete
    await page.waitForTimeout(250);
    // await flow.snapshot("Drawer opened");
    await flow.endTimespan();

    // Get the nav link href
    const linkSelector = await page.$('nav[data-drawer-container] > a');
    const href = await (await linkSelector?.getProperty('href'))?.jsonValue();

    // Clear the pages cookies so the proxy can correctly locate cached entrypoint
    const cookies = await page.cookies();
    cookies.forEach(async (cookie) => {
      await page.deleteCookie({
        name: cookie.name,
        domain: cookie.domain,
        path: cookie.path,
      });
    });

    await flow.navigate(href, {
      stepName: 'Navigate to next page',
    });

    await browser.close();

    return flow;
  }
}
module.exports = new navigationExampleUserFlow();
