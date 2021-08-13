import { iterateDataKey, getDataKeySync } from './utils'

export function computeOffScreenCanvas (canvas, domainKey, sessionKey, getImageDataProxy, canvasKey) {
    const ctx = canvas.getContext('2d')
    // We *always* compute the random pixels on the complete pixel set, then pass back the subset later
    let imageData = getImageDataProxy._native.apply(ctx, [0, 0, canvas.width, canvas.height])
    imageData = modifyPixelData(imageData, sessionKey, domainKey, canvasKey)

    // Make a off-screen canvas and put the data there
    const offScreenCanvas = document.createElement('canvas')
    offScreenCanvas.width = canvas.width
    offScreenCanvas.height = canvas.height
    const offScreenCtx = offScreenCanvas.getContext('2d')
    offScreenCtx.putImageData(imageData, 0, 0)

    return { offScreenCanvas, offScreenCtx }
}

export function modifyPixelData (imageData, domainKey, sessionKey, canvasKey) {
    const length = imageData.data.length / 4
    const windowSize = 1000
    let windows = Math.ceil(length / windowSize)
    let remainder = length % windowSize
    for (let windowNumber = 0; windowNumber < windows; windowNumber++) {
        let windowHash = getDataKeySync(sessionKey, domainKey, canvasKey + windowNumber)
        let windowLength = windowSize
        if (windowNumber === windows - 1) {
            windowLength = remainder
        }

        let hits = 0
        let ignored = 0
        iterateDataKey(windowHash, (item, byte) => {
            const channel = byte % 3
            const lookupId = item % windowLength
            const pixelCanvasIndex = (windowNumber * windowSize) + lookupId + channel
            const pixelData = imageData.data[pixelCanvasIndex];
            const d = imageData.data;
    
            if (d[lookupId + 1] === 0 && d[lookupId + 2] === 0) {
                // Ignore non blank pixels there is high chance compression ignores them
                if (d[lookupId] === 0 && d[lookupId + 3] === 0) {
    ++ignored
                    return
                }
                // Ignore phaser background
                if (d[lookupId] === 255 && d[lookupId + 3] === 255) {
    ++ignored
                    return
                }
            }
    
            ++hits
            imageData.data[pixelCanvasIndex] = imageData.data[pixelCanvasIndex] ^ (byte & 0x1)
        })
        if (hits < 10) {
          // DO no hot path code.
//console.log({hits, ignored, windows});
        }
    }

    return imageData
}

function produceFilterMap() {
    const arr = []
    // Create an array of only pixels that have data in them
    const d = imageData.data
    for (let i = 0; i < d.length; i += 4) {
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
    }
    const length = arr.length
}
