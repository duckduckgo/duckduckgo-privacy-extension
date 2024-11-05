const assert = require('assert');

const { generateGPCheaderRule, GPC_HEADER_PRIORITY } = require('../lib/gpc');

const allowedDomains = ['exception1.example', 'exception2.example'];
const ruleId = 123;

const expectedRule = {
    id: ruleId,
    priority: GPC_HEADER_PRIORITY,
    action: {
        type: 'modifyHeaders',
        requestHeaders: [{ header: 'Sec-GPC', operation: 'set', value: '1' }],
    },
    condition: {
        resourceTypes: [
            'main_frame',
            'sub_frame',
            'stylesheet',
            'script',
            'image',
            'font',
            'object',
            'xmlhttprequest',
            'ping',
            'csp_report',
            'media',
            'websocket',
            'webtransport',
            'webbundle',
            'other',
        ],
        excludedInitiatorDomains: ['exception1.example', 'exception2.example'],
        excludedRequestDomains: ['exception1.example', 'exception2.example'],
    },
};

describe('GPC Header rule', () => {
    it('should generate GPC header rule  correctly', async () => {
        const actualRule = generateGPCheaderRule(ruleId, allowedDomains);
        assert.deepEqual(actualRule, expectedRule);
    });

    it('should handle an undefined allowedDomains parameter', async () => {
        const expectedNoDomainRule = JSON.parse(JSON.stringify(expectedRule));
        delete expectedNoDomainRule.condition.excludedInitiatorDomains;
        delete expectedNoDomainRule.condition.excludedRequestDomains;

        const actualRule = generateGPCheaderRule(ruleId);
        assert.deepEqual(actualRule, expectedNoDomainRule);
    });
});
