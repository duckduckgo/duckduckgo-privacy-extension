import {
    periodToSeconds,
    toStartOfInterval,
    calculateAttributionPeriod,
    bucketCount,
    TelemetryInstance,
} from '../../shared/js/background/components/event-hub';

describe('periodToSeconds', () => {
    it('converts seconds', () => {
        expect(periodToSeconds({ seconds: 30 })).toBe(30);
    });
    it('converts minutes', () => {
        expect(periodToSeconds({ minutes: 5 })).toBe(300);
    });
    it('converts hours', () => {
        expect(periodToSeconds({ hours: 2 })).toBe(7200);
    });
    it('converts days', () => {
        expect(periodToSeconds({ days: 1 })).toBe(86400);
    });
    it('converts combined periods', () => {
        expect(periodToSeconds({ days: 1, hours: 2, minutes: 3, seconds: 4 })).toBe(86400 + 7200 + 180 + 4);
    });
    it('returns 0 for empty period', () => {
        expect(periodToSeconds({})).toBe(0);
    });
});

describe('toStartOfInterval', () => {
    it('snaps to day boundary', () => {
        // 2026-01-02T00:01:00Z => 2026-01-02T00:00:00Z
        const ts = Date.UTC(2026, 0, 2, 0, 1, 0) / 1000;
        const result = toStartOfInterval(ts, { days: 1 });
        expect(result).toBe(Date.UTC(2026, 0, 2, 0, 0, 0) / 1000);
    });
    it('snaps to hour boundary', () => {
        // 2026-01-02T17:15:00Z => 2026-01-02T17:00:00Z
        const ts = Date.UTC(2026, 0, 2, 17, 15, 0) / 1000;
        const result = toStartOfInterval(ts, { hours: 1 });
        expect(result).toBe(Date.UTC(2026, 0, 2, 17, 0, 0) / 1000);
    });
    it('returns same value if already on boundary', () => {
        // 2026-01-03T00:00:00Z => 2026-01-03T00:00:00Z
        const ts = Date.UTC(2026, 0, 3, 0, 0, 0) / 1000;
        const result = toStartOfInterval(ts, { days: 1 });
        expect(result).toBe(ts);
    });
});

describe('calculateAttributionPeriod', () => {
    it('calculates daily attribution period', () => {
        // (2026-01-02T00:01:00Z, {days: 1}) => 2026-01-03T00:00:00Z
        const start = Date.UTC(2026, 0, 2, 0, 1, 0) / 1000;
        const result = calculateAttributionPeriod(start, { days: 1 });
        expect(result).toBe(Date.UTC(2026, 0, 3, 0, 0, 0) / 1000);
    });
    it('calculates hourly attribution period', () => {
        // (2026-01-02T17:15:00Z, {hours: 1}) => 2026-01-02T18:00:00Z
        const start = Date.UTC(2026, 0, 2, 17, 15, 0) / 1000;
        const result = calculateAttributionPeriod(start, { hours: 1 });
        expect(result).toBe(Date.UTC(2026, 0, 2, 18, 0, 0) / 1000);
    });
    it('handles start on boundary', () => {
        // (2026-01-03T00:00:00Z, {days: 1}) => 2026-01-04T00:00:00Z
        const start = Date.UTC(2026, 0, 3, 0, 0, 0) / 1000;
        const result = calculateAttributionPeriod(start, { days: 1 });
        expect(result).toBe(Date.UTC(2026, 0, 4, 0, 0, 0) / 1000);
    });
});

describe('bucketCount', () => {
    const buckets = [
        { minInclusive: 0, maxExclusive: 1, name: '0' },
        { minInclusive: 1, maxExclusive: 3, name: '1-2' },
        { minInclusive: 3, maxExclusive: 6, name: '3-5' },
        { minInclusive: 6, maxExclusive: 11, name: '6-10' },
        { minInclusive: 40, name: '40+' },
    ];

    it('returns first bucket for 0', () => {
        expect(bucketCount(0, buckets)?.name).toBe('0');
    });
    it('returns 1-2 bucket for 2', () => {
        expect(bucketCount(2, buckets)?.name).toBe('1-2');
    });
    it('returns 3-5 bucket for 5', () => {
        expect(bucketCount(5, buckets)?.name).toBe('3-5');
    });
    it('returns 6-10 bucket for 10', () => {
        expect(bucketCount(10, buckets)?.name).toBe('6-10');
    });
    it('returns 40+ bucket for 100', () => {
        expect(bucketCount(100, buckets)?.name).toBe('40+');
    });
    it('returns null for unmatched count', () => {
        expect(bucketCount(15, buckets)).toBeNull();
    });
    it('returns null for empty buckets', () => {
        expect(bucketCount(5, [])).toBeNull();
    });
});

