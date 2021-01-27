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

// eslint-disable-next-line no-unused-vars
function initCanvasProtection (sessionKey) {
    const domainKey = window.top.location.origin
    const _getImageData = CanvasRenderingContext2D.prototype.getImageData
    function getImageData () {
        let imageData = _getImageData.apply(this, arguments)
        let canvasKey = getCanvasKeySync(sessionKey, domainKey, imageData)

        console.log({imageData, width: this.width, sessionKey, domainKey, canvasKey})

        let pixel = canvasKey[0]
        for (let i in canvasKey) {
            console.log({i, pixel})
            let byte = canvasKey[i]
            for (let j = 8; j >= 0; j--) {
                let pixelCanvasIndex = pixel % imageData.data.length

                console.log('pixel modification', {
                    bit: byte & 0x1,
                    pixelCanvasIndex,
                    id: imageData.data[pixelCanvasIndex],
                    idm: imageData.data[pixelCanvasIndex] ^ (byte & 0x1)
                })

                imageData.data[pixelCanvasIndex] = imageData.data[pixelCanvasIndex] ^ (byte & 0x1)
                // find next pixel to perturb
                pixel = nextRandom(pixel)

                // Right shift as we use the least significant bit of it
                byte = byte >> 1
            }
        }
        return imageData
    }
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'getImageData', {
        value: getImageData
    })

    // TODO hide toString
    let canvasMethods = ['toDataURL', 'toBlob']
    for (let methodName of canvasMethods) {
        let _method = HTMLCanvasElement.prototype[methodName]
        let method = function method () {
            let ctx = this.getContext('2d')
            let imageData = ctx.getImageData(0, 0, this.width, this.height)

            // Make a off-screen canvas and put the data there
            let offScreenCanvas = document.createElement('canvas')
            offScreenCanvas.width = this.width
            offScreenCanvas.height = this.height
            let offScreenCtx = offScreenCanvas.getContext('2d')
            offScreenCtx.putImageData(imageData, 0, 0)

            // Call the original method on the modified off-screen canvas
            return _method.apply(offScreenCanvas, arguments)
        }
        Object.defineProperty(HTMLCanvasElement.prototype, methodName, {
            get: method
        })
    }
}
