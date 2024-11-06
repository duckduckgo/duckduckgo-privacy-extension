const https = require('../src/https');

https.addLists({
    https: ['github.com', 'status.github.com'],

    httpsAutoUpgrade: ['test.com'],
});

describe('getUpgradedUrl', () => {
    const tests = [
        { url: 'http://github.com/', shouldUpgrade: true },
        { url: 'http://status.github.com/', shouldUpgrade: true },
        { url: 'http://test.github.com/', shouldUpgrade: false },
        { url: 'http://github.io/', shouldUpgrade: false },

        { url: 'http://github.com/duckduckgo/', shouldUpgrade: true },
        { url: 'http://github.com/duckduckgo/?query=string', shouldUpgrade: true },

        // malformed URL
        { url: 'http://%20%20s.src%20%3D/', shouldUpgrade: false },
    ];

    tests.forEach((test) => {
        it(`should ${test.shouldUpgrade ? '' : 'not '}upgrade ${test.url}`, () => {
            const upgraded = https.getUpgradedUrl(test.url);

            if (test.shouldUpgrade) {
                expect(upgraded).toEqual(test.url.replace(/^http:/, 'https:'));
            } else {
                expect(upgraded).not.toEqual(test.url.replace(/^http:/, 'https:'));
            }
        });
    });
});
