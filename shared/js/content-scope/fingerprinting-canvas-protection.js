import { DDGProxy, DDGReflect, getDataKeySync } from './utils'
import { computeOffScreenCanvas } from './canvas'

export function init (args) {
    const { sessionKey, site } = args
    const domainKey = site.domain
    const featureName = 'fingerprinting-canvas'

    const unsafeCanvases = new WeakSet()
    const canvasMetadata = new WeakMap()
    const canvasCache = new WeakMap()

    function updateHash (canvas, args) {
        // Add support for other data types like image and ImageData.
        const stringified = JSON.stringify(args)
        const existingHash = canvasMetadata.get(canvas) || ''
        const newHash = getDataKeySync(sessionKey, domainKey, existingHash + stringified)
        canvasMetadata.set(canvas, newHash)
        // Clear cache as canvas has changed
        canvasCache.delete(canvas)
    }

    // if (args.debug) {
    // Debugging of canvas methods
    const debuggingMethods = ['putImageData', 'drawImage']
    for (const methodName of debuggingMethods) {
        const debuggingProxy = new DDGProxy(featureName, CanvasRenderingContext2D.prototype, methodName, {
            apply (target, thisArg, args) {
                updateHash(thisArg.canvas, args)
                return DDGReflect.apply(target, thisArg, args)
            }
        })
        debuggingProxy.overload()
    }
    // }

    // Include all these: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
    // Or overload the parent object and make an allow list of the put and draw calls only?
    const unsafeMethods = [
        'rect',
        'fill',
        'stroke',
        'lineTo',
        'beginPath',
        'closePath',
        'arc',
        'fillText',
        'fillRect',
        'strokeText',
        'createConicGradient',
        'createLinearGradient',
        'createRadialGradient',
        'createPattern'
    ]
    for (const methodName of unsafeMethods) {
        const unsafeProxy = new DDGProxy(featureName, CanvasRenderingContext2D.prototype, methodName, {
            apply (target, thisArg, args) {
                unsafeCanvases.add(thisArg.canvas)
                updateHash(thisArg.canvas, args)
                return DDGReflect.apply(target, thisArg, args)
            }
        })
        unsafeProxy.overload()
    }

    // Using proxies here to swallow calls to toString etc
    const getImageDataProxy = new DDGProxy(featureName, CanvasRenderingContext2D.prototype, 'getImageData', {
        apply (target, thisArg, args) {
            if (!unsafeCanvases.has(thisArg.canvas)) {
                return DDGReflect.apply(target, thisArg, args)
            }
            // Anything we do here should be caught and ignored silently
            try {
                const { offScreenCtx } = getCachedOffScreenCanvasOrCompute(thisArg.canvas, domainKey, sessionKey, getImageDataProxy)
                // Call the original method on the modified off-screen canvas
                return DDGReflect.apply(target, offScreenCtx, args)
            } catch {
            }

            return DDGReflect.apply(target, thisArg, args)
        }
    })
    getImageDataProxy.overload()

    // Get cached offscreen if one exists, otherwise compute one
    function getCachedOffScreenCanvasOrCompute (canvas, domainKey, sessionKey, getImageDataProxy) {
        let result
        if (canvasCache.has(canvas)) {
            result = canvasCache.get(canvas)
        } else {
            const canvasKey = canvasMetadata.get(canvas) || ''
            result = computeOffScreenCanvas(canvas, domainKey, sessionKey, getImageDataProxy, canvasKey)
            canvasCache.set(canvas, result)
        }
        return result
    }

    const canvasMethods = ['toDataURL', 'toBlob']
    for (const methodName of canvasMethods) {
        const proxy = new DDGProxy(featureName, HTMLCanvasElement.prototype, methodName, {
            apply (target, thisArg, args) {
                // Short circuit for low risk canvas calls
                if (!unsafeCanvases.has(thisArg)) {
                    return DDGReflect.apply(target, thisArg, args)
                }
                try {
                    const { offScreenCanvas } = getCachedOffScreenCanvasOrCompute(thisArg, domainKey, sessionKey, getImageDataProxy)
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
