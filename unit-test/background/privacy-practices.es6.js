const privacyPractices = require('../../shared/js/background/privacy-practices.es6')

describe('getTosdr', () => {
    const tests = [
        {
            'domain': 'google.com',
            'isMessageBad': 1,
            'descr': 'bad tosdr rating for google.com'
        },
        {
            'domain': 'encrypted.google.com',
            'isMessageBad': 1,
            'descr': 'bad tosdr rating for encrypted.google.com (match domain)'
        },
        {
            'domain': 'youtube.com',
            'isMessageBad': 1,
            'descr': 'bad tosdr rating for youtube.com'
        },
        {
            'domain': 'duckduckgo.com',
            'isMessageBad': 0,
            'descr': 'good tosdr rating for duckduckgo.com'
        },
        {
            'domain': 'bttf.duckduckgo.com',
            'isMessageBad': 0,
            'descr': 'good tosdr rating for bttf.duckduckgo.com'
        },
        {
            'domain': 'deletefacebook.com',
            'isMessageBad': 0,
            'descr': 'not bad tosdr rating for deletefacebook.com'
        }
    ]

    tests.forEach((test) => {
        it(`should return ${test.descr}`, () => {
            let result = privacyPractices.getTosdr(test.domain)
            let message = result.message

            if (test.isMessageBad) {
                expect(message).toEqual('Bad')
            } else {
                expect(message).not.toEqual('Bad')
            }
        })
    })
})
