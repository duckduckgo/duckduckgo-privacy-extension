let settings = bkg.settings.getSetting()
let elements = []

// generate output table
let output = '<h2>Settings</h2><table><th>Name</th><th>Value</th>'
for(let setting in settings) {
    let value = JSON.stringify(settings[setting])
    output += `<tr><td>${setting}</td><td><input type='text' id=${setting} value='${value}'></td></tr>`
    elements.push(setting)
}
output += '</table>'
$('#settings').append(output)

// add on change to each element in the table
elements.forEach((element) => {
    let el = `#${element}`
    $(el).change(() => {
        let name = element
        let value
        try {
            value = JSON.parse($(el).val())
        }
        catch(e) {
            value = $(el).val()
        }

        bkg.settings.updateSetting(name,value)
        $(el).addClass('saved')
        window.setInterval(() => $(el).removeClass('saved'), 500)
    });
})

$('#reset').on('click', resetSettings)

function resetSettings () {
    for(let setting in defaultSettings) {
        bkg.settings.updateSetting(setting, defaultSettings[setting])
    }
    window.location.reload()
}
