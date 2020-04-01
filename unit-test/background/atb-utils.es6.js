
const atbUtils = require('../../shared/js/background/atb-utils.es6')

describe('utils.getCurrentATB', () => {
    var result = atbUtils.getCurrentATB()

    it('should return a majorVersion that is an integer', function () {
        expect(result.majorVersion % 1).toEqual(0)
    })

    it('should return a majorVersion greater than 25', function () {
        expect(result.majorVersion).toBeGreaterThan(25)
    })

    it('should return a majorVersion less than 500', function () {
        expect(result.majorVersion).toBeLessThan(500)
    })

    it('should return a minorVersion from 1-7', function () {
        expect([1, 2, 3, 4, 5, 6, 7].indexOf(result.minorVersion)).toBeGreaterThan(-1)
    })

    var tests = [
        // eastern
        { date: 'Wed Mar 02 2016 00:01:00 GMT-0500 (EST)', atb: 'v2-1' },
        { date: 'Wed Sep 07 2016 00:01:00 GMT-0400 (EDT)', atb: 'v29-1' },
        { date: 'Tue Sep 06 2016 23:59:00 GMT-0400 (EDT)', atb: 'v28-7' },
        { date: 'Wed Sep 07 2016 23:03:09 GMT-0400 (EDT)', atb: 'v29-1' },
        { date: 'Thu Sep 08 2016 23:03:09 GMT-0400 (EDT)', atb: 'v29-2' },
        { date: 'Fri Sep 09 2016 02:03:09 GMT-0400 (EDT)', atb: 'v29-3' },
        { date: 'Thu Mar 02 2017 00:01:00 GMT-0500 (EST)', atb: 'v54-2' },

        // other time zones:
        { date: 'Tue Mar 01 2016 20:59:00 GMT-0800 (PST)', atb: 'v1-7' },
        { date: 'Tue Mar 01 2016 21:01:00 GMT-0800 (PST)', atb: 'v2-1' },
        { date: 'Fri Sep 09 2016 08:03:09 GMT+0500 (YEXT)', atb: 'v29-2' },
        { date: 'Wed Sep 07 2016 00:01:00 GMT-0000 (GMT)', atb: 'v28-7' },
        { date: 'Wed Sep 07 2016 03:59:00 GMT-0000 (GMT)', atb: 'v28-7' },
        { date: 'Wed Sep 07 2016 04:01:00 GMT-0000 (GMT)', atb: 'v29-1' },
        { date: 'Tue Sep 06 2016 21:16:00 GMT+0300 (MSK)', atb: 'v28-7' },
        { date: 'Tue Sep 06 2016 06:59:00 GMT+0300 (MSK)', atb: 'v28-6' },
        { date: 'Fri Jan 13 2017 12:00:49 GMT+0000 (GMT)', atb: 'v47-3' },

        // Near DST Fall:
        { date: 'Sat Nov 05 2016 22:59:00 GMT-0400 (EDT)', atb: 'v37-4' },
        { date: 'Sat Nov 05 2016 23:59:00 GMT-0400 (EDT)', atb: 'v37-4' },
        { date: 'Sun Nov 06 2016 00:01:00 GMT-0400 (EDT)', atb: 'v37-5' },

        { date: 'Sun Nov 06 2016 01:01:00 GMT-0400 (EDT)', atb: 'v37-5' },
        { date: 'Sun Nov 06 2016 01:59:00 GMT-0400 (EDT)', atb: 'v37-5' },
        { date: 'Sun Nov 06 2016 02:01:00 GMT-0500 (EST)', atb: 'v37-5' },
        { date: 'Sun Nov 06 2016 23:59:00 GMT-0500 (EST)', atb: 'v37-5' },
        { date: 'Mon Nov 07 2016 00:01:00 GMT-0500 (EST)', atb: 'v37-6' },
        { date: 'Mon Nov 07 2016 01:01:00 GMT-0500 (EST)', atb: 'v37-6' },
        { date: 'Mon Nov 07 2016 02:01:00 GMT-0500 (EST)', atb: 'v37-6' },
        { date: 'Mon Nov 07 2016 23:59:00 GMT-0500 (EST)', atb: 'v37-6' },

        { date: 'Sun Nov 06 2016 03:59:00 GMT-0000 (GMT)', atb: 'v37-4' },
        { date: 'Sun Nov 06 2016 04:01:00 GMT-0000 (GMT)', atb: 'v37-5' },
        { date: 'Sun Nov 06 2016 04:59:00 GMT-0000 (GMT)', atb: 'v37-5' },
        { date: 'Sun Nov 06 2016 05:01:00 GMT-0000 (GMT)', atb: 'v37-5' },
        { date: 'Sun Nov 06 2016 05:59:00 GMT-0000 (GMT)', atb: 'v37-5' },
        { date: 'Sun Nov 06 2016 06:01:00 GMT-0000 (GMT)', atb: 'v37-5' },
        { date: 'Mon Nov 14 2016 23:59:00 GMT-0500 (EST)', atb: 'v38-6' },

        // Switchover to DST in the Spring should work fine:
        { date: 'Sat Mar 11 2017 22:59:00 GMT-0500 (EST)', atb: 'v55-4' },
        { date: 'Sat Mar 11 2017 23:59:00 GMT-0500 (EST)', atb: 'v55-4' },
        { date: 'Sun Mar 12 2017 00:59:00 GMT-0500 (EST)', atb: 'v55-5' },
        { date: 'Sun Mar 12 2017 01:01:00 GMT-0500 (EST)', atb: 'v55-5' },
        { date: 'Sun Mar 12 2017 01:59:00 GMT-0500 (EST)', atb: 'v55-5' },
        { date: 'Sun Mar 12 2017 02:01:00 GMT-0400 (EDT)', atb: 'v55-5' },
        { date: 'Sun Mar 12 2017 03:01:00 GMT-0400 (EDT)', atb: 'v55-5' }
    ]

    tests.forEach(function (test) {
        it('should return version ' + test.atb + ' for ' + test.date, function () {
            const baseTime = new Date(test.date)
            jasmine.clock().mockDate(baseTime)

            const result = atbUtils.getCurrentATB()

            expect(result.version).toEqual(test.atb)
        })
    })
})
