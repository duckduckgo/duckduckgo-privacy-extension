const puppeteer = require('puppeteer')

let Grade = require('../src/classes/grade')
let grade

const handleRequest = (request) => {
    let url = request.url()

    // fake some tracker blocking for now
    if (url.indexOf('doubleclick.net') > -1) {
        console.log(`blocking: ${url}`)
        grade.update({
            trackerBlocked: {
                parentCompany: 'google',
                url
            }
        })
        request.abort()
    } else {
        request.continue()
    }
}

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox']
    })
    const page = await browser.newPage()

    await page.setRequestInterception(true)
    page.on('request', handleRequest)

    grade = new Grade('', 'theguardian.com')

    await page.goto('http://theguardian.com')

    console.log(`grade is: ${JSON.stringify(grade.get())}`)

    await browser.close()
})()
