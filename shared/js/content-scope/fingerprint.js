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
    let errorLines = new Error().stack.split('\n')
    let errorFiles = new Set()
    // Should cater for Chrome and Firefox stacks, we only care about https? resources.
    let lineTest = /(\()?(http[^)]+):[0-9]+:[0-9]+(\))?/
    for (let line of errorLines) {
        // console.log("line", line, line.match(lineTest));
        let res = line.match(lineTest)
        if (res) {
            let path = res[2]
            // checked already
            if (errorFiles.has(path)) {
                continue
            }
            if (shouldExemptUrl(path)) {
                console.log('Exempting script path:', path)
                return true
            }
            errorFiles.add(res[2])
        }
    }
    return false
}

// eslint-disable-next-line no-unused-vars
function initCanvasProtection (args) {
    let { sessionKey, stringExemptionList, site } = args
    initExemptionList(stringExemptionList)
    const domainKey = site.domain
    const _getImageData = CanvasRenderingContext2D.prototype.getImageData
    function getImageData () {
        if (shouldExemptMethod()) {
            return _getImageData.apply(this, arguments)
        }
        let imageData = _getImageData.apply(this, arguments)
        let canvasKey = getCanvasKeySync(sessionKey, domainKey, imageData)
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
            if (shouldExemptMethod()) {
                return _method.apply(this, arguments)
            }
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
