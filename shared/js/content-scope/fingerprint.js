/* global sjcl */
function getCanvasKeySync (sessionKey, domainKey, inputData) {
    // eslint-disable-next-line new-cap
    const hmac = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(sessionKey + domainKey), sjcl.hash.sha256)
    return sjcl.codec.hex.fromBits(hmac.encrypt(inputData))
}

// linear feedback shift register to find a random approximation
function nextRandom (v) {
    return Math.abs((v >> 1) | (((v << 62) ^ (v << 61)) & (~(~0 << 63) << 62)))
}

const exemptionList = []

function shouldExemptUrl (url) {
    for (const regex of exemptionList) {
        if (regex.test(url)) {
            return true
        }
    }
    return false
}

function initExemptionList (stringExemptionList) {
    for (const stringExemption of stringExemptionList) {
        exemptionList.push(new RegExp(stringExemption))
    }
}

// Checks the stack trace if there are known libraries that are broken.
function shouldExemptMethod () {
    try {
        const errorLines = new Error().stack.split('\n')
        const errorFiles = new Set()
        // Should cater for Chrome and Firefox stacks, we only care about https? resources.
        const lineTest = /(\()?(http[^)]+):[0-9]+:[0-9]+(\))?/
        for (const line of errorLines) {
            const res = line.match(lineTest)
            if (res) {
                const path = res[2]
                // checked already
                if (errorFiles.has(path)) {
                    continue
                }
                if (shouldExemptUrl(path)) {
                    return true
                }
                errorFiles.add(res[2])
            }
        }
    } catch (e) {
        // Fall through
    }
    return false
}

function modifyPixelData (imageData, domainKey, sessionKey) {
    const arr = []
    // We calculate a checksum as passing imageData as a key is too slow.
    // We might want to do something more pseudo random that is less observable through timing attacks and collisions (but this will come at a performance cost)
    let checkSum = 0
    // Create an array of only pixels that have data in them
    for (let i = 0; i < imageData.data.length; i++) {
        const d = imageData.data.subarray(i, i + 4)
        // Ignore non blank pixels there is high chance compression ignores them
        const sum = d[0] + d[1] + d[2] + d[3]
        if (sum !== 0) {
            checkSum += sum
            arr.push(i)
        }
    }

    const canvasKey = getCanvasKeySync(sessionKey, domainKey, checkSum)
    let pixel = canvasKey.charCodeAt(0)
    const length = arr.length
    for (const i in canvasKey) {
        let byte = canvasKey.charCodeAt(i)
        for (let j = 8; j >= 0; j--) {
            const channel = byte % 3
            const lookupId = pixel % length
            const pixelCanvasIndex = arr[lookupId] + channel

            imageData.data[pixelCanvasIndex] = imageData.data[pixelCanvasIndex] ^ (byte & 0x1)

            // find next pixel to perturb
            pixel = nextRandom(pixel)

            // Right shift as we use the least significant bit of it
            byte = byte >> 1
        }
    }
    return imageData
}

// eslint-disable-next-line no-unused-vars
function initCanvasProtection (args) {
    const { sessionKey, stringExemptionList, site } = args
    initExemptionList(stringExemptionList)
    const domainKey = site.domain

    // Using proxies here to swallow calls to toString etc
    const getImageDataProxy = new Proxy(CanvasRenderingContext2D.prototype.getImageData, {
        apply (target, thisArg, args) {
            // The normal return value
            const imageData = target.apply(thisArg, args)
            if (shouldExemptMethod()) {
                return imageData
            }
            // Anything we do here should be caught and ignored silently
            try {
                return modifyPixelData(imageData, sessionKey, domainKey)
            } catch (e) {
            }
            return imageData
        }
    })
    CanvasRenderingContext2D.prototype.getImageData = getImageDataProxy

    const canvasMethods = ['toDataURL', 'toBlob']
    for (const methodName of canvasMethods) {
        const methodProxy = new Proxy(HTMLCanvasElement.prototype[methodName], {
            apply (target, thisArg, args) {
                if (shouldExemptMethod()) {
                    return target.apply(thisArg, args)
                }
                try {
                    const ctx = thisArg.getContext('2d')
                    const imageData = ctx.getImageData(0, 0, thisArg.width, thisArg.height)

                    // Make a off-screen canvas and put the data there
                    const offScreenCanvas = document.createElement('canvas')
                    offScreenCanvas.width = thisArg.width
                    offScreenCanvas.height = thisArg.height
                    const offScreenCtx = offScreenCanvas.getContext('2d')
                    offScreenCtx.putImageData(imageData, 0, 0)

                    // Call the original method on the modified off-screen canvas
                    return target.apply(offScreenCanvas, args)
                } catch (e) {
                    // Something we did caused an exception, fall back to the native
                    return target.apply(thisArg, args)
                }
            }
        })
        HTMLCanvasElement.prototype[methodName] = methodProxy
    }
}
