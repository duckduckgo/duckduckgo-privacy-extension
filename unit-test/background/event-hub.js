import {
    periodToSeconds,
    toStartOfInterval,
    bucketCount,
    shouldStopCounting,
    STORAGE_KEY,
    ALARM_PREFIX,
} from '../../shared/js/background/components/event-hub';
import browser from 'webextension-polyfill';

describe('EventHub utilities', () => {
    describe('periodToSeconds', () => {
        it('should convert days to seconds', () => {
            expect(periodToSeconds({ days: 1 })).toBe(86400);
            expect(periodToSeconds({ days: 7 })).toBe(604800);
        });

        it('should convert hours to seconds', () => {
            expect(periodToSeconds({ hours: 1 })).toBe(3600);
            expect(periodToSeconds({ hours: 24 })).toBe(86400);
        });

        it('should convert minutes to seconds', () => {
            expect(periodToSeconds({ minutes: 1 })).toBe(60);
            expect(periodToSeconds({ minutes: 30 })).toBe(1800);
        });

        it('should convert seconds directly', () => {
            expect(periodToSeconds({ seconds: 10 })).toBe(10);
        });

        it('should combine multiple units', () => {
            expect(periodToSeconds({ days: 1, hours: 2, minutes: 30, seconds: 15 })).toBe(86400 + 7200 + 1800 + 15);
        });

        it('should handle empty period', () => {
            expect(periodToSeconds({})).toBe(0);
        });
    });

    describe('toStartOfInterval', () => {
        it('should snap daily period to start of day', () => {
            // 2026-01-02T00:01:00Z => 2026-01-02T00:00:00Z
            const ts = Date.UTC(2026, 0, 2, 0, 1, 0);
            const result = toStartOfInterval(ts, { days: 1 });
            expect(result).toBe(Math.floor(Date.UTC(2026, 0, 2, 0, 0, 0) / 1000));
        });

        it('should snap hourly period to start of hour', () => {
            // 2026-01-02T17:15:00Z => 2026-01-02T17:00:00Z
            const ts = Date.UTC(2026, 0, 2, 17, 15, 0);
            const result = toStartOfInterval(ts, { hours: 1 });
            expect(result).toBe(Math.floor(Date.UTC(2026, 0, 2, 17, 0, 0) / 1000));
        });

        it('should return same value if already on boundary', () => {
            const ts = Date.UTC(2026, 0, 3, 0, 0, 0);
            const result = toStartOfInterval(ts, { days: 1 });
            expect(result).toBe(Math.floor(ts / 1000));
        });
    });

    describe('bucketCount', () => {
        const buckets = {
            0: { gte: 0, lt: 1 },
            '1-2': { gte: 1, lt: 3 },
            '3-5': { gte: 3, lt: 6 },
            '6-10': { gte: 6, lt: 11 },
            '11-20': { gte: 11, lt: 21 },
            '21-39': { gte: 21, lt: 40 },
            '40+': { gte: 40 },
        };

        it('should return 0 for count 0', () => {
            expect(bucketCount(0, buckets)).toBe('0');
        });

        it('should return 1-2 for count 1', () => {
            expect(bucketCount(1, buckets)).toBe('1-2');
        });

        it('should return 1-2 for count 2', () => {
            expect(bucketCount(2, buckets)).toBe('1-2');
        });

        it('should return 3-5 for count 3', () => {
            expect(bucketCount(3, buckets)).toBe('3-5');
        });

        it('should return 6-10 for count 10', () => {
            expect(bucketCount(10, buckets)).toBe('6-10');
        });

        it('should return 40+ for count 40', () => {
            expect(bucketCount(40, buckets)).toBe('40+');
        });

        it('should return 40+ for count 100', () => {
            expect(bucketCount(100, buckets)).toBe('40+');
        });

        it('should return null for no matching bucket', () => {
            expect(bucketCount(-1, buckets)).toBeNull();
        });

        it('should return null for empty buckets', () => {
            expect(bucketCount(5, {})).toBeNull();
        });
    });

    describe('shouldStopCounting', () => {
        const buckets = {
            0: { gte: 0, lt: 1 },
            '1-2': { gte: 1, lt: 3 },
            '3+': { gte: 3 },
        };

        it('should return false when count can still reach a higher bucket', () => {
            expect(shouldStopCounting(0, buckets)).toBe(false);
            expect(shouldStopCounting(1, buckets)).toBe(false);
            expect(shouldStopCounting(2, buckets)).toBe(false);
        });

        it('should return true when count is in the highest bucket', () => {
            expect(shouldStopCounting(3, buckets)).toBe(true);
            expect(shouldStopCounting(10, buckets)).toBe(true);
        });
    });
});

