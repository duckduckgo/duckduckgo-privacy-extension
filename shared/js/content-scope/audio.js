import { shouldExemptMethod, iterateDataKey, DDGProxy, DDGReflect } from "./utils";

export function initAudioProtection (args) {
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

