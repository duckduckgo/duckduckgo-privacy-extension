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
import { sendPixelRequest } from '../pixels';

/**
 * @returns {ExperimentMetric[]}
 */
export function generateRetentionMetrics() {
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

/**
 * A/B/N testing framework: metrics.
 *
 * This component handles metrics needed for A/B testing. It handles the rate-limiting required
 * to define and send metrics as per the documentation in Asana (https://app.asana.com/0/1208889145294658/1208747415972722/f)
 *
 * Usage:
 *  - The main entry point is `markExperimentEnrolled`. This should be used to move an assigned experiment to
 * 'enrolled' state when the user first sees the treatment behavior. You can call this multiple times, as
 * subsequent calls will be a no-op if the user is already enrolled.
 *  - When enrolling, you can pass a list of 'metrics' that should be sent for the experiment. Each metric defines an
 * event, value count and conversion window. e.g. metric: 'search', value: 4, conversionWindow 1-7: triggered
 * once 4 searches have been done within 1-7 days (inclusive) of enrollment.
 *  - `generateRetentionMetrics` can be used to create a default list of retention metrics (search and app_use).
 *
 * Example:
 *  - Check if user has been assigned a cohort for the subfeature: `remoteConfig.getCohortName(feature, subFeature) !== null`
 *  - Check if user is in the 'treatment' group: `remoteConfig.isSubFeatureEnabled(feature, subFeature, 'treatment')`
 *  - Enroll the user in the experiment (with default retention metrics.): `abnMetrics.markExperimentEnrolled(feature, subFeature)`
 */
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
            cohort.metrics = (metrics || generateRetentionMetrics()).map((m) => ({ ...m, counter: 0, sent: false }));
            sendPixelRequest(`experiment_enroll_${subFeatureName}_${cohort.name}`, {
                enrollmentDate: new Date(cohort.enrolledAt).toISOString().slice(0, 10),
            });
            // updated stored cohort metadata
            this.remoteConfig.setCohort(featureName, subFeatureName, cohort);
        }
    }

    /**
     * Triggered when a given metric is triggered.
     *
     * Checks all active, enrolled subfeature experiments to find matching metrics that should be
     * sent for them. With those that match, their counter is incremented by `value`, and if they
     * exceed the threshold, a pixel is sent.
     *
     * After incrementing counters and potentially sending pixels, the updated cohort state is
     * written back to settings.
     * @param {string} metric
     * @param {number} [value]
     * @param {number} [timestamp]
     */
    async onMetricTriggered(metric, value = 1, timestamp) {
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
                // Find metrics for this experiment that match at this point in time.
                // i.e. we are within the conversion window, and haven't sent the pixel yet.
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
