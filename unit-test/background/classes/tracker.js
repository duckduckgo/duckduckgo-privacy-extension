const { Tracker } = require('../../../shared/js/background/classes/tracker');
const load = require('./../../helpers/utils');
const config = require('./../../../shared/data/bundled/extension-config.json');
const tdsStorage = require('../../../shared/js/background/storage/tds').default;
const tdsStorageStub = require('./../../helpers/tds');

describe('Tracker', () => {
    beforeAll(() => {
        load.loadStub({ config });
        tdsStorageStub.stub();

        return tdsStorage.getLists();
    });

    describe('constructor', () => {
        it('should throw an error when tracker object is missing', () => {
            const invalidTrackerData = { notTracker: {} };

            expect(() => new Tracker(invalidTrackerData)).toThrowError('Tracker object required for Tracker constructor');
        });

        it('should create an empty tracker with null argument', () => {
            const tracker = new Tracker(null);

            expect(tracker.urls).toEqual({});
            expect(tracker.count).toEqual(0);
        });

        it('should initialize tracker with valid data', () => {
            const trackerData = {
                tracker: {
                    owner: {
                        name: 'Example Corp',
                        displayName: 'Example Corporation',
                    },
                },
            };

            const tracker = new Tracker(trackerData);

            expect(tracker.urls).toEqual({});
            expect(tracker.count).toEqual(0);
            expect(tracker.displayName).toBeDefined();
        });
    });

    describe('restore()', () => {
        it('should restore a tracker from data', () => {
            const data = {
                urls: {
                    'example.com:block': {
                        action: 'block',
                        url: 'https://example.com/tracker.js',
                        eTLDplus1: 'example.com',
                        pageUrl: 'https://test.com',
                        entityName: 'Example Corp',
                        state: 'blocked',
                    },
                },
                count: 5,
                displayName: 'Example Corporation',
                parentCompany: {
                    name: 'Example Corp',
                    displayName: 'Example Corporation',
                },
            };

            const restored = Tracker.restore(data);

            expect(restored.urls).toEqual(data.urls);
            expect(restored.count).toEqual(5);
            expect(restored.displayName).toEqual('Example Corporation');
            expect(restored.parentCompany).toEqual(data.parentCompany);
        });

        it('should restore an empty tracker', () => {
            const emptyData = {
                urls: {},
                count: 0,
            };

            const restored = Tracker.restore(emptyData);

            expect(restored.urls).toEqual({});
            expect(restored.count).toEqual(0);
        });
    });
});
