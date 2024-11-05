const dnrSessionId = require('../../shared/js/background/dnr-session-rule-id.js');
const browserWrapper = require('../../shared/js/background/wrapper');

describe('Check DNR session IDs', () => {
    it('should increment session rule IDs', async () => {
        await browserWrapper.setToSessionStorage('sessionRuleOffset', 0);
        await dnrSessionId.setSessionRuleOffsetFromStorage();

        // initial call should get base id, offset will increment
        expect(dnrSessionId.getNextSessionRuleId()).toBe(100000);

        // check offset was incremented
        expect(dnrSessionId.getNextSessionRuleId()).toBe(100001);

        // check that session storage has the correct offset
        expect(await browserWrapper.getFromSessionStorage('sessionRuleOffset')).toBe(2);

        await browserWrapper.setToSessionStorage('sessionRuleOffset', 0);
        await dnrSessionId.setSessionRuleOffsetFromStorage();

        // set test offset to session storage
        await browserWrapper.setToSessionStorage('sessionRuleOffset', 10);
        await dnrSessionId.setSessionRuleOffsetFromStorage();
        expect(dnrSessionId.getNextSessionRuleId()).toBe(100010);
    });
});
