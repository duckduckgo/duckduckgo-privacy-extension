import { getDataKeySync } from './utils'
import Seedrandom from 'seedrandom'

export function computeOffScreenCanvas (canvas, domainKey, sessionKey, getImageDataProxy) {
    const ctx = canvas.getContext('2d')
    // We *always* compute the random pixels on the complete pixel set, then pass back the subset later
    let imageData = getImageDataProxy._native.apply(ctx, [0, 0, canvas.width, canvas.height])
    imageData = modifyPixelData(imageData, sessionKey, domainKey, canvas.width)

    // Make a off-screen canvas and put the data there
    const offScreenCanvas = document.createElement('canvas')
    offScreenCanvas.width = canvas.width
    offScreenCanvas.height = canvas.height
    const offScreenCtx = offScreenCanvas.getContext('2d')
    offScreenCtx.putImageData(imageData, 0, 0)

    return { offScreenCanvas, offScreenCtx }
}

export function modifyPixelData (imageData, domainKey, sessionKey, width) {
    const d = imageData.data
    const length = d.length / 4
    let checkSum = 0
    const mappingArray = []
    for (let i = 0; i < length; i += 4) {
        if (!shouldIgnorePixel(d, i) && !adjacentSame(d, i, width)) {
            mappingArray.push(i)
            checkSum += d[i] + d[i + 1] + d[i + 2] + d[i + 3]
        }
    }

    const windowHash = getDataKeySync(sessionKey, domainKey, checkSum)
    const rng = new Seedrandom(windowHash)
    for (let i = 0; i < mappingArray.length; i++) {
        const rand = rng()
        const byte = Math.floor(rand * 10)
        const channel = byte % 3
        const pixelCanvasIndex = mappingArray[i] + channel

        d[pixelCanvasIndex] = d[pixelCanvasIndex] ^ (byte & 0x1)
    }

    return imageData
}

// Ignore pixels that have neighbours that are the same
function adjacentSame (d, i, width) {
    const widthPixel = width * 4
    const x = i % widthPixel
    const maxLength = d.length

    if (x < widthPixel) {
        const right = i + 4
        if (!pixelsSame(d, i, right)) {
            return false
        }
        const diagonalRightUp = right - widthPixel
        if (diagonalRightUp > 0 && !pixelsSame(d, i, diagonalRightUp)) {
            return false
        }
        const diagonalRightDown = right + widthPixel
        if (diagonalRightDown < maxLength && !pixelsSame(d, i, diagonalRightDown)) {
            return false
        }
    }

    if (x > 0) {
        const left = i - 4
        if (!pixelsSame(d, i, left)) {
            return false
        }
        const diagonalLeftUp = left - widthPixel
        if (diagonalLeftUp > 0 && !pixelsSame(d, i, diagonalLeftUp)) {
            return false
        }
        const diagonalLeftDown = left + widthPixel
        if (diagonalLeftDown < maxLength && !pixelsSame(d, i, diagonalLeftDown)) {
            return false
        }
    }

    const up = i - widthPixel
    if (up > 0 && !pixelsSame(d, i, up)) {
        return false
    }

    const down = i + widthPixel
    if (down < maxLength && !pixelsSame(d, i, down)) {
        return false
    }

    return true
}

// Check that a pixel at i and j match all channels
function pixelsSame (d, i, j) {
    return d[i] === d[j] &&
           d[i + 1] === d[j + 1] &&
           d[i + 2] === d[j + 2] &&
           d[i + 3] === d[j + 3]
}

function shouldIgnorePixel (d, i) {
    // Transparent pixels
    if (d[i + 3] === 0) {
        return true
    }
    return false
}
