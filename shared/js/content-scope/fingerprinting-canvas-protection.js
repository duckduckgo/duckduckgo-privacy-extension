import { DDGProxy, DDGReflect, getDataKeySync } from './utils'
import { computeOffScreenCanvas } from './canvas'

export function init (args) {
    const { sessionKey, site } = args
    const domainKey = site.domain
    const featureName = 'fingerprinting-canvas'

    const unsafeCanvases = new WeakSet()
    const canvasMetadata = new WeakMap()

    function updateHash(canvas, args) {
        // Add support for other data types like image and ImageData.
        let stringified = JSON.stringify(args);
        let existingHash = canvasMetadata.get(canvas) || ''
        let newHash = getDataKeySync(sessionKey, domainKey, existingHash + stringified)
        canvasMetadata.set(canvas, newHash)
        console.log({stringified, args, newHash, existingHash}) 
    }

    //if (args.debug) {
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
    //}


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
        'createPattern',
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
                const canvasKey = canvasMetadata.get(thisArg.canvas)
                const { offScreenCtx } = computeOffScreenCanvas(thisArg.canvas, domainKey, sessionKey, getImageDataProxy, canvasKey)
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
                // Short circuit for low risk canvas calls
                if (!unsafeCanvases.has(thisArg)) {
                    return DDGReflect.apply(target, thisArg, args)
                }
                try {
                    const canvasKey = canvasMetadata.get(thisArg) || ""
                    const { offScreenCanvas } = computeOffScreenCanvas(thisArg, domainKey, sessionKey, getImageDataProxy, canvasKey)
                    // Call the original method on the modified off-screen canvas
                    return DDGReflect.apply(target, offScreenCanvas, args)
                } catch (e) {
//console.log(e);
                    // Something we did caused an exception, fall back to the native
                    return DDGReflect.apply(target, thisArg, args)
                }
            }
        })
        proxy.overload()
    }
}
