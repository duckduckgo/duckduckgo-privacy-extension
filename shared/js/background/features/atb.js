import ATB from '../atb'
import settings from '../settings'
import { getManifestVersion, setUninstallURL } from '../wrapper'

async function init () {
    await settings.ready()
    setUninstallURL(await ATB.getSurveyURL())
}

async function onInstalled () {
    // await ATB.updateATBValues()
    // await ATB.openPostInstallPage()
    // onUpdated()
}

async function onUpdated () {
    if (getManifestVersion() === 3) {
        // create ATB rule if there is a stored value in settings
        // ATB.setOrUpdateATBdnrRule(settings.getSetting('atb'))
    }
}

export default {
    init, onInstalled, onUpdated
}
