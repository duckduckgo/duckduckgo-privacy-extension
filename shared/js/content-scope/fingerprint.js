/* global sjcl */
function getCanvasKeySync (sessionKey, domainKey, inputData) {
    // eslint-disable-next-line new-cap
    let hmac = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(sessionKey + domainKey), sjcl.hash.sha256)
    return sjcl.codec.hex.fromBits(hmac.encrypt(inputData))
}

// linear feedback shift register to find a random approximation
function nextRandom (v) {
    return Math.abs((v >> 1) | (((v << 62) ^ (v << 61)) & (~(~0 << 63) << 62)))
}

let exemptionList = []

function shouldExemptUrl (url) {
    for (let regex of exemptionList) {
        if (regex.test(url)) {
            return true
        }
    }
    return false
}

function initExemptionList (stringExemptionList) {
    for (let stringExemption of stringExemptionList) {
        exemptionList.push(new RegExp(stringExemption))
    }
}

// Checks the stack trace if there are known libraries that are broken.
function shouldExemptMethod () {
    try {
        let errorLines = new Error().stack.split('\n')
        let errorFiles = new Set()
        // Should cater for Chrome and Firefox stacks, we only care about https? resources.
        let lineTest = /(\()?(http[^)]+):[0-9]+:[0-9]+(\))?/
        for (let line of errorLines) {
            let res = line.match(lineTest)
            if (res) {
                let path = res[2]
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
    } catch {
        // Fall through
    }
    return false
}

// eslint-disable-next-line no-unused-vars
function initCanvasProtection (args) {
    let { sessionKey, stringExemptionList, site } = args
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
                const canvasKey = getCanvasKeySync(sessionKey, domainKey, imageData)
                let pixel = canvasKey[0]
                for (let i in canvasKey) {
                    let byte = canvasKey[i]
                    for (let j = 8; j >= 0; j--) {
                        let pixelCanvasIndex = pixel % imageData.data.length

                        imageData.data[pixelCanvasIndex] = imageData.data[pixelCanvasIndex] ^ (byte & 0x1)
                        // find next pixel to perturb
                        pixel = nextRandom(pixel)

                        // Right shift as we use the least significant bit of it
                        byte = byte >> 1
                    }
                }
            } catch {
            }
            return imageData
        }
    })
    CanvasRenderingContext2D.prototype.getImageData = getImageDataProxy

    let canvasMethods = ['toDataURL', 'toBlob']
    for (let methodName of canvasMethods) {
        const methodProxy = new Proxy(HTMLCanvasElement.prototype[methodName], {
            apply (target, thisArg, args) {
                if (shouldExemptMethod()) {
                    return target.apply(thisArg, args)
                }
                try {
                    let ctx = thisArg.getContext('2d')
                    let imageData = ctx.getImageData(0, 0, thisArg.width, thisArg.height)

                    // Make a off-screen canvas and put the data there
                    let offScreenCanvas = document.createElement('canvas')
                    offScreenCanvas.width = thisArg.width
                    offScreenCanvas.height = thisArg.height
                    let offScreenCtx = offScreenCanvas.getContext('2d')
                    offScreenCtx.putImageData(imageData, 0, 0)

                    // Call the original method on the modified off-screen canvas
                    return target.apply(offScreenCanvas, args)
                } catch {
                    // Something we did caused an exception, fall back to the native
                    return target.apply(thisArg, args)
                }
            }
        })
        HTMLCanvasElement.prototype[methodName] = methodProxy
    }
}
