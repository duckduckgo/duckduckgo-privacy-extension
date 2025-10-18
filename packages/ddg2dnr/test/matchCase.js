const assert = require('assert');
const { actualMatchOutcome } = require('./utils/helpers');
const { generateDNRRule } = require('../lib/utils');

/**
 * @typedef {import('./utils/helpers').testFunction} testFunction
 */

describe('Case sensitive matching', /** @this {testFunction} */ async function () {
    it('Enforces matchCase correctly', /** @this {testFunction} */ async function () {
        const ruleset = [
            generateDNRRule({
                id: 1001,
                priority: 1,
                actionType: 'block',
                urlFilter: '||domain.example/ignorecase1BLOCK',
                matchCase: false,
            }),
            generateDNRRule({
                id: 1002,
                priority: 1,
                actionType: 'block',
                urlFilter: '||domain.example/matchcase2BLOCK',
                matchCase: true,
            }),
            generateDNRRule({
                id: 1003,
                priority: 1,
                actionType: 'block',
                regexFilter: 'https://domain.example/[i]gnorecase3BLOCK',
                matchCase: false,
            }),
            generateDNRRule({
                id: 1004,
                priority: 1,
                actionType: 'block',
                regexFilter: 'https://domain.example/m[a]tchcase4BLOCK',
                matchCase: true,
            }),
        ];
        await this.browser.addRules(ruleset);

        const tests = [
            { requestUrl: 'https://domain.example/ignorecase1block', expectedAction: 'block' },
            { requestUrl: 'https://domain.example/ignorecase1BLOCK', expectedAction: 'block' },
            { requestUrl: 'https://domain.example/matchcase2block', expectedAction: 'ignore' },
            { requestUrl: 'https://domain.example/matchcase2BLOCK', expectedAction: 'block' },
            { requestUrl: 'https://domain.example/ignorecase3block', expectedAction: 'block' },
            { requestUrl: 'https://domain.example/ignorecase3BLOCK', expectedAction: 'block' },
            { requestUrl: 'https://domain.example/matchcase4block', expectedAction: 'ignore' },
            { requestUrl: 'https://domain.example/matchcase4BLOCK', expectedAction: 'block' },
        ];

        for (const { requestUrl, expectedAction } of tests) {
            const { actualAction } = await actualMatchOutcome(this.browser, { requestUrl, websiteUrl: 'https://website.example' });
            assert.equal(actualAction, expectedAction, requestUrl);
        }
    });
});
