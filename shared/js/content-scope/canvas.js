import { iterateDataKey, getDataKeySync } from './utils'

export function computeOffScreenCanvas (canvas, domainKey, sessionKey, getImageDataProxy) {
    const ctx = canvas.getContext('2d')
    // We *always* compute the random pixels on the complete pixel set, then pass back the subset later
    let imageData = getImageDataProxy._native.apply(ctx, [0, 0, canvas.width, canvas.height])
    imageData = modifyPixelData(imageData, sessionKey, domainKey)

    // Make a off-screen canvas and put the data there
    const offScreenCanvas = document.createElement('canvas')
    offScreenCanvas.width = canvas.width
    offScreenCanvas.height = canvas.height
    const offScreenCtx = offScreenCanvas.getContext('2d')
    offScreenCtx.putImageData(imageData, 0, 0)

    return { offScreenCanvas, offScreenCtx }
}

export function modifyPixelData (imageData, domainKey, sessionKey) {
    const length = imageData.data.length / 4
    const hitMinimum = 50
    const hitMax = 500
    const windowSize = 2000
    const windows = Math.ceil(length / windowSize)
    const remainder = length % windowSize
    for (let windowNumber = 0; windowNumber < windows; windowNumber++) {
        const windowStartIndex = windowNumber * windowSize
        let windowLength = windowSize
        if (windowNumber === windows - 1) {
            windowLength = remainder
        }
        const checksum = getChecksum(imageData.data, windowStartIndex, windowStartIndex + windowLength)
        const windowHash = getDataKeySync(sessionKey, domainKey, checksum + windowNumber)

        let hits = 0
        iterateDataKey(windowHash, (item, byte) => {
            const channel = byte % 3
            const lookupId = item % windowLength
            const pixelCanvasIndex = windowStartIndex + lookupId + channel
            const d = imageData.data

            if (d[pixelCanvasIndex + 1] === 0 && d[pixelCanvasIndex + 2] === 0) {
                // Ignore non blank pixels there is high chance compression ignores them
                if (d[pixelCanvasIndex] === 0 && d[pixelCanvasIndex + 3] === 0) {
                    return
                }
                // Ignore phaser background
                if (d[pixelCanvasIndex] === 255 && d[pixelCanvasIndex + 3] === 255) {
                    return
                }
            }

            ++hits
            imageData.data[pixelCanvasIndex] = imageData.data[pixelCanvasIndex] ^ (byte & 0x1)
        })

        if (hits < hitMinimum) {
            // Do additional work as this window didn't hit enough pixels
            const lookupIds = produceFilterMap(imageData.data, windowStartIndex, windowStartIndex + windowLength)
            if (lookupIds.length) {
                iterateDataKey(windowHash, (item, byte) => {
                    ++hits
                    const channel = byte % 3
                    const lookupId = item % lookupIds.length
                    const pixelCanvasIndex = lookupIds[lookupId] + channel
                    imageData.data[pixelCanvasIndex] = imageData.data[pixelCanvasIndex] ^ (byte & 0x1)
                    if (hits >= hitMax) {
                        return null
                    }
                })
            }
        }
    }

    return imageData
}

function getChecksum (d, start, end) {
    let checkSum = 0;
    for (let i = start; i < end; i += 4) {
        checkSum += d[i] + d[i + 1] + d[i + 2] + d[i + 3]
    }
    return checkSum
}

function produceFilterMap (d, start, end) {
    const arr = []
    // Create an array of only pixels that have data in them
    for (let i = start; i < end; i += 4) {
        // Blank Blue and Green color
        if (d[i + 1] === 0 && d[i + 2] === 0) {
            // Ignore non blank pixels there is high chance compression ignores them
            if (d[i] === 0 && d[i + 3] === 0) {
                continue
            }
            // Ignore phaser background
            if (d[i] === 255 && d[i + 3] === 255) {
                continue
            }
        }
        arr.push(i)
    }
    return arr
}