describe('TelemetryInstance', () => {
    /** @type {TelemetryInstance} */
    let instance;
    const config = {
        state: 'enabled',
        trigger: { period: { days: 1 } },
        parameters: {
            count: {
                template: 'counter',
                source: 'adwall',
                buckets: [
                    { minInclusive: 0, maxExclusive: 1, name: '0' },
                    { minInclusive: 1, maxExclusive: 3, name: '1-2' },
                    { minInclusive: 3, maxExclusive: 6, name: '3-5' },
                    { minInclusive: 40, name: '40+' },
                ],
            },
        },
    };

    beforeEach(() => {
        instance = new TelemetryInstance('webTelemetry_adwallDetection_day', config);
    });

    describe('initialization', () => {
        it('sets name and period', () => {
            expect(instance.name).toBe('webTelemetry_adwallDetection_day');
            expect(instance.period).toEqual({ days: 1 });
        });
        it('initializes with null period timestamps', () => {
            expect(instance.periodStart).toBeNull();
            expect(instance.periodEnd).toBeNull();
        });
        it('initializes counter parameter at 0', () => {
            const param = instance.parameters.get('count');
            expect(param).toBeDefined();
            expect(param?.data).toBe(0);
            expect(param?.template).toBe('counter');
            expect(param?.source).toBe('adwall');
        });
    });

    describe('start', () => {
        it('sets periodStart and periodEnd', () => {
            instance.start();
            expect(instance.periodStart).toBeDefined();
            expect(instance.periodEnd).toBeDefined();
            expect(instance.periodEnd - instance.periodStart).toBe(86400);
        });
    });

    describe('handleEvent', () => {
        /** @type {Map<number, Set<string>>} */
        let seenEventsPerTab;

        beforeEach(() => {
            instance.start();
            seenEventsPerTab = new Map();
        });

        it('increments counter for matching event', () => {
            instance.handleEvent({ type: 'adwall' }, 1, seenEventsPerTab);
            expect(instance.parameters.get('count')?.data).toBe(1);
        });

        it('ignores non-matching events', () => {
            instance.handleEvent({ type: 'other' }, 1, seenEventsPerTab);
            expect(instance.parameters.get('count')?.data).toBe(0);
        });

        it('de-duplicates events across frames on same tab', () => {
            instance.handleEvent({ type: 'adwall' }, 1, seenEventsPerTab);
            instance.handleEvent({ type: 'adwall' }, 1, seenEventsPerTab);
            expect(instance.parameters.get('count')?.data).toBe(1);
        });

        it('counts events from different tabs', () => {
            instance.handleEvent({ type: 'adwall' }, 1, seenEventsPerTab);
            instance.handleEvent({ type: 'adwall' }, 2, seenEventsPerTab);
            expect(instance.parameters.get('count')?.data).toBe(2);
        });

        it('does not count events before start', () => {
            const fresh = new TelemetryInstance('test', config);
            fresh.handleEvent({ type: 'adwall' }, 1, seenEventsPerTab);
            expect(fresh.parameters.get('count')?.data).toBe(0);
        });

        it('stops counting after exceeding all buckets', () => {
            for (let i = 0; i < 50; i++) {
                instance.handleEvent({ type: 'adwall' }, 100 + i, seenEventsPerTab);
            }
            const param = instance.parameters.get('count');
            expect(param?.stopCounting).toBeTrue();
            expect(param?.data).toBe(40);
        });
    });

    describe('_buildPixel', () => {
        it('returns empty object when count is 0 and 0 is bucketed', () => {
            instance.start();
            const result = instance._buildPixel();
            expect(result).toEqual({ count: '0' });
        });

        it('returns bucketed value after counting', () => {
            instance.start();
            const seenEventsPerTab = new Map();
            instance.handleEvent({ type: 'adwall' }, 1, seenEventsPerTab);
            instance.handleEvent({ type: 'adwall' }, 2, seenEventsPerTab);
            const result = instance._buildPixel();
            expect(result).toEqual({ count: '1-2' });
        });
    });

    describe('serialize / restore', () => {
        it('round-trips state through serialization', () => {
            instance.start();
            const seenEventsPerTab = new Map();
            instance.handleEvent({ type: 'adwall' }, 1, seenEventsPerTab);

            const serialized = instance.serialize();
            expect(serialized.name).toBe('webTelemetry_adwallDetection_day');
            expect(serialized.periodStart).toBe(instance.periodStart);
            expect(serialized.periodEnd).toBe(instance.periodEnd);
            expect(serialized.parameters.count.data).toBe(1);
        });
    });
});
