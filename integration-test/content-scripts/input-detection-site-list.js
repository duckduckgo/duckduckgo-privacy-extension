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
        actions: [{ action: 'click', arg: '.signup_email_link' }],
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
    {
        name: 'IGN.com signup',
        url: 'https://www.ign.com',
        actions: [
            { action: 'waitForTimeout', arg: 200 },
            { action: 'click', arg: '.user-tools-wrapper .sign-in-button > button' },
            { action: 'click', arg: '#email-label > .supplemental > button' }
        ],
        autofillExpected: 1
    },
    {
        name: 'IGN.com login',
        url: 'https://www.ign.com',
        actions: [
            { action: 'waitForTimeout', arg: 200 },
            { action: 'click', arg: '.user-tools-wrapper .sign-in-button > button' }
        ],
        autofillExpected: 0
    },
    {
        name: 'cnbc login',
        url: 'https://www.cnbc.com/world/?region=world',
        actions: [
            { action: 'reload', arg: { waitUntil: 'networkidle0' } },
            { action: 'click', arg: '.account-menu-accountMenu > ul > li:first-child > a' }
        ],
        autofillExpected: 0
    },
    {
        name: 'cnbc newsletter',
        url: 'https://www.cnbc.com/sign-up-for-cnbc-newsletters/',
        actions: [
            { action: 'reload', arg: { waitUntil: 'networkidle0' } },
            { action: 'click', arg: '#onetrust-accept-btn-handler', optional: true }
        ],
        autofillExpected: 1
    },
    {
        name: 'ResearchGate signup',
        url: 'https://www.researchgate.net/signup.SignUpAccountBasics.html',
        actions: [
            { action: 'click', arg: '.qc-cmp2-summary-buttons button[mode=primary]', optional: true },
            { action: 'click', arg: '.js-submit.option.institution' },
            { action: 'waitForTimeout', arg: 1000 },
            { action: 'click', arg: '.js-skip-step' }
        ],
        autofillExpected: 1
    },
    {
        name: 'ResearchGate login',
        url: 'https://www.researchgate.net/login',
        actions: [{ action: 'click', arg: '.qc-cmp2-summary-buttons button[mode=primary]', optional: true }],
        autofillExpected: 0
    },
    {
        name: 'WordReference newsletter',
        url: 'https://daily.wordreference.com/',
        autofillExpected: 1
    },
    {
        name: 'RightMove signup',
        // We explicitly go to login and then click on register to test for a possible regression
        url: 'https://www.rightmove.co.uk/login.html',
        actions: [{ action: 'click', arg: 'a[href="/register.html"]' }],
        autofillExpected: 1
    },
    {
        name: 'RightMove login',
        url: 'https://www.rightmove.co.uk/login.html',
        autofillExpected: 0
    },
    {
        name: 'Leafly signup',
        url: 'https://sso.leafly.com/i/',
        actions: [{ action: 'click', arg: 'a[href="/sign-up"]' }],
        autofillExpected: 1
    },
    {
        name: 'Leafly login',
        url: 'https://sso.leafly.com/i/',
        actions: [{ action: 'click', arg: 'a[href="/sign-in"]' }],
        autofillExpected: 0
    },
    /* Stopped loading in headless browser
    {
        name: 'Infowars signup',
        url: 'https://www.infowarsstore.com/customer/account/create/',
        autofillExpected: 2
    },
    {
        name: 'Infowars login',
        url: 'https://www.infowarsstore.com/customer/account/login/',
        autofillExpected: 1
    },
    {
        name: 'Infowars newsletter',
        url: 'https://www.infowars.com/newsletter-sign-up/',
        autofillExpected: 1
    }, */
    /* The page doesn't load for some reason
    {
        name: 'Kijiji signup',
        url: 'https://www.kijiji.ca/t-user-registration.html',
        autofillExpected: 1
    },
    {
        name: 'Kijiji login',
        url: 'https://www.kijiji.ca/t-login.html',
        autofillExpected: 0
    }, */
    {
        name: 'Leo.org signup',
        url: 'https://dict.leo.org/myleo/register.php?lp=ende&lang=en',
        autofillExpected: 2
    },
    {
        name: 'Esquire signup (mylo.id)',
        url: 'https://www.mylo.id/signup',
        autofillExpected: 1
    },
    {
        name: 'Esquire login (mylo.id)',
        url: 'https://www.mylo.id/login',
        autofillExpected: 0
    },
    {
        name: 'Esquire newsletter',
        url: 'https://link.esquire.com/join/3o3/esq-newsletter',
        autofillExpected: 1
    },
    {
        name: 'Wired signup',
        url: 'https://subscribe.wired.com/subscribe/splits/wired/WIR_FAILSAFE',
        autofillExpected: 1
    },
    {
        name: 'Wired login',
        url: 'https://www.wired.com/account/sign-in',
        autofillExpected: 0
    },
    {
        name: 'Wired newsletter',
        url: 'https://www.wired.com/newsletter',
        autofillExpected: 1
    },
    {
        name: 'Slate signup',
        url: 'https://id.tinypass.com/id/?client_id=homyv5Uzpu&sender=piano-id-qlBRl&origin=https:%2F%2Fslate.com&site=https:%2F%2Fslate.com&parent_uri=https:%2F%2Fslate.com%2Fsign-in&display_mode=inline&screen=login',
        actions: [{ action: 'click', arg: '[showscreen="register"] > a' }],
        autofillExpected: 1
    },
    {
        name: 'Slate login',
        url: 'https://id.tinypass.com/id/?client_id=homyv5Uzpu&sender=piano-id-qlBRl&origin=https:%2F%2Fslate.com&site=https:%2F%2Fslate.com&parent_uri=https:%2F%2Fslate.com%2Fsign-in&display_mode=inline&screen=login',
        autofillExpected: 0
    },
    {
        name: 'Fandom signup',
        url: 'https://www.fandom.com/register',
        autofillExpected: 1
    },
    {
        name: 'Fandom login',
        url: 'https://www.fandom.com/signin',
        autofillExpected: 0
    },
    {
        name: 'Apartments.com signup',
        url: 'https://www.apartments.com/',
        actions: [{ action: 'click', arg: '.js-headerSignUp.headerSignUp' }],
        autofillExpected: 1
    },
    {
        name: 'OpticsPlanet signup',
        url: 'https://www.opticsplanet.com/register',
        autofillExpected: 1
    },
    {
        name: 'OpticsPlanet login',
        url: 'https://www.opticsplanet.com/signin',
        autofillExpected: 0
    },
    {
        name: 'OpticsPlanet newsletter',
        url: 'https://www.opticsplanet.com/',
        autofillExpected: 2
    },
    {
        name: 'iFixIt signup',
        url: 'https://www.ifixit.com/#',
        actions: [{ action: 'click', arg: '#navSignup' }],
        autofillExpected: 3
    },
    {
        name: 'iFixIt login',
        url: 'https://www.ifixit.com/#',
        actions: [{ action: 'click', arg: '#navLogin' }],
        autofillExpected: 2
    },
    {
        name: 'BlazeTV signup',
        url: 'https://get.blazetv.com/clkn/https/www.blazetv.com/signup',
        autofillExpected: 1
    },
    {
        name: 'BlazeTV login',
        url: 'https://get.blazetv.com/clkn/https/www.blazetv.com/login',
        autofillExpected: 0
    },
    {
        name: 'BlazeTV newsletter',
        url: 'https://www.theblaze.com/',
        actions: [{ action: 'evaluate', arg: () => window.scrollBy(0, window.innerHeight) }],
        autofillExpected: 1
    },
    {
        name: 'Sur.ly signup',
        url: 'https://sur.ly/',
        actions: [{ action: 'click', arg: 'a[data-popup="sign-up"]' }],
        autofillExpected: 1
    },
    {
        name: 'Sur.ly login',
        url: 'https://sur.ly/',
        actions: [{ action: 'click', arg: 'a[data-popup="log-in"]' }],
        autofillExpected: 0
    },
    {
        name: 'Sur.ly contact',
        url: 'https://sur.ly/contacts',
        autofillExpected: 1
    },
    {
        name: 'CoinMarketCap signup',
        url: 'https://accounts.coinmarketcap.com/signup',
        autofillExpected: 1
    },
    {
        name: 'CoinMarketCap login',
        url: 'https://accounts.coinmarketcap.com/login',
        autofillExpected: 0
    },
    {
        name: 'CoinMarketCap newsletter',
        url: 'https://coinmarketcap.com/',
        autofillExpected: 1
    },
    {
        name: '1337x.to signup',
        url: 'https://www.1337x.to/register',
        autofillExpected: 1
    },
    {
        name: '1337x.to login',
        url: 'https://www.1337x.to/login',
        autofillExpected: 0
    },
    {
        name: 'Reverso signup',
        url: 'https://account.reverso.net/Account/Register',
        autofillExpected: 1
    },
    {
        name: 'Reverso login',
        url: 'https://account.reverso.net/Account/Login',
        autofillExpected: 0
    },
    {
        name: 'US News newsletter',
        url: 'https://emailprefs.usnews.com/emailprefs/newsletters-index',
        autofillExpected: 1
    },
    {
        name: 'US News contact',
        url: 'https://www.usnews.com/info/features/contact',
        autofillExpected: 1
    },
    {
        name: 'BabyCenter signup',
        url: 'https://www.babycenter.com/register.htm',
        autofillExpected: 1
    },
    {
        name: 'BabyCenter login',
        url: 'https://www.babycenter.com/login.htm',
        autofillExpected: 0
    },
    {
        name: 'YourTango signup',
        url: 'https://www.yourtango.com/user/register',
        autofillExpected: 1
    },
    {
        name: 'YourTango login',
        url: 'https://www.yourtango.com/user/login',
        autofillExpected: 0
    },
    {
        name: 'NewGrounds signup',
        url: 'https://www.newgrounds.com/passport/signup/new',
        autofillExpected: 1
    },
    {
        name: 'NewGrounds login',
        url: 'https://www.newgrounds.com/passport',
        autofillExpected: 0
    },
    {
        name: 'ItemFix signup',
        url: 'https://www.itemfix.com/user?a=register',
        autofillExpected: 2
    },
    {
        name: 'ItemFix login',
        url: 'https://www.itemfix.com/user?a=login',
        autofillExpected: 0
    },
    {
        name: 'CookPad signup',
        url: 'https://cookpad.com/us/accounts/emails/new',
        autofillExpected: 1
    },
    {
        name: 'CookPad login',
        url: 'https://cookpad.com/us/login',
        autofillExpected: 0
    },
    {
        name: 'Mein Schoener Garten newsletter',
        url: 'https://www.mein-schoener-garten.de/newsletter',
        autofillExpected: 1
    },
    {
        name: 'TripSavvy newsletter',
        url: 'https://www.tripsavvy.com',
        autofillExpected: 1
    },
    {
        name: 'Fanfiction.net signup',
        url: 'https://www.fanfiction.net/signup.php',
        autofillExpected: 1
    },
    {
        name: 'Fanfiction.net login',
        url: 'https://www.fanfiction.net/login.php',
        autofillExpected: 0
    },
    {
        name: 'Self.com newsletter',
        url: 'https://www.self.com/newsletter/subscribe',
        autofillExpected: 1
    },
    {
        name: 'Guns.com signup',
        url: 'https://www.guns.com/register',
        autofillExpected: 2
    },
    {
        name: 'Guns.com login',
        url: 'https://www.guns.com',
        autofillExpected: 1
    },
    {
        name: 'Guns.com newsletter',
        url: 'https://www.guns.com/email-sign-up',
        autofillExpected: 2
    },
    {
        name: 'Guns.com contacts',
        url: 'https://www.guns.com/contact',
        autofillExpected: 2
    },
    {
        name: 'Garten Journal signup',
        url: 'https://www.gartenjournal.net/forum/register/',
        autofillExpected: 1
    },
    {
        name: 'Garten Journal login',
        url: 'https://www.gartenjournal.net/forum/login/login',
        autofillExpected: 0
    },
    {
        name: 'Garten Journal newsletter',
        url: 'https://www.gartenjournal.net/',
        autofillExpected: 1
    },
    {
        name: 'Dropbox signup',
        url: 'https://www.dropbox.com/login',
        actions: [{ action: 'click', arg: '.login-register-switch-link' }],
        autofillExpected: 1
    },
    {
        name: 'Dropbox login',
        url: 'https://www.dropbox.com/login',
        autofillExpected: 0
    },
    {
        name: 'Carmax signup',
        url: 'https://www.carmax.com/mycarmax/register',
        autofillExpected: 1
    },
    {
        name: 'Carmax login',
        url: 'https://www.carmax.com/mycarmax/sign-in',
        autofillExpected: 0
    },
    {
        name: 'Vulture.com signup',
        url: 'https://subs.nymag.com/magazine/subscribe/official-subscription.html',
        actions: [{ action: 'click', arg: '.subscription-stripe-plan.all .plan-button' }],
        autofillExpected: 1
    },
    {
        name: 'Vulture.com login',
        url: 'https://www.vulture.com/',
        actions: [
            { action: 'click', arg: '.user-signin > button.sign-in-button' }
        ],
        autofillExpected: 0
    },
    /* Stopped loading signin/signup forms in puppeteer
    {
        name: 'Sydney Morning Herald signup',
        url: 'https://smh.myfairfax.com.au/channel/zHE9EWDHf1XPuz3Phk0YIg/members/signups/new?callback_uri=https%3A%2F%2Fwww.smh.com.au%2F',
        autofillExpected: 1
    },
    {
        name: 'Sydney Morning Herald login',
        url: 'https://smh.myfairfax.com.au/members/lite_session/new?a_loginRegistrationTrigger=lightRego_enterEmail&callback_uri=https%3A%2F%2Fwww.smh.com.au%2F&channel_key=zHE9EWDHf1XPuz3Phk0YIg',
        autofillExpected: 0
    }, */
    {
        name: '123rf.com signup',
        url: 'https://www.123rf.com/register.php',
        autofillExpected: 1
    },
    {
        name: '123rf.com login',
        url: 'https://www.123rf.com/login.php',
        autofillExpected: 0
    },
    {
        name: 'Thermoworks guest checkout',
        url: 'https://www.thermoworks.com/sca-dev-elbrus/checkout.ssp?is=checkout#login-register',
        autofillExpected: 2
    },
    {
        name: 'Thermoworks newsletter',
        url: 'https://www.thermoworks.com/',
        autofillExpected: 1
    },
    {
        name: 'Wikihow Signup',
        url: 'https://www.wikihow.com/Special:CreateAccount',
        autofillExpected: 1
    },
    {
        name: 'Wikihow Login',
        url: 'https://www.wikihow.com/Special:UserLogin',
        autofillExpected: 0
    },
    {
        name: 'Airbnb Signup',
        url: 'https://www.airbnb.com/',
        actions: [
            { action: 'click', arg: '[data-testid="cypress-headernav-profile"]' },
            { action: 'click', arg: '[data-testid="cypress-headernav-signup"]' },
            { action: 'click', arg: '[data-testid="social-auth-button-email"]' }
        ],
        autofillExpected: 1
    },
    {
        name: 'Airbnb Login',
        url: 'https://www.airbnb.com/',
        actions: [
            { action: 'click', arg: '[data-testid="cypress-headernav-profile"]' },
            { action: 'click', arg: '[data-testid="cypress-headernav-login"]' },
            { action: 'click', arg: '[data-testid="social-auth-button-email"]' }
        ],
        autofillExpected: 0
    }
]

const focusedSites = []

module.exports = { sites, focusedSites }
