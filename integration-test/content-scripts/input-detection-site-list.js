const sites = [
    {
        name: 'reddit signup',
        url: 'https://www.reddit.com/register/?dest=https%3A%2F%2Fwww.reddit.com%2F',
        autofillExpected: 1
    },
    {
        name: 'reddit login',
        url: 'https://www.reddit.com/login/?dest=https%3A%2F%2Fwww.reddit.com%2F',
        autofillExpected: 0
    },
    {
        name: 'quora signup',
        url: 'https://www.quora.com/',
        actions: [{action: 'click', arg: '.signup_email_link'}],
        autofillExpected: 1
    },
    {
        name: 'quora login',
        url: 'https://www.quora.com/',
        autofillExpected: 0
    },
    {
        name: 'imdb signup',
        url: 'https://www.imdb.com/ap/register?showRememberMe=true&openid.return_to=https%3A%2F%2Fwww.imdb.com%2Fregistration%2Fap-signin-handler%2Fimdb_us&prevRID=4P4HK4MBFAQT1PV6PHAZ&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=imdb_us&openid.mode=checkid_setup&siteState=eyJvcGVuaWQuYXNzb2NfaGFuZGxlIjoiaW1kYl91cyIsInJlZGlyZWN0VG8iOiJodHRwczovL3d3dy5pbWRiLmNvbS8_cmVmXz1sb2dpbiJ9&prepopulatedLoginId=&failedSignInCount=0&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&pageId=imdb_us&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0',
        autofillExpected: 1
    },
    {
        name: 'imdb login',
        url: 'https://www.imdb.com/ap/signin?openid.return_to=https%3A%2F%2Fwww.imdb.com%2Fregistration%2Fap-signin-handler%2Fimdb_us&prevRID=67HJB7XMRSFB2KXR6NFN&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=imdb_us&openid.mode=checkid_setup&siteState=eyJvcGVuaWQuYXNzb2NfaGFuZGxlIjoiaW1kYl91cyIsInJlZGlyZWN0VG8iOiJodHRwczovL3d3dy5pbWRiLmNvbS8_cmVmXz1sb2dpbiJ9&failedSignInCount=0&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&pageId=imdb_us&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0',
        autofillExpected: 0
    },
    /* // Commented because headless Chrome does not load the page at all for some reason
    {
        name: 'ebay-kleinanzeigen signup',
        url: 'https://www.ebay-kleinanzeigen.de/m-benutzer-anmeldung.html',
        autofillExpected: 1
    },
    {
        name: 'ebay-kleinanzeigen login',
        url: 'https://www.ebay-kleinanzeigen.de/m-einloggen.html?targetUrl=/',
        autofillExpected: 0
    }, */
    /* // Disabled because the signup form is inside an iframe
    {
        name: 'cnbc signup',
        url: 'https://www.cnbc.com/world/?region=world',
        actions: [
            {action: 'reload', arg: { waitUntil: 'networkidle0' }},
            {action: 'click', arg: '.account-menu-accountMenu > ul > li:first-child > a'},
            {action: 'click', arg: '.AuthModal-tab > li:nth-child(2) > a'},
            {action: 'waitFor', arg: 1500}
        ],
        autofillExpected: 1
    }, */
    {
        name: 'cnbc login',
        url: 'https://www.cnbc.com/world/?region=world',
        actions: [
            {action: 'reload', arg: { waitUntil: 'networkidle0' }},
            {action: 'click', arg: '.account-menu-accountMenu > ul > li:first-child > a'}
        ],
        autofillExpected: 0
    },
    {
        name: 'cnbc newsletter',
        url: 'https://www.cnbc.com/sign-up-for-cnbc-newsletters/',
        actions: [{action: 'reload', arg: { waitUntil: 'networkidle0' }}],
        autofillExpected: 1
    },
    {
        name: 'ResearchGate signup',
        url: 'https://www.researchgate.net/signup.SignUpAccountBasics.html',
        actions: [
            {action: 'click', arg: 'button.qc-cmp-button[onclick]', optional: true},
            {action: 'click', arg: '.js-submit.option.institution'},
            {action: 'waitFor', arg: 1000},
            {action: 'click', arg: '.js-skip-step'}
        ],
        autofillExpected: 1
    },
    {
        name: 'ResearchGate login',
        url: 'https://www.researchgate.net/login',
        actions: [{action: 'click', arg: 'button.qc-cmp-button[onclick]', optional: true}],
        autofillExpected: 0
    },
    {
        name: 'WordReference newsletter',
        url: 'https://daily.wordreference.com/',
        autofillExpected: 1
    }
]

const focusedSites = []

module.exports = {sites, focusedSites}
