const assert = require('assert')

const {
    generateDNRRule
} = require('../lib/utils')

describe('generateDNRRule', () => {
    it('should populate the rule priority', async () => {
        {
            const { priority } = await generateDNRRule({
                priority: 30,
                actionType: 'block'
            })

            await assert.equal(priority, 30)
        }

        {
            const { priority } = await generateDNRRule({
                priority: 31,
                actionType: 'block'
            })

            await assert.equal(priority, 31)
        }
    })

    it('should populate the action type', async () => {
        {
            const { action } = await generateDNRRule({
                priority: 5,
                actionType: 'block'
            })

            await assert.deepEqual(action, ({ type: 'block' }))
        }

        {
            const { action } = await generateDNRRule({
                priority: 5,
                actionType: 'allow'
            })

            await assert.deepEqual(action, ({ type: 'allow' }))
        }

        {
            const { action } = await generateDNRRule({
                priority: 5,
                actionType: 'allowAllRequests'
            })

            await assert.deepEqual(action, ({ type: 'allowAllRequests' }))
        }
    })

    it('should populate the rule ID', async () => {
        {
            const { id } = await generateDNRRule({
                id: 20,
                priority: 30,
                actionType: 'block'
            })

            await assert.equal(id, 20)
        }

        {
            // generateDNRRule considers the ID optional, so that it can be
            // populated later if necessary.
            const { id } = await generateDNRRule({
                priority: 30,
                actionType: 'block'
            })

            await assert.equal(id, undefined)
        }
    })

    it('should populate requestDomains/excludedRequestDomains conditions', async () => {
        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'allow',
                requestDomains: ['a.example', 'b.example']
            })

            await assert.deepEqual(condition, {
                requestDomains: ['a.example', 'b.example']
            })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'allow',
                excludedRequestDomains: ['c.example', 'd.example']
            })

            await assert.deepEqual(condition, {
                excludedRequestDomains: ['c.example', 'd.example']
            })
        }
    })

    it('should populate redirect actions', async () => {
        {
            const { action } = await generateDNRRule({
                priority: 10,
                actionType: 'redirect'
            })

            await assert.deepEqual(action, { type: 'redirect' })
        }

        {
            // The redirect details are ignored if the rule action type isn't
            // 'redirect'.
            const { action } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                redirect: { extensionPath: '/redirect.js' }
            })

            await assert.deepEqual(action, { type: 'block' })
        }

        {
            const { action } = await generateDNRRule({
                priority: 10,
                actionType: 'redirect',
                redirect: { extensionPath: '/redirect.js' }
            })

            await assert.deepEqual(action, {
                type: 'redirect',
                redirect: { extensionPath: '/redirect.js' }
            })
        }
    })

    it('should populate modifyHeaders actions', async () => {
        {
            const { action } = await generateDNRRule({
                priority: 10,
                actionType: 'modifyHeaders'
            })

            await assert.deepEqual(action, { type: 'modifyHeaders' })
        }

        {
            // The requestHeaders are ignored if the rule action type isn't
            // 'modifyHeaders'.
            const { action } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                requestHeaders: [
                    { header: 'header-name', operation: 'set', value: 'test' }
                ]
            })

            await assert.deepEqual(action, { type: 'block' })
        }

        {
            // The responseHeaders are ignored if the rule action type isn't
            // 'modifyHeaders'.
            const { action } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                responseHeaders: [
                    { header: 'header-name', operation: 'set', value: 'test' }
                ]
            })

            await assert.deepEqual(action, { type: 'block' })
        }

        {
            const { action } = await generateDNRRule({
                priority: 10,
                actionType: 'modifyHeaders',
                requestHeaders: [
                    { header: 'header-name', operation: 'set', value: 'test' }
                ]
            })

            await assert.deepEqual(action, {
                type: 'modifyHeaders',
                requestHeaders: [
                    { header: 'header-name', operation: 'set', value: 'test' }
                ]
            })
        }

        {
            const { action } = await generateDNRRule({
                priority: 10,
                actionType: 'modifyHeaders',
                responseHeaders: [
                    { header: 'header-name', operation: 'set', value: 'test' }
                ]
            })

            await assert.deepEqual(action, {
                type: 'modifyHeaders',
                responseHeaders: [
                    { header: 'header-name', operation: 'set', value: 'test' }
                ]
            })
        }

        {
            // Both requestHeaders and responseHeaders can be specified.
            const { action } = await generateDNRRule({
                priority: 10,
                actionType: 'modifyHeaders',
                requestHeaders: [
                    { header: 'header-name', operation: 'set', value: 'test' }
                ],
                responseHeaders: [
                    { header: 'header-name', operation: 'set', value: 'test' }
                ]
            })

            await assert.deepEqual(action, {
                type: 'modifyHeaders',
                requestHeaders: [
                    { header: 'header-name', operation: 'set', value: 'test' }
                ],
                responseHeaders: [
                    { header: 'header-name', operation: 'set', value: 'test' }
                ]
            })
        }
    })

    it('should populate urlFilter conditions', async () => {
        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block'
            })

            await assert.deepEqual(condition, {})
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                urlFilter: 'abc'
            })

            // By default, Tracker Blocking rules are case insensitive, and by
            // default declarativeNetRequest rules are case sensitive. So,
            // unless specified the `isUrlFilterCaseSensitive: false` option
            // must be included.
            await assert.deepEqual(condition, {
                isUrlFilterCaseSensitive: false,
                urlFilter: 'abc'
            })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                urlFilter: 'abc',
                matchCase: true
            })

            await assert.deepEqual(condition, {
                urlFilter: 'abc'
            })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                urlFilter: 'abc',
                requestDomains: ['example.invalid']
            })

            await assert.deepEqual(condition, {
                isUrlFilterCaseSensitive: false,
                urlFilter: 'abc',
                requestDomains: ['example.invalid']
            })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                urlFilter: '||example.invalid/abc',
                requestDomains: ['example.invalid']
            })

            // Request domain can be omitted, since it's implied with the
            // request domain condition anyway.
            // Note: See caveats in corresponding generateDNRRule code, this
            //       logic was designed for a specific use-case (tds.json) and
            //       will likely need to be expanded in the future.
            await assert.deepEqual(condition, {
                isUrlFilterCaseSensitive: false,
                urlFilter: '||example.invalid/abc'
            })
        }
    })

    it('should populate regexFilter conditions', async () => {
        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block'
            })

            await assert.deepEqual(condition, {})
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                regexFilter: 'abc'
            })

            // Like urlFilter above, the `isUrlFilterCaseSensitive: false`
            // option is necessary unless case sensitive matching is requested.
            await assert.deepEqual(condition, {
                isUrlFilterCaseSensitive: false,
                regexFilter: 'abc'
            })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                regexFilter: 'abc',
                matchCase: true
            })

            await assert.deepEqual(condition, {
                regexFilter: 'abc'
            })
        }
    })

    it('should populate resourceTypes/excludedResourceTypes conditions', async () => {
        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'allow',
                resourceTypes: ['main_frame', 'sub_frame']
            })

            await assert.deepEqual(condition, {
                resourceTypes: ['main_frame', 'sub_frame']
            })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'allow',
                excludedResourceTypes: ['script']
            })

            await assert.deepEqual(condition, {
                excludedResourceTypes: ['script']
            })
        }
    })

    it('should populate initiatorDomains/excludedInitiatorDomains conditions', async () => {
        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                initiatorDomains: ['a.example', 'b.example']
            })

            await assert.deepEqual(condition, {
                initiatorDomains: ['a.example', 'b.example']
            })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                excludedInitiatorDomains: ['c.example', 'd.example']
            })

            await assert.deepEqual(condition, {
                excludedInitiatorDomains: ['c.example', 'd.example']
            })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'allow',
                initiatorDomains: ['a.example', 'b.example']
            })

            await assert.deepEqual(condition, {
                initiatorDomains: ['a.example', 'b.example']
            })
        }

        {
            // Excluded initiator domains are stripped for allowing rules.
            // Note: See caveats in corresponding generateDNRRule code, this
            //       logic was designed for a specific use-case (tds.json) and
            //       will likely need to be expanded in the future.
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'allow',
                excludedInitiatorDomains: ['c.example', 'd.example']
            })

            await assert.deepEqual(condition, { })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'block',
                requestDomains: ['a.example'],
                excludedInitiatorDomains: ['a.example']
            })

            // If one request domain and initiator domain is specified, we
            // assume the domains match and therefore replace the initiator
            // domain condition with `domainType: 'thirdParty'`
            // Note: See caveats in corresponding generateDNRRule code, this
            //       logic was designed for a specific use-case (tds.json) and
            //       will likely need to be expanded in the future.
            await assert.deepEqual(condition, {
                requestDomains: ['a.example'],
                domainType: 'thirdParty'
            })
        }
    })

    it('should populate tabIds/excludedTabIds conditions', async () => {
        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'allow',
                tabIds: [-1, 10]
            })

            await assert.deepEqual(condition, {
                tabIds: [-1, 10]
            })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'allow',
                excludedTabIds: [20, 30]
            })

            await assert.deepEqual(condition, {
                excludedTabIds: [20, 30]
            })
        }
    })

    it('should populate requestMethods/excludedRequestMethods conditions', async () => {
        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'allow',
                requestMethods: ['post', 'get']
            })

            await assert.deepEqual(condition, {
                requestMethods: ['post', 'get']
            })
        }

        {
            const { condition } = await generateDNRRule({
                priority: 10,
                actionType: 'allow',
                excludedRequestMethods: ['connect']
            })

            await assert.deepEqual(condition, {
                excludedRequestMethods: ['connect']
            })
        }
    })
})
