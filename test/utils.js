const assert = require('assert')

const {
    generateDNRRule
} = require('../lib/utils')

describe('generateDNRRule', () => {
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
})
