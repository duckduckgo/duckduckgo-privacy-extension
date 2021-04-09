/* global sjcl */
function getDataKeySync (sessionKey, domainKey, inputData) {
    // eslint-disable-next-line new-cap
    const hmac = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(sessionKey + domainKey), sjcl.hash.sha256)
    return sjcl.codec.hex.fromBits(hmac.encrypt(inputData))
}

// linear feedback shift register to find a random approximation
function nextRandom (v) {
    return Math.abs((v >> 1) | (((v << 62) ^ (v << 61)) & (~(~0 << 63) << 62)))
}

const exemptionLists = {}

function shouldExemptUrl (type, url) {
    for (const regex of exemptionLists[type]) {
        if (regex.test(url)) {
            return true
        }
    }
    return false
}

// eslint-disable-next-line no-unused-vars
function initStringExemptionLists (args) {
    const { stringExemptionLists } = args
    for (const type in stringExemptionLists) {
        exemptionLists[type] = []
        for (const stringExemption of stringExemptionLists[type]) {
            exemptionLists[type].push(new RegExp(stringExemption))
        }
    }
}

// Checks the stack trace if there are known libraries that are broken.
function shouldExemptMethod (type) {
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
                if (shouldExemptUrl(type, path)) {
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

// Iterate through the key, passing an item index and a byte to be modified
function iterateDataKey (key, callback) {
    let item = key.charCodeAt(0)
    for (const i in key) {
        let byte = key.charCodeAt(i)
        for (let j = 8; j >= 0; j--) {
            callback(item, byte)

            // find next item to perturb
            item = nextRandom(item)

            // Right shift as we use the least significant bit of it
            byte = byte >> 1
        }
    }
}

// eslint-disable-next-line no-unused-vars
function initCanvasProtection (args) {
    const { sessionKey, site } = args
    const domainKey = site.domain

    const _getImageData = CanvasRenderingContext2D.prototype.getImageData
    function computeOffScreenCanvas (canvas) {
        const ctx = canvas.getContext('2d')
        // We *always* compute the random pixels on the complete pixel set, then pass back the subset later
        let imageData = _getImageData.apply(ctx, [0, 0, canvas.width, canvas.height])
        imageData = modifyPixelData(imageData, sessionKey, domainKey)

        // Make a off-screen canvas and put the data there
        const offScreenCanvas = document.createElement('canvas')
        offScreenCanvas.width = canvas.width
        offScreenCanvas.height = canvas.height
        const offScreenCtx = offScreenCanvas.getContext('2d')
        offScreenCtx.putImageData(imageData, 0, 0)

        return { offScreenCanvas, offScreenCtx }
    }

    function modifyPixelData (imageData, domainKey, sessionKey) {
        const arr = []
        // We calculate a checksum as passing imageData as a key is too slow.
        // We might want to do something more pseudo random that is less observable through timing attacks and collisions (but this will come at a performance cost)
        let checkSum = 0
        // Create an array of only pixels that have data in them
        const d = imageData.data
        for (let i = 0; i < d.length; i += 4) {
            // Ignore non blank pixels there is high chance compression ignores them
            const sum = d[i] + d[i + 1] + d[i + 2] + d[i + 3]
            if (sum !== 0) {
                checkSum += sum
                arr.push(i)
            }
        }

        const canvasKey = getDataKeySync(sessionKey, domainKey, checkSum)
        const length = arr.length
        iterateDataKey(canvasKey, (item, byte) => {
            const channel = byte % 3
            const lookupId = item % length
            const pixelCanvasIndex = arr[lookupId] + channel

            imageData.data[pixelCanvasIndex] = imageData.data[pixelCanvasIndex] ^ (byte & 0x1)
        })

        return imageData
    }

    // Using proxies here to swallow calls to toString etc
    const getImageDataProxy = new Proxy(_getImageData, {
        apply (target, thisArg, args) {
            // The normal return value
            if (shouldExemptMethod('canvas')) {
                const imageData = target.apply(thisArg, args)
                return imageData
            }
            // Anything we do here should be caught and ignored silently
            try {
                const { offScreenCtx } = computeOffScreenCanvas(thisArg.canvas)
                // Call the original method on the modified off-screen canvas
                return target.apply(offScreenCtx, args)
            } catch {
            }

            const imageData = target.apply(thisArg, args)
            return imageData
        }
    })
    CanvasRenderingContext2D.prototype.getImageData = getImageDataProxy

    const canvasMethods = ['toDataURL', 'toBlob']
    for (const methodName of canvasMethods) {
        const methodProxy = new Proxy(HTMLCanvasElement.prototype[methodName], {
            apply (target, thisArg, args) {
                if (shouldExemptMethod('canvas')) {
                    return target.apply(thisArg, args)
                }
                try {
                    const { offScreenCanvas } = computeOffScreenCanvas(thisArg)
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

// eslint-disable-next-line no-unused-vars
function initAudioProtection (args) {
    const { sessionKey, site } = args
    const domainKey = site.domain

    // In place modify array data to remove fingerprinting
    function transformArrayData (channelData, domainKey, sessionKey, thisArg) {
        let { audioKey } = getCachedResponse(thisArg, args)
        if (!audioKey) {
            const cdSum = channelData.reduce((sum, v) => {
                return sum + v
            }, 0)
            audioKey = getDataKeySync(sessionKey, domainKey, cdSum)
            setCache(thisArg, args, audioKey)
        }
        iterateDataKey(audioKey, (item, byte) => {
            const itemAudioIndex = item % channelData.length

            let factor = byte * 0.0000001
            if (byte ^ 0x1) {
                factor = 0 - factor
            }
            channelData[itemAudioIndex] = channelData[itemAudioIndex] + factor
        })
    }

    AudioBuffer.prototype.copyFromChannel = new Proxy(AudioBuffer.prototype.copyFromChannel, {
        apply (target, thisArg, args) {
            const [source, channelNumber, startInChannel] = args
            // This is implemented in a different way to canvas purely because calling the function copied the original value, which is not ideal
            if (shouldExemptMethod('audio') ||
                // If channelNumber is longer than arrayBuffer number of channels then call the default method to throw
                channelNumber > thisArg.numberOfChannels ||
                // If startInChannel is longer than the arrayBuffer length then call the default method to throw
                startInChannel > thisArg.length) {
                // The normal return value
                return target.apply(thisArg, args)
            }
            try {
                // Call the protected getChannelData we implement, slice from the startInChannel value and assign to the source array
                thisArg.getChannelData(channelNumber).slice(startInChannel).forEach((val, index) => {
                    source[index] = val
                })
            } catch {
                return target.apply(thisArg, args)
            }
        }
    })

    const cacheExpiry = 60
    const cacheData = new WeakMap()
    function getCachedResponse (thisArg, args) {
        const data = cacheData.get(thisArg)
        const timeNow = Date.now()
        if (data &&
            data.args === JSON.stringify(args) &&
            data.expires > timeNow) {
            data.expires = timeNow + cacheExpiry
            cacheData.set(thisArg, data)
            return data
        }
        return { audioKey: null }
    }

    function setCache (thisArg, args, audioKey) {
        cacheData.set(thisArg, { args: JSON.stringify(args), expires: Date.now() + cacheExpiry, audioKey })
    }

    AudioBuffer.prototype.getChannelData = new Proxy(AudioBuffer.prototype.getChannelData, {
        apply (target, thisArg, args) {
            // The normal return value
            const channelData = target.apply(thisArg, args)
            if (shouldExemptMethod('audio')) {
                return channelData
            }
            // Anything we do here should be caught and ignored silently
            try {
                transformArrayData(channelData, domainKey, sessionKey, thisArg, args)
            } catch {
            }
            return channelData
        }
    })

    const audioMethods = ['getByteTimeDomainData', 'getFloatTimeDomainData', 'getByteFrequencyData', 'getFloatFrequencyData']
    for (const methodName of audioMethods) {
        AnalyserNode.prototype[methodName] = new Proxy(AnalyserNode.prototype[methodName], {
            apply (target, thisArg, args) {
                target.apply(thisArg, args)
                if (shouldExemptMethod('audio')) {
                    return
                }
                // Anything we do here should be caught and ignored silently
                try {
                    transformArrayData(args[0], domainKey, sessionKey, thisArg, args)
                } catch {
                }
            }
        })
    }
}
