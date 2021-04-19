/**
 * Inject all the overwrites into the page.
 */
function inject (code) {
    const elem = document.head || document.documentElement
    // Inject into main page
    try {
        const e = document.createElement('script')
        e.textContent = `(() => {
            ${code}
        })();`
        elem.appendChild(e)
        e.remove()
    } catch (e) {
    }
}

inject()

function randomString () {
    const num = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
    return num.toString().replace('0.', '')
}

function init () {
    const randomMethodName = '_d' + randomString()
    const randomPassword = '_p' + randomString()
    const initialScript = `
      /* global protections */
      // Define a random function we call later.
      // Use define property so isn't enumerable
      Object.defineProperty(window, '${randomMethodName}', {
          enumerable: false,
          // configurable, To allow for deletion later
          configurable: true,
          writable: false,
          // Use proxy to ensure stringification isn't possible
          value: new Proxy(function () {}, {
              apply(target, thisArg, args) {
                  if ('${randomPassword}' === args[0]) {
                      protections.initProtection(args[1])
                  } else {
                      // TODO force enable all protections if password is wrong
                      console.error("Password for hidden function wasn't correct! The page is likely attempting to attack the protections by DuckDuckGo");
                  }
                  delete window.${randomMethodName};
              }
          })
      });
    `
    inject(initialScript)

    chrome.runtime.sendMessage({ registeredContentScript: true },
        (message) => {
            const stringifiedArgs = JSON.stringify(message)
            const callRandomFunction = `
            window.${randomMethodName}('${randomPassword}', ${stringifiedArgs});
          `
            inject(callRandomFunction)
        }
    )
}

init()
