/* global BUILD_TARGET */
import load from './load';
import { getBrowserName } from './utils';

/**
 *
 * Return URL for the pixel request
 * @param {string} pixelName
 * @returns {string}
 */
export function getURL(pixelName) {
    if (!pixelName) throw new Error('pixelName is required');

    const url = 'https://improving.duckduckgo.com/t/';
    return url + pixelName;
}

/**
 * Send a pixel request.
 * @param {string} pixelName
 * @param {Record<string, any>} [params]
 * @param {import('./components/native-messaging').default} [nativeMessaging]
 */
export function sendPixelRequest(pixelName, params = {}, nativeMessaging = undefined) {
    console.log('sendPixelRequest', pixelName, params);

    // Pixel requests should never fire for Firefox users.
    if (BUILD_TARGET === 'firefox') {
        return;
    }

    if (BUILD_TARGET === 'embedded') {
        if (nativeMessaging) {
            nativeMessaging.notify('sendPixel', {
                pixelName,
                params,
            });
        }
        return;
    }

    const browserName = getBrowserName() || 'unknown';

    const randomNum = Math.ceil(Math.random() * 1e7);
    const searchParams = new URLSearchParams(Object.entries(params));
    const url = getURL(`${pixelName}_extension_${browserName}`) + `?${randomNum}&${searchParams.toString()}`;
    return load.url(url);
}
