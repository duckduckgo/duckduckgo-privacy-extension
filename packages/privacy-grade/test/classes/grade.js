const Grade = require('../../src/classes/grade');
const exampleGradeTests = require('../data/grade-cases');

let grade;

describe('example grades', () => {
    beforeEach(() => {
        grade = new Grade();
    });

    exampleGradeTests.forEach((test) => {
        it(`should calculate the correct grade for ${test.url}`, () => {
            grade.setHttps(test.input.https, test.input.httpsAutoUpgrade);
            grade.setPrivacyScore(test.input.privacyScore);
            grade.setParentEntity(test.input.parentEntity, test.input.parentTrackerPrevalence);

            test.input.trackers.forEach((tracker) => {
                if (tracker.blocked) {
                    grade.addEntityBlocked(tracker.parentEntity, tracker.prevalence);
                } else {
                    grade.addEntityNotBlocked(tracker.parentEntity, tracker.prevalence);
                }
            });

            const gradeData = grade.get();

            expect(gradeData.site).toEqual(test.expected.site, 'site grade should be correct');
            expect(gradeData.enhanced).toEqual(test.expected.enhanced, 'enhanced grade should be correct');
        });
    });
});

describe('constructor', () => {
    it('should be able to use attributes passed in via the constructor', () => {
        grade = new Grade({
            https: true,
            httpsAutoUpgrade: true,
            parentEntity: 'Oath',
            privacyScore: 5,
            prevalence: 7.06,
            trackersBlocked: {
                comScore: {
                    prevalence: 12.75,
                    'scorecardresearch.com': {
                        blocked: true,
                        parentEntity: 'comScore',
                        reason: 'trackersWithParentCompany',
                        type: 'Analytics',
                        url: 'scorecardresearch.com',
                    },
                },
            },
            trackersNotBlocked: {
                'Amazon.com': {
                    prevalence: 14.15,
                    's3.amazonaws.com': {
                        parentEntity: 'Amazon.com',
                        url: 's3.amazonaws.com',
                        type: 'trackersWhitelist',
                        block: false,
                        reason: 'whitelisted',
                    },
                },
            },
        });

        expect(grade.https).toEqual(true);
        expect(grade.httpsAutoUpgrade).toEqual(true);
        expect(grade.privacyScore).toEqual(5);
        expect(grade.entitiesBlocked).toEqual({
            comScore: 12.75,
        });
        expect(grade.entitiesNotBlocked).toEqual({
            Oath: 7.06,
            'Amazon.com': 14.15,
        });
    });
});
