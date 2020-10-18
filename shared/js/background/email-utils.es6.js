const {getSetting, updateSetting} = require('./settings.es6')
const REFETCH_ALIAS_ALARM = 'refetchAlias'

// Keep track of the number of attempted fetches. Stop trying after 5.
let attempts = 1

const fetchAlias = () => {
    // if another fetch was previously scheduled, clear that and execute now
    chrome.alarms.get(REFETCH_ALIAS_ALARM, () => chrome.alarms.clear(REFETCH_ALIAS_ALARM))

    const userData = getSetting('userData')

    if (!userData.token) return

    return fetch(`https://quackdev.duckduckgo.com/api/email/addresses`, {
        method: 'post',
        headers: {Authorization: `Bearer ${userData.token}`}
    })
        .then(response => {
            if (response.ok) {
                return response.json().then(({address}) => {
                    updateSetting('userData', Object.assign(userData, {nextAlias: `${address}@duck.com`}))
                    // Reset attempts
                    attempts = 1
                    return {success: true}
                })
            } else {
                throw new Error('An error occurred while fetching the alias')
            }
        })
        .catch(e => {
            // TODO: Do we want to logout if the error is a 401 unauthorized?
            console.log('Error fetching new alias', e)
            // Don't try fetching more than 5 times in a row
            if (attempts < 5) {
                chrome.alarms.create(REFETCH_ALIAS_ALARM, {delayInMinutes: 2})
                attempts++
            }
            // Return the error so we can handle it
            return {error: e}
        })
}

module.exports = {
    REFETCH_ALIAS_ALARM,
    fetchAlias
}
