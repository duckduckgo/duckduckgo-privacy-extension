/**
 * @typedef {{
 *  metric: string;
 *  value: number;
 *  conversionWindowStart: number;
 *  conversionWindowEnd: number;
 * }} ExperimentMetric
 *
 * @typedef {{
 *  counter: number;
 *  sent: boolean;
 * } & ExperimentMetric} ExperimentMetricCounter
 */
import browser from 'webextension-polyfill';
import { sendPixelRequest } from '../pixels';

/**
 * @returns {ExperimentMetric[]}
 */
export function generateBuildRetentionMetrics() {
    return ['app_use', 'search'].flatMap((metric) => {
        const metrics = [0, 1, 2, 3, 4, 5, 6, 7].map((conversionWindowStart) => ({
            metric,
            value: 1,
            conversionWindowStart,
            conversionWindowEnd: conversionWindowStart,
        }));
        metrics.push({
            metric,
            value: 1,
            conversionWindowStart: 5,
            conversionWindowEnd: 7,
        });
        return metrics.concat(
            [4, 6, 11, 21, 30].flatMap((value) => {
                return [
                    [5, 7],
                    [8, 15],
                ].map(([conversionWindowStart, conversionWindowEnd]) => ({
                    metric,
                    value,
                    conversionWindowStart,
                    conversionWindowEnd,
                }));
            }),
        );
    });
}

export class AppUseMetric {
    /**
     * Metric that fires once on creation.
     * @param {{
     * abnMetrics: AbnExperimentMetrics
     * }} opts
     */
    constructor({ abnMetrics }) {
        // trigger on construction: happens whenever the service worker is spun up, which should correlate with browser activity.
        abnMetrics.remoteConfig.ready.then(() => abnMetrics.onMetricTriggered('app_use'));
    }
}

export class SearchMetric {
    /**
     * Metric that fires whenever a new search is made
     * @param {{
     * abnMetrics: AbnExperimentMetrics
     * }} opts
     */
    constructor({ abnMetrics }) {
        browser.webRequest.onCompleted.addListener(
            async (details) => {
                const params = new URL(details.url).searchParams;
                if (params.has('q') && (params.get('q')?.length || 0) > 0) {
                    await abnMetrics.remoteConfig.ready;
                    abnMetrics.onMetricTriggered('search');
                }
            },
            {
                urls: ['https://*.duckduckgo.com/*'],
                types: ['main_frame'],
            },
        );
    }
}

export default class AbnExperimentMetrics {
    /**
     *
     * @param {{
     *  remoteConfig: import('./remote-config').default
     * }} opts
     */
    constructor({ remoteConfig }) {
        this.remoteConfig = remoteConfig;
    }

    /**
     * Mark that the user should be enrolled in the experiment for the given feature and sub feature.
     *
     * This will send the enrollment
     * @param {string} featureName
     * @param {string} subFeatureName
     * @param {ExperimentMetric[]} [metrics]
     */
    markExperimentEnrolled(featureName, subFeatureName, metrics) {
        const cohort = this.remoteConfig.getCohort(featureName, subFeatureName);
        if (cohort && !cohort.enrolledAt) {
            cohort.enrolledAt = Date.now();
            cohort.metrics = (metrics || generateBuildRetentionMetrics()).map((m) => ({ ...m, counter: 0, sent: false }));
            sendPixelRequest(`experiment_enroll_${subFeatureName}_${cohort.name}`, {
                enrollmentDate: new Date(cohort.enrolledAt).toISOString().slice(0, 10),
            });
            // updated stored cohort metadata
            this.remoteConfig.setCohort(featureName, subFeatureName, cohort);
        }
    }

    /**
     *
     * @param {string} metric
     * @param {number} value
     * @param {number} [timestamp]
     */
    async onMetricTriggered(metric, value = 1, timestamp) {
        console.log('xxx metric triggered:', metric);
        this.remoteConfig
            .getSubFeatureStatuses()
            .filter((status) => status.hasCohorts && status.cohort && status.cohort.enrolledAt)
            .forEach((status) => {
                const cohort = status.cohort;
                if (!cohort?.metrics || !cohort?.enrolledAt) {
                    return;
                }
                const enrollmentDate = new Date(cohort.enrolledAt).toISOString().slice(0, 10);
                const daysSinceEnrollment = Math.floor(((timestamp || Date.now()) - cohort.enrolledAt) / (1000 * 60 * 60 * 24));
                const matchingPixels = cohort.metrics.filter(
                    (m) =>
                        m.metric === metric &&
                        !m.sent &&
                        m.conversionWindowStart <= daysSinceEnrollment &&
                        m.conversionWindowEnd >= daysSinceEnrollment,
                );
                if (matchingPixels.length > 0) {
                    matchingPixels
                        .filter((m) => {
                            // increment counter value and check it exceeds the threshold
                            m.counter += value;
                            return m.counter >= m.value;
                        })
                        .forEach((m) => {
                            m.sent = true;
                            sendPixelRequest(`experiment_metrics_${status.subFeature}_${cohort.name}`, {
                                metric: m.metric,
                                conversionWindowDays:
                                    m.conversionWindowStart === m.conversionWindowEnd
                                        ? `${m.conversionWindowStart}`
                                        : `${m.conversionWindowStart}-${m.conversionWindowEnd}`,
                                value: m.value,
                                enrollmentDate,
                            });
                        });
                    this.remoteConfig.setCohort(status.feature, status.subFeature, cohort);
                }
            });
    }
}
