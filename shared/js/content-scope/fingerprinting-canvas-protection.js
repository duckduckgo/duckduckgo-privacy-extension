import { DDGProxy, DDGReflect } from './utils'
import { computeOffScreenCanvas } from './canvas'

export function init (args) {
    const { sessionKey, site } = args
    const domainKey = site.domain
    const featureName = 'fingerprinting-canvas'

    if (args.debug) {
        // Debugging of canvas methods
        const debuggingMethods = ['putImageData', 'drawImage']
        for (const methodName of debuggingMethods) {
            const debuggingProxy = new DDGProxy(featureName, CanvasRenderingContext2D.prototype, methodName, {
                apply (target, thisArg, args) {
                    return DDGReflect.apply(target, thisArg, args)
                }
            })
            debuggingProxy.overload()
        }
    }

    // Using proxies here to swallow calls to toString etc
    const getImageDataProxy = new DDGProxy(featureName, CanvasRenderingContext2D.prototype, 'getImageData', {
        apply (target, thisArg, args) {
            // Anything we do here should be caught and ignored silently
            try {
                const { offScreenCtx } = computeOffScreenCanvas(thisArg.canvas, domainKey, sessionKey, getImageDataProxy)
                // Call the original method on the modified off-screen canvas
                return DDGReflect.apply(target, offScreenCtx, args)
            } catch {
            }

            return DDGReflect.apply(target, thisArg, args)
        }
    })
    getImageDataProxy.overload()

    const canvasMethods = ['toDataURL', 'toBlob']
    for (const methodName of canvasMethods) {
        const proxy = new DDGProxy(featureName, HTMLCanvasElement.prototype, methodName, {
            apply (target, thisArg, args) {
                try {
                    const { offScreenCanvas } = computeOffScreenCanvas(thisArg, domainKey, sessionKey, getImageDataProxy)
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
