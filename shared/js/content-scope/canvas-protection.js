import { shouldExemptMethod, iterateDataKey, DDGProxy, DDGReflect, getDataKeySync } from './utils'

export function init (args) {
    const { sessionKey, site } = args
    const domainKey = site.domain

    // Using proxies here to swallow calls to toString etc
    const getImageDataProxy = new DDGProxy(CanvasRenderingContext2D.prototype, 'getImageData', {
        apply (target, thisArg, args) {
            // The normal return value
            if (shouldExemptMethod('canvas')) {
                return DDGReflect.apply(target, thisArg, args)
            }
            // Anything we do here should be caught and ignored silently
            try {
                const { offScreenCtx } = computeOffScreenCanvas(thisArg.canvas)
                // Call the original method on the modified off-screen canvas
                return DDGReflect.apply(target, offScreenCtx, args)
            } catch {
            }

            return DDGReflect.apply(target, thisArg, args)
        }
    })
    getImageDataProxy.overload()

    function computeOffScreenCanvas (canvas) {
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

    const canvasMethods = ['toDataURL', 'toBlob']
    for (const methodName of canvasMethods) {
        const proxy = new DDGProxy(HTMLCanvasElement.prototype, methodName, {
            apply (target, thisArg, args) {
                if (shouldExemptMethod('canvas')) {
                    return DDGReflect.apply(target, thisArg, args)
                }
                try {
                    const { offScreenCanvas } = computeOffScreenCanvas(thisArg)
                    // Call the original method on the modified off-screen canvas
                    return DDGReflect.apply(target, offScreenCanvas, args)
                } catch {
                    // Something we did caused an exception, fall back to the native
                    return DDGReflect.apply(target, thisArg, args)
                }
            }
        })
        proxy.overload()
    }
}
