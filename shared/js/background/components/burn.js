import Companies from '../companies';
import tabManager from '../tab-manager';

/**
 * Clear the state a browser-side burn cannot reach: the tracker counts we
 * persist to local storage, and the per-tab data held in memory, session
 * storage and session DNR rules.
 *
 * The burn does not wait for this and may already have finished, so it is
 * idempotent and safe to run late or twice. The event names no tab or origin,
 * so everything goes; counts for tabs left open are rebuilt on next navigation.
 *
 * @param {'in-session' | 'on-exit' | 'on-startup'} trigger
 */
export function clearBurnedState(trigger) {
    console.log('🔥 burn started:', trigger);
    Companies.resetData();
    tabManager.clearAll();
}

/**
 * Listen for the browser's burn announcement.
 *
 * Must be called on the first tick of the service worker, before any await:
 * only top-level registration lets the browser wake a sleeping worker to
 * deliver the event.
 *
 * `chrome.ddg` is absent outside the allowlisted component extension, and
 * `onBurnStarted` is absent on a browser older than the event.
 */
export default function setupBurn() {
    chrome.ddg?.onBurnStarted?.addListener(({ trigger }) => clearBurnedState(trigger));
}
