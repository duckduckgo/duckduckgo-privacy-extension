import lottie from 'lottie-web'
import i18n from '../ui/base/localize'

const animation = lottie.loadAnimation({
    container: document.getElementById('fire'),
    renderer: 'svg',
    loop: false,
    autoplay: true,
    path: '/data/fire-animation.json',
})
animation.addEventListener('complete', () => {
    console.log('animation complete')
    chrome.runtime.sendMessage({
        messageType: 'fireAnimationComplete',
    })
})

document.title = i18n.t('options:burnPageTitle.title')
