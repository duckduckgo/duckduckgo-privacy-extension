const privacyPolicy = require('../src/privacy-policy');

privacyPolicy.addLists({
    tosdr: {
        'couchsurfing.org': {
            score: 5,
            good: [],
            bad: ['may sell your data in merger'],
        },
        'google.com': {
            score: 10,
            good: [],
            bad: [
                'they can use your content for all their existing and future services',
                'tracks you on other websites',
                'logs are kept forever',
            ],
        },
    },
    polisis: {
        'wikihow.com': {
            reasons: {
                bad: [
                    'Some personal information is shared with third parties.',
                    'Data might be shared in the case of a merger or acquisition.',
                    'Certain data is shared with third parties for advertising purposes.',
                ],
                good: [],
            },
            score: 11,
        },
        'yahoo.com': {
            reasons: {
                bad: [
                    'Some personal information is shared with third parties.',
                    'Data might be shared in the case of a merger or acquisition.',
                    'Certain data is shared with third parties for advertising purposes.',
                ],
                good: [],
            },
            score: 11,
        },
        'thefreedictionary.com': {
            reasons: {
                bad: [],
                good: [],
            },
            score: 0,
        },
    },
});

describe('getScoreForUrl', () => {
    const tests = [
        { url: 'wikihow.com', expected: 11 },
        { url: 'de.yahoo.com', expected: 11 },
        { url: 'couchsurfing.org', expected: 5 },
        { url: 'maps.google.com', expected: 10 },
        { url: 'legal-dictionary.thefreedictionary.com', expected: 0 },
    ];

    tests.forEach((test) => {
        it(`should get correct score for ${test.url}`, () => {
            expect(privacyPolicy.getScoreForUrl(test.url)).toEqual(test.expected);
        });
    });
});
