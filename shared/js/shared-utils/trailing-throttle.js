/**
 * Trailing throttle: returns a function that, when called, schedules `fn` to
 * run once after `ms`. Calls made while a run is already scheduled are
 * absorbed into it, so a burst of calls results in a single (trailing)
 * execution.
 *
 * @param {() => void} fn
 * @param {number} ms
 * @returns {() => void}
 */
export function trailingThrottle(fn, ms) {
    /** @type {ReturnType<typeof setTimeout>?} */
    let timer = null;
    return () => {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            fn();
        }, ms);
    };
}
