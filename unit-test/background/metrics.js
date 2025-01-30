import { RefreshMetric } from '../../shared/js/background/metrics';

class MockAbnExperimentMetrics {
    onMetricTriggered() {}
}

class MockTabTracking extends EventTarget {
    mockRefreshEvent(tabId, timeStamp = Date.now()) {
        this.dispatchEvent(
            new CustomEvent('tabRefresh', {
                detail: {
                    tabId,
                    timeStamp,
                },
            }),
        );
    }
}

describe('RefreshMetric', () => {
    let abnMetrics;
    let tabTracking;
    /** @type {RefreshMetric} */
    let metric;
    /** @type {jasmine.Spy} */
    let metricsSpy;

    beforeEach(() => {
        abnMetrics = new MockAbnExperimentMetrics();
        tabTracking = new MockTabTracking();
        metricsSpy = spyOn(abnMetrics, 'onMetricTriggered');
        metric = new RefreshMetric({
            abnMetrics,
            tabTracking,
        });
    });

    it('triggers 2xRefresh metric', () => {
        tabTracking.mockRefreshEvent(1, Date.now() - 5000);
        tabTracking.mockRefreshEvent(1, Date.now() - 1000);
        expect(metricsSpy).toHaveBeenCalledOnceWith('2xRefresh');
    });

    it('triggers 3xRefresh metric', () => {
        tabTracking.mockRefreshEvent(1, Date.now() - 5000);
        tabTracking.mockRefreshEvent(1, Date.now() - 3000);
        tabTracking.mockRefreshEvent(1, Date.now() - 1000);
        expect(metricsSpy).toHaveBeenCalledWith('2xRefresh');
        expect(metricsSpy).toHaveBeenCalledWith('3xRefresh');
    });

    it('debounces spammed refreshes', () => {
        const t = Date.now() - 1000;
        tabTracking.mockRefreshEvent(1, t);
        tabTracking.mockRefreshEvent(1, t + 1);
        tabTracking.mockRefreshEvent(1, t + 2);
        tabTracking.mockRefreshEvent(1, t + 3);
        tabTracking.mockRefreshEvent(1, t + 4);
        expect(metricsSpy).toHaveBeenCalledTimes(0);
        tabTracking.mockRefreshEvent(1, t + metric.DEBOUNCE_MS + 4);
        tabTracking.mockRefreshEvent(1, t + metric.DEBOUNCE_MS + 5);
        expect(metricsSpy).toHaveBeenCalledOnceWith('2xRefresh');
    });

    it('triggers 2xRefresh if the events happened within 12s, but not otherwise', () => {
        const t = Date.now() - 30000;
        tabTracking.mockRefreshEvent(1, t);
        tabTracking.mockRefreshEvent(1, t + 12100);
        expect(metricsSpy).toHaveBeenCalledTimes(0);
        tabTracking.mockRefreshEvent(1, t + 21000);
        expect(metricsSpy).toHaveBeenCalledOnceWith('2xRefresh');
    });

    it('triggers 3xRefresh if the events happend within 20s, but not otherwise', () => {
        const t = 30000;
        tabTracking.mockRefreshEvent(1, t);
        tabTracking.mockRefreshEvent(1, t + 1000);
        expect(metricsSpy).toHaveBeenCalledOnceWith('2xRefresh');
        tabTracking.mockRefreshEvent(1, t + 20100);
        expect(metricsSpy.calls.all().map((c) => c.args[0])).toEqual(['2xRefresh']);
        tabTracking.mockRefreshEvent(1, t + 20900);
        expect(metricsSpy.calls.all().map((c) => c.args[0])).toEqual(['2xRefresh', '2xRefresh', '3xRefresh']);
    });
});
