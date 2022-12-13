export function getURL (pixelName) {
    if (!pixelName) throw new Error('pixelName is required')

    const url = 'https://improving.duckduckgo.com/t/'
    return url + pixelName
}
