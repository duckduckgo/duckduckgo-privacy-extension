// Access the original setter (needed to bypass React's implementation on mobile)
const originalSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set

// This ensures that the value is set properly and dispatches events to simulate a real user action
const setValue = (el, val) => {
    el.focus()
    originalSet.call(el, val)
    const ev = new Event('input', {bubbles: true})
    el.dispatchEvent(ev)
    el.blur()
}

module.exports = { setValue }
