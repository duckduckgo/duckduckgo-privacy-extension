import lottie from 'lottie-web'

const animation = lottie.loadAnimation({
    container: document.getElementById('fire'),
    renderer: 'svg',
    loop: false,
    autoplay: true,
    path: '/data/fire-animation.json'
})
animation.addEventListener('complete', () => {
    console.log('animation complete')
    chrome.runtime.sendMessage({
        messageType: 'fireAnimationComplete'
    })
})