describe('EventHub integration', () => {
    /** @type {Record<string, any>} */
    let storageData;
    /** @type {Record<string, any>} */
    let alarmData;

    beforeEach(() => {
        storageData = {};
        alarmData = {};

        // Set up shim methods
        browser.storage.local.remove = browser.storage.local.remove || (() => {});
        browser.alarms = Object.assign(
            {
                create() {},
                clear() {},
                getAll() {},
                onAlarm: { addListener() {}, removeListener() {} },
            },
            browser.alarms || {},
        );
        browser.tabs.onRemoved = browser.tabs.onRemoved || { addListener() {}, removeListener() {} };
        browser.webNavigation.onBeforeNavigate = browser.webNavigation.onBeforeNavigate || {
            addListener() {},
            removeListener() {},
        };

        spyOn(browser.storage.local, 'get').and.callFake(async (key) => {
            return { [key]: storageData[key] || undefined };
        });
        spyOn(browser.storage.local, 'set').and.callFake(async (data) => {
            Object.assign(storageData, data);
        });
        spyOn(browser.storage.local, 'remove').and.callFake(async (key) => {
            delete storageData[key];
        });

        spyOn(browser.alarms, 'create').and.callFake(async (name, info) => {
            alarmData[name] = info;
        });
        spyOn(browser.alarms, 'clear').and.callFake(async (name) => {
            delete alarmData[name];
            return true;
        });
        spyOn(browser.alarms, 'getAll').and.callFake(async () => {
            return Object.entries(alarmData).map(([name, info]) => ({ name, ...info }));
        });
    });

    it('should have correct storage key constant', () => {
        expect(STORAGE_KEY).toBe('eventHub_pixelState');
    });

    it('should have correct alarm prefix constant', () => {
        expect(ALARM_PREFIX).toBe('eventHub_fire_');
    });

    it('should persist pixel state to chrome.storage.local', async () => {
        await browser.storage.local.set({
            [STORAGE_KEY]: {
                testPixel: {
                    pixelName: 'testPixel',
                    periodStartMillis: 1000,
                    periodEndMillis: 2000,
                    params: { count: { value: 5, stopCounting: false } },
                    config: {},
                },
            },
        });

        const result = await browser.storage.local.get(STORAGE_KEY);
        expect(result[STORAGE_KEY].testPixel).toBeDefined();
        expect(result[STORAGE_KEY].testPixel.params.count.value).toBe(5);
    });

    it('should create alarms with correct prefix', async () => {
        const pixelName = 'webTelemetry_adwallDetection_day';
        const alarmName = ALARM_PREFIX + pixelName;
        const fireTime = Date.now() + 86400000;

        await browser.alarms.create(alarmName, { when: fireTime });

        expect(alarmData[alarmName]).toBeDefined();
        expect(alarmData[alarmName].when).toBe(fireTime);
    });

    it('should clear all eventHub alarms', async () => {
        alarmData.eventHub_fire_pixel1 = { when: 1000 };
        alarmData.eventHub_fire_pixel2 = { when: 2000 };
        alarmData.otherAlarm = { when: 3000 };

        const allAlarms = await browser.alarms.getAll();
        const ehAlarms = allAlarms.filter((a) => a.name.startsWith(ALARM_PREFIX));
        await Promise.all(ehAlarms.map((a) => browser.alarms.clear(a.name)));

        expect(alarmData.eventHub_fire_pixel1).toBeUndefined();
        expect(alarmData.eventHub_fire_pixel2).toBeUndefined();
        expect(alarmData.otherAlarm).toBeDefined();
    });

    it('should delete all pixel states on disable', async () => {
        storageData[STORAGE_KEY] = {
            pixel1: { pixelName: 'pixel1' },
            pixel2: { pixelName: 'pixel2' },
        };

        await browser.storage.local.remove(STORAGE_KEY);

        expect(storageData[STORAGE_KEY]).toBeUndefined();
    });
});

describe('EventHub bucketing scenarios', () => {
    const adwallBuckets = {
        0: { gte: 0, lt: 1 },
        '1-2': { gte: 1, lt: 3 },
        '3-5': { gte: 3, lt: 6 },
        '6-10': { gte: 6, lt: 11 },
        '11-20': { gte: 11, lt: 21 },
        '21-39': { gte: 21, lt: 40 },
        '40+': { gte: 40 },
    };

    it('should assign correct buckets for typical adwall counts', () => {
        const testCases = [
            [0, '0'],
            [1, '1-2'],
            [2, '1-2'],
            [3, '3-5'],
            [5, '3-5'],
            [6, '6-10'],
            [10, '6-10'],
            [11, '11-20'],
            [20, '11-20'],
            [21, '21-39'],
            [39, '21-39'],
            [40, '40+'],
            [100, '40+'],
        ];

        for (const [count, expectedBucket] of testCases) {
            expect(bucketCount(count, adwallBuckets)).toBe(expectedBucket);
        }
    });

    it('should correctly detect when counting should stop', () => {
        expect(shouldStopCounting(0, adwallBuckets)).toBe(false);
        expect(shouldStopCounting(5, adwallBuckets)).toBe(false);
        expect(shouldStopCounting(39, adwallBuckets)).toBe(false);
        expect(shouldStopCounting(40, adwallBuckets)).toBe(true);
        expect(shouldStopCounting(100, adwallBuckets)).toBe(true);
    });
});

describe('EventHub period calculations', () => {
    it('should calculate daily period correctly', () => {
        expect(periodToSeconds({ days: 1 })).toBe(86400);
    });

    it('should calculate weekly period correctly', () => {
        expect(periodToSeconds({ days: 7 })).toBe(604800);
    });

    it('should align attributionPeriod to period boundary', () => {
        const period = { days: 1 };
        const dayInMs = 86400 * 1000;

        // Midnight UTC on a specific day
        const midnight = Math.floor(Date.now() / dayInMs) * dayInMs;
        const midDay = midnight + dayInMs / 2;

        const result = toStartOfInterval(midDay, period);
        expect(result).toBe(midnight / 1000);
    });
});
