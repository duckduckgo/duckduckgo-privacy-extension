/* global BUILD_TARGET */
import load from './load'

/**
 *
 * Return URL for the pixel request
 * @param {string} pixelName
 * @returns {string}
 */
export function getURL (pixelName) {
    if (!pixelName) throw new Error('pixelName is required')

    const url = 'https://improving.duckduckgo.com/t/'
    return url + pixelName
}

export function sendPixelRequest (pixelName, params = {}) {
    // Pixel requests should never fire for Firefox users.
    if (BUILD_TARGET === 'firefox') {
        return
    }

    const randomNum = Math.ceil(Math.random() * 1e7)
    const searchParams = new URLSearchParams(Object.entries(params))
    const url = getURL(pixelName) + `?${randomNum}&${searchParams.toString()}`
    return load.url(url)
}
