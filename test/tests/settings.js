let settings = bkg.settings.getSetting()
const settingsToShow = ['blocking', 'ddgWhitelist', 'ddgWhitelist-etag']
let elements = []

let output = '<h2>Settings</h2><table><th>Name</th><th>Value</th>'
for(let setting in settings) {
    let value = JSON.stringify(settings[setting])
    output += `<tr><td>${setting}</td><td><input type='text' id=${setting} value='${value}'></td></tr>`
    elements.push(setting)
}

output += '</table>'

$('#settings').append(output)

elements.forEach((element) => {
    let el = `#${element}`
    $(el).change(() => {
        let name = element
        bkg.settings.updateSetting(name, JSON.parse($(el).val()))
        $(el).addClass('saved')
        window.setInterval(() => $(el).removeClass('saved'), 500)
    });
})
