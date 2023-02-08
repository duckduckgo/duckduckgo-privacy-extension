import { test, expect } from "./harness";

test("postinstall page: should open the postinstall page correctly", async ({
    context,
    page,
}) => {
    let postInstallOpened;

    // wait for post install page to open
    // if it never does, jasmine timeout will kick in
    while (!postInstallOpened) {
        const urls = await Promise.all(
            context.pages().map((target) => target.url())
        );
        postInstallOpened = urls.some((url) =>
            url.includes("duckduckgo.com/extension-success")
        );
        await page.waitForTimeout(100);
    }

    expect(postInstallOpened).toBeTruthy();
});

test("postinstall page: should get its ATB param from atb.js when there's no install success page", async ({
    backgroundPage,
    routeExtensionRequests,
    page,
}) => {
    const mockAtb = {
        majorVersion: 364,
        minorVersion: 2,
        version: 'v364-2'
    };
    let numAtbCalled = 0
    let numExtiCalled = 0

    // intercept atb and exti requests
    await routeExtensionRequests('https://duckduckgo.com/**/*', (route) => {
        const url = route.request().url()
        console.log('route', url)
        if (url.match(/atb\.js/)) {
            numAtbCalled += 1
            return route.fulfill({
                body: JSON.stringify(mockAtb)
            })
        } else if (url.match(/exti/)) {
            numExtiCalled += 1
            expect(url).toContain(`atb=${mockAtb.version}`)
        }
        route.continue()
    })
    // try get ATB params
    // await backgroundPage.evaluate(() => globalThis.dbg.atb.updateATBValues());
    while (numExtiCalled === 0) {
        await page.waitForTimeout(100);
    }

    const atb = await backgroundPage.evaluate(() =>
        globalThis.dbg.settings.getSetting("atb")
    );
    const setAtb = await backgroundPage.evaluate(() =>
        globalThis.dbg.settings.getSetting("set_atb")
    );
    const extiSent = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('extiSent'))

    // check the extension's internal state is correct
    expect(atb).toEqual(mockAtb.version)
    expect(setAtb).toEqual(atb);
    expect(extiSent).toBeTruthy();

    expect(numAtbCalled).toEqual(1);
    expect(numExtiCalled).toEqual(1);
});
