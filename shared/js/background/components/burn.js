import Companies from '../companies';
import tabManager from '../tab-manager';

/**
 * Burning belongs to the browser in DDG-Chromium: it owns the fire button UI and
 * clears cookies, history and site storage itself. What it cannot reach is the
 * record this extension keeps of what was browsed — the tracker counts in local
 * storage, and the per-tab data (including ad-click attribution allowlisting)
 * held in memory, in session storage and in session DNR rules. This clears that
 * half.
 *
 * The browser announces a burn and then gets on with it. There is no reply
 * channel, it does not wait for us, and the worker may still be waking while
 * storage is already being cleared — so a burn that finishes before this runs is
 * expected. Everything here is therefore idempotent and correct when run late,
 * run twice, or run with nothing left to clear.
 *
 * The event carries only a trigger, never a tab or an origin, so we cannot be
 * selective: a burn means all of it goes. Tracker counts for any tab the browser
 * chose to keep open are rebuilt on the next navigation.
 *
 * @param {'in-session' | 'on-exit' | 'on-startup'} trigger
 */
export function clearBurnedState(trigger) {
    console.log('🔥 burn started:', trigger);
    // Tracker counts are the only burnable thing we persist beyond the session.
    Companies.resetData();
    tabManager.clearAll();
}

/**
 * Listen for the browser's burn announcement.
 *
 * Must be called on the first tick of the service worker, before any await:
 * top-level registration is what tells the browser this worker wants the event,
 * and it is the only thing that lets the browser wake a sleeping worker to
 * deliver it. A listener added later only works while the worker happens to be
 * alive.
 *
 * `chrome.ddg` is absent unless we are the allowlisted component extension, and
 * `onBurnStarted` is absent on a browser older than the event, so both are
 * optional: an unsupported API means carry on alone, not fail.
 */
export default function setupBurn() {
    chrome.ddg?.onBurnStarted?.addListener(({ trigger }) => clearBurnedState(trigger));
}
