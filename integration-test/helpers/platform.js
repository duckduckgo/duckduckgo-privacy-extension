/**
 * @returns {'chrome' | 'firefox' | 'chromium-embedded'}
 */
export function getPlatform() {
    return /** @type {'chrome' | 'firefox' | 'chromium-embedded'} */ (process.env.DDG_PLATFORM || 'chrome');
}

export function isFirefox() {
    return getPlatform() === 'firefox';
}

export function isChromiumEmbedded() {
    return getPlatform() === 'chromium-embedded';
}
