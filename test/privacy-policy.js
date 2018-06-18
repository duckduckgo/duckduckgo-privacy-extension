const privacyPolicy = require('../src/privacy-policy')

privacyPolicy.addLists({
    tosdr: {
        "couchsurfing.org": {
            "score": 5,
            "good": [],
            "bad": [
                "may sell your data in merger"
            ]
        }
    },
    polisis: {
        'wikihow.com': {
            reasons: {
                bad: [
                    'Some personal information is shared with third parties.',
                    'Data might be shared in the case of a merger or acquisition.',
                    'Certain data is shared with third parties for advertising purposes.'
                ],
                good: []
            },
            score: 11
        },
        'yahoo.com': {
            reasons: {
                bad: [
                    'Some personal information is shared with third parties.',
                    'Data might be shared in the case of a merger or acquisition.',
                    'Certain data is shared with third parties for advertising purposes.'
                ],
                good: []
            },
            score: 11
        }
    }
})

describe('getScoreForUrl', () => {
    let tests = [
        { url: 'wikihow.com', expected: 11 },
        { url: 'de.yahoo.com', expected: 11 },
        { url: 'couchsurfing.org', expected: 5 }
    ]

    tests.forEach((test) => {
        it(`should get correct score for ${test.url}`, () => {
            expect(privacyPolicy.getScoreForUrl(test.url)).toEqual(test.expected)
        })
    })
})
